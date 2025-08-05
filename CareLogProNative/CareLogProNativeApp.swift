// CareLogProNativeApp.swift

import SwiftUI
import SwiftData

@main
struct CareLogProNativeApp: App {
    // 使用 @AppStorage 讀取我們在 SettingsView 中儲存的同一個值
    @AppStorage("appearance") private var appearance: Appearance = .system
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                // 【新增】使用 .preferredColorScheme 修飾符來改變 App 外觀
                .preferredColorScheme(
                    appearance == .dark ? .dark :
                    appearance == .light ? .light :
                    nil // nil 代表跟隨系統設定
                )
        }
        .modelContainer(for: [Patient.self, CareLog.self])
    }
}
