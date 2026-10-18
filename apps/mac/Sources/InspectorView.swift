import AppKit
import SwiftUI

/// Post settings for the selected video: captions, platforms, timing, dry run.
struct InspectorView: View {
    @Environment(AppStore.self) private var store
    let item: ReviewItem
    @State private var tab: Platform = .tiktok

    var body: some View {
        let draft = store.binding(for: item)
        let locked = item.review.status != .pending
        ScrollView {
            VStack(alignment: .leading, spacing: Space.xxl) {
                header
                Divider()
                captions(draft)
                Divider()
                platforms(draft)
                Divider()
                timing(draft)
                if let tip = item.soundTip, !tip.isEmpty {
                    Divider()
                    VStack(alignment: .leading, spacing: Space.s) {
                        SectionLabel("Sound")
                        HStack(alignment: .firstTextBaseline, spacing: Space.s) {
                            Image(systemName: "music.note").foregroundStyle(.secondary)
                            Text(tip)
                                .font(.callout)
                                .foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                                .textSelection(.enabled)
                        }
                    }
                }
            }
            .padding(Space.xl)
            .disabled(locked)
            .opacity(locked ? 0.55 : 1)
        }
        .background(Brand.panel)
    }

    // MARK: Header

    private var header: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            Text(item.displayHook)
                .font(.title3.weight(.semibold))
                .fixedSize(horizontal: false, vertical: true)
                .textSelection(.enabled)
            Text(meta)
                .font(.callout)
                .foregroundStyle(.secondary)
            if let score = item.hookScore {
                HookScore(score: score)
                    .padding(.top, Space.xs)
            }
        }
    }

    private var meta: String {
        var parts = [item.formatName, item.projectName]
        if item.isCarousel { parts.append("\(item.slides.count) slides") } else if item.durationSec > 0 { parts.append(Fmt.duration(item.durationSec)) }
        parts.append("by \(item.madeBy)")
        return parts.joined(separator: " · ")
    }

    // MARK: Captions

    private func captions(_ draft: Binding<Draft>) -> some View {
        VStack(alignment: .leading, spacing: Space.m) {
            HStack {
                SectionLabel("Captions")
                Spacer()
                if draft.wrappedValue.captions != item.captions || draft.wrappedValue.youtubeTitle != item.youtubeTitle {
                    Button("Reset") {
                        draft.wrappedValue.captions = item.captions
                        draft.wrappedValue.youtubeTitle = item.youtubeTitle
                    }
                    .buttonStyle(.link)
                    .font(.callout)
                    .help("Go back to the captions Shipreel wrote")
                }
            }
            Picker("Platform", selection: $tab) {
                ForEach(Platform.allCases) { p in Text(p.name).tag(p) }
            }
            .pickerStyle(.segmented)
            .labelsHidden()

            if tab == .youtube {
                VStack(alignment: .leading, spacing: Space.xs) {
                    Text("Title").font(.callout).foregroundStyle(.secondary)
                    TextField("YouTube title", text: draft.youtubeTitle)
                        .textFieldStyle(.roundedBorder)
                    Counter(count: draft.wrappedValue.youtubeTitle.count, limit: 100)
                }
                Text("Description").font(.callout).foregroundStyle(.secondary)
            }
            CaptionEditor(text: Binding(get: { draft.wrappedValue.captions[tab] },
                                        set: { draft.wrappedValue.captions[tab] = $0 }))
                .accessibilityLabel("\(tab.name) caption")
            Counter(count: draft.wrappedValue.captions[tab].count, limit: limit(tab))
        }
    }

    private func limit(_ p: Platform) -> Int {
        switch p {
        case .tiktok: 4000
        case .instagram: 2200
        case .youtube: 5000
        }
    }

    // MARK: Platforms

    private func platforms(_ draft: Binding<Draft>) -> some View {
        VStack(alignment: .leading, spacing: Space.m) {
            HStack {
                SectionLabel("Post to")
                Spacer()
                if store.postboxLoading { ProgressView().controlSize(.mini) }
            }
            if let pb = store.postbox, !pb.daemon {
                Notice(text: "Postbox isn't running. Shipreel starts it when you approve; check Accounts if it keeps failing.",
                       style: .warning)
            } else if store.postbox == nil, let err = store.postboxError {
                Notice(text: "Couldn't check Postbox: \(err)", style: .warning)
            }
            ForEach(Platform.allCases) { p in
                PlatformToggleRow(platform: p, isOn: Binding(
                    get: { draft.wrappedValue.platforms.contains(p) },
                    set: { on in
                        if on { draft.wrappedValue.platforms.insert(p) } else { draft.wrappedValue.platforms.remove(p) }
                        draft.wrappedValue.platformsTouched = true
                    }))
            }
        }
    }

    // MARK: Timing

    private func timing(_ draft: Binding<Draft>) -> some View {
        VStack(alignment: .leading, spacing: Space.m) {
            SectionLabel("When")
            Picker("When", selection: draft.when) {
                ForEach(WhenChoice.allCases) { w in Text(w.label).tag(w) }
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            if draft.wrappedValue.when == .pick {
                DatePicker("Post at", selection: draft.date, in: Date()..., displayedComponents: [.date, .hourAndMinute])
                    .datePickerStyle(.compact)
            } else if draft.wrappedValue.when == .nextSlot {
                Text("Uses the posting slots in Shipreel's Settings.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            }
            HStack(spacing: Space.m) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Dry run")
                    Text("Fills everything in Chrome but doesn't press Post.")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                Toggle("Dry run", isOn: draft.dryRun)
                    .toggleStyle(.switch)
                    .labelsHidden()
                    .controlSize(.small)
            }
            .padding(.top, Space.xs)
        }
    }
}

struct HookScore: View {
    let score: Double
    var body: some View {
        HStack(spacing: Space.s) {
            Text("Hook score")
                .font(.callout)
                .foregroundStyle(.secondary)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.primary.opacity(0.1))
                    Capsule().fill(Color.primary.opacity(0.7))
                        .frame(width: geo.size.width * min(max(score / 100, 0), 1))
                }
            }
            .frame(width: 80, height: 4)
            Text("\(Int(score))")
                .font(.callout.weight(.semibold).monospacedDigit())
            Text(score >= 80 ? "Strong" : score >= 60 ? "Good" : "Weak")
                .font(.callout)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }
}

