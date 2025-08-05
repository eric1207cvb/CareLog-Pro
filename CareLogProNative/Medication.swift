// Medication.swift

import Foundation

// 【新增】定義一個用藥方式的列舉 (Enum)
// CaseIterable 讓我們可以遍歷所有選項 (用於 Picker)
enum MedicationRoute: String, CaseIterable, Codable {
    case oral = "口服"
    case injection = "針劑"
    case topical = "塗抹"
    case spray = "噴劑"
    case inhaled = "吸入"
    case other = "其他"
}

struct Medication: Identifiable, Codable {
    var id = UUID()
    var name: String = ""
    var dosage: String = "" // 劑量/頻率
    var route: MedicationRoute = .oral // 【新增】用藥方式，預設為「口服」
}
