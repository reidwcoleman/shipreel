import SwiftUI
import UIKit

// MARK: - Posts

struct PostsTab: View {
    @Environment(PhoneStore.self) private var store

    private var groups: [(String, [ReviewItem])] {
        let all = store.postItems
        func st(_ i: ReviewItem) -> PostState { i.post?.state ?? .unknown }
        func d(_ i: ReviewItem) -> Date { i.post?.scheduledDate ?? .distantPast }
        return [
            ("Needs you", all.filter { st($0).needsAttention }.sorted { d($0) > d($1) }),
            ("Up next", all.filter { [.scheduled, .posting, .rendering].contains(st($0)) }.sorted { d($0) < d($1) }),
            ("Posted", all.filter { st($0) == .posted }.sorted { d($0) > d($1) }),
            ("Cancelled", all.filter { st($0) == .cancelled }.sorted { d($0) > d($1) }),
        ].filter { !$0.1.isEmpty }
    }

    var body: some View {
        NavigationStack {
            Group {
                if groups.isEmpty {
                    ContentUnavailableView {
                        Label("Nothing posted yet", systemImage: "paperplane")
                    } description: {
                        Text("Videos you approve show up here with their schedule and links to the live posts.")
                    } actions: {
                        Button("Go to Review") { store.tab = .review }.buttonStyle(.bordered)
                    }
                } else {
                    List {
                        ForEach(groups, id: \.0) { title, items in
                            Section(title) {
                                ForEach(items) { PostCell(item: $0) }
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                    .scrollContentBackground(.hidden)
                    .refreshable { await store.refresh() }
                }
            }
            .background(Brand.ground)
            .navigationTitle("Posts")
        }
    }
}

struct PostCell: View {
    @Environment(PhoneStore.self) private var store
    let item: ReviewItem
    @State private var confirmCancel = false

    var body: some View {
        let post = item.post!
        VStack(alignment: .leading, spacing: Space.s) {
            HStack(alignment: .top, spacing: Space.m) {
                Thumb(url: item.thumb).frame(width: 40, height: 71)
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.displayHook).font(.subheadline.weight(.semibold)).lineLimit(2)
                    Text(meta(post)).font(.caption).foregroundStyle(.secondary)
                    StatusPill(state: post.state, dryRun: post.dryRun == true)
                }
            }
            ForEach(post.platforms.isEmpty ? post.results.map(\.platform) : post.platforms, id: \.self) { name in
                ResultRow(name: name, result: post.results.first { $0.platform == name }, dryRun: post.dryRun == true)
            }
            if post.state == .scheduled {
                Button("Cancel Post", role: .destructive) { confirmCancel = true }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .confirmationDialog("Cancel this post?", isPresented: $confirmCancel, titleVisibility: .visible) {
                        Button("Cancel Post", role: .destructive) { Task { await store.cancelPost(item) } }
                        Button("Keep It", role: .cancel) {}
                    } message: {
                        Text("Nothing will be posted. The video stays in Shipreel.")
                    }
            }
        }
        .padding(.vertical, Space.xs)
    }

    private func meta(_ p: PostSummary) -> String {
        let when = Fmt.when(p.scheduledDate)
        return [item.projectName, p.state == .scheduled ? "Goes out \(when)" : when].filter { !$0.isEmpty }.joined(separator: " · ")
    }
}

struct ResultRow: View {
    @Environment(PhoneStore.self) private var store
    let name: String
    let result: PostResult?
    let dryRun: Bool

    var body: some View {
        let p = Platform.named(name)
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: Space.s) {
                Image(systemName: p?.symbol ?? "globe").frame(width: 18).foregroundStyle(.secondary)
                Text(p?.name ?? name.capitalized).frame(width: 84, alignment: .leading)
                if let r = result {
                    Label(r.ok ? (dryRun ? "Filled, not posted" : "Live") : "Didn't post",
                          systemImage: r.ok ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .foregroundStyle(r.ok ? Brand.success : Brand.danger)
                    Spacer()
                    if let s = r.url, let u = URL(string: s) {
                        Link("Open", destination: u).foregroundStyle(Brand.lime).fontWeight(.semibold)
                    }
                } else {
                    Label("Waiting", systemImage: "clock").foregroundStyle(.secondary)
                }
            }
            .font(.footnote)
            .labelStyle(.titleAndIcon)
            if let r = result, let note = r.note, !note.isEmpty {
                Text(note).font(.caption).foregroundStyle(.secondary).padding(.leading, 26)
            }
            if let r = result, !r.ok {
                let e = r.error ?? "Postbox couldn't post this."
                VStack(alignment: .leading, spacing: 6) {
                    Text(e).font(.caption).foregroundStyle(.secondary)
                    if let p, ["connect", "sign in", "log in", "logged in", "login"].contains(where: { e.lowercased().contains($0) }), !e.lowercased().contains("extension") {
                        Button("Connect \(p.name) in Postbox") { Task { await store.connectAccount(p) } }
                            .buttonStyle(.bordered).controlSize(.small)
                    } else if e.lowercased().contains("extension") {
                        Text("Fix it on your Mac: open Chrome and turn on the Postbox extension.")
                            .font(.caption.weight(.semibold))
                    }
                }
                .padding(.leading, 26)
            }
        }
    }
}

