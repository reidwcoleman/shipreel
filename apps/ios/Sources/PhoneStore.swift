import Foundation
import Observation
import SwiftUI
import UIKit

struct Toast: Identifiable, Equatable {
    enum Style { case info, success, error }
    let id = UUID()
    var text: String
    var style: Style = .info
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil
    static func == (a: Toast, b: Toast) -> Bool { a.id == b.id }
}

struct BridgeInfo: Decodable {
    var lanUrls: [String]?
    var tunnelUrl: String?
    var mac: String?
}

@MainActor
@Observable
final class PhoneStore {
    enum Link: Equatable {
        case unpaired
        case connecting
        case connected
        case unreachable(String)
        case unauthorized(String)
    }

    enum Tab: Hashable { case review, posts, create, accounts }

    var pairing: Pairing? = PairingStore.load()
    var link: Link = .connecting
    var via: String = ""          // "Home Wi-Fi" / "Tunnel"
    var baseURL: String = ""
    var tab: Tab = .review

    var items: [ReviewItem] = []
    var hasLoaded = false
    var currentId: String?
    var drafts: [String: Draft] = [:]
    var busy: Set<String> = []
    var toast: Toast?

    var postbox: PostboxStatus?
    var postboxError: String?
    var connectingPlatforms: Set<Platform> = []
    var projects: [ProjectInfo] = []
    var run: CreateRun?

    let api = API(base: URL(string: "http://127.0.0.1:4748")!)
    let player = PhonePlayer()

    private var loops: [Task<Void, Never>] = []
    private var refreshTask: Task<Void, Never>?
    private var streamTask: Task<Void, Never>?
    private var connectTask: Task<Void, Never>?

    init() {
        link = pairing == nil ? .unpaired : .connecting
    }

    // MARK: Derived

    var queue: [ReviewItem] { items.filter { $0.review.status == .pending || $0.review.status == .revising } }
    var pendingCount: Int { items.filter { $0.review.status == .pending }.count }
    var postItems: [ReviewItem] { items.filter { $0.post != nil } }
    var attentionCount: Int { postItems.filter { $0.post?.state.needsAttention == true }.count }
    var current: ReviewItem? { currentId.flatMap { id in items.first { $0.id == id } } }

    // MARK: Pairing

    func pair(with p: Pairing) {
        PairingStore.save(p)
        pairing = p
        hasLoaded = false
        items = []
        connect()
    }

    func handle(url: URL) {
        guard let p = Pairing.parse(url.absoluteString) else {
            show(Toast(text: "That isn't a Shipreel pairing link.", style: .error)); return
        }
        pair(with: p)
    }

    func unpair() {
        PairingStore.clear()
        pairing = nil
        stopLoops()
        items = []
        hasLoaded = false
        link = .unpaired
        player.load(nil)
    }

    // MARK: Connecting

    /// Try each home Wi-Fi address (1.5 s each), then the tunnel.
    func connect() {
        guard let p = pairing else { link = .unpaired; return }
        connectTask?.cancel()
        link = .connecting
        connectTask = Task {
            stopLoops()
            if let base = await reachable(p) {
                api.base = URL(string: base.url)!
                api.token = p.token
                baseURL = base.url
                via = base.via
                await refresh()
                if case .unauthorized = link { return }
                if hasLoaded {
                    link = .connected
                    startLoops()
                    Task { await self.learnAddresses() }
                    Task { await self.loadPostbox() }
                    Task { await self.loadProjects() }
                }
            } else {
                link = .unreachable("Tried \(p.lanUrls.count) Wi-Fi address\(p.lanUrls.count == 1 ? "" : "es")" + (p.tunnelUrl == nil ? "." : " and the tunnel."))
            }
        }
    }

    private func reachable(_ p: Pairing) async -> (url: String, via: String)? {
        for lan in p.lanUrls where await Self.ping(lan, timeout: 1.5) {
            return (lan, "Home Wi-Fi")
        }
        if let t = p.tunnelUrl, await Self.ping(t, timeout: 8) { return (t, "Tunnel") }
        return nil
    }

