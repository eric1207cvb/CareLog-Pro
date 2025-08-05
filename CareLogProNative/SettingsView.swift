// SettingsView.swift

import SwiftUI

// 我們再次使用 enum 來定義可選的項目，安全又清晰
enum Appearance: String, CaseIterable, Identifiable {
    case light = "淺色模式"
    case dark = "深色模式"
    case system = "跟隨系統"
    
    var id: String { self.rawValue }
}

struct SettingsView: View {
    // 使用 @AppStorage 來讀取或寫入名為 "appearance" 的設定值
    // 如果是第一次讀取，預設值為 .system
    @AppStorage("appearance") private var appearance: Appearance = .system
    
    // 用於關閉視窗
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("外觀設定")) {
                    // 建立一個選擇器，綁定到我們的 appearance 變數
                    Picker("模式", selection: $appearance) {
                        ForEach(Appearance.allCases) { appearance in
                            Text(appearance.rawValue).tag(appearance)
                        }
                    }
                    .pickerStyle(.inline) // 使用內聯樣式，更清晰
                    .labelsHidden() // 隱藏 Picker 左邊的 "模式" 文字
                }
            }
            .navigationTitle("設定")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成") {
                        dismiss()
                    }
                }
            }
        }
    }
}
