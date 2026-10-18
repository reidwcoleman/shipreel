import AVFoundation
import AppKit
import Observation
import SwiftUI

/// One looping player shared by the Review screen.
@MainActor
@Observable
final class PlayerModel {
    let player = AVQueuePlayer()
    private var looper: AVPlayerLooper?
    private var observer: Any?
    private var statusObs: NSKeyValueObservation?
    private(set) var url: URL?

    var isPlaying = false
    var isMuted = UserDefaults.standard.bool(forKey: "muted") {
        didSet {
            player.isMuted = isMuted
            UserDefaults.standard.set(isMuted, forKey: "muted")
        }
    }
    var time: Double = 0
    var duration: Double = 0
    var isScrubbing = false
    var failed: String?
    var ready = false

    init() {
        player.isMuted = isMuted
        player.actionAtItemEnd = .advance
        observer = player.addPeriodicTimeObserver(forInterval: CMTime(value: 1, timescale: 30), queue: .main) { [weak self] t in
            MainActor.assumeIsolated {
                guard let self, !self.isScrubbing else { return }
                self.time = t.seconds.isFinite ? t.seconds : 0
                if let d = self.player.currentItem?.duration.seconds, d.isFinite, d > 0 { self.duration = d }
            }
        }
    }

    func load(_ url: URL?, autoplay: Bool = true) {
        guard url != self.url else { return }
        self.url = url
        player.pause()
        looper?.disableLooping()
        looper = nil
        player.removeAllItems()
        time = 0
        duration = 0
        failed = nil
        ready = false
        isPlaying = false
        guard let url else { return }
        let item = AVPlayerItem(url: url)
        looper = AVPlayerLooper(player: player, templateItem: item)
        statusObs = player.observe(\.currentItem?.status, options: [.new]) { [weak self] p, _ in
            let status = p.currentItem?.status
            let err = p.currentItem?.error?.localizedDescription
            Task { @MainActor in
                guard let self else { return }
                if status == .readyToPlay { self.ready = true }
                if status == .failed { self.failed = err ?? "This video couldn't be played." }
            }
        }
        if autoplay { play() }
    }

    func play() {
        guard url != nil else { return }
        player.play()
        isPlaying = true
    }

    func pause() {
        player.pause()
        isPlaying = false
    }

    func toggle() { isPlaying ? pause() : play() }
    func toggleMute() { isMuted.toggle() }

    func seek(to seconds: Double) {
        time = seconds
        player.seek(to: CMTime(seconds: seconds, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
    }
}

/// AVPlayerLayer host, no system controls.
struct PlayerSurface: NSViewRepresentable {
    let player: AVPlayer

    func makeNSView(context: Context) -> PlayerLayerView {
        let v = PlayerLayerView()
        v.playerLayer.player = player
        return v
    }

    func updateNSView(_ v: PlayerLayerView, context: Context) {
        if v.playerLayer.player !== player { v.playerLayer.player = player }
    }

    final class PlayerLayerView: NSView {
        let playerLayer = AVPlayerLayer()
        override init(frame: NSRect) {
            super.init(frame: frame)
            wantsLayer = true
            layer = CALayer()
            layer?.backgroundColor = NSColor.black.cgColor
            playerLayer.videoGravity = .resizeAspect
            layer?.addSublayer(playerLayer)
        }
        required init?(coder: NSCoder) { fatalError() }
        override func layout() {
            super.layout()
            CATransaction.begin()
            CATransaction.setDisableActions(true)
            playerLayer.frame = bounds
            CATransaction.commit()
        }
    }
}

/// The 9:16 frame with a hover play glyph; click toggles playback.
struct VideoFrame: View {
    @Bindable var model: PlayerModel
    let poster: URL?
    let aspect: CGFloat
    @State private var hover = false

    var body: some View {
        ZStack {
            Color.black
            if !model.ready, let poster {
                AsyncImage(url: poster) { img in img.resizable().aspectRatio(contentMode: .fit) } placeholder: { Color.black }
            }
            PlayerSurface(player: model.player)
                .opacity(model.ready ? 1 : 0)
            if let failed = model.failed {
                VStack(spacing: Space.s) {
                    Image(systemName: "exclamationmark.triangle").font(.title2)
                    Text("Can't play this video").font(.headline)
                    Text(failed).font(.caption).multilineTextAlignment(.center).foregroundStyle(.secondary)
                }
                .foregroundStyle(.white)
                .padding(Space.xxl)
            } else if !model.isPlaying || hover {
                Image(systemName: model.isPlaying ? "pause.fill" : "play.fill")
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 64, height: 64)
                    .background(.black.opacity(0.45), in: Circle())
                    .opacity(model.isPlaying ? (hover ? 0.9 : 0) : 1)
                    .allowsHitTesting(false)
            }
        }
        .aspectRatio(aspect, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: Radius.l, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.l, style: .continuous).strokeBorder(Brand.line, lineWidth: 1))
        .contentShape(Rectangle())
        .onTapGesture { model.toggle() }
        .onHover { h in withAnimation(.easeOut(duration: 0.15)) { hover = h } }
        .accessibilityElement()
        .accessibilityLabel("Video preview")
        .accessibilityValue(model.isPlaying ? "Playing" : "Paused")
        .accessibilityAddTraits(.startsMediaSession)
        .accessibilityAction { model.toggle() }
    }
}

/// Play/pause, time, scrubber, sound.
struct Transport: View {
    @Bindable var model: PlayerModel

