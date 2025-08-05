// DietSelectionView.swift

import SwiftUI

// 【新增】建立一個自訂的按鈕樣式，專門用於我們的預設標籤
// 這讓我們的程式碼更乾淨，也方便未來統一修改樣式
struct PresetTagButtonStyle: ButtonStyle {
    let isSelected: Bool
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14)) // 統一字體大小
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Color.blue.opacity(0.2) : Color(UIColor.secondarySystemBackground))
            .foregroundColor(.primary)
            .cornerRadius(20) // 使用圓角讓標籤更柔和
            // 當按鈕被按下時，稍微縮小，提供視覺回饋
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}


struct DietSelectionView: View {
    @Binding var selectedItems: [String]
    
    let presetDietOptions = [
        "水", "牛奶", "豆漿", "果汁", "茶", "安素", "完膳", "補體素",
        "早餐", "午餐", "晚餐", "點心", "白飯", "稀飯", "麵食", "麵包",
        "水果", "蔬菜", "魚肉", "雞肉", "豬肉", "餅乾"
    ]
    
    @State private var newDietItemText = ""
    private let selectionLimit = 5
    
    var body: some View {
        // 使用 VStack 來統一管理佈局和間距
        VStack(alignment: .leading, spacing: 16) {
            // 1. 計數器
            HStack {
                Text("已選項目").font(.headline)
                Spacer()
                Text("\(selectedItems.count) / \(selectionLimit) 項")
                    .font(.footnote)
                    .foregroundColor(selectedItems.count >= selectionLimit ? .red : .secondary)
                    .animation(.none, value: selectedItems.count)
            }
            
            // 2. 已選項目顯示區 (如果為空，則顯示提示)
            if selectedItems.isEmpty {
                Text("請從下方常用項目選擇或自行輸入")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 38, alignment: .center)
            } else {
                // 使用 LazyVGrid 來自動換行顯示已選標籤
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: 10) {
                    ForEach(selectedItems, id: \.self) { item in
                        HStack(spacing: 4) {
                            Text(item)
                                .font(.system(size: 14))
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(Color.blue.opacity(0.1)).cornerRadius(20)
                        .onTapGesture {
                            selectedItems.removeAll { $0 == item }
                        }
                    }
                }
            }

            Divider()

            // 3. 預設選項
            Text("常用項目 (點擊選擇)").font(.headline)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: 10) {
                ForEach(presetDietOptions, id: \.self) { option in
                    Button(option) {
                        toggleSelection(for: option)
                    }
                    // 直接套用我們自訂的按鈕樣式
                    .buttonStyle(PresetTagButtonStyle(isSelected: selectedItems.contains(option)))
                    // 【優化】對於被禁用的按鈕，除了改變透明度，也讓它看起來更灰
                    .saturation(isDisabled(option) ? 0 : 1)
                    .opacity(isDisabled(option) ? 0.4 : 1.0)
                    .disabled(isDisabled(option))
                }
            }
            
            Divider()

            // 4. 自訂輸入
            HStack {
                TextField("或輸入自訂項目", text: $newDietItemText)
                    .textFieldStyle(.roundedBorder)
                Button("新增") {
                    addCustomItem()
                }
                .buttonStyle(.bordered)
                .disabled(newDietItemText.trimmingCharacters(in: .whitespaces).isEmpty || selectedItems.count >= selectionLimit)
            }
        }
    }
    
    // --- 輔助邏輯 ---
    
    private func isDisabled(_ option: String) -> Bool {
        return selectedItems.count >= selectionLimit && !selectedItems.contains(option)
    }
    
    private func toggleSelection(for item: String) {
        if let index = selectedItems.firstIndex(of: item) {
            selectedItems.remove(at: index)
        } else {
            guard selectedItems.count < selectionLimit else { return }
            selectedItems.append(item)
        }
    }
    
    private func addCustomItem() {
        guard selectedItems.count < selectionLimit else { return }
        let trimmedItem = newDietItemText.trimmingCharacters(in: .whitespaces)
        if !trimmedItem.isEmpty && !selectedItems.contains(trimmedItem) {
            selectedItems.append(trimmedItem)
            newDietItemText = ""
        }
    }
}
