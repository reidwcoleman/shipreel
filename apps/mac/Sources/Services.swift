import AppKit
import Foundation
import UserNotifications

// MARK: - Starting the Shipreel server

/// Launches `npm run start` in the Shipreel folder through a login shell, with the usual
/// node locations (nvm, Homebrew, Volta) on PATH, and logs to ~/Library/Logs/Shipreel/server.log.
/// The server keeps running after the app quits, so scheduled posts still go out.
final class ServerLauncher {
    private var process: Process?

    let logURL: URL = {
        let dir = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Logs/Shipreel", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("server.log")
    }()

    var isRunning: Bool { process?.isRunning ?? false }

    struct LaunchError: LocalizedError {
        var errorDescription: String?
    }

    /// Returns true if a production build already existed (fast start).
    @discardableResult
    func start(folder: String, port: Int) throws -> Bool {
        let fm = FileManager.default
        guard fm.fileExists(atPath: (folder as NSString).appendingPathComponent("package.json")) else {
            throw LaunchError(errorDescription: "There's no Shipreel at \(folder). Pick the right folder in Settings (⌘,).")
        }
        let built = fm.fileExists(atPath: (folder as NSString).appendingPathComponent(".next/BUILD_ID"))
        let portArgs = port == 4747 ? "" : " -- -p \(port)"
        let command = built ? "exec npm run start\(portArgs)" : "npm run build && exec npm run start\(portArgs)"

        if !fm.fileExists(atPath: logURL.path) { fm.createFile(atPath: logURL.path, contents: nil) }
        let log = try FileHandle(forWritingTo: logURL)
        log.seekToEndOfFile()
        log.write("\n── \(Date()) starting Shipreel: \(command)\n".data(using: .utf8)!)

        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/zsh")
        p.arguments = ["-lc", "export PATH=\"\(Self.extraPath()):$PATH\"; cd \(Self.shellQuote(folder)) && \(command)"]
        p.currentDirectoryURL = URL(fileURLWithPath: folder)
        p.standardOutput = log
        p.standardError = log
        p.standardInput = FileHandle.nullDevice
        try p.run()
        process = p
        return built
    }

    func logTail(lines: Int = 8) -> String {
        guard let s = try? String(contentsOf: logURL, encoding: .utf8) else { return "" }
        return s.split(separator: "\n").suffix(lines).joined(separator: "\n")
    }

    /// node/npm usually live outside a login shell's PATH (nvm sets it up in .zshrc).
    static func extraPath() -> String {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        var dirs: [String] = []
        let nvm = "\(home)/.nvm/versions/node"
        if let versions = try? FileManager.default.contentsOfDirectory(atPath: nvm) {
            let sorted = versions.sorted { $0.compare($1, options: .numeric) == .orderedDescending }
            if let newest = sorted.first { dirs.append("\(nvm)/\(newest)/bin") }
        }
        dirs += ["\(home)/.volta/bin", "\(home)/.local/bin", "/opt/homebrew/bin", "/usr/local/bin"]
        return dirs.joined(separator: ":")
    }

    static func shellQuote(_ s: String) -> String { "'" + s.replacingOccurrences(of: "'", with: "'\\''") + "'" }
}

// MARK: - Notifications

final class Notifier: NSObject, UNUserNotificationCenterDelegate {
    static let shared = Notifier()
    var onOpen: ((String) -> Void)?

    private var center: UNUserNotificationCenter { UNUserNotificationCenter.current() }

    func install() { center.delegate = self }

    func status() async -> UNAuthorizationStatus {
        await center.notificationSettings().authorizationStatus
    }

    func request() async -> Bool {
        (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    func notify(item: ReviewItem, revised: Bool) {
        guard UserDefaults.standard.object(forKey: "notifyNewVideos") as? Bool ?? true else { return }
        let content = UNMutableNotificationContent()
        content.title = revised ? "Revision ready to review" : "New video ready to review"
        content.subtitle = "\(item.projectName) · \(item.formatName)"
        content.body = item.displayHook
        content.sound = .default
        content.userInfo = ["id": item.id]
        content.threadIdentifier = "review"
        center.add(UNNotificationRequest(identifier: item.id + "-" + (item.review.at ?? ""), content: content, trigger: nil))
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        if let id = response.notification.request.content.userInfo["id"] as? String { onOpen?(id) }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        // The app is in front: the sidebar and Dock badge already show it.
        [.list]
    }
}

// MARK: - Review keyboard

/// J/K/↑/↓ move, Space plays/pauses, ←/→ page a carousel, M toggles sound.
/// Only when the main window is key and no text field is being edited.
@MainActor
final class KeyMonitor {
    private var token: Any?

    func install(store: AppStore) {
        guard token == nil else { return }
        token = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak store] event in
            guard let store, Self.shouldHandle(event) else { return event }
            return MainActor.assumeIsolated { Self.handle(event, store: store) ? nil : event }
        }
    }

    private static func shouldHandle(_ event: NSEvent) -> Bool {
        let mods = event.modifierFlags.intersection([.command, .control, .option])
        guard mods.isEmpty, let window = event.window, !(window is NSPanel),
              !(window.identifier?.rawValue.localizedCaseInsensitiveContains("settings") ?? false) else { return false }
        if let tv = window.firstResponder as? NSTextView, tv.isEditable { return false }
        if window.firstResponder is NSTextField { return false }
        if window.attachedSheet != nil { return false }
        return true
    }

    private static func handle(_ event: NSEvent, store: AppStore) -> Bool {
        guard store.route.isReview, store.connection == .online else { return false }
        let ch = event.charactersIgnoringModifiers?.lowercased() ?? ""
        switch event.keyCode {
        case 125: store.move(1); return true // ↓
        case 126: store.move(-1); return true // ↑
        case 123: return store.stepCarousel(-1) // ←
        case 124: return store.stepCarousel(1) // →
        case 49: store.player.toggle(); return true // space
        default: break
        }
        switch ch {
        case "j": store.move(1); return true
        case "k": store.move(-1); return true
        case "m": store.player.toggleMute(); return true
        default: return false
        }
    }
}

extension AppStore {
    func stepCarousel(_ d: Int) -> Bool {
        guard let s = selected, s.isCarousel else { return false }
        carouselIndex = min(max(carouselIndex + d, 0), s.slides.count - 1)
        return true
    }
}
