import AppKit
import CoreText
import SwiftUI

// Shipreel brand tokens, taken from docs/index.html (OKLCH converted to sRGB).
// Dark is the brand ground; light is a designed counterpart, not an inversion.

extension NSColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1) {
        self.init(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255,
                  green: CGFloat((hex >> 8) & 0xFF) / 255,
                  blue: CGFloat(hex & 0xFF) / 255,
                  alpha: alpha)
    }

    static func brand(dark: UInt32, light: UInt32, alpha: CGFloat = 1) -> NSColor {
        NSColor(name: nil) { appearance in
            appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
                ? NSColor(hex: dark, alpha: alpha) : NSColor(hex: light, alpha: alpha)
        }
    }
}

enum Brand {
    /// Page ground (--bg).
    static let ground = Color(nsColor: .brand(dark: 0x0A0A09, light: 0xFAFAF8))
    /// Panels (--panel).
    static let panel = Color(nsColor: .brand(dark: 0x11110F, light: 0xF3F4F0))
    /// Raised surfaces (--raised).
    static let raised = Color(nsColor: .brand(dark: 0x191A17, light: 0xFFFFFF))
    /// Hairlines (--line, --line-strong).
    static let line = Color(nsColor: .brand(dark: 0x262724, light: 0xDDDFDA))
    static let lineStrong = Color(nsColor: .brand(dark: 0x3A3B37, light: 0xC3C5BF))
    /// The lime. Used as a fill for the one primary action and the brand mark.
    static let lime = Color(nsColor: .brand(dark: 0xD2FC4A, light: 0xC8F23C))
    static let limeInk = Color(nsColor: NSColor(hex: 0x131904))
    /// Accent for text and icons (lime on dark, olive on light so it stays readable).
    static let accent = Color(nsColor: .brand(dark: 0xD2FC4A, light: 0x577600))
    static let accentSoft = Color(nsColor: .brand(dark: 0xD2FC4A, light: 0x577600, alpha: 0.12))

    // Semantic status colors (always paired with an icon and a word).
    static let success = Color(nsColor: .brand(dark: 0x6EE7A0, light: 0x15803D))
    static let warning = Color(nsColor: .brand(dark: 0xF5C451, light: 0xB45309))
    static let danger = Color(nsColor: .brand(dark: 0xF58A84, light: 0xC9302C))

    /// The terminal pane stays dark in both appearances.
    static let terminal = Color(nsColor: NSColor(hex: 0x070807))
    static let terminalText = Color(nsColor: NSColor(hex: 0xD9DBD4))
    static let terminalDim = Color(nsColor: NSColor(hex: 0x8B8D88))
}

enum Space {
    static let xs: CGFloat = 4
    static let s: CGFloat = 8
    static let m: CGFloat = 12
    static let l: CGFloat = 16
    static let xl: CGFloat = 20
    static let xxl: CGFloat = 24
    static let x3: CGFloat = 32
    static let x4: CGFloat = 40
    static let x5: CGFloat = 48
}

enum Radius {
    static let s: CGFloat = 6
    static let m: CGFloat = 10
    static let l: CGFloat = 16
}

extension Font {
    /// Instrument Serif (SIL OFL 1.1, bundled) for big headings only.
    static func display(_ size: CGFloat) -> Font {
        .custom(Fonts.displayName, size: size, relativeTo: .largeTitle)
    }
}

enum Fonts {
    static let displayName = "InstrumentSerif-Regular"

    static func register() {
        guard let url = Bundle.main.url(forResource: "InstrumentSerif-Regular", withExtension: "ttf") else { return }
        CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
    }
}

// MARK: - Buttons

/// The single lime primary action per view.
struct PrimaryButtonStyle: ButtonStyle {
    var wide = false
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundStyle(Brand.limeInk)
            .padding(.horizontal, Space.l)
            .padding(.vertical, Space.s)
            .frame(maxWidth: wide ? .infinity : nil)
            .background(
                RoundedRectangle(cornerRadius: Radius.s + 2, style: .continuous)
                    .fill(Brand.lime)
                    .brightness(configuration.isPressed ? -0.08 : 0)
            )
            .opacity(isEnabled ? 1 : 0.4)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
            .contentShape(Rectangle())
    }
}

/// Neutral secondary button that matches the primary's height.
struct SecondaryButtonStyle: ButtonStyle {
    var tint: Color? = nil
    @Environment(\.isEnabled) private var isEnabled
    @State private var hover = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.medium))
            .foregroundStyle(tint ?? Color.primary)
            .padding(.horizontal, Space.l)
            .padding(.vertical, Space.s)
            .background(
                RoundedRectangle(cornerRadius: Radius.s + 2, style: .continuous)
                    .fill(Color.primary.opacity(configuration.isPressed ? 0.14 : hover ? 0.10 : 0.07))
            )
            .opacity(isEnabled ? 1 : 0.4)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
            .onHover { hover = $0 }
            .contentShape(Rectangle())
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var primary: PrimaryButtonStyle { PrimaryButtonStyle() }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
    static var secondary: SecondaryButtonStyle { SecondaryButtonStyle() }
}

/// Small uppercase section label (secondary, tracked).
struct SectionLabel: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text.uppercased())
            .font(.caption.weight(.semibold))
            .tracking(0.8)
            .foregroundStyle(.secondary)
    }
}

/// Keyboard shortcut hint, e.g. ⌘↩.
struct KeyHint: View {
    let keys: String
    var body: some View {
        Text(keys)
            .font(.caption.weight(.medium))
            .foregroundStyle(.tertiary)
            .monospacedDigit()
    }
}
