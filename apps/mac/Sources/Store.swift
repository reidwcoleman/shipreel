import AppKit
import Observation
import SwiftUI
import UserNotifications

enum Route: Hashable {
    case item(String)
    case caughtUp
    case create
    case posts
    case accounts

    var isReview: Bool {
        switch self {
        case .item, .caughtUp: true
        default: false
        }
    }
}

struct Toast: Identifiable, Equatable {
    enum Style { case info, success, error }
    let id = UUID()
    var text: String
    var style: Style = .info
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    static func == (a: Toast, b: Toast) -> Bool { a.id == b.id }
}

@MainActor
@Observable
final class AppStore {
    enum Connection: Equatable {
        case connecting
        case online
        case offline(String)
        case outdated(String)
    }

    // Settings (UserDefaults-backed; read on demand so Settings changes apply right away).
    static let defaultServer = "http://127.0.0.1:4747"
    static let defaultFolder = ("~/Glide/Shipreel" as NSString).expandingTildeInPath

    var connection: Connection = .connecting
    var hasLoaded = false
    var items: [ReviewItem] = []
    var route: Route = .caughtUp {
        didSet { if route != oldValue { routeChangedAt = Date() } }
    }
    /// When the current item came on screen. Approve/Reject ignore anything faster than a person
    /// could have looked at it, and auto-repeated key presses, so a held ⌘↩ can't run down the queue.
    private var routeChangedAt = Date()
    var showInspector = true
    var drafts: [String: Draft] = [:]
    var busy: Set<String> = []
    var toast: Toast?
    var showRevise = false
    var carouselIndex = 0

    var postbox: PostboxStatus?
    var postboxError: String?
    var postboxLoading = false
    var connecting: Set<Platform> = []

    var projects: [ProjectInfo] = []
    var run: CreateRun?

    var launching = false
    var launchStatus = ""
    var launchError: String?

    var notificationStatus: UNAuthorizationStatus = .notDetermined
    var primerDismissed = UserDefaults.standard.bool(forKey: "notifPrimerDismissed")

    let player = PlayerModel()
    let api: API
    private let launcher = ServerLauncher()
    private var knownPending: Set<String> = []
    private var refreshTask: Task<Void, Never>?
    private var loops: [Task<Void, Never>] = []
    private var streamTask: Task<Void, Never>?

    init() {
        api = API(base: URL(string: Self.serverURLString) ?? URL(string: Self.defaultServer)!)
        Notifier.shared.onOpen = { [weak self] id in
            Task { @MainActor in
                self?.route = .item(id)
                NSApp.activate()
            }
        }
    }

    static var serverURLString: String {
        let s = UserDefaults.standard.string(forKey: "serverURL") ?? ""
        return s.trimmingCharacters(in: .whitespaces).isEmpty ? defaultServer : s
    }

    static var folder: String {
        let s = UserDefaults.standard.string(forKey: "shipreelFolder") ?? ""
        return s.isEmpty ? defaultFolder : (s as NSString).expandingTildeInPath
    }

    var serverHost: String {
        let u = api.base
        return "\(u.host ?? "127.0.0.1"):\(u.port ?? 80)"
    }

    // MARK: Derived

    var queue: [ReviewItem] {
        items.filter { $0.review.status == .pending || $0.review.status == .revising }
    }

    var pendingCount: Int { items.filter { $0.review.status == .pending }.count }

    var postItems: [ReviewItem] { items.filter { $0.post != nil } }

    var attentionCount: Int { postItems.filter { $0.post?.state.needsAttention == true }.count }

    var selected: ReviewItem? {
        if case .item(let id) = route { return items.first { $0.id == id } }
        return nil
    }

    func item(_ id: String) -> ReviewItem? { items.first { $0.id == id } }

    var accountsNeedAttention: Bool {
        guard let pb = postbox else { return postboxError != nil }
        return !pb.daemon || pb.extension == false || pb.accounts.contains { $0.connected == false }
    }

    var showNotificationPrimer: Bool {
        notificationStatus == .notDetermined && !primerDismissed && pendingCount > 0
    }

    // MARK: Lifecycle

