import AppKit
import SwiftUI

struct ReviewScreen: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        @Bindable var store = store
        Group {
            if let item = store.selected {
                ReviewDetail(item: item)
            } else {
                CaughtUpView()
            }
        }
        .overlay(alignment: .top) { ToastView().padding(.horizontal, Space.l) }
        .navigationTitle("Review")
        .navigationSubtitle(store.pendingCount == 0 ? "All caught up" : "\(store.pendingCount) waiting")
        // Toggled only by the toolbar button / ⌥⌘I; the system flips the binding off when the view goes away.
        .inspector(isPresented: Binding(get: { store.showInspector && store.selected != nil },
                                        set: { _ in })) {
            if let item = store.selected {
                InspectorView(item: item)
                    .inspectorColumnWidth(min: 300, ideal: 350, max: 460)
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    store.showInspector.toggle()
                } label: {
                    Label("Post Settings", systemImage: "sidebar.right")
                }
                .help("Show or hide post settings (⌥⌘I)")
                .disabled(store.selected == nil)
            }
        }
    }
}

// MARK: - Detail

struct ReviewDetail: View {
    @Environment(AppStore.self) private var store
    let item: ReviewItem

    var body: some View {
        VStack(spacing: 0) {
            if store.showNotificationPrimer {
                NotificationPrimer()
            }
            GeometryReader { geo in
                let chrome: CGFloat = item.review.status == .revising ? 0 : (item.isCarousel ? 18 : 36) + 92
                let maxH = max(240, geo.size.height - Space.x3 * 2 - chrome)
                let width = min(maxH * item.aspectRatio, geo.size.width - Space.x3 * 2)
                VStack(spacing: Space.l) {
                    Spacer(minLength: 0)
                    stage(width: width)
                    if item.review.status == .pending {
                        ActionBar(item: item)
                            .padding(.top, Space.xs)
                    }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity)
                .padding(Space.x3)
            }
        }
        .onAppear { load() }
        .onChange(of: item.id) { load() }
        .onChange(of: item.mp4Url) { load() }
        .onChange(of: item.review.status) { load() }
        .onDisappear { store.player.pause() }
    }

    private func load() {
        if item.review.status == .revising || item.isCarousel {
            store.player.load(nil)
        } else {
            store.player.load(item.mp4)
        }
    }

    @ViewBuilder
    private func stage(width: CGFloat) -> some View {
        @Bindable var store = store
        if item.review.status == .revising {
            RevisingStage(item: item)
                .frame(width: width)
        } else if item.renderStatus == "rendering" || item.renderStatus == "draft" || (item.mp4 == nil && !item.isCarousel) {
            RenderingStage(item: item)
                .frame(width: width)
        } else if item.isCarousel {
            CarouselStage(slides: item.slides, aspect: item.aspectRatio, index: $store.carouselIndex)
                .frame(width: width)
        } else {
            VStack(spacing: Space.m) {
                VideoFrame(model: store.player, poster: item.thumb, aspect: item.aspectRatio)
                Transport(model: store.player)
            }
            .frame(width: width)
        }
    }
}

struct ActionBar: View {
    @Environment(AppStore.self) private var store
    let item: ReviewItem

