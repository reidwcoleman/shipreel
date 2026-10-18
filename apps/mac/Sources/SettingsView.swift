import AppKit
import SwiftUI
import UserNotifications

struct SettingsView: View {
    @AppStorage("settingsTab") private var tab = "general"

    var body: some View {
        TabView(selection: $tab) {
            GeneralSettingsView()
                .tabItem { Label("General", systemImage: "gearshape") }
                .tag("general")
            PairPhoneView()
                .tabItem { Label("iPhone", systemImage: "iphone") }
                .tag("iphone")
        }
    }
}

struct GeneralSettingsView: View {
    @Environment(AppStore.self) private var store
    @AppStorage("serverURL") private var serverURL = AppStore.defaultServer
    @AppStorage("shipreelFolder") private var folder = AppStore.defaultFolder
    @AppStorage("appearance") private var appearance = "dark"
    @AppStorage("dryRunDefault") private var dryRunDefault = false
    @AppStorage("notifyNewVideos") private var notify = true
    @State private var testResult: String?
    @State private var testing = false

    var body: some View {
        Form {
            Section {
                TextField("Server", text: $serverURL, prompt: Text(AppStore.defaultServer))
                    .onSubmit(apply)
                HStack {
                    Button(testing ? "Testing…" : "Test Connection") { test() }
                        .disabled(testing)
                    if serverURL != AppStore.defaultServer {
                        Button("Use Default") {
                            serverURL = AppStore.defaultServer
                            apply()
                        }
                    }
                    if let r = testResult {
                        Text(r).font(.callout).foregroundStyle(.secondary)
                    }
                }
            } header: {
                Text("Shipreel server")
            } footer: {
                Text("Where the Shipreel app is running. Usually \(AppStore.defaultServer).")
                    .foregroundStyle(.secondary)
            }

            Section {
                HStack {
                    TextField("Folder", text: $folder)
                    Button("Choose…", action: choose)
                }
            } header: {
                Text("Shipreel folder")
            } footer: {
                Text("Used by Start Shipreel and Open in Terminal. The server log is at ~/Library/Logs/Shipreel/server.log.")
                    .foregroundStyle(.secondary)
            }

            Section("Review") {
                Toggle("Dry run by default", isOn: $dryRunDefault)
                Toggle("Notify me when a new video is ready", isOn: $notify)
                if store.notificationStatus == .denied {
                    HStack {
                        Text("Notifications are off for Shipreel in System Settings.")
                            .foregroundStyle(.secondary)
                        Button("Open System Settings") {
                            NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.Notifications-Settings.extension")!)
                        }
                    }
                } else if store.notificationStatus == .notDetermined {
                    Button("Allow Notifications…") {
                        Task {
                            _ = await Notifier.shared.request()
                            store.notificationStatus = await Notifier.shared.status()
                        }
                    }
                }
            }

            Section("Appearance") {
                Picker("Appearance", selection: $appearance) {
                    Text("Dark").tag("dark")
                    Text("Light").tag("light")
                    Text("Match System").tag("system")
                }
                .pickerStyle(.segmented)
            }
        }
        .formStyle(.grouped)
        .frame(width: 520)
        .fixedSize(horizontal: false, vertical: true)
        .onDisappear(perform: apply)
    }

    private func apply() { store.serverURLChanged() }

    private func test() {
        apply()
        testing = true
        testResult = nil
        Task {
            await store.refresh()
            testing = false
            switch store.connection {
            case .online: testResult = "Connected · \(store.pendingCount) to review"
            case .outdated: testResult = "Running, but no Review API yet"
            case .offline(let why): testResult = why
            case .connecting: testResult = nil
            }
        }
    }

    private func choose() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.directoryURL = URL(fileURLWithPath: (folder as NSString).expandingTildeInPath)
        panel.prompt = "Use Folder"
        if panel.runModal() == .OK, let url = panel.url { folder = url.path }
    }
}
