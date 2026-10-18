import AppKit
import SwiftUI

struct AccountsView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.x3) {
                VStack(alignment: .leading, spacing: Space.xs) {
                    Text("Accounts").font(.display(40))
                    Text("Shipreel posts through Postbox, which uses your own logged-in Chrome.")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }

                if let err = store.postboxError, store.postbox == nil {
                    Notice(text: "Couldn't check Postbox: \(err)", style: .error)
                }

                VStack(alignment: .leading, spacing: Space.s) {
                    SectionLabel("Postbox")
                    Card {
                        StatusRow(symbol: "server.rack", title: "Postbox app",
                                  ok: store.postbox?.daemon,
                                  okText: "Running on this Mac",
                                  badText: "Not running. Shipreel starts it when it needs it; press Check Again.",
                                  known: store.postbox != nil) {
                            EmptyView()
                        }
                        Divider().padding(.leading, 48)
                        StatusRow(symbol: "puzzlepiece.extension", title: "Chrome extension",
                                  ok: store.postbox?.extension,
                                  okText: "Connected to Chrome",
                                  badText: "Not connected. Install or turn on the Postbox extension in Chrome.",
                                  unknownText: "Not seen yet. Open Chrome, or set up the extension from the dashboard.",
                                  known: store.postbox != nil) {
                            if store.postbox?.extension != true {
                                Button("Set Up…") { openDashboard() }.controlSize(.small)
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: Space.s) {
                    SectionLabel("Accounts")
                    Card {
                        ForEach(Array(Platform.allCases.enumerated()), id: \.element) { n, p in
                            if n > 0 { Divider().padding(.leading, 48) }
                            let acct = store.postbox?.account(p)
                            StatusRow(symbol: p.symbol, title: acct?.name ?? p.name,
                                      ok: acct?.connected,
                                      okText: "Connected",
                                      badText: "Not connected. Connect opens \(p.name) in Chrome so you can sign in.",
                                      unknownText: "Unknown. Postbox hasn't checked this account yet.",
                                      known: store.postbox != nil) {
                                Button(store.connecting.contains(p) ? "Opening…" : (acct?.connected == true ? "Reconnect" : "Connect")) {
                                    store.connect(p)
                                }
                                .controlSize(.small)
                                .disabled(store.connecting.contains(p))
                            }
                        }
                    }
                }

                HStack(spacing: Space.s) {
                    Button {
                        Task { await store.loadPostbox() }
                    } label: {
                        HStack(spacing: 6) {
                            if store.postboxLoading { ProgressView().controlSize(.small) }
                            Text("Check Again")
                        }
                    }
                    .buttonStyle(.secondary)
                    .disabled(store.postboxLoading)
                    Button("Open Postbox Dashboard") { openDashboard() }
                        .buttonStyle(.secondary)
                    Spacer()
                    Button {
                        openWindow(id: "pair")
                    } label: {
                        Label("Pair iPhone…", systemImage: "iphone")
                    }
                    .buttonStyle(.secondary)
                }

                Text("Postbox lives at \(store.postbox?.dashboard.absoluteString ?? "http://127.0.0.1:4710"). TikTok's terms don't allow automated posting, so use accounts you can afford to have restricted, and try Dry run first.")
                    .font(.callout)
                    .foregroundStyle(.tertiary)
                    .frame(maxWidth: 620, alignment: .leading)
            }
            .padding(.horizontal, Space.x4)
            .padding(.vertical, Space.x3)
            .frame(maxWidth: 860, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .navigationTitle("Accounts")
        .navigationSubtitle("")
        .toolbar(removing: .title)
        .task { await store.loadPostbox() }
    }

    private func openDashboard() {
        NSWorkspace.shared.open(store.postbox?.dashboard ?? URL(string: "http://127.0.0.1:4710")!)
    }
}

struct Card<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        VStack(spacing: 0) { content }
            .background(Brand.panel, in: RoundedRectangle(cornerRadius: Radius.m + 2, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.m + 2, style: .continuous).strokeBorder(Brand.line))
    }
}

struct StatusRow<Trailing: View>: View {
    let symbol: String
    let title: String
    let ok: Bool?
    let okText: String
    let badText: String
    var unknownText = "Unknown"
    var known = true
    @ViewBuilder var trailing: Trailing

    var body: some View {
        HStack(spacing: Space.l) {
            Image(systemName: symbol)
                .font(.title3)
                .foregroundStyle(.secondary)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.headline)
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Image(systemName: icon).imageScale(.small).foregroundStyle(color)
                    Text(text).foregroundStyle(.secondary)
                }
                .font(.callout)
            }
            Spacer()
            trailing
        }
        .padding(.horizontal, Space.l)
        .padding(.vertical, Space.m)
    }

    private var icon: String {
        guard known else { return "ellipsis.circle" }
        switch ok {
        case .some(true): return "checkmark.circle.fill"
        case .some(false): return "xmark.circle.fill"
        case .none: return "questionmark.circle"
        }
    }

    private var color: Color {
        guard known else { return .secondary }
        switch ok {
        case .some(true): return Brand.success
        case .some(false): return Brand.warning
        case .none: return .secondary
        }
    }

    private var text: String {
        guard known else { return "Checking…" }
        switch ok {
        case .some(true): return okText
        case .some(false): return badText
        case .none: return unknownText
        }
    }
}