    var body: some View {
        @Bindable var store = store
        let busy = store.busy.contains(item.id)
        VStack(spacing: Space.s) {
            HStack(spacing: Space.s) {
                Button("Reject") { store.rejectSelected() }
                    .buttonStyle(.secondary)
                    .help("Reject (⌘⌫). You can undo it.")
                Button("Request Changes…") { store.showRevise = true }
                    .buttonStyle(.secondary)
                    .help("Tell Claude what to change (⌘R)")
                    .popover(isPresented: $store.showRevise, arrowEdge: .bottom) {
                        RevisePopover()
                    }
                Button { store.approveSelected() } label: {
                    HStack(spacing: Space.s) {
                        if busy {
                            ProgressView().controlSize(.small).tint(Brand.limeInk)
                        }
                        Text(ApproveRules.title(store.draft(for: item)))
                        Text("⌘↩").font(.callout).opacity(0.55)
                    }
                    .frame(minWidth: 168)
                }
                .buttonStyle(.primary)
                .disabled(blocked != nil)
                .help(blocked ?? "Approve and hand it to Postbox (⌘↩)")
            }
            .disabled(busy)
            if let blocked {
                HStack(spacing: Space.s) {
                    Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(Brand.warning)
                    Text(blocked).foregroundStyle(.secondary)
                    Button("Open Accounts") { store.select(.accounts) }
                        .buttonStyle(.link)
                        .foregroundStyle(Brand.accent)
                }
                .font(.callout)
                .lineLimit(2)
            } else {
                Text(summary)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
    }

    private var blocked: String? {
        ApproveRules.blocked(store.draft(for: item), postbox: store.postbox, postboxError: store.postboxError)
    }

    private var summary: String {
        let d = store.draft(for: item)
        let names = Platform.allCases.filter { d.platforms.contains($0) }.map(\.name)
        if names.isEmpty { return "Pick a platform in Post settings." }
        let list = Fmt.list(names)
        let when: String
        switch d.when {
        case .now: when = "now"
        case .nextSlot: when = "at the next free slot"
        case .pick: when = Fmt.when(d.date)
        }
        if d.dryRun { return "Dry run on \(list): fills everything in Chrome, doesn't press Post." }
        return d.when == .pick ? "Posts to \(list) · \(when)" : "Posts to \(list) \(when)"
    }
}

struct RevisePopover: View {
    @Environment(AppStore.self) private var store
    @State private var note = ""
    @FocusState private var focused: Bool
    private let quick = ["Stronger hook", "Make it shorter", "Bigger captions", "Different music", "Show the app sooner"]

    var body: some View {
        VStack(alignment: .leading, spacing: Space.m) {
            Text("What should Claude change?")
                .font(.headline)
            TextField("e.g. Cut the first second and make the hook bigger", text: $note, axis: .vertical)
                .lineLimit(3...6)
                .textFieldStyle(.roundedBorder)
                .focused($focused)
            FlowChips(items: quick) { q in
                note = note.isEmpty ? q : note.trimmingCharacters(in: .whitespaces) + ". " + q
            }
            HStack {
                Text("Comes back to Review when it's re-rendered.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Button("Cancel") { store.showRevise = false }
                    .keyboardShortcut(.cancelAction)
                Button("Send to Claude") { store.revise(note) }
                    .buttonStyle(.primary)
                    .keyboardShortcut(.return, modifiers: .command)
                    .disabled(note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .padding(Space.l)
        .frame(width: 400)
        .onAppear { focused = true }
    }
}

/// Wrapping row of small chips.
struct FlowChips: View {
    let items: [String]
    var selected: Set<String> = []
    let tap: (String) -> Void

    var body: some View {
        FlowLayout(spacing: 6) {
            ForEach(items, id: \.self) { q in
                let on = selected.contains(q)
                Button { tap(q) } label: {
                    Text(q)
                        .font(.callout)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .foregroundStyle(on ? Brand.accent : .primary)
                        .background(Capsule().fill(on ? Brand.accentSoft : Color.primary.opacity(0.07)))
                        .overlay(Capsule().strokeBorder(on ? Brand.accent.opacity(0.6) : .clear))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxW = proposal.width ?? 600
        var x: CGFloat = 0, y: CGFloat = 0, rowH: CGFloat = 0, widest: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x > 0, x + s.width > maxW { x = 0; y += rowH + spacing; rowH = 0 }
            x += s.width + spacing
            widest = max(widest, x - spacing)
            rowH = max(rowH, s.height)
        }
        return CGSize(width: min(widest, maxW), height: y + rowH)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowH: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x > bounds.minX, x + s.width > bounds.maxX { x = bounds.minX; y += rowH + spacing; rowH = 0 }
            v.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(s))
            x += s.width + spacing
            rowH = max(rowH, s.height)
        }
    }
}

struct RevisingStage: View {
    let item: ReviewItem
    var body: some View {
        ZStack {
            Color.black
            if let t = item.thumb {
                AsyncImage(url: t) { img in img.resizable().aspectRatio(contentMode: .fit) } placeholder: { Color.clear }
                    .blur(radius: 18)
                    .opacity(0.45)
            }
            VStack(spacing: Space.m) {
                ProgressView().controlSize(.regular).tint(.white)
                Text("Claude is revising…")
                    .font(.title3.weight(.semibold))
                if let note = item.review.note, !note.isEmpty {
                    Text("“\(note)”")
                        .multilineTextAlignment(.center)
                        .opacity(0.8)
                }
                Text("It comes back here when it's re-rendered.")
                    .font(.callout)
                    .opacity(0.6)
            }
            .foregroundStyle(.white)
            .padding(Space.xxl)
        }
        .aspectRatio(item.aspectRatio, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: Radius.l, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.l, style: .continuous).strokeBorder(Brand.line))
    }
}

struct RenderingStage: View {
    let item: ReviewItem
    var body: some View {
        ZStack {
            Brand.panel
            VStack(spacing: Space.m) {
                if item.renderStatus == "failed" {
                    Image(systemName: "exclamationmark.triangle").font(.title2).foregroundStyle(Brand.danger)
                    Text("The render failed").font(.headline)
                    Text("Ask Claude to fix it with Request Changes, or re-render it in Shipreel's editor.")
                        .font(.callout).foregroundStyle(.secondary).multilineTextAlignment(.center)
                } else {
                    if let p = item.renderProgress, p > 0 {
                        ProgressView(value: p).frame(width: 140)
                    } else {
                        ProgressView().controlSize(.small)
                    }
                    Text("Rendering…").font(.headline)
                }
            }
            .padding(Space.xxl)
        }
        .aspectRatio(item.aspectRatio, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: Radius.l, style: .continuous))
    }
}

struct NotificationPrimer: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        HStack(spacing: Space.m) {
            Image(systemName: "bell.badge")
                .font(.title3)
                .foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 2) {
                Text("Know when a video is ready")
                    .font(.headline)
                Text("Get one notification per new video, so you can approve it while it's fresh.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button("Not Now") {
                store.primerDismissed = true
                UserDefaults.standard.set(true, forKey: "notifPrimerDismissed")
            }
            .buttonStyle(.borderless)
            .foregroundStyle(.secondary)
            Button("Turn On Notifications") {
                Task {
                    _ = await Notifier.shared.request()
                    store.notificationStatus = await Notifier.shared.status()
                    store.primerDismissed = true
                    UserDefaults.standard.set(true, forKey: "notifPrimerDismissed")
                }
            }
            .buttonStyle(.secondary)
        }
        .padding(.horizontal, Space.xl)
        .padding(.vertical, Space.m)
        .background(Brand.panel)
        .overlay(alignment: .bottom) { Rectangle().fill(Brand.line).frame(height: 1) }
    }
}

// MARK: - Empty state

struct CaughtUpView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        VStack(spacing: 0) {
            BrandMark(size: 72)
                .padding(.bottom, Space.xxl)
            Text("You're all caught up")
                .font(.display(48))
                .padding(.bottom, Space.m)
            Text("New videos land here as soon as they're rendered: from Create, from Claude in Terminal, or from autopilot.")
                .font(.title3)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 460)
                .padding(.bottom, Space.x3)
            HStack(spacing: Space.s) {
                Button("Create Videos") { store.select(.create) }
                    .buttonStyle(.primary)
                Button("Open in Terminal") { store.openInTerminal() }
                    .buttonStyle(.secondary)
            }
            if let next = nextPost {
                Text(next)
                    .font(.callout)
                    .foregroundStyle(.tertiary)
                    .padding(.top, Space.x3)
            }
        }
        .padding(Space.x5)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var nextPost: String? {
        let upcoming = store.postItems.compactMap { i -> (Date, ReviewItem)? in
            guard let p = i.post, p.state == .scheduled, let d = p.scheduledDate, d > .now else { return nil }
            return (d, i)
        }.sorted { $0.0 < $1.0 }
        guard let first = upcoming.first, let post = first.1.post else { return nil }
        let names = post.platforms.compactMap { Platform.named($0)?.name }
        return "Next post: \(Fmt.when(first.0))" + (names.isEmpty ? "" : " on \(Fmt.list(names))")
    }
}
