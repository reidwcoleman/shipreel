import AppKit
import SwiftUI

struct PostsView: View {
    @Environment(AppStore.self) private var store

    private var groups: [(String, [ReviewItem])] {
        let all = store.postItems
        func state(_ i: ReviewItem) -> PostState { i.post?.state ?? .unknown }
        func date(_ i: ReviewItem) -> Date { i.post?.scheduledDate ?? .distantPast }
        let attention = all.filter { state($0).needsAttention }.sorted { date($0) > date($1) }
        let active = all.filter { [.scheduled, .posting, .rendering].contains(state($0)) }.sorted { date($0) < date($1) }
        let posted = all.filter { state($0) == .posted }.sorted { date($0) > date($1) }
        let cancelled = all.filter { state($0) == .cancelled || state($0) == .unknown }.sorted { date($0) > date($1) }
        return [("Needs you", attention), ("Up next", active), ("Posted", posted), ("Cancelled", cancelled)].filter { !$0.1.isEmpty }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.x3) {
                VStack(alignment: .leading, spacing: Space.xs) {
                    Text("Posts").font(.display(40))
                    Text(subtitle).font(.title3).foregroundStyle(.secondary)
                }
                if groups.isEmpty {
                    EmptyPosts()
                } else {
                    ForEach(groups, id: \.0) { title, items in
                        VStack(alignment: .leading, spacing: Space.s) {
                            SectionLabel(title)
                            VStack(spacing: 0) {
                                ForEach(Array(items.enumerated()), id: \.element.id) { n, item in
                                    if n > 0 { Divider().padding(.leading, 76) }
                                    PostRow(item: item)
                                }
                            }
                            .background(Brand.panel, in: RoundedRectangle(cornerRadius: Radius.m + 2, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: Radius.m + 2, style: .continuous).strokeBorder(Brand.line))
                        }
                    }
                }
            }
            .padding(.horizontal, Space.x4)
            .padding(.vertical, Space.x3)
            .frame(maxWidth: 860, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .navigationTitle("Posts")
        .navigationSubtitle("")
        .toolbar(removing: .title)
    }

    private var subtitle: String {
        let all = store.postItems.compactMap(\.post)
        let scheduled = all.filter { $0.state == .scheduled }.count
        let attention = all.filter { $0.state.needsAttention }.count
        let posted = all.filter { $0.state == .posted }.count
        var parts: [String] = []
        if attention > 0 { parts.append("\(attention) need\(attention == 1 ? "s" : "") you") }
        if scheduled > 0 { parts.append("\(scheduled) scheduled") }
        if posted > 0 { parts.append("\(posted) posted") }
        return parts.isEmpty ? "Approved videos go out through Postbox, in your Chrome." : parts.joined(separator: " · ")
    }
}

struct EmptyPosts: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        VStack(alignment: .leading, spacing: Space.m) {
            Text("Nothing posted yet")
                .font(.title2.weight(.semibold))
            Text("When you approve a video in Review, it shows up here with its schedule, and links to the live posts once Postbox is done.")
                .foregroundStyle(.secondary)
                .frame(maxWidth: 460, alignment: .leading)
            Button("Go to Review") { store.goToReview() }
                .buttonStyle(.secondary)
                .padding(.top, Space.xs)
        }
        .padding(Space.xxl)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: Radius.m + 2, style: .continuous))
    }
}

struct PostRow: View {
    @Environment(AppStore.self) private var store
    let item: ReviewItem
    @State private var confirmCancel = false

