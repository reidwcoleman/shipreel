import SwiftUI
import UIKit

/// TikTok-style vertical feed of videos waiting for review.
struct ReviewFeed: View {
    @Environment(PhoneStore.self) private var store
    @State private var approving: ReviewItem?
    @State private var revising: ReviewItem?

    var body: some View {
        @Bindable var store = store
        Group {
            if !store.hasLoaded {
                ConnectingView()
            } else if store.queue.isEmpty {
                CaughtUpView()
            } else {
                GeometryReader { geo in
                    // Pages fill the whole screen; overlays keep clear of the status bar and tab bar.
                    let insets = geo.safeAreaInsets
                    ScrollView(.vertical) {
                        LazyVStack(spacing: 0) {
                            ForEach(store.queue) { item in
                                ReviewPage(item: item,
                                           index: (store.queue.firstIndex { $0.id == item.id } ?? 0) + 1,
                                           total: store.queue.count,
                                           active: store.currentId == item.id,
                                           insets: insets,
                                           onApprove: { approving = item },
                                           onRevise: { revising = item })
                                    .containerRelativeFrame([.horizontal, .vertical])
                                    .id(item.id)
                            }
                        }
                        .scrollTargetLayout()
                    }
                    .scrollTargetBehavior(.paging)
                    .scrollPosition(id: $store.currentId)
                    .scrollIndicators(.hidden)
                    .ignoresSafeArea()
                    .background(Color.black)
                }
            }
        }
        .onChange(of: store.currentId, initial: true) { syncPlayer() }
        .onChange(of: store.current?.mp4Url) { syncPlayer() }
        .onChange(of: store.current?.review.status) { syncPlayer() }
        .onChange(of: store.tab) { if store.tab != .review { store.player.pause() } else { syncPlayer() } }
        .sheet(item: $approving) { item in ApproveSheet(item: item) }
        #if DEBUG
        .task(id: store.hasLoaded) {
            guard store.hasLoaded, let s = DebugArgs.sheet else { return }
            try? await Task.sleep(for: .seconds(1.5))
            if s == "approve" { approving = store.current }
            if s == "revise" { revising = store.current }
        }
        #endif
        .sheet(item: $revising) { item in ReviseSheet(item: item) }
    }

    private func syncPlayer() {
        guard store.tab == .review, let item = store.current, item.review.status == .pending, !item.isCarousel else {
            store.player.load(nil); return
        }
        store.player.load(item.mp4)
    }
}

struct ReviewPage: View {
    @Environment(PhoneStore.self) private var store
    let item: ReviewItem
    let index: Int
    let total: Int
    let active: Bool
    var insets = EdgeInsets()
    let onApprove: () -> Void
    let onRevise: () -> Void
    @State private var slide = 0
    /// Height of the band under the status bar that holds the counter and sound button.
    static let band: CGFloat = 52

