#if DEBUG
import AppKit
import SwiftUI

/// Debug builds only: lets Tools/shot.sh drive the UI and capture the app's own windows
/// (an app may image its own windows without Screen Recording permission).
///   Tools/shot.sh route posts
///   Tools/shot.sh snap /tmp/review.png
@MainActor
enum DebugBridge {
    static let name = Notification.Name("com.reidcoleman.shipreel.debug")
    private static var token: NSObjectProtocol?

    static func install(store: AppStore) {
        guard token == nil else { return }
        token = DistributedNotificationCenter.default().addObserver(forName: name, object: nil, queue: .main) { note in
            guard let cmd = note.object as? String else { return }
            MainActor.assumeIsolated { run(cmd, store: store) }
        }
    }

    private static func run(_ cmd: String, store: AppStore) {
        let parts = cmd.split(separator: " ", maxSplits: 1).map(String.init)
        let arg = parts.count > 1 ? parts[1] : ""
        switch parts.first ?? "" {
        case "route":
            switch arg {
            case "create": store.select(.create)
            case "posts": store.select(.posts)
            case "accounts": store.select(.accounts)
            case "caughtup": store.select(.caughtUp)
            default: store.goToReview()
            }
        case "next": store.move(1)
        case "prev": store.move(-1)
        case "select": store.select(.item(arg))
        case "play": store.player.play()
        case "pause": store.player.pause()
        case "mute": store.player.toggleMute()
        case "seek": store.player.seek(to: Double(arg) ?? 0)
        case "carousel": _ = store.stepCarousel(Int(arg) ?? 1)
        case "inspector": store.showInspector = arg != "off"
        case "revise": store.showRevise = arg != "off"
        case "revisenote": store.revise(arg)
        case "start": store.startServer()
        case "dryrun":
            if let s = store.selected { store.drafts[s.id] = { var d = store.draft(for: s); d.dryRun = arg != "off"; return d }() }
        case "when":
            if let s = store.selected { store.drafts[s.id] = { var d = store.draft(for: s); d.when = WhenChoice(rawValue: arg) ?? .now; return d }() }
        case "create": store.startCreate(prompt: arg, projectId: "famsync", count: 2, formats: [])
        case "stop": store.stopCreate()
        case "primer": store.primerDismissed = arg == "off"
        case "appearance":
            UserDefaults.standard.set(arg, forKey: "appearance")
            NSApp.appearance = arg == "light" ? NSAppearance(named: .aqua) : NSAppearance(named: .darkAqua)
        case "pair":
            NotificationCenter.default.post(name: .init("shipreel.openPair"), object: nil)
        case "settings":
            if let appMenu = NSApp.mainMenu?.items.first?.submenu,
               let i = appMenu.items.firstIndex(where: { $0.keyEquivalent == "," }) {
                appMenu.performActionForItem(at: i)
            }
        case "size":
            let wh = arg.split(separator: "x").compactMap { Double($0) }
            if wh.count == 2, let w = mainWindow() {
                var f = w.frame
                f.origin.y += f.height - wh[1]
                f.size = CGSize(width: wh[0], height: wh[1])
                w.setFrame(f, display: true)
            }
        case "dump":
            let wins = NSApp.windows.map { "\(type(of: $0)) visible=\($0.isVisible) key=\($0.isKeyWindow) \(Int($0.frame.width))x\(Int($0.frame.height))" }
            let text = "route=\(store.route) showRevise=\(store.showRevise) active=\(NSApp.isActive) conn=\(store.connection)\n" + wins.joined(separator: "\n")
            try? text.write(toFile: arg, atomically: true, encoding: .utf8)
        case "snap":
            if let w = mainWindow() { snap(w, to: arg) }
        case "snapall":
            // One PNG per visible window: <arg>-<n>.png
            for (n, w) in NSApp.windows.filter({ $0.isVisible && $0.frame.width > 100 && !($0.className.contains("StatusBar")) }).enumerated() {
                snap(w, to: "\(arg)-\(n).png")
            }
        default:
            NSLog("DebugBridge: unknown command \(cmd)")
        }
    }

    private static func mainWindow() -> NSWindow? {
        NSApp.windows.first { $0.isVisible && !($0 is NSPanel) && $0.frame.width > 600 }
    }

    private typealias CreateImage = @convention(c) (CGRect, UInt32, UInt32, UInt32) -> Unmanaged<CGImage>?

    static func snap(_ window: NSWindow, to path: String) {
        let url = URL(fileURLWithPath: path)
        guard window.windowNumber > 0 else { return }
        // CGWindowListCreateImage is hidden from the macOS 15 SDK; look it up at runtime.
        if let h = dlopen(nil, RTLD_NOW), let sym = dlsym(h, "CGWindowListCreateImage") {
            let fn = unsafeBitCast(sym, to: CreateImage.self)
            // optionIncludingWindow = 1 << 3; boundsIgnoreFraming = 1 << 0, bestResolution = 1 << 3
            if let img = fn(.null, 1 << 3, UInt32(window.windowNumber), (1 << 0) | (1 << 3))?.takeRetainedValue(),
               img.width > 1 {
                write(NSBitmapImageRep(cgImage: img), to: url)
                return
            }
        }
        // Fallback: draw the view hierarchy (misses video layers and vibrancy).
        guard let view = window.contentView?.superview ?? window.contentView,
              let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds) else { return }
        view.cacheDisplay(in: view.bounds, to: rep)
        write(rep, to: url)
    }

    private static func write(_ rep: NSBitmapImageRep, to url: URL) {
        try? rep.representation(using: .png, properties: [:])?.write(to: url)
        NSLog("DebugBridge: wrote \(url.path)")
    }
}
#endif
