import AVFoundation
import Observation
import SwiftUI
import UIKit

/// One looping player for the feed; only the visible page shows it.
@MainActor
@Observable
final class PhonePlayer {
    let player = AVQueuePlayer()
    private var looper: AVPlayerLooper?
    private var observer: Any?
    private var statusObs: NSKeyValueObservation?
    private(set) var url: URL?

    var isPlaying = false
    var ready = false
    var failed: String?
    var progress: Double = 0
    var isMuted = UserDefaults.standard.bool(forKey: "muted") {
        didSet {
            player.isMuted = isMuted
            UserDefaults.standard.set(isMuted, forKey: "muted")
        }
    }

    init() {
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
        player.isMuted = isMuted
        observer = player.addPeriodicTimeObserver(forInterval: CMTime(value: 1, timescale: 20), queue: .main) { [weak self] t in
            MainActor.assumeIsolated {
                guard let self, let d = self.player.currentItem?.duration.seconds, d.isFinite, d > 0 else { return }
                self.progress = min(max(t.seconds / d, 0), 1)
            }
        }
    }

    func load(_ url: URL?) {
        guard url != self.url else { return }
        self.url = url
        player.pause()
        looper?.disableLooping()
        looper = nil
        player.removeAllItems()
        ready = false
        failed = nil
        progress = 0
        isPlaying = false
        guard let url else { return }
        try? AVAudioSession.sharedInstance().setActive(true)
        looper = AVPlayerLooper(player: player, templateItem: AVPlayerItem(url: url))
        statusObs = player.observe(\.currentItem?.status, options: [.new]) { [weak self] p, _ in
            let status = p.currentItem?.status
            let err = p.currentItem?.error?.localizedDescription
            Task { @MainActor in
                if status == .readyToPlay { self?.ready = true }
                if status == .failed { self?.failed = err ?? "This video couldn't be played." }
            }
        }
        play()
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
}

struct PlayerSurface: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context: Context) -> PlayerView {
        let v = PlayerView()
        v.playerLayer.player = player
        v.playerLayer.videoGravity = .resizeAspect
        v.backgroundColor = .black
        return v
    }

    func updateUIView(_ v: PlayerView, context: Context) {
        if v.playerLayer.player !== player { v.playerLayer.player = player }
    }

    final class PlayerView: UIView {
        override static var layerClass: AnyClass { AVPlayerLayer.self }
        var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
    }
}
