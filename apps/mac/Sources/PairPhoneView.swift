import AppKit
import CoreImage
import CoreImage.CIFilterBuiltins
import Observation
import SwiftUI

/// ~/Library/Application Support/Shipreel/phone.json, written by scripts/phone-bridge.mjs.
struct PhoneBridgeState: Decodable, Equatable {
    var token: String?
    var port: Int?
    var tunnel: Bool?
    var tunnelUrl: String?
    var lanUrls: [String]?
    var updatedAt: String?
}

/// Watches the phone bridge and builds the pairing link the iPhone app scans.
@MainActor
@Observable
final class PhonePairing {
    var state: PhoneBridgeState?
    var installed = false
    var bridgeUp: Bool?
    var tunnelUp: Bool?
    var busy: String?
    var error: String?

    static let dir = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Shipreel")
    static let stateURL = dir.appendingPathComponent("phone.json")
    static let plist = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/LaunchAgents/com.reidcoleman.shipreel.bridge.plist")

    private var task: Task<Void, Never>?
    private var lastModified: Date?
    private var lastTunnelCheck = Date.distantPast

    func start() {
        guard task == nil else { return }
        task = Task { [weak self] in
            while !Task.isCancelled {
                await self?.tick()
                try? await Task.sleep(for: .seconds(3))
            }
        }
    }

    func stop() {
        task?.cancel()
        task = nil
    }

    private func tick() async {
        installed = FileManager.default.fileExists(atPath: Self.plist.path)
        let mod = (try? FileManager.default.attributesOfItem(atPath: Self.stateURL.path)[.modificationDate]) as? Date
        if mod != lastModified || state == nil {
            lastModified = mod
            if let data = try? Data(contentsOf: Self.stateURL) {
                let new = try? JSONDecoder().decode(PhoneBridgeState.self, from: data)
                if new?.tunnelUrl != state?.tunnelUrl { tunnelUp = nil; lastTunnelCheck = .distantPast }
                state = new
            } else {
                state = nil
            }
        }
        bridgeUp = await Self.ping("http://127.0.0.1:\(state?.port ?? 4748)")
        if let t = state?.tunnelUrl, Date().timeIntervalSince(lastTunnelCheck) > 20 {
            lastTunnelCheck = Date()
            tunnelUp = await Self.ping(t, timeout: 8)
        } else if state?.tunnelUrl == nil {
            tunnelUp = nil
        }
    }

    static func ping(_ base: String, timeout: TimeInterval = 1.5) async -> Bool {
        guard let url = URL(string: base + "/bridge/ping") else { return false }
        var req = URLRequest(url: url, timeoutInterval: timeout)
        req.cachePolicy = .reloadIgnoringLocalCacheData
        guard let (data, resp) = try? await URLSession.shared.data(for: req),
              (resp as? HTTPURLResponse)?.statusCode == 200 else { return false }
        return String(data: data, encoding: .utf8)?.contains("shipreel") == true
    }

    /// shipreel://pair?t=…&lan=…&lan=…&tunnel=…
    var pairLink: String? {
        guard let s = state, let token = s.token else { return nil }
        var c = URLComponents()
        c.scheme = "shipreel"
        c.host = "pair"
        var q = [URLQueryItem(name: "t", value: token)]
        q += (s.lanUrls ?? []).map { URLQueryItem(name: "lan", value: $0) }
        if let t = s.tunnelUrl { q.append(URLQueryItem(name: "tunnel", value: t)) }
        c.queryItems = q
        // Encode ":" and "/" inside values too, so the link survives any scanner.
        c.percentEncodedQuery = q.map { "\($0.name)=\(($0.value ?? "").addingPercentEncoding(withAllowedCharacters: .alphanumerics.union(CharacterSet(charactersIn: "-._~"))) ?? "")" }.joined(separator: "&")
        return c.string
    }

    func install() {
        run("Installing the phone bridge…", "scripts/phone-bridge.sh install")
    }

    func rotate() {
        run("Making a new pairing code…", "node scripts/phone-bridge.mjs --rotate && scripts/phone-bridge.sh restart")
    }

    private func run(_ label: String, _ command: String) {
        busy = label
        error = nil
        let folder = AppStore.folder
        Task.detached {
            let p = Process()
            p.executableURL = URL(fileURLWithPath: "/bin/zsh")
            p.arguments = ["-lc", "export PATH=\"\(ServerLauncher.extraPath()):$PATH\"; cd \(ServerLauncher.shellQuote(folder)) && \(command)"]
            let pipe = Pipe()
            p.standardOutput = pipe
            p.standardError = pipe
            var out = ""
            var status: Int32 = -1
            do {
                try p.run()
                p.waitUntilExit()
                status = p.terminationStatus
                out = String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
            } catch {
                out = error.localizedDescription
            }
            let failed = status != 0
            let message = out.trimmingCharacters(in: .whitespacesAndNewlines)
            await MainActor.run {
                self.busy = nil
                if failed { self.error = message.isEmpty ? "That didn't work (exit \(status))." : message }
                self.lastModified = nil
            }
        }
    }

