import Foundation

// Types from apps/REVIEW-API.md. Decoding is lenient: anything the server leaves out
// gets a sensible default so a slightly different server never blanks the app.

enum Platform: String, Codable, CaseIterable, Identifiable, Hashable {
    case tiktok, instagram, youtube
    var id: String { rawValue }

    var name: String {
        switch self {
        case .tiktok: "TikTok"
        case .instagram: "Instagram"
        case .youtube: "YouTube"
        }
    }

    var symbol: String {
        switch self {
        case .tiktok: "music.note"
        case .instagram: "camera"
        case .youtube: "play.rectangle"
        }
    }

    static func named(_ raw: String) -> Platform? { Platform(rawValue: raw.lowercased()) }
}

enum ReviewStatus: String, Codable {
    case pending, approved, rejected, revising, unknown

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = ReviewStatus(rawValue: raw) ?? .unknown
    }
}

struct Review: Codable, Hashable {
    var status: ReviewStatus
    var note: String?
    var at: String?
    var postId: String?
}

struct Captions: Codable, Hashable {
    var tiktok: String = ""
    var instagram: String = ""
    var youtube: String = ""

    init(tiktok: String = "", instagram: String = "", youtube: String = "") {
        self.tiktok = tiktok; self.instagram = instagram; self.youtube = youtube
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        tiktok = (try? c.decodeIfPresent(String.self, forKey: .tiktok)) ?? ""
        instagram = (try? c.decodeIfPresent(String.self, forKey: .instagram)) ?? ""
        youtube = (try? c.decodeIfPresent(String.self, forKey: .youtube)) ?? ""
    }

    subscript(p: Platform) -> String {
        get {
            switch p {
            case .tiktok: tiktok
            case .instagram: instagram
            case .youtube: youtube
            }
        }
        set {
            switch p {
            case .tiktok: tiktok = newValue
            case .instagram: instagram = newValue
            case .youtube: youtube = newValue
            }
        }
    }
}

struct PostResult: Codable, Hashable {
    var platform: String
    var ok: Bool
    var url: String?
    var error: String?
    var note: String?
    var mode: String?
}

enum PostState: String {
    case scheduled, rendering, posting, posted, partial, failed, cancelled, needsYou = "needs-you", unknown

    init(raw: String) {
        if raw == "canceled" { self = .cancelled } else { self = PostState(rawValue: raw) ?? .unknown }
    }

    var label: String {
        switch self {
        case .scheduled: "Scheduled"
        case .rendering: "Rendering"
        case .posting: "Posting"
        case .posted: "Posted"
        case .partial: "Partly posted"
        case .failed: "Failed"
        case .cancelled: "Cancelled"
        case .needsYou: "Needs you"
        case .unknown: "Unknown"
        }
    }

    var symbol: String {
        switch self {
        case .scheduled: "clock"
        case .rendering, .posting: "arrow.up.circle"
        case .posted: "checkmark.circle.fill"
        case .partial: "exclamationmark.circle"
        case .failed: "xmark.octagon"
        case .cancelled: "minus.circle"
        case .needsYou: "hand.raised"
        case .unknown: "questionmark.circle"
        }
    }

    var needsAttention: Bool { self == .failed || self == .partial || self == .needsYou }
}

struct PostSummary: Codable, Hashable {
    var id: String
    var status: String
    var scheduledAt: String?
    var platforms: [String]
    var results: [PostResult]
    var dryRun: Bool?

    var state: PostState { PostState(raw: status) }
    var scheduledDate: Date? { scheduledAt.flatMap(ISODate.parse) }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        status = (try? c.decode(String.self, forKey: .status)) ?? "unknown"
        scheduledAt = try? c.decodeIfPresent(String.self, forKey: .scheduledAt)
        platforms = (try? c.decodeIfPresent([String].self, forKey: .platforms)) ?? []
        results = (try? c.decodeIfPresent([PostResult].self, forKey: .results)) ?? []
        dryRun = try? c.decodeIfPresent(Bool.self, forKey: .dryRun)
    }
}