struct StatusPill: View {
    let state: PostState
    var dryRun = false
    var body: some View {
        let color: Color = state == .posted ? Brand.success : state == .failed ? Brand.danger : state.needsAttention ? Brand.warning : .secondary
        Label(dryRun && state != .scheduled ? "Dry run · \(state.label)" : state.label, systemImage: state.symbol)
            .font(.caption.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.14), in: Capsule())
    }
}

// MARK: - Create

struct CreateTab: View {
    @Environment(PhoneStore.self) private var store
    @AppStorage("createProject") private var projectId = ""
    @State private var prompt = ""
    @State private var count = 3
    @State private var formats: Set<String> = []
    @FocusState private var focused: Bool

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: Space.xxl) {
                        Text("Claude writes them, your Mac renders them, and they land in Review.")
                            .foregroundStyle(.secondary)

                        if let run = store.run, run.isActive {
                            VStack(alignment: .leading, spacing: Space.s) {
                                Text(run.prompt).font(.title3).lineLimit(3)
                                Text([run.projectName, "Claude is working on your Mac"].compactMap { $0 }.joined(separator: " · "))
                                    .font(.subheadline).foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(Space.l)
                            .background(Brand.panel, in: RoundedRectangle(cornerRadius: Radius.l, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: Radius.l, style: .continuous).strokeBorder(Brand.line))
                            Terminal().id("terminal")
                            Button("Stop") { store.stopCreate() }.buttonStyle(.secondary)
                        } else {
                            VStack(alignment: .leading, spacing: Space.l) {
                                TextField("Make videos about the 3:55 school-pickup scramble…", text: $prompt, axis: .vertical)
                                    .font(.title3)
                                    .lineLimit(2...6)
                                    .focused($focused)
                                Divider()
                                HStack {
                                    Text("Project").foregroundStyle(.secondary)
                                    Spacer()
                                    Picker("Project", selection: $projectId) {
                                        if store.projects.isEmpty { Text("None").tag("") }
                                        ForEach(store.projects) { Text($0.name).tag($0.id) }
                                    }
                                    .labelsHidden()
                                }
                                Stepper(value: $count, in: 1...10) {
                                    Text("\(count) video\(count == 1 ? "" : "s")").monospacedDigit()
                                }
                                VStack(alignment: .leading, spacing: Space.s) {
                                    Text("Formats (optional)").font(.subheadline).foregroundStyle(.secondary)
                                    Chips(items: FormatChoice.all.map(\.name),
                                          selected: Set(FormatChoice.all.filter { formats.contains($0.id) }.map(\.name))) { name in
                                        guard let f = FormatChoice.all.first(where: { $0.name == name }) else { return }
                                        if formats.contains(f.id) { formats.remove(f.id) } else { formats.insert(f.id) }
                                    }
                                }
                            }
                            .padding(Space.l)
                            .background(Brand.panel, in: RoundedRectangle(cornerRadius: Radius.l, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: Radius.l, style: .continuous).strokeBorder(Brand.line))

                            Button(count == 1 ? "Make 1 Video" : "Make \(count) Videos") {
                                focused = false
                                store.startCreate(prompt: prompt, projectId: projectId.isEmpty ? nil : projectId, count: count, formats: Array(formats))
                                withAnimation { proxy.scrollTo("terminal", anchor: .top) }
                            }
                            .buttonStyle(.primary)
                            .disabled(prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                            if store.run != nil { Terminal().id("terminal") }
                        }
                    }
                    .padding(Space.l)
                }
                .scrollDismissesKeyboard(.interactively)
            }
            .background(Brand.ground)
            .navigationTitle("Make videos")
            .onAppear {
                if projectId.isEmpty || !store.projects.contains(where: { $0.id == projectId }) { projectId = store.projects.first?.id ?? "" }
            }
            .onChange(of: store.projects) { if projectId.isEmpty { projectId = store.projects.first?.id ?? "" } }
        }
    }
}