    func start() {
        guard loops.isEmpty else { return }
        loops.append(Task { [weak self] in await self?.eventsLoop() })
        loops.append(Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(30))
                await self?.refresh()
                await self?.loadPostbox()
            }
        })
        Task {
            await refresh()
            await loadPostbox()
            await loadProjects()
            notificationStatus = await Notifier.shared.status()
        }
    }

    /// Re-point the client after the server URL changes in Settings.
    func serverURLChanged() {
        guard let u = URL(string: Self.serverURLString), u != api.base else { return }
        api.base = u
        hasLoaded = false
        connection = .connecting
        items = []
        knownPending = []
        Task {
            await refresh()
            await loadPostbox()
            await loadProjects()
        }
    }

    private func eventsLoop() async {
        while !Task.isCancelled {
            if connection == .online {
                do {
                    for try await ev in api.events("/api/events") {
                        handle(ev)
                    }
                } catch {}
            }
            await refresh()
            try? await Task.sleep(for: connection == .online ? .seconds(2) : .seconds(4))
        }
    }

    private func handle(_ ev: SSEEvent) {
        guard let data = ev.data.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = obj["type"] as? String else { return }
        switch type {
        case "review", "post", "videos", "render":
            if type == "render", (obj["status"] as? String) == "rendering" { return }
            scheduleRefresh()
            if type == "post" { Task { await loadPostbox() } }
        default: break
        }
    }

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
            apply(list.items)
            connection = .online
            hasLoaded = true
        } catch let e as APIError {
            switch e.kind {
            case .offline: connection = .offline(e.message)
            case .notFound: connection = .outdated(e.message)
            case .server, .unauthorized: if !hasLoaded { connection = .offline(e.message) }
            }
        } catch {
            if !hasLoaded { connection = .offline(error.localizedDescription) }
        }
    }

    private func apply(_ newItems: [ReviewItem]) {
        let pendingNow = Set(newItems.filter { $0.review.status == .pending }.map(\.id))
        if hasLoaded {
            let fresh = newItems.filter { pendingNow.subtracting(knownPending).contains($0.id) }
            for item in fresh.prefix(3) {
                Notifier.shared.notify(item: item, revised: item.review.note != nil && !(item.review.note ?? "").isEmpty)
            }
        }
        knownPending = pendingNow
        items = newItems

        // Keep the selection valid.
        let q = queue
        switch route {
        case .item(let id):
            if !q.contains(where: { $0.id == id }) { route = q.first.map { .item($0.id) } ?? .caughtUp }
        case .caughtUp:
            if let first = q.first(where: { $0.review.status == .pending }) ?? q.first { route = .item(first.id) }
        default: break
        }
        NSApp.dockTile.badgeLabel = pendingCount > 0 ? "\(pendingCount)" : nil
    }

    // MARK: Navigation

    func select(_ r: Route) {
        if r != route {
            route = r
            carouselIndex = 0
            showRevise = false
        }
    }

    func goToReview() {
        if let first = queue.first(where: { $0.review.status == .pending }) ?? queue.first {
            select(.item(first.id))
        } else {
            select(.caughtUp)
        }
    }

    func move(_ delta: Int) {
        let q = queue
        guard !q.isEmpty else { return }
        guard case .item(let id) = route, let i = q.firstIndex(where: { $0.id == id }) else {
            select(.item(q[0].id)); return
        }
        let j = min(max(i + delta, 0), q.count - 1)
        select(.item(q[j].id))
    }

    /// After acting on `id`, pick the next pending item (below first, then above).
    private func advance(from id: String) {
        let q = queue
        guard let i = q.firstIndex(where: { $0.id == id }) else { goToReview(); return }
        let below = q[(i + 1)...].first { $0.review.status == .pending }
        let above = q[..<i].last { $0.review.status == .pending }
        if let next = below ?? above { select(.item(next.id)) } else { select(.caughtUp) }
    }

    // MARK: Drafts

    func draft(for item: ReviewItem) -> Draft {
        if let d = drafts[item.id] { return d }
        return Draft(captions: item.captions,
                     youtubeTitle: item.youtubeTitle,
                     platforms: defaultPlatforms(),
                     date: Self.defaultPickDate(),
                     dryRun: UserDefaults.standard.bool(forKey: "dryRunDefault"))
    }

    func binding(for item: ReviewItem) -> Binding<Draft> {
        Binding(get: { self.draft(for: item) }, set: { self.drafts[item.id] = $0 })
    }

    private func defaultPlatforms() -> Set<Platform> {
        guard let pb = postbox else { return Set(Platform.allCases) }
        let on = Platform.allCases.filter { pb.account($0)?.connected != false } // unknown counts as on
        return Set(on)
    }

    static func defaultPickDate() -> Date {
        let cal = Calendar.current
        let base = Date().addingTimeInterval(3600)
        return cal.date(bySetting: .minute, value: 0, of: base) ?? base
    }

    // MARK: Review actions

    private func path(_ item: ReviewItem) -> String {
        let p = item.projectId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? item.projectId
        let v = item.videoId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? item.videoId
        return "/api/review/\(p)/\(v)"
    }

    var canAct: Bool {
        guard let s = selected else { return false }
        return s.review.status == .pending && !busy.contains(s.id)
    }

    /// False for auto-repeated keys and for items that have been on screen under 1.2 s.
    private var deliberate: Bool {
        if NSApp.currentEvent?.type == .keyDown, NSApp.currentEvent?.isARepeat == true { return false }
        return Date().timeIntervalSince(routeChangedAt) >= 1.2
    }

    /// Why Approve is blocked for the selected item (nil when it's allowed).
    var approveBlocked: String? {
        guard let item = selected else { return nil }
        return ApproveRules.blocked(draft(for: item), postbox: postbox, postboxError: postboxError)
    }

    func approveSelected() {
        guard canAct, deliberate, let item = selected else { return }
        let d = draft(for: item)
        if let why = ApproveRules.blocked(d, postbox: postbox, postboxError: postboxError) {
            show(Toast(text: why, style: .error, actionTitle: "Accounts") { [weak self] in self?.select(.accounts) })
            return
        }
        guard !d.platforms.isEmpty else {
            show(Toast(text: "Pick at least one platform to post to.", style: .error)); return
        }
        var body: [String: Any] = [
            "action": "approve",
            "platforms": Platform.allCases.filter { d.platforms.contains($0) }.map(\.rawValue),
            "dryRun": d.dryRun,
        ]
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
        Task {
            defer { busy.remove(item.id) }
            do {
                let updated: ReviewItem = try await api.send("POST", path(item), body: body)
                advance(from: item.id)
                replace(updated)
                drafts[item.id] = nil
                let names = Fmt.list(Platform.allCases.filter { d.platforms.contains($0) }.map(\.name))
                let text: String
                if d.dryRun {
                    text = "Dry run: Postbox fills \(names) in Chrome and stops before Post."
                } else if d.when == .now {
                    text = "Posting to \(names)."
                } else {
                    text = "Scheduled for \(Fmt.when(updated.post?.scheduledDate ?? d.date)) on \(names)."
                }
                show(Toast(text: text, style: .success, actionTitle: "View in Posts") { [weak self] in self?.select(.posts) })
            } catch {
                show(Toast(text: "Couldn't approve: \(error.localizedDescription)", style: .error))
            }
        }
    }

    func revise(_ note: String) {
        guard let item = selected, item.review.status == .pending else { return }
        let note = note.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !note.isEmpty else { return }
        busy.insert(item.id)
        showRevise = false
        Task {
            defer { busy.remove(item.id) }
            do {
                let updated: ReviewItem = try await api.send("POST", path(item), body: ["action": "revise", "note": note])
                advance(from: item.id)
                replace(updated)
                show(Toast(text: "Sent to Claude. It comes back here when it's re-rendered.", style: .success))
            } catch {
                show(Toast(text: "Couldn't send the change request: \(error.localizedDescription)", style: .error))
            }
        }
    }

    func rejectSelected() {
        guard canAct, deliberate, let item = selected else { return }
        busy.insert(item.id)
        Task {
            defer { busy.remove(item.id) }
            do {
                let updated: ReviewItem = try await api.send("POST", path(item), body: ["action": "reject"])
                advance(from: item.id)
                replace(updated)
                show(Toast(text: "Rejected “\(item.displayHook.prefix(40))”.", actionTitle: "Undo") { [weak self] in
                    self?.reopen(updated)
                })
            } catch {
                show(Toast(text: "Couldn't reject: \(error.localizedDescription)", style: .error))
            }
        }
    }

    func reopen(_ item: ReviewItem) {
        Task {
            do {
                let updated: ReviewItem = try await api.send("POST", path(item), body: ["action": "reopen"])
                replace(updated)
                select(.item(updated.id))
            } catch {
                show(Toast(text: "Couldn't bring it back: \(error.localizedDescription)", style: .error))
            }
        }
    }

    private func replace(_ updated: ReviewItem) {
        if let i = items.firstIndex(where: { $0.id == updated.id }) { items[i] = updated } else { items.insert(updated, at: 0) }
        knownPending = Set(items.filter { $0.review.status == .pending }.map(\.id))
        NSApp.dockTile.badgeLabel = pendingCount > 0 ? "\(pendingCount)" : nil
    }

    func show(_ t: Toast) {
        withAnimation(.easeOut(duration: 0.2)) { toast = t }
        let id = t.id
        Task {
            try? await Task.sleep(for: .seconds(t.actionTitle == nil ? 4 : 7))
            if toast?.id == id { withAnimation(.easeIn(duration: 0.16)) { toast = nil } }
        }
    }

    // MARK: Posts

    func cancelPost(_ item: ReviewItem) {
        guard let post = item.post else { return }
        let pid = item.projectId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? item.projectId
        Task {
            do {
                let _: Ignored = try await api.send("PATCH", "/api/projects/\(pid)/posts", body: ["postId": post.id, "status": "canceled"])
                await refresh()
                show(Toast(text: "Cancelled. Nothing will be posted.", style: .success))
            } catch {
                show(Toast(text: "Couldn't cancel: \(error.localizedDescription)", style: .error))
            }
        }
    }

    // MARK: Postbox

    func loadPostbox() async {
        postboxLoading = true
        defer { postboxLoading = false }
        do {
            let pb: PostboxStatus = try await api.get("/api/postbox")
            postbox = pb
            postboxError = nil
            // Untouched drafts follow the connected accounts.
            for (k, d) in drafts where !d.platformsTouched { drafts[k]?.platforms = defaultPlatforms() }
        } catch {
            postboxError = error.localizedDescription
        }
    }

    func connect(_ p: Platform) {
        connecting.insert(p)
        Task {
            defer { connecting.remove(p) }
            do {
                let r: MessageReply = try await api.send("POST", "/api/postbox/connect", body: ["platform": p.rawValue])
                show(Toast(text: r.message ?? "Opened \(p.name) in Chrome. Sign in there, then come back.", style: .info))
            } catch {
                show(Toast(text: "Couldn't open \(p.name): \(error.localizedDescription)", style: .error))
            }
        }
    }

    // MARK: Create

    func loadProjects() async {
        if let p: [ProjectInfo] = try? await api.get("/api/projects") { projects = p }
    }

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
                if ev.event == "done" {
                    finish(r, status: obj["status"] as? String, ids: obj["videoIds"] as? [String])
                    return
                }
                if let t = obj["text"] as? String { r.append(t) }
            }
        } catch {}
        // The stream closed without `done`: poll the run until it finishes.
        while r.isActive, !Task.isCancelled {
            if let info: CreateRunInfo = try? await api.get("/api/create/\(runId)") {
                if let out = info.output {
                    let all = out.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
                    let have = r.lines.count - 1 // first line is our own command echo
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
        if r.status == .done {
            let n = r.videoIds.count
            if n > 0 { show(Toast(text: "\(n) new video\(n == 1 ? "" : "s") in Review.", style: .success, actionTitle: "Review") { [weak self] in self?.goToReview() }) }
        }
    }

    func stopCreate() {
        guard let r = run, r.isActive else { return }
        r.status = .stopped
        r.ended = Date()
        r.append("^C Stopped.")
        if let id = r.id {
            Task { let _: Ignored? = try? await api.send("POST", "/api/create/\(id)/stop") }
        }
        streamTask?.cancel()
    }

    // MARK: Terminal + server

    func openInTerminal() {
        let folder = Self.folder
        let script = """
        tell application "Terminal"
            activate
            do script "cd " & quoted form of "\(folder.replacingOccurrences(of: "\"", with: "\\\""))" & " && claude"
        end tell
        """
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        p.arguments = ["-e", script]
        do { try p.run() } catch {
            show(Toast(text: "Couldn't open Terminal: \(error.localizedDescription)", style: .error))
        }
    }

    var logURL: URL { launcher.logURL }

    func startServer() {
        guard !launching else { return }
        launching = true
        launchError = nil
        launchStatus = "Starting Shipreel…"
        let port = api.base.port ?? 4747
        Task {
            defer { launching = false }
            do {
                let built = try launcher.start(folder: Self.folder, port: port)
                let limit = built ? 120 : 360
                for s in 1...limit {
                    try? await Task.sleep(for: .seconds(1))
                    launchStatus = built ? "Starting Shipreel… \(s) s" : "Building Shipreel for the first time… \(s) s"
                    await refresh()
                    if connection == .online {
                        await loadPostbox()
                        await loadProjects()
                        return
                    }
                    if !launcher.isRunning {
                        launchError = "Shipreel stopped while starting.\n" + launcher.logTail()
                        return
                    }
                }
                launchError = "Shipreel didn't answer after \(limit) seconds.\n" + launcher.logTail()
            } catch {
                launchError = error.localizedDescription
            }
        }
    }
}

/// For endpoints whose JSON answer we don't need.
struct Ignored: Decodable {}
