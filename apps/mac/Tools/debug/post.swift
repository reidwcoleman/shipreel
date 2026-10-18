// Sends one command to a Debug build of Shipreel (see Sources/DebugBridge.swift).
import Foundation
let cmd = CommandLine.arguments.dropFirst().joined(separator: " ")
DistributedNotificationCenter.default().postNotificationName(.init("com.reidcoleman.shipreel.debug"), object: cmd, userInfo: nil, deliverImmediately: true)