    var body: some View {
        HStack(spacing: Space.m) {
            Button { model.toggle() } label: {
                Image(systemName: model.isPlaying ? "pause.fill" : "play.fill")
                    .frame(width: 20, height: 20)
            }
            .buttonStyle(.borderless)
            .help(model.isPlaying ? "Pause (Space)" : "Play (Space)")
            .accessibilityLabel(model.isPlaying ? "Pause" : "Play")

            Text(Fmt.duration(model.time))
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)
                .frame(width: 32, alignment: .trailing)

            Scrubber(model: model)

            Text(Fmt.duration(model.duration))
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)
                .frame(width: 32, alignment: .leading)

            Button { model.toggleMute() } label: {
                Image(systemName: model.isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                    .frame(width: 20, height: 20)
                    .contentTransition(.symbolEffect(.replace))
            }
            .buttonStyle(.borderless)
            .help(model.isMuted ? "Sound on (M)" : "Sound off (M)")
            .accessibilityLabel(model.isMuted ? "Turn sound on" : "Turn sound off")
        }
        .foregroundStyle(.primary)
    }
}

struct Scrubber: View {
    @Bindable var model: PlayerModel
    @State private var hover = false

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let p = model.duration > 0 ? min(max(model.time / model.duration, 0), 1) : 0
            ZStack(alignment: .leading) {
                Capsule().fill(Color.primary.opacity(0.14)).frame(height: 4)
                Capsule().fill(Color.primary.opacity(0.85)).frame(width: max(4, w * p), height: 4)
                Circle()
                    .fill(Color.primary)
                    .frame(width: 12, height: 12)
                    .offset(x: w * p - 6)
                    .opacity(hover || model.isScrubbing ? 1 : 0)
            }
            .frame(height: geo.size.height)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { v in
                        model.isScrubbing = true
                        guard model.duration > 0 else { return }
                        model.seek(to: min(max(v.location.x / w, 0), 1) * model.duration)
                    }
                    .onEnded { _ in model.isScrubbing = false }
            )
            .onHover { hover = $0 }
        }
        .frame(height: 20)
        .accessibilityElement()
        .accessibilityLabel("Playback position")
        .accessibilityValue("\(Fmt.duration(model.time)) of \(Fmt.duration(model.duration))")
        .accessibilityAdjustableAction { dir in
            let step = 1.0
            model.seek(to: min(max(model.time + (dir == .increment ? step : -step), 0), model.duration))
        }
    }
}

/// Carousel slides with arrows, dots, swipe and ←/→.
struct CarouselStage: View {
    let slides: [URL]
    let aspect: CGFloat
    @Binding var index: Int
    @State private var drag: CGFloat = 0
    @State private var hover = false

    var body: some View {
        VStack(spacing: Space.m) {
            GeometryReader { geo in
                let w = geo.size.width
                HStack(spacing: 0) {
                    ForEach(Array(slides.enumerated()), id: \.offset) { _, url in
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let img): img.resizable().aspectRatio(contentMode: .fit)
                            case .failure: Label("Slide didn't load", systemImage: "photo").foregroundStyle(.secondary)
                            default: ProgressView().controlSize(.small)
                            }
                        }
                        .frame(width: w, height: geo.size.height)
                    }
                }
                .offset(x: -CGFloat(index) * w + drag)
                .animation(.spring(duration: 0.35, bounce: 0), value: index)
                .gesture(
                    DragGesture(minimumDistance: 10)
                        .onChanged { drag = $0.translation.width }
                        .onEnded { v in
                            let projected = v.predictedEndTranslation.width
                            if projected < -w / 3 { index = min(index + 1, slides.count - 1) }
                            if projected > w / 3 { index = max(index - 1, 0) }
                            withAnimation(.spring(duration: 0.35, bounce: 0)) { drag = 0 }
                        }
                )
            }
            .background(Color.black)
            .aspectRatio(aspect, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: Radius.l, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.l, style: .continuous).strokeBorder(Brand.line, lineWidth: 1))
            .overlay(alignment: .leading) { arrow("chevron.left", -1).padding(Space.m).opacity(hover && index > 0 ? 1 : 0) }
            .overlay(alignment: .trailing) { arrow("chevron.right", 1).padding(Space.m).opacity(hover && index < slides.count - 1 ? 1 : 0) }
            .onHover { h in withAnimation(.easeOut(duration: 0.15)) { hover = h } }

            HStack(spacing: Space.s) {
                ForEach(slides.indices, id: \.self) { i in
                    Circle()
                        .fill(i == index ? Color.primary : Color.primary.opacity(0.25))
                        .frame(width: 6, height: 6)
                        .onTapGesture { index = i }
                }
            }
            .accessibilityElement()
            .accessibilityLabel("Slide \(index + 1) of \(slides.count)")
            .accessibilityAdjustableAction { dir in
                index = dir == .increment ? min(index + 1, slides.count - 1) : max(index - 1, 0)
            }
        }
    }

    private func arrow(_ symbol: String, _ d: Int) -> some View {
        Button {
            index = min(max(index + d, 0), slides.count - 1)
        } label: {
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(.black.opacity(0.5), in: Circle())
        }
        .buttonStyle(.plain)
        .help(d < 0 ? "Previous slide (←)" : "Next slide (→)")
        .accessibilityLabel(d < 0 ? "Previous slide" : "Next slide")
    }
}
