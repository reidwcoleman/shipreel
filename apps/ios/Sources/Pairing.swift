import Foundation
import Security

/// What the phone needs to reach Shipreel on the Mac (from shipreel://pair?t=…&lan=…&tunnel=…).
struct Pairing: Codable, Equatable {
    var token: String
    var lanUrls: [String]
    var tunnelUrl: String?
    var mac: String?

    static func parse(_ text: String) -> Pairing? {
        let s = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let comps = URLComponents(string: s), comps.scheme == "shipreel", comps.host == "pair" else { return nil }
        let q = comps.queryItems ?? []
        guard let token = q.first(where: { $0.name == "t" })?.value, !token.isEmpty else { return nil }
        let lan = q.filter { $0.name == "lan" }.compactMap(\.value).filter { URL(string: $0)?.host != nil }
        let tunnel = q.first(where: { $0.name == "tunnel" })?.value.flatMap { URL(string: $0)?.host != nil ? $0 : nil }
        guard !lan.isEmpty || tunnel != nil else { return nil }
        return Pairing(token: token, lanUrls: lan, tunnelUrl: tunnel)
    }
}

/// The pairing (with its token) lives in the Keychain, this device only.
enum PairingStore {
    private static let service = "com.reidcoleman.shipreel.phone"
    private static let account = "pairing"

    static func load() -> Pairing? {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                kSecAttrService as String: service,
                                kSecAttrAccount as String: account,
                                kSecReturnData as String: true,
                                kSecMatchLimit as String: kSecMatchLimitOne]
        var out: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return try? JSONDecoder().decode(Pairing.self, from: data)
    }

    static func save(_ p: Pairing) {
        guard let data = try? JSONEncoder().encode(p) else { return }
        let base: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                   kSecAttrService as String: service,
                                   kSecAttrAccount as String: account]
        let attrs: [String: Any] = [kSecValueData as String: data,
                                    kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        if SecItemUpdate(base as CFDictionary, attrs as CFDictionary) == errSecItemNotFound {
            SecItemAdd(base.merging(attrs) { $1 } as CFDictionary, nil)
        }
    }

    static func clear() {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                kSecAttrService as String: service,
                                kSecAttrAccount as String: account]
        SecItemDelete(q as CFDictionary)
    }
}