    var body: some View {
        let revising = item.review.status == .revising
        ZStack(alignment: .top) {
            Color.black
            // The video starts below the status bar and the counter/mute band, letterboxed in black.
            media
                .aspectRatio(item.aspectRatio, contentMode: .fit)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .padding(.top, insets.top + Self.band)
            if revising { revisingOverlay }
            if active, !item.isCarousel, !revising, !store.player.isPlaying, store.player.url != nil {
                Image(systemName: "play.fill")
                    .font(.system(size: 34, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 84, height: 84)
                    .background(.black.opacity(0.4), in: Circle())
                    .allowsHitTesting(false)
                    .transition(.opacity)
            }
            VStack(spacing: 0) {
                topBar
                Spacer()
                bottom(revising: revising)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .contentShape(Rectangle())
        .onTapGesture {
            guard active, !item.isCarousel, !revising else { return }
            withAnimation(.easeOut(duration: 0.15)) { store.player.toggle() }
        }
    }

    @ViewBuilder
    private var media: some View {
        if item.isCarousel {
            TabView(selection: $slide) {
                ForEach(Array(item.slides.enumerated()), id: \.offset) { i, url in
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let img): img.resizable().aspectRatio(contentMode: .fit)
                        case .failure: Label("Slide didn't load", systemImage: "photo").foregroundStyle(.secondary)
                        default: ProgressView()
                        }
                    }
                    .tag(i)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .accessibilityLabel("Carousel, slide \(slide + 1) of \(item.slides.count)")
        } else if active, store.player.url != nil {
            ZStack {
                poster.opacity(store.player.ready ? 0 : 1)
                PlayerSurface(player: store.player.player).opacity(store.player.ready ? 1 : 0)
                if let f = store.player.failed {
                    Label(f, systemImage: "exclamationmark.triangle").foregroundStyle(.white).padding()
                }
            }
        } else {
            poster
        }
    }

    private var poster: some View {
        AsyncImage(url: item.thumb) { img in img.resizable().aspectRatio(contentMode: .fit) } placeholder: { Color.black }
    }

    private var topBar: some View {
        HStack(spacing: Space.s) {
            Text("\(index) of \(total)")
                .font(.subheadline.weight(.semibold).monospacedDigit())
                .foregroundStyle(.white)
                .padding(.horizontal, 12)
                .frame(height: 32)
                .background(Color.white.opacity(0.12), in: Capsule())
            Spacer()
            if item.isCarousel {
                HStack(spacing: 5) {
                    ForEach(item.slides.indices, id: \.self) { i in
                        Circle().fill(.white.opacity(i == slide ? 1 : 0.4)).frame(width: 6, height: 6)
                    }
                }
                .padding(.horizontal, 10)
                .frame(height: 32)
                .background(Color.white.opacity(0.12), in: Capsule())
                .accessibilityHidden(true)
            } else {
                Button {
                    store.player.isMuted.toggle()
                } label: {
                    Image(systemName: store.player.isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(width: 40, height: 40)
                        .background(Color.white.opacity(0.12), in: Circle())
                        .contentTransition(.symbolEffect(.replace))
                }
                .accessibilityLabel(store.player.isMuted ? "Turn sound on" : "Turn sound off")
            }
        }
        .frame(height: Self.band)
        .padding(.horizontal, Space.l)
        .padding(.top, insets.top)
    }

    private func bottom(revising: Bool) -> some View {
        VStack(alignment: .leading, spacing: Space.m) {
            Text(item.displayHook)
                .font(.title3.weight(.semibold))
                .foregroundStyle(.white)
                .lineLimit(2)
                .shadow(color: .black.opacity(0.5), radius: 6)
            Text(meta)
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.75))
                .lineLimit(1)
            if active, !item.isCarousel, !revising {
                GeometryReader { g in
                    ZStack(alignment: .leading) {
                        Capsule().fill(.white.opacity(0.25))
                        Capsule().fill(.white).frame(width: g.size.width * store.player.progress)
                    }
                }
                .frame(height: 3)
                .accessibilityHidden(true)
            }
            if !revising {
                HStack(alignment: .top, spacing: Space.l) {
                    RoundAction(symbol: "xmark", label: "Reject") {
                        Task { await store.reject(item) }
                    }
                    RoundAction(symbol: "text.bubble", label: "Changes", action: onRevise)
                    Button(action: onApprove) {
                        Text("Approve & Post")
                    }
                    .buttonStyle(.primary)
                    .disabled(store.busy.contains(item.id))
                }
                .padding(.top, Space.xs)
            }
        }
        .padding(.horizontal, Space.l)
        .padding(.top, 96)
        .padding(.bottom, insets.bottom + Space.m)
        .background(
            // Tall scrim so the hook, meta and progress read cleanly over busy app UI.
            LinearGradient(stops: [.init(color: .clear, location: 0),
                                   .init(color: .black.opacity(0.6), location: 0.22),
                                   .init(color: .black.opacity(0.78), location: 0.45),
                                   .init(color: .black.opacity(0.93), location: 0.7),
                                   .init(color: .black.opacity(0.96), location: 1)],
                           startPoint: .top, endPoint: .bottom)
                .allowsHitTesting(false)
        )
    }

    private var meta: String {
        var parts = [item.formatName, item.projectName]
        if let s = item.hookScore { parts.append("Hook \(Int(s))") }
        if item.isCarousel { parts.append("\(item.slides.count) slides") } else if item.durationSec > 0 { parts.append(Fmt.duration(item.durationSec)) }
        return parts.joined(separator: " · ")
    }

    private var revisingOverlay: some View {
        ZStack {
            Rectangle().fill(.ultraThinMaterial)
            VStack(spacing: Space.m) {
                ProgressView().tint(.white)
                Text("Claude is revising…").font(.title3.weight(.semibold))
                if let n = item.review.note, !n.isEmpty {
                    Text("“\(n)”").multilineTextAlignment(.center).foregroundStyle(.secondary)
                }
                Text("It comes back here when it's re-rendered.").font(.footnote).foregroundStyle(.tertiary)
            }
            .padding(Space.x3)
        }
    }
}

struct RoundAction: View {
    let symbol: String
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: symbol)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 52, height: 52)
                    .background(Color.white.opacity(0.14), in: Circle())
                Text(label)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.white.opacity(0.8))
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}