    static func ping(_ base: String, timeout: TimeInterval) async -> Bool {
        guard let url = URL(string: base + "/bridge/ping") else { return false }
        var req = URLRequest(url: url, timeoutInterval: timeout)
        req.cachePolicy = .reloadIgnoringLocalCacheData
        guard let (data, resp) = try? await URLSession.shared.data(for: req),
              (resp as? HTTPURLResponse)?.statusCode == 200 else { return false }
        return String(data: data, encoding: .utf8)?.contains("shipreel") == true
    }

    /// The tunnel URL changes whenever the bridge restarts; keep the pairing current.
    private func learnAddresses() async {
        guard var p = pairing, let info: BridgeInfo = try? await api.get("/bridge/info") else { return }
        var changed = false
        if let t = info.tunnelUrl, t != p.tunnelUrl { p.tunnelUrl = t; changed = true }
        if let lan = info.lanUrls, !lan.isEmpty, lan != p.lanUrls { p.lanUrls = lan; changed = true }
        if let m = info.mac, m != p.mac { p.mac = m; changed = true }
        if changed {
            pairing = p
            PairingStore.save(p)
        }
    }

    private func startLoops() {
        loops.append(Task { [weak self] in await self?.eventsLoop() })
        loops.append(Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(60))
                await self?.learnAddresses()
                await self?.refresh()
                await self?.loadPostbox()
            }
        })
    }

    private func stopLoops() {
        loops.forEach { $0.cancel() }
        loops = []
    }

    private func eventsLoop() async {
        while !Task.isCancelled {
            do {
                for try await ev in api.events("/api/events") {
                    guard let data = ev.data.data(using: .utf8),
                          let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                          let type = obj["type"] as? String else { continue }
                    if ["review", "post", "videos"].contains(type) { scheduleRefresh() }
                    if type == "post" { Task { await self.loadPostbox() } }
                    if type == "render", (obj["status"] as? String) != "rendering" { scheduleRefresh() }
                }
            } catch {}
            if Task.isCancelled { return }
            await refresh()
            if case .unreachable = link { return }
            try? await Task.sleep(for: .seconds(3))
        }
    }

    /// Back in the foreground: reconnect (the phone may have changed networks).
    func resume() {
        guard pairing != nil else { return }
        connect()
    }

    // MARK: Data

    func scheduleRefresh() {
        refreshTask?.cancel()
        refreshTask = Task {
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }
            await refresh()
        }
    }

    func refresh() async {
        do {
            let list: ReviewList = try await api.get("/api/review", query: ["status": "all"])
            apply(list.items.map(api.rewrite))
            hasLoaded = true
            if link != .connected, !loops.isEmpty { link = .connected }
        } catch let e as APIError {
            switch e.kind {
            case .unauthorized: link = .unauthorized(e.message); stopLoops()
            case .offline: if link == .connected { stopLoops(); connect() } else { link = .unreachable(e.message) }
            default: if !hasLoaded { link = .unreachable(e.message) }
            }
        } catch {
            if !hasLoaded { link = .unreachable(error.localizedDescription) }
        }
    }

    private func apply(_ new: [ReviewItem]) {
        items = new
        let q = queue
        if currentId == nil || !q.contains(where: { $0.id == currentId }) {
            currentId = q.first(where: { $0.review.status == .pending })?.id ?? q.first?.id
        }
    }

    private func replace(_ updated: ReviewItem) {
        let u = api.rewrite(updated)
        if let i = items.firstIndex(where: { $0.id == u.id }) { items[i] = u } else { items.insert(u, at: 0) }
    }

    func loadPostbox() async {
        do {
            postbox = try await api.get("/api/postbox")
            postboxError = nil
        } catch {
            postboxError = error.localizedDescription
        }
    }

    func loadProjects() async {
        if let p: [ProjectInfo] = try? await api.get("/api/projects") { projects = p }
    }

    // MARK: Review

    func draft(for item: ReviewItem) -> Draft {
        if let d = drafts[item.id] { return d }
        let on = Platform.allCases.filter { postbox?.account($0)?.connected != false }
        return Draft(captions: item.captions, youtubeTitle: item.youtubeTitle, platforms: Set(on),
                     date: Calendar.current.date(bySetting: .minute, value: 0, of: Date().addingTimeInterval(3600)) ?? Date(),
                     dryRun: false)
    }

    func binding(for item: ReviewItem) -> Binding<Draft> {
        Binding(get: { self.draft(for: item) }, set: { self.drafts[item.id] = $0 })
    }

    private func path(_ item: ReviewItem) -> String {
        "/api/review/\(item.projectId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? item.projectId)/\(item.videoId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? item.videoId)"
    }

    /// Next pending item after `id` (below first, then above).
    private func next(after id: String) -> String? {
        let q = queue
        guard let i = q.firstIndex(where: { $0.id == id }) else { return q.first?.id }
        return (q[(i + 1)...].first { $0.review.status == .pending } ?? q[..<i].last { $0.review.status == .pending })?.id
    }

    /// Returns true when the server took it.
    func approve(_ item: ReviewItem) async -> Bool {
        guard item.review.status == .pending, !busy.contains(item.id) else { return false }
        let d = draft(for: item)
        guard !d.platforms.isEmpty else {
            show(Toast(text: "Pick at least one platform.", style: .error)); return false
        }
        if let why = ApproveRules.blocked(d, postbox: postbox, postboxError: postboxError) {
            show(Toast(text: why, style: .error)); return false
        }
        var body: [String: Any] = ["action": "approve",
                                   "platforms": Platform.allCases.filter { d.platforms.contains($0) }.map(\.rawValue),
                                   "dryRun": d.dryRun]
        switch d.when {
        case .now: body["when"] = "now"
        case .nextSlot: body["when"] = "next-slot"
        case .pick: body["when"] = ISODate.string(d.date)
        }
        var changed: [String: String] = [:]
        for p in Platform.allCases where d.captions[p] != item.captions[p] { changed[p.rawValue] = d.captions[p] }
        if !changed.isEmpty { body["captions"] = changed }
        if d.youtubeTitle != item.youtubeTitle { body["youtubeTitle"] = d.youtubeTitle }
        busy.insert(item.id)
        defer { busy.remove(item.id) }
        do {
            let updated: ReviewItem = try await api.send("POST", path(item), body: body)
            let nextId = next(after: item.id)
            replace(updated)
            drafts[item.id] = nil
            currentId = nextId
            let names = Fmt.list(Platform.allCases.filter { d.platforms.contains($0) }.map(\.name))
            let text = d.dryRun ? "Dry run on \(names): filled in Chrome, Post not pressed."
                : d.when == .now ? "Posting to \(names)."
                : "Scheduled for \(Fmt.when(updated.post?.scheduledDate ?? d.date))."
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            show(Toast(text: text, style: .success, actionTitle: "Posts") { [weak self] in self?.tab = .posts })
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            show(Toast(text: "Couldn't approve: \(error.localizedDescription)", style: .error))
            return false
        }
    }

    func revise(_ item: ReviewItem, note: String) async -> Bool {
        let note = note.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !note.isEmpty, item.review.status == .pending else { return false }
        busy.insert(item.id)
        defer { busy.remove(item.id) }
        do {
            let updated: ReviewItem = try await api.send("POST", path(item), body: ["action": "revise", "note": note])
            let nextId = next(after: item.id)
            replace(updated)
            currentId = nextId
            show(Toast(text: "Sent to Claude. It comes back here when it's re-rendered.", style: .success))
            return true
        } catch {
            show(Toast(text: "Couldn't send it: \(error.localizedDescription)", style: .error))
            return false
        }
    }

    func reject(_ item: ReviewItem) async {
        guard item.review.status == .pending, !busy.contains(item.id) else { return }
        busy.insert(item.id)
        defer { busy.remove(item.id) }
        do {
            let updated: ReviewItem = try await api.send("POST", path(item), body: ["action": "reject"])
            let nextId = next(after: item.id)
            replace(updated)
            currentId = nextId
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            show(Toast(text: "Rejected.", actionTitle: "Undo") { [weak self] in
                Task { await self?.reopen(updated) }
            })
        } catch {
            show(Toast(text: "Couldn't reject: \(error.localizedDescription)", style: .error))
        }
    }

    func reopen(_ item: ReviewItem) async {
        if let updated: ReviewItem = try? await api.send("POST", path(item), body: ["action": "reopen"]) {
            replace(updated)
            currentId = updated.id
        }
    }

    func cancelPost(_ item: ReviewItem) async {
        guard let post = item.post else { return }
        do {
            let _: Ignored = try await api.send("PATCH", "/api/projects/\(item.projectId)/posts", body: ["postId": post.id, "status": "canceled"])
            await refresh()
            show(Toast(text: "Cancelled. Nothing will be posted.", style: .success))
        } catch {
            show(Toast(text: "Couldn't cancel: \(error.localizedDescription)", style: .error))
        }
    }

    func connectAccount(_ p: Platform) async {
        connectingPlatforms.insert(p)
        defer { connectingPlatforms.remove(p) }
        do {
            let r: MessageReply = try await api.send("POST", "/api/postbox/connect", body: ["platform": p.rawValue])
            show(Toast(text: r.message ?? "Opened \(p.name) in Chrome on your Mac.", style: .info))
        } catch {
            show(Toast(text: "Couldn't open \(p.name): \(error.localizedDescription)", style: .error))
        }
    }

    func show(_ t: Toast) {
        withAnimation(.easeOut(duration: 0.2)) { toast = t }
        let id = t.id
        Task {
            try? await Task.sleep(for: .seconds(t.actionTitle == nil ? 3.5 : 6))
            if toast?.id == id { withAnimation(.easeIn(duration: 0.16)) { toast = nil } }
        }
    }

    // MARK: Create

    func startCreate(prompt: String, projectId: String?, count: Int, formats: [String]) {
        let prompt = prompt.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !prompt.isEmpty, run?.isActive != true else { return }
        let r = CreateRun(prompt: prompt, projectName: projects.first { $0.id == projectId }?.name)
        r.append("$ shipreel create \"\(prompt)\"" + (count > 1 ? " ×\(count)" : ""))
        run = r
        var body: [String: Any] = ["prompt": prompt, "count": count]
        if let projectId { body["projectId"] = projectId }
        if !formats.isEmpty { body["formats"] = formats }
        streamTask = Task {
            do {
                let start: CreateStart = try await api.send("POST", "/api/create", body: body)
                r.id = start.runId
                r.status = .running
                await follow(r, runId: start.runId)
            } catch {
                r.status = .failed(error.localizedDescription)
                r.append("✗ \(error.localizedDescription)")
                r.ended = Date()
            }
        }
    }

    private func follow(_ r: CreateRun, runId: String) async {
        do {
            for try await ev in api.events("/api/create/\(runId)/stream") {
                guard let data = ev.data.data(using: .utf8),
                      let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { continue }
                if ev.event == "done" { finish(r, status: obj["status"] as? String, ids: obj["videoIds"] as? [String]); return }
                if let t = obj["text"] as? String { r.append(t) }
            }
        } catch {}
        while r.isActive, !Task.isCancelled {
            if let info: CreateRunInfo = try? await api.get("/api/create/\(runId)") {
                if let out = info.output {
                    let all = out.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
                    let have = r.lines.count - 1
                    if all.count > have { for l in all[max(0, have)...] { r.append(l) } }
                }
                if info.status != "running" { finish(r, status: info.status, ids: info.videoIds); return }
            }
            try? await Task.sleep(for: .seconds(1))
        }
    }

    private func finish(_ r: CreateRun, status: String?, ids: [String]?) {
        if r.status == .stopped { return }
        r.videoIds = ids ?? []
        r.ended = Date()
        r.status = status == "failed" ? .failed("Claude stopped with an error.") : .done
        scheduleRefresh()
        if r.status == .done, !r.videoIds.isEmpty {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
    }

    func stopCreate() {
        guard let r = run, r.isActive else { return }
        r.status = .stopped
        r.ended = Date()
        r.append("^C Stopped.")
        if let id = r.id { Task { let _: Ignored? = try? await api.send("POST", "/api/create/\(id)/stop") } }
        streamTask?.cancel()
    }
}

struct Ignored: Decodable {}
