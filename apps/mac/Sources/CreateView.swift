import AppKit
import SwiftUI

struct CreateView: View {
    @Environment(AppStore.self) private var store
    @AppStorage("createProject") private var projectId = ""
    @State private var prompt = ""
    @State private var count = 3
    @State private var formats: Set<String> = []
    @FocusState private var promptFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: Space.xxl) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: Space.xs) {
                    Text("Make videos").font(.display(40))
                    Text("Claude writes them, Shipreel renders them, and they land in Review.")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button {
                    store.openInTerminal()
                } label: {
                    Label("Open in Terminal", systemImage: "terminal")
                }
                .buttonStyle(.secondary)
                .help("Open Terminal in your Shipreel folder and start Claude Code there (⇧⌘T). Videos it makes show up in Review too.")
            }

            composer

            TerminalPane()
                .frame(maxHeight: .infinity)
        }
        .padding(.horizontal, Space.x4)
        .padding(.vertical, Space.x3)
        .navigationTitle("Create")
        .navigationSubtitle("")
        .toolbar(removing: .title)
        .onAppear {
            promptFocused = true
            if projectId.isEmpty || !store.projects.contains(where: { $0.id == projectId }) {
                projectId = store.projects.first?.id ?? ""
            }
        }
        .onChange(of: store.projects) {
            if projectId.isEmpty { projectId = store.projects.first?.id ?? "" }
        }
    }

    private var running: Bool { store.run?.isActive == true }

    private var composer: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            TextField("Make videos about the 3:55 school-pickup scramble…", text: $prompt, axis: .vertical)
                .textFieldStyle(.plain)
                .font(.title3)
                .lineLimit(2...5)
                .focused($promptFocused)
                .onSubmit(start)
                .accessibilityLabel("What should the videos be about?")

            VStack(alignment: .leading, spacing: Space.s) {
                Text("Formats (optional)").font(.callout).foregroundStyle(.secondary)
                FlowChips(items: FormatChoice.all.map(\.name),
                          selected: Set(FormatChoice.all.filter { formats.contains($0.id) }.map(\.name))) { name in
                    guard let f = FormatChoice.all.first(where: { $0.name == name }) else { return }
                    if formats.contains(f.id) { formats.remove(f.id) } else { formats.insert(f.id) }
                }
            }

            Divider()

            HStack(spacing: Space.l) {
                Picker("Project", selection: $projectId) {
                    if store.projects.isEmpty { Text("No projects").tag("") }
                    ForEach(store.projects) { p in Text(p.name).tag(p.id) }
                }
                .fixedSize()

                Stepper(value: $count, in: 1...10) {
                    Text("\(count) video\(count == 1 ? "" : "s")").monospacedDigit()
                }
                .fixedSize()

                Spacer()

                if running {
                    Button("Stop") { store.stopCreate() }
                        .buttonStyle(.secondary)
                        .keyboardShortcut(".", modifiers: .command)
                        .help("Stop Claude (⌘.)")
                } else {
                    Button(action: start) {
                        HStack(spacing: Space.s) {
                            Text(count == 1 ? "Make 1 Video" : "Make \(count) Videos")
                            Text("↩").opacity(0.55)
                        }
                    }
                    .buttonStyle(.primary)
                    .disabled(prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .padding(Space.xl)
        .background(Brand.panel, in: RoundedRectangle(cornerRadius: Radius.l, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.l, style: .continuous).strokeBorder(Brand.line))
    }

    private func start() {
        guard !running else { return }
        store.startCreate(prompt: prompt, projectId: projectId.isEmpty ? nil : projectId, count: count, formats: Array(formats))
    }
}

struct TerminalPane: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        VStack(spacing: 0) {
            header
            Rectangle().fill(Color.white.opacity(0.08)).frame(height: 1)
            if let run = store.run {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 2) {
                            ForEach(run.lines) { line in
                                Text(line.text.isEmpty ? " " : line.text)
                                    .foregroundStyle(color(for: line.text))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .id(line.id)
                            }
                            if run.isActive {
                                BlinkingCursor().id(-1)
                            }
                        }
                        .font(.system(size: 12, design: .monospaced))
                        .textSelection(.enabled)
                        .padding(Space.l)
                    }
                    .onChange(of: run.lines.count) {
                        withAnimation(.linear(duration: 0.1)) { proxy.scrollTo(run.isActive ? -1 : run.lines.last?.id, anchor: .bottom) }
                    }
                }
            } else {
                VStack(spacing: Space.s) {
                    Text("Claude's work shows up here, line by line.")
                    Text("It runs Claude Code in \(AppStore.folder.replacingOccurrences(of: NSHomeDirectory(), with: "~")) with the Shipreel tools.")
                        .foregroundStyle(Brand.terminalDim)
                }
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(Brand.terminalText.opacity(0.8))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(Brand.terminal, in: RoundedRectangle(cornerRadius: Radius.l, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.l, style: .continuous).strokeBorder(Brand.line))
        .environment(\.colorScheme, .dark)
    }

    private var header: some View {
        HStack(spacing: Space.s) {
            if let run = store.run {
                statusIcon(run)
                Text(statusText(run))
                    .foregroundStyle(Brand.terminalText)
                Spacer()
                TimelineView(.periodic(from: .now, by: 1)) { ctx in
                    Text(Fmt.duration((run.ended ?? ctx.date).timeIntervalSince(run.started)))
                        .monospacedDigit()
                        .foregroundStyle(Brand.terminalDim)
                }
                if run.status == .done, !run.videoIds.isEmpty {
                    Button("Review Them") { store.goToReview() }
                        .buttonStyle(.borderless)
                        .foregroundStyle(Brand.lime)
                        .fontWeight(.semibold)
                }
                if run.isActive {
                    Button {
                        store.stopCreate()
                    } label: {
                        Image(systemName: "stop.fill")
                    }
                    .buttonStyle(.borderless)
                    .foregroundStyle(Brand.terminalText)
                    .help("Stop (⌘.)")
                    .accessibilityLabel("Stop")
                }
            } else {
                Image(systemName: "terminal").foregroundStyle(Brand.terminalDim)
                Text("claude · shipreel").foregroundStyle(Brand.terminalDim)
                Spacer()
            }
        }
        .font(.system(size: 12, weight: .medium, design: .monospaced))
        .padding(.horizontal, Space.l)
        .frame(height: 36)
    }

    @ViewBuilder
    private func statusIcon(_ run: CreateRun) -> some View {
        switch run.status {
        case .starting, .running: ProgressView().controlSize(.mini)
        case .done: Image(systemName: "checkmark.circle.fill").foregroundStyle(Brand.lime)
        case .failed: Image(systemName: "xmark.octagon.fill").foregroundStyle(Color(nsColor: NSColor(hex: 0xF58A84)))
        case .stopped: Image(systemName: "stop.circle").foregroundStyle(Brand.terminalDim)
        }
    }

    private func statusText(_ run: CreateRun) -> String {
        switch run.status {
        case .starting: return "Starting Claude…"
        case .running: return "Claude is working"
        case .done:
            let n = run.videoIds.count
            return n == 0 ? "Done" : "Done · \(n) video\(n == 1 ? "" : "s") sent to Review"
        case .failed(let why): return "Failed · \(why)"
        case .stopped: return "Stopped"
        }
    }

    private func color(for text: String) -> Color {
        if text.hasPrefix("$") { return Brand.lime }
        if text.hasPrefix("✗") || text.lowercased().hasPrefix("error") { return Color(nsColor: NSColor(hex: 0xF58A84)) }
        if text.hasPrefix("›") || text.hasPrefix("  ") { return Brand.terminalDim }
        return Brand.terminalText
    }
}

struct BlinkingCursor: View {
    @State private var on = true
    var body: some View {
        Rectangle()
            .fill(Brand.terminalText)
            .frame(width: 7, height: 14)
            .opacity(on ? 0.8 : 0)
            .task {
                while !Task.isCancelled {
                    try? await Task.sleep(for: .milliseconds(530))
                    on.toggle()
                }
            }
            .accessibilityHidden(true)
    }
}
