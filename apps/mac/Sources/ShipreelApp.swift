import AppKit
import SwiftUI
import UserNotifications

@main
struct ShipreelApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var store = AppStore()
    @AppStorage("appearance") private var appearance = "dark"
    private let keys = KeyMonitor()

    init() {
        Fonts.register()
        Notifier.shared.install()
    }

    var body: some Scene {
        Window("Shipreel", id: "main") {
            RootView()
                .environment(store)
                .tint(Brand.accent)
                .onAppear {
                    applyAppearance()
                    keys.install(store: store)
                    store.start()
                    #if DEBUG
                    DebugBridge.install(store: store)
                    #endif
                }
                .onChange(of: appearance) { applyAppearance() }
        }
        .defaultSize(width: 1360, height: 860)
        .windowToolbarStyle(.unified)
        .commands { ShipreelCommands(store: store) }

        Window("Pair iPhone", id: "pair") {
            PairPhoneView()
                .tint(Brand.accent)
        }
        .windowResizability(.contentSize)
        .defaultPosition(.center)

        Settings {
            SettingsView()
                .environment(store)
                .tint(Brand.accent)
        }

        MenuBarExtra {
            MenuBarContent()
                .environment(store)
        } label: {
            MenuBarLabel(count: store.pendingCount)
        }
    }

    private func applyAppearance() {
        switch appearance {
        case "light": NSApp.appearance = NSAppearance(named: .aqua)
        case "system": NSApp.appearance = nil
        default: NSApp.appearance = NSAppearance(named: .darkAqua)
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
}

struct MenuBarLabel: View {
    let count: Int
    var body: some View {
        HStack(spacing: 2) {
            Image("MenuBarIcon")
            if count > 0 { Text("\(count)").monospacedDigit() }
        }
        .accessibilityLabel(count > 0 ? "Shipreel, \(count) to review" : "Shipreel")
    }
}

struct MenuBarContent: View {
    @Environment(AppStore.self) private var store
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        let n = store.pendingCount
        Text(n == 0 ? "Nothing to review" : "\(n) video\(n == 1 ? "" : "s") to review")
        if store.connection != .online {
            Text("Shipreel isn't running")
        }
        Divider()
        Button("Open Review") { show { store.goToReview() } }
            .keyboardShortcut("1")
        Button("Make Videos…") { show { store.select(.create) } }
            .keyboardShortcut("n")
        Button("Posts") { show { store.select(.posts) } }
        Divider()
        Button("Quit Shipreel") { NSApp.terminate(nil) }
            .keyboardShortcut("q")
    }

    private func show(_ then: () -> Void) {
        then()
        openWindow(id: "main")
        NSApp.activate()
    }
}

struct ShipreelCommands: Commands {
    let store: AppStore
    @Environment(\.openWindow) private var openWindow

    var body: some Commands {
        CommandGroup(replacing: .newItem) {
            Button("Make Videos…") { store.select(.create) }
                .keyboardShortcut("n")
            Button("Open in Terminal") { store.openInTerminal() }
                .keyboardShortcut("t", modifiers: [.command, .shift])
            Divider()
            Button("Pair iPhone…") { openWindow(id: "pair") }
        }
        CommandMenu("Review") {
            Button(store.selected.map { ApproveRules.title(store.draft(for: $0)) } ?? "Approve & Post") { store.approveSelected() }
                .keyboardShortcut(.return, modifiers: .command)
                .disabled(!store.route.isReview || !store.canAct || store.showRevise || store.approveBlocked != nil)
            Button("Request Changes…") { store.showRevise = true }
                .keyboardShortcut("r")
                .disabled(!store.route.isReview || !store.canAct)
            Button("Reject") { store.rejectSelected() }
                .keyboardShortcut(.delete, modifiers: .command)
                .disabled(!store.route.isReview || !store.canAct || store.showRevise)
            Divider()
            Button("Next Video  (J or ↓)") { store.move(1) }
                .disabled(store.queue.isEmpty)
            Button("Previous Video  (K or ↑)") { store.move(-1) }
                .disabled(store.queue.isEmpty)
            Button(store.player.isPlaying ? "Pause  (Space)" : "Play  (Space)") { store.player.toggle() }
                .disabled(store.selected == nil)
            Button(store.player.isMuted ? "Sound On  (M)" : "Sound Off  (M)") { store.player.toggleMute() }
        }
        CommandGroup(before: .sidebar) {
            Button("Review") { store.goToReview() }.keyboardShortcut("1")
            Button("Create") { store.select(.create) }.keyboardShortcut("2")
            Button("Posts") { store.select(.posts) }.keyboardShortcut("3")
            Button("Accounts") { store.select(.accounts) }.keyboardShortcut("4")
            Divider()
            Button(store.showInspector ? "Hide Post Settings" : "Show Post Settings") { store.showInspector.toggle() }
                .keyboardShortcut("i", modifiers: [.command, .option])
            Button("Reload") {
                Task {
                    await store.refresh()
                    await store.loadPostbox()
                }
            }
            .keyboardShortcut("r", modifiers: [.command, .shift])
            Divider()
        }
    }
}
