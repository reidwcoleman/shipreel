import AppKit
import SwiftUI

struct RootView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        Group {
            switch store.connection {
            case .online:
                MainSplit()
            case .connecting:
                LoadingView()
            case .offline(let why):
                OfflineView(kind: .offline(why))
            case .outdated(let why):
                OfflineView(kind: .outdated(why))
            }
        }
        .frame(minWidth: 1040, minHeight: 680)
        .background { Brand.ground.ignoresSafeArea() }
        .toolbarBackgroundVisibility(.hidden, for: .windowToolbar)
    }
}

struct MainSplit: View {
    @Environment(AppStore.self) private var store
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        NavigationSplitView {
            Sidebar()
                .navigationSplitViewColumnWidth(min: 260, ideal: 300, max: 380)
        } detail: {
            Group {
                switch store.route {
                case .item, .caughtUp: ReviewScreen()
                case .create: CreateView()
                case .posts: PostsView()
                case .accounts: AccountsView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background { Brand.ground.ignoresSafeArea() }
            .toolbarBackgroundVisibility(.hidden, for: .windowToolbar)
            .overlay(alignment: .top) { if !store.route.isReview { ToastView() } }
            #if DEBUG
            .onReceive(NotificationCenter.default.publisher(for: .init("shipreel.openPair"))) { _ in openWindow(id: "pair") }
            #endif
        }
    }
}

// MARK: - Sidebar

struct Sidebar: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        List {
            Section {
                NavRow(route: .create, title: "Create", symbol: "plus.rectangle.on.rectangle")
                NavRow(route: .posts, title: "Posts", symbol: "paperplane", badge: store.attentionCount)
                NavRow(route: .accounts, title: "Accounts", symbol: "person.crop.circle",
                       warning: store.accountsNeedAttention)
            }

            Section {
                if store.queue.isEmpty {
                    CaughtUpRow()
                } else {
                    ForEach(store.queue) { item in
                        ReviewRow(item: item)
                    }
                }
            } header: {
                HStack {
                    Text("To review")
                    Spacer()
                    if store.pendingCount > 0 {
                        Text("\(store.pendingCount)").monospacedDigit()
                    }
                }
            }
        }
        .listStyle(.sidebar)
    }
}

/// Custom selection: the system sidebar highlight would paint white text on lime.
private struct RowBackground: View {
    var selected: Bool
    var hover: Bool
    var body: some View {
        RoundedRectangle(cornerRadius: 8, style: .continuous)
            .fill(Color.primary.opacity(selected ? 0.11 : hover ? 0.05 : 0))
    }
}

struct NavRow: View {
    @Environment(AppStore.self) private var store
    let route: Route
    let title: String
    let symbol: String
    var badge: Int = 0
    var warning = false
    @State private var hover = false