    static func qr(_ text: String) -> NSImage? {
        let f = CIFilter.qrCodeGenerator()
        f.message = Data(text.utf8)
        f.correctionLevel = "M"
        guard let out = f.outputImage?.transformed(by: CGAffineTransform(scaleX: 10, y: 10)),
              let cg = CIContext().createCGImage(out, from: out.extent) else { return nil }
        return NSImage(cgImage: cg, size: NSSize(width: out.extent.width / 2, height: out.extent.height / 2))
    }
}

struct PairPhoneView: View {
    @State private var pairing = PhonePairing()
    @State private var confirmRotate = false
    @State private var copied = false

    var body: some View {
        VStack(alignment: .leading, spacing: Space.xxl) {
            HStack(alignment: .top, spacing: Space.xxl) {
                qr
                VStack(alignment: .leading, spacing: Space.m) {
                    Text("Pair your iPhone")
                        .font(.display(30))
                    Text("Open Shipreel on your iPhone and scan this code. Your phone then reviews and approves videos through this Mac, at home over Wi-Fi and anywhere else through a private tunnel.")
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                    if let link = pairing.pairLink {
                        Button(copied ? "Copied" : "Copy Pairing Link") {
                            NSPasteboard.general.clearContents()
                            NSPasteboard.general.setString(link, forType: .string)
                            copied = true
                        }
                        .buttonStyle(.link)
                        .help("For “Paste link” on the phone, e.g. through Universal Clipboard")
                    }
                }
            }

            VStack(alignment: .leading, spacing: Space.s) {
                SectionLabel("Phone bridge")
                Card {
                    StatusRow(symbol: "antenna.radiowaves.left.and.right", title: "Bridge",
                              ok: pairing.installed ? pairing.bridgeUp : false,
                              okText: "Running on port \(pairing.state?.port ?? 4748)",
                              badText: pairing.installed ? "Installed but not answering. It restarts on its own; check bridge.log if it doesn't." : "Not installed. Install it so your phone can reach this Mac.",
                              known: pairing.bridgeUp != nil || !pairing.installed) {
                        if !pairing.installed {
                            Button("Install Phone Bridge") { pairing.install() }
                                .controlSize(.small)
                                .disabled(pairing.busy != nil)
                        }
                    }
                    Divider().padding(.leading, 48)
                    StatusRow(symbol: "wifi", title: "Home Wi-Fi",
                              ok: (pairing.state?.lanUrls?.isEmpty == false) ? true : (pairing.state == nil ? nil : false),
                              okText: (pairing.state?.lanUrls ?? []).joined(separator: "  ·  "),
                              badText: "No Wi-Fi address. Join a network so the phone can find this Mac at home.",
                              unknownText: "Waiting for the bridge…") { EmptyView() }
                    Divider().padding(.leading, 48)
                    StatusRow(symbol: "globe", title: "Away from home",
                              ok: pairing.state?.tunnelUrl == nil ? (pairing.state == nil ? nil : false) : pairing.tunnelUp,
                              okText: "Tunnel is up · \(pairing.state?.tunnelUrl?.replacingOccurrences(of: "https://", with: "") ?? "")",
                              badText: pairing.state?.tunnelUrl == nil ? "No tunnel yet. The bridge starts one when it can." : "The tunnel isn't answering. It comes back when the bridge restarts it.",
                              unknownText: "Checking the tunnel…") { EmptyView() }
                }
            }

            HStack(spacing: Space.m) {
                if let b = pairing.busy {
                    ProgressView().controlSize(.small)
                    Text(b).foregroundStyle(.secondary)
                } else {
                    Button("New Pairing Code…") { confirmRotate = true }
                        .disabled(!pairing.installed)
                }
                Spacer()
            }
            .confirmationDialog("Make a new pairing code?", isPresented: $confirmRotate) {
                Button("New Pairing Code", role: .destructive) { pairing.rotate() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Phones you've already paired stop working until they scan the new code.")
            }

            if let e = pairing.error {
                Notice(text: e, style: .error)
            }
        }
        .padding(Space.x3)
        .frame(width: 600)
        .onAppear { pairing.start() }
        .onDisappear { pairing.stop() }
    }

    @ViewBuilder
    private var qr: some View {
        ZStack {
            RoundedRectangle(cornerRadius: Radius.l, style: .continuous).fill(.white)
            if let link = pairing.pairLink, pairing.bridgeUp == true, let img = PhonePairing.qr(link) {
                Image(nsImage: img)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .padding(Space.m)
                    .accessibilityLabel("Pairing code for the Shipreel iPhone app")
            } else {
                VStack(spacing: Space.s) {
                    Image(systemName: "qrcode").font(.largeTitle)
                    Text(pairing.installed ? "Waiting for the bridge…" : "Install the bridge first")
                        .font(.caption)
                        .multilineTextAlignment(.center)
                }
                .foregroundStyle(.black.opacity(0.45))
                .padding(Space.m)
            }
        }
        .frame(width: 200, height: 200)
    }
}
