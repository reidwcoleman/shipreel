import Foundation

struct APIError: LocalizedError {
    enum Kind { case offline, notFound, server, unauthorized }
    var kind: Kind
    var message: String
    var status: Int = 0
    var errorDescription: String? { message }
}

struct SSEEvent {
    var event: String
    var data: String
}

/// Thin client for the Shipreel server (apps/REVIEW-API.md). Shared by the Mac and iPhone apps.
/// On the phone, `base` is the phone bridge (scripts/phone-bridge.mjs) and `token` its pairing token.
final class API: @unchecked Sendable {
    var base: URL
    var token: String?

    private let session: URLSession = {
        let c = URLSessionConfiguration.default
        c.timeoutIntervalForRequest = 20
        c.requestCachePolicy = .reloadIgnoringLocalCacheData
        c.httpAdditionalHeaders = ["Accept": "application/json"]
        return URLSession(configuration: c)
    }()

    private let streamSession: URLSession = {
        let c = URLSessionConfiguration.default
        c.timeoutIntervalForRequest = 120 // the server pings every 15 s
        c.timeoutIntervalForResource = 60 * 60 * 24
        c.requestCachePolicy = .reloadIgnoringLocalCacheData
        return URLSession(configuration: c)
    }()

    init(base: URL, token: String? = nil) {
        self.base = base
        self.token = token
    }

    private func authorize(_ req: inout URLRequest) {
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
    }

    /// The server answers with absolute `http://127.0.0.1:4747/...` URLs. Through the bridge they must
    /// point at the bridge instead, with the token in the query (AVPlayer can't send headers).
    func media(_ s: String) -> String {
        guard var comps = URLComponents(string: s), let host = comps.host,
              ["127.0.0.1", "localhost"].contains(host),
              let b = URLComponents(url: base, resolvingAgainstBaseURL: false) else { return s }
        if b.host == host, b.port == comps.port, token == nil { return s }
        comps.scheme = b.scheme
        comps.host = b.host
        comps.port = b.port
        if let token {
            comps.queryItems = (comps.queryItems ?? []).filter { $0.name != "t" } + [URLQueryItem(name: "t", value: token)]
            // "+" and "/" can't appear in base64url, but be safe with the query encoding.
            comps.percentEncodedQuery = comps.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%2B")
        }
        return comps.string ?? s
    }

    func rewrite(_ item: ReviewItem) -> ReviewItem {
        var i = item
        i.mp4Url = i.mp4Url.map(media)
        i.thumbUrl = i.thumbUrl.map(media)
        i.appIcon = i.appIcon.map(media)
        i.slideUrls = i.slideUrls.map(media)
        return i
    }

    func url(_ path: String, query: [String: String] = [:]) -> URL {
        var comps = URLComponents(url: base, resolvingAgainstBaseURL: false)!
        let prefix = comps.path.hasSuffix("/") ? String(comps.path.dropLast()) : comps.path
        comps.path = prefix + path
        if !query.isEmpty { comps.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) } }
        return comps.url!
    }

    func get<T: Decodable>(_ path: String, query: [String: String] = [:], as: T.Type = T.self) async throws -> T {
        var req = URLRequest(url: url(path, query: query))
        req.httpMethod = "GET"
        authorize(&req)
        return try await run(req)
    }

    func send<T: Decodable>(_ method: String, _ path: String, body: [String: Any] = [:], as: T.Type = T.self) async throws -> T {
        var req = URLRequest(url: url(path))
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        authorize(&req)
        return try await run(req)
    }

    private func run<T: Decodable>(_ req: URLRequest) async throws -> T {
        let data: Data
        let resp: URLResponse
        do {
            (data, resp) = try await session.data(for: req)
        } catch let e as URLError {
            throw APIError(kind: .offline, message: Self.describe(e))
        }
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else {
            let msg = (try? JSONDecoder().decode([String: String].self, from: data))?["error"]
            if code == 401 || code == 403 {
                throw APIError(kind: .unauthorized, message: msg ?? "This pairing code isn't valid anymore. Pair again from Shipreel on your Mac.", status: code)
            }
            if code == 502 || code == 503 || code == 504 {
                throw APIError(kind: .offline, message: msg ?? "Shipreel isn't running on your Mac.", status: code)
            }
            throw APIError(kind: code == 404 ? .notFound : .server,
                           message: msg ?? "Shipreel answered \(code).", status: code)
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            // An HTML page where JSON was expected means this route doesn't exist on this server.
            if let s = String(data: data.prefix(64), encoding: .utf8), s.contains("<!DOCTYPE") || s.contains("<html") {
                throw APIError(kind: .notFound, message: "This Shipreel server doesn't have \(req.url?.path ?? "that route").", status: 404)
            }
            throw APIError(kind: .server, message: "Couldn't read Shipreel's answer (\(error.localizedDescription)).")
        }
    }

    static func describe(_ e: URLError) -> String {
        switch e.code {
        case .cannotConnectToHost, .cannotFindHost, .networkConnectionLost, .notConnectedToInternet:
            "Shipreel isn't answering."
        case .timedOut: "Shipreel took too long to answer."
        default: e.localizedDescription
        }
    }

    /// Server-sent events. Each `data:` line completes an event (Shipreel sends one data line per event).
    func events(_ path: String) -> AsyncThrowingStream<SSEEvent, Error> {
        let req: URLRequest = {
            var r = URLRequest(url: url(path))
            r.setValue("text/event-stream", forHTTPHeaderField: "Accept")
            authorize(&r)
            return r
        }()
        let session = streamSession
        return AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    let (bytes, resp) = try await session.bytes(for: req)
                    let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
                    guard (200..<300).contains(code) else {
                        throw APIError(kind: code == 404 ? .notFound : .server, message: "Stream answered \(code).", status: code)
                    }
                    var name = "message"
                    for try await line in bytes.lines {
                        if line.hasPrefix("event:") {
                            name = line.dropFirst(6).trimmingCharacters(in: .whitespaces)
                        } else if line.hasPrefix("data:") {
                            continuation.yield(SSEEvent(event: name, data: String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)))
                            name = "message"
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}