struct ReviewItem: Codable, Identifiable, Hashable {
    var projectId: String
    var projectName: String
    var appIcon: String?
    var videoId: String
    var title: String
    var hook: String
    var formatId: String
    var formatName: String
    var kind: String
    var aspect: String
    var durationSec: Double
    var hookScore: Double?
    var mp4Url: String?
    var thumbUrl: String?
    var slideUrls: [String]
    var captions: Captions
    var youtubeTitle: String
    var soundTip: String?
    var review: Review
    var renderStatus: String
    var renderProgress: Double?
    var createdAt: String
    var source: String
    var post: PostSummary?

    var id: String { "\(projectId)/\(videoId)" }
    var isCarousel: Bool { kind == "slideshow" && !slideUrls.isEmpty }
    var mp4: URL? { mp4Url.flatMap(URL.init(string:)) }
    var thumb: URL? { thumbUrl.flatMap(URL.init(string:)) }
    var slides: [URL] { slideUrls.compactMap(URL.init(string:)) }
    var created: Date? { ISODate.parse(createdAt) }
    var reviewedAt: Date? { review.at.flatMap(ISODate.parse) }

    /// Width / height of the rendered video.
    var aspectRatio: CGFloat {
        let parts = aspect.split(separator: ":").compactMap { Double($0) }
        guard parts.count == 2, parts[1] > 0 else { return 9.0 / 16.0 }
        return CGFloat(parts[0] / parts[1])
    }

    var displayHook: String { hook.isEmpty ? title : hook }
    var madeBy: String {
        switch source {
        case "claude": "Claude"
        case "codex": "Codex"
        case "manual": "You"
        default: "Template"
        }
    }

    enum CodingKeys: String, CodingKey {
        case projectId, projectName, appIcon, videoId, title, hook, formatId, formatName, kind, aspect, durationSec,
             hookScore, mp4Url, thumbUrl, slideUrls, captions, youtubeTitle, soundTip, review, renderStatus,
             renderProgress, createdAt, source, post
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func s(_ k: CodingKeys, _ d: String = "") -> String { (try? c.decodeIfPresent(String.self, forKey: k)) ?? d }
        projectId = try c.decode(String.self, forKey: .projectId)
        videoId = try c.decode(String.self, forKey: .videoId)
        projectName = s(.projectName, projectId)
        appIcon = try? c.decodeIfPresent(String.self, forKey: .appIcon)
        title = s(.title)
        hook = s(.hook)
        formatId = s(.formatId)
        formatName = s(.formatName, formatId)
        kind = s(.kind, "video")
        aspect = s(.aspect, "9:16")
        durationSec = (try? c.decodeIfPresent(Double.self, forKey: .durationSec)) ?? 0
        hookScore = try? c.decodeIfPresent(Double.self, forKey: .hookScore)
        mp4Url = try? c.decodeIfPresent(String.self, forKey: .mp4Url)
        thumbUrl = try? c.decodeIfPresent(String.self, forKey: .thumbUrl)
        slideUrls = (try? c.decodeIfPresent([String].self, forKey: .slideUrls)) ?? []
        captions = (try? c.decodeIfPresent(Captions.self, forKey: .captions)) ?? Captions()
        youtubeTitle = s(.youtubeTitle, title)
        soundTip = try? c.decodeIfPresent(String.self, forKey: .soundTip)
        review = (try? c.decodeIfPresent(Review.self, forKey: .review)) ?? Review(status: .pending)
        renderStatus = s(.renderStatus, "rendered")
        renderProgress = try? c.decodeIfPresent(Double.self, forKey: .renderProgress)
        createdAt = s(.createdAt)
        source = s(.source, "template")
        post = try? c.decodeIfPresent(PostSummary.self, forKey: .post)
    }
}