    var body: some View {
        let selected = store.route == route
        Button { store.select(route) } label: {
            HStack(spacing: Space.s) {
                Image(systemName: symbol)
                    .frame(width: 20)
                    .foregroundStyle(selected ? Brand.accent : .secondary)
                Text(title)
                    .foregroundStyle(.primary)
                Spacer()
                if badge > 0 {
                    Text("\(badge)")
                        .font(.caption.weight(.semibold).monospacedDigit())
                        .foregroundStyle(Brand.danger)
                        .accessibilityLabel("\(badge) need attention")
                } else if warning {
                    Image(systemName: "exclamationmark.circle.fill")
                        .foregroundStyle(Brand.warning)
                        .accessibilityLabel("Needs attention")
                }
            }
            .padding(.horizontal, Space.s)
            .padding(.vertical, 5)
            .background(RowBackground(selected: selected, hover: hover))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hover = $0 }
        .listRowInsets(EdgeInsets(top: 1, leading: 0, bottom: 1, trailing: 0))
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

struct ReviewRow: View {
    @Environment(AppStore.self) private var store
    let item: ReviewItem
    @State private var hover = false

    var body: some View {
        let selected = store.route == .item(item.id)
        let revising = item.review.status == .revising
        Button { store.select(.item(item.id)) } label: {
            HStack(spacing: Space.m) {
                Thumb(url: item.thumb, carousel: item.kind == "slideshow")
                    .frame(width: 40, height: 71)
                    .opacity(revising ? 0.5 : 1)
                VStack(alignment: .leading, spacing: Space.xs) {
                    Text(item.displayHook)
                        .font(.body.weight(.medium))
                        .foregroundStyle(revising ? .secondary : .primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    if revising {
                        HStack(spacing: 6) {
                            ProgressView().controlSize(.mini)
                            Text("Claude is revising…")
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    } else {
                        Text("\(item.formatName) · \(item.projectName)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                        HStack(spacing: Space.s) {
                            TimelineView(.periodic(from: .now, by: 60)) { ctx in
                                Text(Fmt.age(item.created, now: ctx.date))
                            }
                            if let score = item.hookScore {
                                Text("Hook \(Int(score))").monospacedDigit()
                            }
                        }
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(Space.s)
            .background(RowBackground(selected: selected, hover: hover))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hover = $0 }
        .listRowInsets(EdgeInsets(top: 1, leading: 0, bottom: 1, trailing: 0))
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(selected ? .isSelected : [])
        .contextMenu {
            if let url = item.mp4 { Button("Open Video") { NSWorkspace.shared.open(url) } }
            Button("Copy TikTok Caption") {
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString(item.captions.tiktok, forType: .string)
            }
        }
    }
}

struct CaughtUpRow: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        Button { store.select(.caughtUp) } label: {
            HStack(spacing: Space.s) {
                Image(systemName: "checkmark.circle").frame(width: 20).foregroundStyle(.secondary)
                Text("All caught up").foregroundStyle(.secondary)
                Spacer()
            }
            .padding(.horizontal, Space.s)
            .padding(.vertical, 5)
            .background(RowBackground(selected: store.route == .caughtUp, hover: false))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .listRowInsets(EdgeInsets(top: 1, leading: 0, bottom: 1, trailing: 0))
    }
}

struct Thumb: View {
    let url: URL?
    var carousel = false

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            Rectangle().fill(Brand.raised)
            if let url {
                AsyncImage(url: url) { img in
                    img.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.clear
                }
            } else {
                Image(systemName: "film").foregroundStyle(.tertiary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            if carousel {
                Image(systemName: "square.on.square")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(3)
                    .background(.black.opacity(0.55), in: RoundedRectangle(cornerRadius: 4))
                    .padding(3)
                    .accessibilityLabel("Carousel")
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: Radius.s, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.s, style: .continuous).strokeBorder(Brand.line, lineWidth: 0.5))
    }
}

// MARK: - Toast

struct ToastView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        if let t = store.toast {
            HStack(spacing: Space.m) {
                Image(systemName: t.style == .error ? "exclamationmark.triangle.fill" : t.style == .success ? "checkmark.circle.fill" : "info.circle.fill")
                    .foregroundStyle(t.style == .error ? Brand.danger : t.style == .success ? Brand.success : Color.secondary)
                Text(t.text)
                    .lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)
                if let title = t.actionTitle, let action = t.action {
                    Button(title) {
                        action()
                        store.toast = nil
                    }
                    .buttonStyle(.borderless)
                    .foregroundStyle(Brand.accent)
                    .fontWeight(.semibold)
                }
                Button {
                    store.toast = nil
                } label: {
                    Image(systemName: "xmark").font(.caption.weight(.bold)).foregroundStyle(.secondary)
                }
                .buttonStyle(.borderless)
                .help("Dismiss")
                .accessibilityLabel("Dismiss")
            }
            .padding(.horizontal, Space.l)
            .padding(.vertical, Space.m)
            .frame(maxWidth: 560)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: Radius.m + 2, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.m + 2, style: .continuous).strokeBorder(Brand.line, lineWidth: 1))
            .shadow(color: .black.opacity(0.18), radius: 16, y: 8)
            .padding(.top, Space.m)
            .transition(.move(edge: .top).combined(with: .opacity))
            .id(t.id)
        }
    }
}

// MARK: - Loading / offline

struct LoadingView: View {
    @State private var show = false
    var body: some View {
        VStack(spacing: Space.m) {
            ProgressView().controlSize(.small)
            Text("Connecting to Shipreel…").foregroundStyle(.secondary)
        }
        .opacity(show ? 1 : 0)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task {
            try? await Task.sleep(for: .milliseconds(350))
            withAnimation(.easeOut(duration: 0.2)) { show = true }
        }
    }
}

struct BrandMark: View {
    var size: CGFloat = 64
    var body: some View {
        Image(nsImage: NSApp.applicationIconImage)
            .resizable()
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

struct OfflineView: View {
    enum Kind { case offline(String), outdated(String) }
    @Environment(AppStore.self) private var store
    @Environment(\.openSettings) private var openSettings
    let kind: Kind

    var body: some View {
        VStack(spacing: 0) {
            BrandMark(size: 72)
                .padding(.bottom, Space.xxl)
            Text(title)
                .font(.display(44))
                .padding(.bottom, Space.m)
            Text(message)
                .font(.title3)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 460)
                .padding(.bottom, Space.x3)

            if store.launching {
                HStack(spacing: Space.s) {
                    ProgressView().controlSize(.small)
                    Text(store.launchStatus).monospacedDigit().foregroundStyle(.secondary)
                }
                .frame(height: 32)
            } else {
                HStack(spacing: Space.s) {
                    if case .offline = kind {
                        Button("Start Shipreel") { store.startServer() }
                            .buttonStyle(.primary)
                            .keyboardShortcut(.defaultAction)
                    }
                    Button("Try Again") { Task { await store.refresh() } }
                        .buttonStyle(.secondary)
                    if case .outdated = kind {
                        Button("Open in Terminal") { store.openInTerminal() }
                            .buttonStyle(.secondary)
                    }
                }
            }

            if let err = store.launchError {
                VStack(alignment: .leading, spacing: Space.s) {
                    Label("Shipreel didn't start", systemImage: "exclamationmark.triangle.fill")
                        .font(.headline)
                        .foregroundStyle(Brand.danger)
                    Text(err)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(.secondary)
                        .textSelection(.enabled)
                        .lineLimit(10)
                    HStack {
                        Button("Show Log") { NSWorkspace.shared.open(store.logURL) }
                        Button("Change Folder…") { openSettings() }
                    }
                    .buttonStyle(.link)
                }
                .padding(Space.l)
                .frame(maxWidth: 520, alignment: .leading)
                .background(Brand.panel, in: RoundedRectangle(cornerRadius: Radius.m, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: Radius.m, style: .continuous).strokeBorder(Brand.line))
                .padding(.top, Space.xxl)
            }

            Text(footnote)
                .font(.callout)
                .foregroundStyle(.tertiary)
                .padding(.top, Space.x3)
                .textSelection(.enabled)
        }
        .padding(Space.x5)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var title: String {
        switch kind {
        case .offline: "Shipreel isn't running"
        case .outdated: "Shipreel needs an update"
        }
    }

    private var message: String {
        switch kind {
        case .offline:
            "This app reviews and posts the videos Shipreel makes on this Mac. Start the Shipreel server and your queue shows up here."
        case .outdated:
            "The Shipreel server at \(store.serverHost) is running, but it doesn't have the Review API yet. Pull the latest Shipreel and restart it."
        }
    }

    private var footnote: String {
        switch kind {
        case .offline: "Looking for it at \(store.serverHost). Or run  npm run start  in \(AppStore.folder.replacingOccurrences(of: NSHomeDirectory(), with: "~"))."
        case .outdated: "Checked \(store.serverHost)/api/review and got “not found”."
        }
    }
}