struct CaptionEditor: View {
    @Binding var text: String
    var body: some View {
        TextEditor(text: $text)
            .font(.body)
            .scrollContentBackground(.hidden)
            .padding(Space.s)
            .frame(minHeight: 120, maxHeight: 180)
            .background(Brand.raised, in: RoundedRectangle(cornerRadius: Radius.s + 2, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.s + 2, style: .continuous).strokeBorder(Brand.lineStrong.opacity(0.7)))
    }
}

struct Counter: View {
    let count: Int
    let limit: Int
    var body: some View {
        HStack {
            Spacer()
            Text("\(count.formatted()) / \(limit.formatted())")
                .font(.caption.monospacedDigit())
                .foregroundStyle(count > limit ? Brand.danger : Color.secondary)
                .accessibilityLabel(count > limit ? "\(count - limit) characters over the limit" : "\(count) of \(limit) characters")
        }
    }
}

struct Notice: View {
    enum Style { case warning, error, info }
    let text: String
    var style: Style = .info

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: Space.s) {
            Image(systemName: style == .info ? "info.circle" : "exclamationmark.triangle.fill")
                .foregroundStyle(style == .error ? Brand.danger : style == .warning ? Brand.warning : .secondary)
            Text(text)
                .font(.callout)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Space.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: Radius.s + 2, style: .continuous))
    }
}

struct PlatformToggleRow: View {
    @Environment(AppStore.self) private var store
    let platform: Platform
    @Binding var isOn: Bool

    var body: some View {
        let state = store.postbox?.account(platform)?.connected
        HStack(spacing: Space.m) {
            Image(systemName: platform.symbol)
                .frame(width: 20)
                .foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 2) {
                Text(platform.name)
                ConnectionLabel(connected: state, known: store.postbox != nil)
            }
            Spacer()
            if state == false {
                Button(store.connecting.contains(platform) ? "Opening…" : "Connect") { store.connect(platform) }
                    .controlSize(.small)
                    .disabled(store.connecting.contains(platform))
            }
            Toggle("Post to \(platform.name)", isOn: $isOn)
                .toggleStyle(.switch)
                .labelsHidden()
                .controlSize(.small)
        }
    }
}

struct ConnectionLabel: View {
    let connected: Bool?
    var known = true

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: symbol)
                .imageScale(.small)
                .foregroundStyle(color)
            Text(text)
                .foregroundStyle(.secondary)
        }
        .font(.caption)
    }

    private var symbol: String {
        guard known else { return "questionmark.circle" }
        switch connected {
        case .some(true): return "checkmark.circle.fill"
        case .some(false): return "xmark.circle"
        case .none: return "questionmark.circle"
        }
    }

    private var color: Color {
        switch connected {
        case .some(true) where known: Brand.success
        case .some(false): Brand.warning
        default: .secondary
        }
    }

    private var text: String {
        guard known else { return "Checking Postbox…" }
        switch connected {
        case .some(true): return "Connected"
        case .some(false): return "Not connected"
        case .none: return "Status unknown"
        }
    }
}
