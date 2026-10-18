import CoreText
import SwiftUI
import UIKit

// Shipreel brand (docs/index.html): near-black ground, lime for the one primary action.
// The phone app is dark only, like the brand.

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255,
                  opacity: alpha)
    }
}

enum Brand {
    static let ground = Color(hex: 0x0A0A09)
    static let panel = Color(hex: 0x11110F)
    static let raised = Color(hex: 0x191A17)
    static let line = Color(hex: 0x262724)
    static let lineStrong = Color(hex: 0x3A3B37)
    static let lime = Color(hex: 0xD2FC4A)
    static let limeInk = Color(hex: 0x131904)
    static let accent = lime
    static let accentSoft = Color(hex: 0xD2FC4A, alpha: 0.14)
    static let success = Color(hex: 0x6EE7A0)
    static let warning = Color(hex: 0xF5C451)
    static let danger = Color(hex: 0xF58A84)
    static let terminal = Color(hex: 0x070807)
    static let terminalText = Color(hex: 0xD9DBD4)
    static let terminalDim = Color(hex: 0x8B8D88)
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
}

enum Radius {
    static let s: CGFloat = 8
    static let m: CGFloat = 12
    static let l: CGFloat = 16
}

extension Font {
    /// Instrument Serif (SIL OFL 1.1, bundled) for big headings only.
    static func display(_ size: CGFloat) -> Font {
        .custom("InstrumentSerif-Regular", size: size, relativeTo: .largeTitle)
    }
}

enum Fonts {
    static func register() {
        guard let url = Bundle.main.url(forResource: "InstrumentSerif-Regular", withExtension: "ttf") else { return }
        CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
    }
}

/// The one lime action on a screen.
struct PrimaryButtonStyle: ButtonStyle {
    var compact = false
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(Brand.limeInk)
            .frame(maxWidth: compact ? nil : .infinity)
            .frame(height: compact ? 44 : 52)
            .padding(.horizontal, compact ? Space.xl : 0)
            .background(Capsule().fill(Brand.lime).brightness(configuration.isPressed ? -0.08 : 0))
            .opacity(isEnabled ? 1 : 0.4)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    var compact = false
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.primary)
            .frame(maxWidth: compact ? nil : .infinity)
            .frame(height: compact ? 44 : 52)
            .padding(.horizontal, compact ? Space.xl : 0)
            .background(Capsule().fill(Color.white.opacity(configuration.isPressed ? 0.18 : 0.11)))
            .opacity(isEnabled ? 1 : 0.4)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var primary: PrimaryButtonStyle { PrimaryButtonStyle() }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
    static var secondary: SecondaryButtonStyle { SecondaryButtonStyle() }
}

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

struct BrandMark: View {
    var size: CGFloat = 72
    var body: some View {
        Image("Mark")
            .resizable()
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

/// Wrapping row of chips.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxW = proposal.width ?? 360
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

struct Chips: View {
    let items: [String]
    var selected: Set<String> = []
    let tap: (String) -> Void

    var body: some View {
        FlowLayout(spacing: 8) {
            ForEach(items, id: \.self) { q in
                let on = selected.contains(q)
                Button { tap(q) } label: {
                    Text(q)
                        .font(.subheadline)
                        .padding(.horizontal, 12)
                        .frame(minHeight: 34)
                        .foregroundStyle(on ? Brand.lime : .primary)
                        .background(Capsule().fill(on ? Brand.accentSoft : Color.white.opacity(0.08)))
                        .overlay(Capsule().strokeBorder(on ? Brand.lime.opacity(0.6) : .clear))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }
}

struct Thumb: View {
    let url: URL?
    var body: some View {
        ZStack {
            Rectangle().fill(Brand.raised)
            if let url {
                AsyncImage(url: url) { img in img.resizable().aspectRatio(contentMode: .fill) } placeholder: { Color.clear }
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
    }
}
