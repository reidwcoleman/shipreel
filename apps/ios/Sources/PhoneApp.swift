import SwiftUI
import UIKit

@main
struct PhoneApp: App {
    @State private var store = PhoneStore()
    @Environment(\.scenePhase) private var phase

    init() {
        Fonts.register()
        if let serif = UIFont(name: "InstrumentSerif-Regular", size: 40) {
            UINavigationBar.appearance().largeTitleTextAttributes = [.font: serif]
        }
        let tab = UITabBarAppearance()
        tab.configureWithDefaultBackground()
        tab.backgroundColor = UIColor(red: 0.04, green: 0.04, blue: 0.035, alpha: 0.92)
        UITabBar.appearance().standardAppearance = tab
        UITabBar.appearance().scrollEdgeAppearance = tab
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .tint(Brand.lime)
                .preferredColorScheme(.dark)
                .onOpenURL { store.handle(url: $0) }
                .onChange(of: phase) { _, p in
                    if p == .active { store.resume() }
                    if p == .background { store.player.pause() }
                }
                .task {
                    #if DEBUG
                    DebugArgs.apply(store)
                    #else
                    store.connect()
                    #endif
                }
        }
    }
}

struct RootView: View {
    @Environment(PhoneStore.self) private var store

    var body: some View {
        Group {
            switch store.link {
            case .unpaired: PairingView()
            case .connecting where !store.hasLoaded: ConnectingView()
            case .unreachable(let why) where !store.hasLoaded: UnreachableView(detail: why)
            case .unauthorized(let why): UnreachableView(detail: why, unauthorized: true)
            case .unreachable(let why): MainTabs().overlay(alignment: .top) { OfflineBanner(text: why) }
            default: MainTabs()
            }
        }
        .overlay(alignment: .top) { ToastView() }
    }
}

struct MainTabs: View {
    @Environment(PhoneStore.self) private var store

    var body: some View {
        @Bindable var store = store
        TabView(selection: $store.tab) {
            ReviewFeed()
                .tabItem { Label("Review", systemImage: "play.rectangle.on.rectangle") }
                .badge(store.pendingCount)
                .tag(PhoneStore.Tab.review)
            PostsTab()
                .tabItem { Label("Posts", systemImage: "paperplane") }
                .badge(store.attentionCount)
                .tag(PhoneStore.Tab.posts)
            CreateTab()
                .tabItem { Label("Create", systemImage: "plus.rectangle.on.rectangle") }
                .tag(PhoneStore.Tab.create)
            AccountsTab()
                .tabItem { Label("Accounts", systemImage: "person.crop.circle") }
                .tag(PhoneStore.Tab.accounts)
        }
    }
}

struct OfflineBanner: View {
    @Environment(PhoneStore.self) private var store
    let text: String
    var body: some View {
        HStack(spacing: Space.s) {
            Image(systemName: "wifi.exclamationmark")
            Text("Can't reach your Mac").fontWeight(.semibold)
            Spacer()
            Button("Retry") { store.connect() }.fontWeight(.semibold)
        }
        .font(.subheadline)
        .padding(.horizontal, Space.l)
        .frame(height: 44)
        .background(.regularMaterial, in: Capsule())
        .padding(.horizontal, Space.l)
        .padding(.top, Space.s)
    }
}

struct ToastView: View {
    @Environment(PhoneStore.self) private var store
    var body: some View {
        if let t = store.toast {
            HStack(spacing: Space.m) {
                Image(systemName: t.style == .error ? "exclamationmark.triangle.fill" : t.style == .success ? "checkmark.circle.fill" : "info.circle.fill")
                    .foregroundStyle(t.style == .error ? Brand.danger : t.style == .success ? Brand.success : .secondary)
                Text(t.text).font(.subheadline).lineLimit(3)
                Spacer(minLength: 0)
                if let title = t.actionTitle, let action = t.action {
                    Button(title) {
                        action()
                        store.toast = nil
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Brand.lime)
                }
            }
            .padding(.horizontal, Space.l)
            .padding(.vertical, Space.m)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .padding(.horizontal, Space.m)
            .padding(.top, Space.xs)
            .transition(.move(edge: .top).combined(with: .opacity))
            .onTapGesture { store.toast = nil }
        }
    }
}

#if DEBUG
/// Simulator testing without taps: launch with -pairLink <shipreel://…> -tab posts -item 2 -sheet approve
enum DebugArgs {
    static var d: UserDefaults { .standard }

    @MainActor
    static func apply(_ store: PhoneStore) {
        if let l = d.string(forKey: "pairLink"), let p = Pairing.parse(l) { store.pair(with: p) } else { store.connect() }
        switch d.string(forKey: "tab") {
        case "posts": store.tab = .posts
        case "create": store.tab = .create
        case "accounts": store.tab = .accounts
        default: break
        }
        Task { @MainActor in
            for _ in 0..<40 where !store.hasLoaded { try? await Task.sleep(for: .milliseconds(250)) }
            let i = d.integer(forKey: "item")
            if i > 0, i <= store.queue.count { store.currentId = store.queue[i - 1].id }
            if let prompt = d.string(forKey: "createPrompt") {
                store.startCreate(prompt: prompt, projectId: "famsync", count: 2, formats: [])
            }
        }
    }

    static var sheet: String? { d.string(forKey: "sheet") }
}
#endif