struct ReviewList: Decodable {
    var items: [ReviewItem]
    var counts: [String: Int]

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        // Skip items that fail to decode instead of failing the whole list.
        var arr = try c.nestedUnkeyedContainer(forKey: .items)
        var out: [ReviewItem] = []
        while !arr.isAtEnd {
            if let item = try? arr.decode(ReviewItem.self) { out.append(item) } else { _ = try? arr.decode(Skip.self) }
        }
        items = out
        counts = (try? c.decodeIfPresent([String: Int].self, forKey: .counts)) ?? [:]
    }

    enum CodingKeys: String, CodingKey { case items, counts }
    private struct Skip: Decodable {}
}

struct PostboxAccount: Codable, Hashable, Identifiable {
    var id: String
    var name: String
    var connected: Bool?
    var platform: Platform? { Platform.named(id) }
}

struct PostboxStatus: Codable, Hashable {
    var daemon: Bool
    var `extension`: Bool?
    var accounts: [PostboxAccount]
    var dashboardUrl: String?

    func account(_ p: Platform) -> PostboxAccount? { accounts.first { $0.id == p.rawValue } }
    var dashboard: URL { URL(string: dashboardUrl ?? "http://127.0.0.1:4710") ?? URL(string: "http://127.0.0.1:4710")! }
}

struct ProjectInfo: Codable, Hashable, Identifiable {
    var id: String
    var name: String
    var icon: String?

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = (try? c.decodeIfPresent(String.self, forKey: .name)) ?? id
        icon = try? c.decodeIfPresent(String.self, forKey: .icon)
    }
}

struct CreateStart: Decodable { var runId: String }

struct CreateRunInfo: Decodable {
    var id: String
    var status: String
    var prompt: String?
    var output: String?
    var videoIds: [String]?
}

struct MessageReply: Decodable { var message: String? }

/// A native Shipreel format the Create box can ask for.
struct FormatChoice: Identifiable, Hashable {
    let id: String
    let name: String

    static let all: [FormatChoice] = [
        .init(id: "raw-demo", name: "Raw demo"),
        .init(id: "found-this", name: "Found this"),
        .init(id: "text-card", name: "Text card"),
        .init(id: "mental-load", name: "Mental load"),
        .init(id: "that-girl", name: "That girl"),
        .init(id: "ditch-old-way", name: "Ditch the old way"),
        .init(id: "backdrop-pov", name: "Backdrop POV"),
        .init(id: "setup-receipts", name: "Carousel"),
    ]
}

enum ISODate {
    private static let frac: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let plain = ISO8601DateFormatter()

    static func parse(_ s: String) -> Date? { frac.date(from: s) ?? plain.date(from: s) }
    static func string(_ d: Date) -> String { frac.string(from: d) }
}

enum Fmt {
    static func duration(_ sec: Double) -> String {
        guard sec.isFinite, sec >= 0 else { return "0:00" }
        let s = Int(sec.rounded(.down))
        return String(format: "%d:%02d", s / 60, s % 60)
    }

    /// "now", "6m", "2h", "3d".
    static func age(_ date: Date?, now: Date = .now) -> String {
        guard let date else { return "" }
        let s = max(0, now.timeIntervalSince(date))
        if s < 60 { return "now" }
        if s < 3600 { return "\(Int(s / 60))m" }
        if s < 86400 { return "\(Int(s / 3600))h" }
        return "\(Int(s / 86400))d"
    }

    /// "Today 4:00 PM", "Tomorrow 9:00 AM", "Sat, Oct 18 4:00 PM".
    static func when(_ date: Date?) -> String {
        guard let date else { return "" }
        let cal = Calendar.current
        let time = date.formatted(date: .omitted, time: .shortened)
        if cal.isDateInToday(date) { return "Today \(time)" }
        if cal.isDateInTomorrow(date) { return "Tomorrow \(time)" }
        if cal.isDateInYesterday(date) { return "Yesterday \(time)" }
        return date.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day().hour().minute())
    }

    static func list(_ names: [String]) -> String {
        ListFormatter.localizedString(byJoining: names)
    }
}
