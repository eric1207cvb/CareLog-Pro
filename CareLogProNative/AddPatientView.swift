// AddPatientView.swift

import SwiftUI
import SwiftData

struct AddPatientView: View {
    @State private var name: String = ""
    @State private var bedNumber: String = ""
    
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            Form {
                TextField("病人姓名 (必填)", text: $name)
                TextField("病床號/房號 (選填)", text: $bedNumber)
            }
            .navigationTitle("新增病患")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存") {
                        // 【最終修正】使用我們新定義的 init 方法來建立 Patient 物件
                        // 在建立的當下就直接傳入所有需要的資料
                        let newPatient = Patient(
                            name: name,
                            bedNumber: bedNumber.isEmpty ? nil : bedNumber
                        )
                        
                        modelContext.insert(newPatient)
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}

#Preview {
    AddPatientView()
        .modelContainer(for: Patient.self, inMemory: true)
}
