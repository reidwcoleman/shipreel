import AVFoundation
import SwiftUI
import UIKit

/// First run: pair with Shipreel on the Mac by scanning its code (or pasting the link).
struct PairingView: View {
    @Environment(PhoneStore.self) private var store
    @Environment(\.openURL) private var openURL
    @State private var scanning = false
    @State private var cameraDenied = AVCaptureDevice.authorizationStatus(for: .video) == .denied
    @State private var pasting = false
    @State private var pasted = ""
    @State private var pasteError: String?

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            BrandMark(size: 76)
                .padding(.bottom, Space.xxl)
            Text("Pair with your Mac")
                .font(.display(44))
                .multilineTextAlignment(.center)
                .padding(.bottom, Space.m)
            Text("Review and approve your Shipreel videos from your phone. On your Mac, open Shipreel → Settings → iPhone and scan the code.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Space.xxl)
            Spacer()

            VStack(spacing: Space.m) {
                if cameraDenied {
                    Text("Camera access is off for Shipreel. Turn it on in Settings to scan, or paste the link.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                    Button("Open Settings") {
                        if let u = URL(string: UIApplication.openSettingsURLString) { openURL(u) }
                    }
                    .buttonStyle(.primary)
                } else {
                    Button {
                        startScan()
                    } label: {
                        Label("Scan the Code", systemImage: "qrcode.viewfinder")
                    }
                    .buttonStyle(.primary)
                    Text("The camera is used only to read this code.")
                        .font(.footnote)
                        .foregroundStyle(.tertiary)
                }
                Button("Paste Link") {
                    pasted = UIPasteboard.general.hasStrings ? (UIPasteboard.general.string ?? "") : ""
                    pasteError = nil
                    pasting = true
                }
                .buttonStyle(.secondary)
            }
            .padding(.horizontal, Space.xl)
            .padding(.bottom, Space.xxl)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Brand.ground.ignoresSafeArea())
        .fullScreenCover(isPresented: $scanning) {
            ScanSheet { code in
                scanning = false
                if let p = Pairing.parse(code) { store.pair(with: p) }
            }
        }
        .sheet(isPresented: $pasting) {
            NavigationStack {
                Form {
                    Section {
                        TextField("shipreel://pair?…", text: $pasted, axis: .vertical)
                            .lineLimit(3...6)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .font(.callout.monospaced())
                    } footer: {
                        Text(pasteError ?? "On your Mac: Settings → iPhone → Copy Pairing Link. Universal Clipboard brings it here.")
                            .foregroundStyle(pasteError == nil ? Color.secondary : Brand.danger)
                    }
                }
                .navigationTitle("Paste Link")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { pasting = false } }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Pair") {
                            if let p = Pairing.parse(pasted) {
                                pasting = false
                                store.pair(with: p)
                            } else {
                                pasteError = "That isn't a Shipreel pairing link. It starts with shipreel://pair"
                            }
                        }
                        .disabled(pasted.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
            }
            .presentationDetents([.medium])
        }
    }

    private func startScan() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: scanning = true
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { ok in
                Task { @MainActor in
                    if ok { scanning = true } else { cameraDenied = true }
                }
            }
        default: cameraDenied = true
        }
    }
}

struct ScanSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onCode: (String) -> Void

    var body: some View {
        ZStack {
            QRScanner(onCode: onCode).ignoresSafeArea()
            VStack {
                HStack {
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(width: 44, height: 44)
                            .background(.black.opacity(0.5), in: Circle())
                    }
                    .accessibilityLabel("Close")
                }
                .padding(Space.l)
                Spacer()
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .strokeBorder(Brand.lime, lineWidth: 4)
                    .frame(width: 250, height: 250)
                    .accessibilityHidden(true)
                Spacer()
                Text("Point at the code in Shipreel on your Mac")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .padding(.horizontal, Space.l)
                    .padding(.vertical, Space.m)
                    .background(.black.opacity(0.55), in: Capsule())
                    .padding(.bottom, Space.x4)
            }
        }
    }
}

/// The Mac can't be reached on Wi-Fi or through the tunnel.
struct UnreachableView: View {
    @Environment(PhoneStore.self) private var store
    let detail: String
    var unauthorized = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            Image(systemName: unauthorized ? "lock.trianglebadge.exclamationmark" : "wifi.exclamationmark")
                .font(.system(size: 44, weight: .regular))
                .foregroundStyle(.secondary)
                .padding(.bottom, Space.xxl)
            Text(unauthorized ? "Pair again" : "Can't reach your Mac")
                .font(.display(40))
                .multilineTextAlignment(.center)
                .padding(.bottom, Space.m)
            Text(unauthorized
                 ? "Your Mac made a new pairing code, so this phone needs to scan again."
                 : "Open Shipreel on your Mac, or join your home Wi-Fi. Away from home, the Mac has to be awake.")
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Space.xxl)
            Text(detail)
                .font(.footnote)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
                .padding(.top, Space.m)
                .padding(.horizontal, Space.xxl)
            Spacer()
            VStack(spacing: Space.m) {
                if unauthorized {
                    Button("Scan a New Code") { store.unpair() }.buttonStyle(.primary)
                } else {
                    Button("Try Again") { store.connect() }.buttonStyle(.primary)
                    Button("Pair Again") { store.unpair() }.buttonStyle(.secondary)
                }
            }
            .padding(.horizontal, Space.xl)
            .padding(.bottom, Space.xxl)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Brand.ground.ignoresSafeArea())
    }
}

struct ConnectingView: View {
    @State private var show = false
    var body: some View {
        VStack(spacing: Space.m) {
            ProgressView()
            Text("Finding your Mac…").foregroundStyle(.secondary)
        }
        .opacity(show ? 1 : 0)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Brand.ground.ignoresSafeArea())
        .task {
            try? await Task.sleep(for: .milliseconds(300))
            withAnimation(.easeOut(duration: 0.2)) { show = true }
        }
    }
}