    var body: some View {
        let post = item.post!
        HStack(alignment: .top, spacing: Space.l) {
            Thumb(url: item.thumb, carousel: item.kind == "slideshow")
                .frame(width: 44, height: 78)
            VStack(alignment: .leading, spacing: Space.s) {
                HStack(alignment: .firstTextBaseline) {
                    Text(item.displayHook)
                        .font(.headline)
                        .lineLimit(2)
                    Spacer(minLength: Space.l)
                    StatusPill(state: post.state, dryRun: post.dryRun == true)
                }
                Text(meta(post))
                    .font(.callout)
                    .foregroundStyle(.secondary)

                platformResults(post)

                HStack(spacing: Space.s) {
                    if post.state == .scheduled {
                        Button("Cancel Post") { confirmCancel = true }
                            .controlSize(.small)
                            .confirmationDialog("Cancel this post?", isPresented: $confirmCancel) {
                                Button("Cancel Post", role: .destructive) { store.cancelPost(item) }
                                Button("Keep It", role: .cancel) {}
                            } message: {
                                Text("Nothing will be posted. The video stays in Shipreel.")
                            }
                    }
                    if post.state == .posting {
                        ProgressView().controlSize(.mini)
                        Text("Postbox is posting in Chrome…").font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(Space.l)
    }

    private func meta(_ post: PostSummary) -> String {
        var parts = [item.projectName, item.formatName]
        let when = Fmt.when(post.scheduledDate)
        switch post.state {
        case .scheduled: parts.append("Goes out \(when)")
        case .posted, .partial, .needsYou, .failed: if !when.isEmpty { parts.append(when) }
        default: break
        }
        return parts.joined(separator: " · ")
    }

    @ViewBuilder
    private func platformResults(_ post: PostSummary) -> some View {
        let names = post.platforms.isEmpty ? post.results.map(\.platform) : post.platforms
        VStack(alignment: .leading, spacing: 6) {
            ForEach(names, id: \.self) { name in
                let platform = Platform.named(name)
                let result = post.results.first { $0.platform == name }
                ResultLine(platformName: platform?.name ?? name.capitalized,
                           symbol: platform?.symbol ?? "globe",
                           result: result,
                           pending: result == nil,
                           dryRun: post.dryRun == true,
                           platform: platform)
            }
        }
    }
}

struct ResultLine: View {
    @Environment(AppStore.self) private var store
    let platformName: String
    let symbol: String
    let result: PostResult?
    let pending: Bool
    let dryRun: Bool
    let platform: Platform?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: Space.s) {
                Image(systemName: symbol).frame(width: 16).foregroundStyle(.secondary)
                Text(platformName).frame(width: 76, alignment: .leading)
                if let r = result {
                    if r.ok {
                        Label(dryRun ? "Filled, not posted" : (r.mode == "draft" ? "In drafts" : "Live"), systemImage: "checkmark.circle.fill")
                            .foregroundStyle(Brand.success)
                            .labelStyle(StatusLabelStyle())
                        if let s = r.url, let url = URL(string: s) {
                            Link("Open on \(platformName)", destination: url)
                                .foregroundStyle(Brand.accent)
                        }
                    } else {
                        Label("Didn't post", systemImage: "xmark.circle.fill")
                            .foregroundStyle(Brand.danger)
                            .labelStyle(StatusLabelStyle())
                    }
                } else if pending {
                    Label("Waiting", systemImage: "clock")
                        .foregroundStyle(.secondary)
                        .labelStyle(StatusLabelStyle())
                }
            }
            .font(.callout)
            if let r = result, let note = r.note, !note.isEmpty {
                Text(note).font(.caption).foregroundStyle(.secondary).padding(.leading, 24)
            }
            if let r = result, !r.ok {
                ErrorFix(error: r.error ?? "Postbox couldn't post this.", platform: platform)
                    .padding(.leading, 24)
            }
        }
    }
}

struct StatusLabelStyle: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 4) {
            configuration.icon.imageScale(.small)
            configuration.title.foregroundStyle(.primary)
        }
    }
}

/// Says what went wrong and offers the fix.
struct ErrorFix: View {
    @Environment(AppStore.self) private var store
    let error: String
    let platform: Platform?

    private var needsConnect: Bool {
        let e = error.lowercased()
        return ["connect", "sign in", "signed in", "log in", "logged in", "login"].contains { e.contains($0) }
    }

    private var needsExtension: Bool {
        let e = error.lowercased()
        return e.contains("extension") || e.contains("chrome isn't") || e.contains("chrome is not")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(error)
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
                .textSelection(.enabled)
            HStack(spacing: Space.s) {
                if needsConnect, let p = platform {
                    Button("Connect \(p.name) in Postbox") { store.connect(p) }
                        .controlSize(.small)
                }
                if needsExtension || !needsConnect {
                    Button("Open Postbox") {
                        NSWorkspace.shared.open(store.postbox?.dashboard ?? URL(string: "http://127.0.0.1:4710")!)
                    }
                    .controlSize(.small)
                }
            }
        }
    }
}

struct StatusPill: View {
    let state: PostState
    var dryRun = false

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: state.symbol).imageScale(.small)
            Text(dryRun && state != .scheduled && state != .posting ? "Dry run · \(state.label)" : state.label)
        }
        .font(.caption.weight(.semibold))
        .foregroundStyle(color)
        .padding(.horizontal, Space.s)
        .padding(.vertical, 3)
        .background(color.opacity(0.12), in: Capsule())
    }

    private var color: Color {
        switch state {
        case .posted: Brand.success
        case .failed: Brand.danger
        case .partial, .needsYou: Brand.warning
        default: .secondary
        }
    }
}
