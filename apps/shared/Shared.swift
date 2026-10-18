import Foundation
import Observation

// Review/post/create state shared by the Mac and iPhone apps.

enum WhenChoice: String, CaseIterable, Identifiable {
    case now, nextSlot, pick
    var id: String { rawValue }
    var label: String {
        switch self {
        case .now: "Now"
        case .nextSlot: "Next slot"
        case .pick: "Pick a time"
        }
    }
}

/// The user's edits to one item before approving it.
struct Draft: Equatable {
    var captions: Captions
    var youtubeTitle: String
    var platforms: Set<Platform>
    var platformsTouched = false
    var when: WhenChoice = .now
    var date: Date
    var dryRun: Bool
}

struct TermLine: Identifiable, Equatable {
    let id: Int
    let text: String
}

@Observable
final class CreateRun {
    enum Status: Equatable { case starting, running, done, failed(String), stopped }
    var id: String?
    var prompt: String
    var projectName: String?
    var lines: [TermLine] = []
    var status: Status = .starting
    var videoIds: [String] = []
    var started = Date()
    var ended: Date?

    init(prompt: String, projectName: String?) {
        self.prompt = prompt
        self.projectName = projectName
    }

    var isActive: Bool { status == .starting || status == .running }

    func append(_ text: String) {
        for part in text.split(separator: "\n", omittingEmptySubsequences: false) {
            lines.append(TermLine(id: lines.count, text: String(part)))
        }
        if lines.count > 4000 { lines.removeFirst(lines.count - 4000) }
    }
}


// MARK: - Approve gate (shared by both apps)

extension PostboxStatus {
    /// Postbox can actually post: its daemon answers and the Chrome extension is connected.
    var readyToPost: Bool { daemon && self.extension == true }
}

/// What “Approve” will do for a draft, and whether it's allowed right now. Posting *now* needs a
/// working Postbox; a later time or a dry run is always allowed.
enum ApproveRules {
    static func title(_ d: Draft) -> String {
        if d.dryRun { return "Approve · Dry run" }
        return d.when == .now ? "Approve & Post" : "Approve & Schedule"
    }

    /// nil when allowed; otherwise why not, with the fix.
    static func blocked(_ d: Draft, postbox: PostboxStatus?, postboxError: String?) -> String? {
        guard d.when == .now, !d.dryRun else { return nil }
        guard let pb = postbox else {
            return postboxError == nil
                ? "Checking Postbox… Posting now waits until it answers."
                : "Postbox can't post yet: Shipreel couldn't check it. Pick a later time or use Dry run."
        }
        if !pb.daemon { return "Postbox can't post yet: it isn't running on your Mac (Accounts)." }
        if pb.extension != true { return "Postbox can't post yet: connect its Chrome extension (Accounts)." }
        return nil
    }
}