struct CaughtUpView: View {
    @Environment(PhoneStore.self) private var store
    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            BrandMark(size: 68).padding(.bottom, Space.xxl)
            Text("You're all caught up")
                .font(.display(40))
                .multilineTextAlignment(.center)
                .padding(.bottom, Space.m)
            Text("New videos show up here as soon as they're rendered on your Mac.")
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Space.xxl)
            Spacer()
            Button("Make Videos") { store.tab = .create }
                .buttonStyle(.primary)
                .padding(.horizontal, Space.xl)
                .padding(.bottom, Space.xxl)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Brand.ground.ignoresSafeArea())
    }
}

// MARK: - Approve

struct ApproveSheet: View {
    @Environment(PhoneStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let item: ReviewItem
    @State private var tab: Platform = .tiktok
    @State private var sending = false

    var body: some View {
        let draft = store.binding(for: item)
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: Space.m) {
                        Thumb(url: item.thumb).frame(width: 44, height: 78)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.displayHook).font(.headline).lineLimit(3)
                            Text("\(item.formatName) · \(item.projectName)").font(.subheadline).foregroundStyle(.secondary)
                        }
                    }
                }

                Section("Post to") {
                    ForEach(Platform.allCases) { p in
                        PlatformRow(platform: p, isOn: Binding(
                            get: { draft.wrappedValue.platforms.contains(p) },
                            set: { on in
                                if on { draft.wrappedValue.platforms.insert(p) } else { draft.wrappedValue.platforms.remove(p) }
                                draft.wrappedValue.platformsTouched = true
                            }))
                    }
                }

                Section {
                    Picker("When", selection: draft.when) {
                        ForEach(WhenChoice.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                    if draft.wrappedValue.when == .pick {
                        DatePicker("Post at", selection: draft.date, in: Date()...)
                    }
                } header: {
                    Text("When")
                } footer: {
                    if draft.wrappedValue.when == .nextSlot { Text("Uses the posting slots in Shipreel's Settings.") }
                }

                Section {
                    Toggle("Dry run", isOn: draft.dryRun)
                } footer: {
                    Text("Fills everything in Chrome on your Mac but doesn't press Post.")
                }

                Section("Captions") {
                    Picker("Platform", selection: $tab) {
                        ForEach(Platform.allCases) { Text($0.name).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                    if tab == .youtube {
                        TextField("YouTube title", text: draft.youtubeTitle, axis: .vertical)
                    }
                    TextField("Caption", text: Binding(get: { draft.wrappedValue.captions[tab] },
                                                        set: { draft.wrappedValue.captions[tab] = $0 }), axis: .vertical)
                        .lineLimit(4...10)
                }

                if let tip = item.soundTip, !tip.isEmpty {
                    Section("Sound") {
                        Label(tip, systemImage: "music.note").font(.subheadline).foregroundStyle(.secondary)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Brand.panel)
            .navigationTitle("Approve & Post")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            .safeAreaInset(edge: .bottom) {
                let blocked = ApproveRules.blocked(draft.wrappedValue, postbox: store.postbox, postboxError: store.postboxError)
                VStack(spacing: Space.s) {
                    if let blocked {
                        HStack(alignment: .firstTextBaseline, spacing: Space.s) {
                            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(Brand.warning)
                            Text(blocked).foregroundStyle(.secondary)
                            Spacer(minLength: 0)
                            Button("Accounts") {
                                dismiss()
                                store.tab = .accounts
                            }
                            .fontWeight(.semibold)
                        }
                        .font(.footnote)
                    } else {
                        Text(summary(draft.wrappedValue))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    Button {
                        sending = true
                        Task {
                            let ok = await store.approve(item)
                            sending = false
                            if ok { dismiss() }
                        }
                    } label: {
                        HStack(spacing: Space.s) {
                            if sending { ProgressView().tint(Brand.limeInk) }
                            Text(ApproveRules.title(draft.wrappedValue))
                        }
                    }
                    .buttonStyle(.primary)
                    .disabled(sending || draft.wrappedValue.platforms.isEmpty || blocked != nil)
                }
                .padding(.horizontal, Space.l)
                .padding(.top, Space.m)
                .padding(.bottom, Space.s)
                .background(.bar)
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .task { await store.loadPostbox() }
    }

    private func summary(_ d: Draft) -> String {
        let names = Platform.allCases.filter { d.platforms.contains($0) }.map(\.name)
        if names.isEmpty { return "Pick at least one platform." }
        let list = Fmt.list(names)
        if d.dryRun { return "Dry run on \(list): nothing gets posted." }
        switch d.when {
        case .now: return "Posts to \(list) now, from Chrome on your Mac."
        case .nextSlot: return "Posts to \(list) at the next free slot."
        case .pick: return "Posts to \(list) · \(Fmt.when(d.date))"
        }
    }
}

struct PlatformRow: View {
    @Environment(PhoneStore.self) private var store
    let platform: Platform
    @Binding var isOn: Bool

    var body: some View {
        let state = store.postbox?.account(platform)?.connected
        HStack(spacing: Space.m) {
            Image(systemName: platform.symbol).frame(width: 24).foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 2) {
                Text(platform.name)
                ConnectionText(connected: state, known: store.postbox != nil)
            }
            Spacer()
            if state == false {
                Button(store.connectingPlatforms.contains(platform) ? "Opening…" : "Connect") {
                    Task { await store.connectAccount(platform) }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
            Toggle(platform.name, isOn: $isOn).labelsHidden()
        }
    }
}

struct ConnectionText: View {
    let connected: Bool?
    var known = true
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: !known ? "ellipsis.circle" : connected == true ? "checkmark.circle.fill" : connected == false ? "xmark.circle" : "questionmark.circle")
                .foregroundStyle(!known ? .secondary : connected == true ? Brand.success : connected == false ? Brand.warning : .secondary)
            Text(!known ? "Checking Postbox…" : connected == true ? "Connected" : connected == false ? "Not connected in Postbox" : "Status unknown")
                .foregroundStyle(.secondary)
        }
        .font(.caption)
        .imageScale(.small)
    }
}

// MARK: - Request changes

struct ReviseSheet: View {
    @Environment(PhoneStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let item: ReviewItem
    @State private var note = ""
    @State private var sending = false
    @FocusState private var focused: Bool
    private let quick = ["Stronger hook", "Make it shorter", "Bigger captions", "Different music", "Show the app sooner"]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("e.g. Cut the first second and make the hook bigger", text: $note, axis: .vertical)
                        .lineLimit(3...8)
                        .focused($focused)
                } header: {
                    Text("What should Claude change?")
                } footer: {
                    Text("Tap the mic on the keyboard to dictate. It comes back to Review when it's re-rendered.")
                }
                Section("Quick asks") {
                    Chips(items: quick) { q in
                        note = note.isEmpty ? q : note.trimmingCharacters(in: .whitespaces) + ". " + q
                    }
                    .padding(.vertical, Space.xs)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Brand.panel)
            .navigationTitle("Request Changes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(sending ? "Sending…" : "Send") {
                        sending = true
                        Task {
                            let ok = await store.revise(item, note: note)
                            sending = false
                            if ok { dismiss() }
                        }
                    }
                    .fontWeight(.semibold)
                    .disabled(sending || note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear { focused = true }
        }
        .presentationDetents([.medium, .large])
    }
}