struct Terminal: View {
    @Environment(PhoneStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: Space.s) {
                if let run = store.run {
                    switch run.status {
                    case .starting, .running: ProgressView().controlSize(.mini)
                    case .done: Image(systemName: "checkmark.circle.fill").foregroundStyle(Brand.lime)
                    case .failed: Image(systemName: "xmark.octagon.fill").foregroundStyle(Brand.danger)
                    case .stopped: Image(systemName: "stop.circle").foregroundStyle(Brand.terminalDim)
                    }
                    Text(status(run)).foregroundStyle(Brand.terminalText).lineLimit(1)
                    Spacer()
                    if run.status == .done, !run.videoIds.isEmpty {
                        Button("Review") { store.tab = .review }.foregroundStyle(Brand.lime).fontWeight(.semibold)
                    }
                } else {
                    Image(systemName: "terminal").foregroundStyle(Brand.terminalDim)
                    Text("claude · shipreel").foregroundStyle(Brand.terminalDim)
                    Spacer()
                }
            }
            .font(.system(size: 13, weight: .medium, design: .monospaced))
            .padding(.horizontal, Space.m)
            .frame(height: 40)
            Rectangle().fill(.white.opacity(0.08)).frame(height: 1)
            VStack(alignment: .leading, spacing: 3) {
                if let run = store.run {
                    ForEach(run.lines.suffix(300)) { l in
                        Text(l.text.isEmpty ? " " : l.text)
                            .foregroundStyle(l.text.hasPrefix("$") ? Brand.lime : l.text.hasPrefix("›") || l.text.hasPrefix("  ") ? Brand.terminalDim : Brand.terminalText)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                } else {
                    Text("Claude's work shows up here, line by line, while it runs on your Mac.")
                        .foregroundStyle(Brand.terminalDim)
                }
            }
            .font(.system(size: 11.5, design: .monospaced))
            .textSelection(.enabled)
            .padding(Space.m)
            .frame(minHeight: 160, alignment: .topLeading)
        }
        .background(Brand.terminal, in: RoundedRectangle(cornerRadius: Radius.l, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.l, style: .continuous).strokeBorder(Brand.line))
    }

    private func status(_ r: CreateRun) -> String {
        switch r.status {
        case .starting: "Starting Claude…"
        case .running: "Claude is working"
        case .done: r.videoIds.isEmpty ? "Done" : "Done · \(r.videoIds.count) sent to Review"
        case .failed(let w): "Failed · \(w)"
        case .stopped: "Stopped"
        }
    }
}

// MARK: - Accounts

struct AccountsTab: View {
    @Environment(PhoneStore.self) private var store
    @Environment(\.openURL) private var openURL
    @State private var confirmUnpair = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    StatusLine(title: "Postbox", symbol: "server.rack", ok: store.postbox?.daemon,
                               okText: "Running on your Mac", badText: "Not running. Shipreel starts it when it posts.")
                    StatusLine(title: "Chrome extension", symbol: "puzzlepiece.extension", ok: store.postbox?.extension,
                               okText: "Connected", badText: "Not connected", unknownText: "Not seen yet. Turn it on in Chrome on your Mac.")
                } header: {
                    Text("Postbox")
                } footer: {
                    if let e = store.postboxError { Text("Couldn't check Postbox: \(e)") }
                }

                Section("Accounts") {
                    ForEach(Platform.allCases) { p in
                        let c = store.postbox?.account(p)?.connected
                        HStack(spacing: Space.m) {
                            Image(systemName: p.symbol).frame(width: 24).foregroundStyle(.secondary)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(p.name)
                                ConnectionText(connected: c, known: store.postbox != nil)
                            }
                            Spacer()
                            Button(store.connectingPlatforms.contains(p) ? "Opening…" : c == true ? "Reconnect" : "Connect") {
                                Task { await store.connectAccount(p) }
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                            .disabled(store.connectingPlatforms.contains(p))
                        }
                    }
                }

                Section {
                    LabeledContent("Mac", value: store.pairing?.mac ?? "Your Mac")
                    LabeledContent("Connected over", value: store.via)
                    LabeledContent("Address", value: store.baseURL.replacingOccurrences(of: "https://", with: "").replacingOccurrences(of: "http://", with: ""))
                    Button("Unpair This iPhone", role: .destructive) { confirmUnpair = true }
                } header: {
                    Text("This iPhone")
                } footer: {
                    Text("Connect opens the sign-in page in Chrome on your Mac. TikTok's terms don't allow automated posting, so try Dry run first.")
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(Brand.ground)
            .navigationTitle("Accounts")
            .refreshable { await store.loadPostbox() }
            .task { await store.loadPostbox() }
            .confirmationDialog("Unpair this iPhone?", isPresented: $confirmUnpair, titleVisibility: .visible) {
                Button("Unpair", role: .destructive) { store.unpair() }
            } message: {
                Text("You'll need to scan the code on your Mac again.")
            }
        }
    }
}

struct StatusLine: View {
    let title: String
    let symbol: String
    let ok: Bool?
    let okText: String
    let badText: String
    var unknownText = "Unknown"

    var body: some View {
        HStack(spacing: Space.m) {
            Image(systemName: symbol).frame(width: 24).foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                HStack(spacing: 4) {
                    Image(systemName: ok == true ? "checkmark.circle.fill" : ok == false ? "xmark.circle.fill" : "questionmark.circle")
                        .foregroundStyle(ok == true ? Brand.success : ok == false ? Brand.warning : .secondary)
                    Text(ok == true ? okText : ok == false ? badText : unknownText).foregroundStyle(.secondary)
                }
                .font(.caption)
                .imageScale(.small)
            }
        }
    }
}
