// shipreel-airdrop: open the macOS AirDrop picker with one or more files.
//
//   swiftc -O scripts/airdrop.swift -o workspace/.bin/shipreel-airdrop
//   shipreel-airdrop [--dry-run] <file> [<file>…]
//
// Prints one line and exits: "OK sent", "OK dry-run", "CANCELED", or "ERR <reason>".
// --dry-run checks that AirDrop can take the files without opening the picker.
import AppKit

let args = Array(CommandLine.arguments.dropFirst())
let dryRun = args.contains("--dry-run")
let urls = args.filter { $0 != "--dry-run" }.map { URL(fileURLWithPath: $0) }

func finish(_ line: String, _ code: Int32) -> Never {
  print(line)
  fflush(stdout)
  exit(code)
}

if urls.isEmpty { finish("ERR no files given", 64) }
for u in urls where !FileManager.default.fileExists(atPath: u.path) { finish("ERR file not found: \(u.path)", 66) }

final class Sender: NSObject, NSApplicationDelegate, NSSharingServiceDelegate {
  func applicationDidFinishLaunching(_ notification: Notification) {
    guard let service = NSSharingService(named: .sendViaAirDrop) else { finish("ERR AirDrop isn't available on this Mac", 69) }
    guard service.canPerform(withItems: urls) else { finish("ERR AirDrop can't send this file. Turn on Wi-Fi and Bluetooth, and set AirDrop to Contacts Only or Everyone in Control Center.", 69) }
    if dryRun { finish("OK dry-run", 0) }
    service.delegate = self
    NSApp.activate(ignoringOtherApps: true)
    service.perform(withItems: urls)
  }

  func sharingService(_ sharingService: NSSharingService, didShareItems items: [Any]) { finish("OK sent", 0) }

  func sharingService(_ sharingService: NSSharingService, didFailToShareItems items: [Any], error: Error) {
    let ns = error as NSError
    if ns.code == NSUserCancelledError { finish("CANCELED", 0) }
    finish("ERR \(ns.localizedDescription)", 1)
  }

  func sharingService(_ sharingService: NSSharingService, sourceWindowForShareItems items: [Any], sharingContentScope: UnsafeMutablePointer<NSSharingService.SharingContentScope>) -> NSWindow? {
    nil
  }
}

let app = NSApplication.shared
let sender = Sender()
app.delegate = sender
// No Dock icon or menu bar: the AirDrop sheet is the only window.
app.setActivationPolicy(.accessory)
// Give up if nobody picks a device within 10 minutes.
DispatchQueue.main.asyncAfter(deadline: .now() + 600) { finish("CANCELED", 0) }
app.run()
