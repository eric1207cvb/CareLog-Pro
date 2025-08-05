// ContentView.swift

import SwiftUI
import SwiftData

struct ContentView: View {
    @State private var searchText = ""
    
    var body: some View {
        NavigationStack {
            PatientListView(searchText: searchText)
                .navigationTitle("病患管理")
        }
        .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .always), prompt: "搜尋姓名或床號")
    }
}

struct PatientListView: View {
    @Query private var patients: [Patient]
    @State private var isShowingAddPatientSheet = false
    @State private var isShowingSettings = false // 【新增】控制設定頁是否顯示
    @Environment(\.modelContext) private var modelContext
    
    init(searchText: String) {
        // ... 搜尋邏輯不變 ...
        let predicate = #Predicate<Patient> {
            if searchText.isEmpty { return true }
            else { return $0.name.localizedStandardContains(searchText) || ($0.bedNumber?.localizedStandardContains(searchText) ?? false) }
        }
        _patients = Query(filter: predicate, sort: \.name)
    }

    var body: some View {
        List {
            // ... ForEach 內容不變 ...
            ForEach(patients) { patient in
                NavigationLink(destination: PatientDetailView(patient: patient)) {
                    VStack(alignment: .leading) {
                        Text(patient.name).font(.headline)
                        if let bedNumber = patient.bedNumber, !bedNumber.isEmpty {
                            Text("床號: \(bedNumber)").font(.subheadline).foregroundColor(.secondary)
                        }
                    }
                }
            }
            .onDelete(perform: deletePatient)
        }
        .toolbar {
            // 【新增】在導覽列左邊加上設定按鈕
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: { isShowingSettings = true }) {
                    Image(systemName: "gearshape.fill")
                }
            }
            
            // 新增病患按鈕保持不變
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { isShowingAddPatientSheet = true }) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $isShowingAddPatientSheet) { AddPatientView() }
        // 【新增】彈出設定頁的 sheet
        .sheet(isPresented: $isShowingSettings) { SettingsView() }
    }

    func deletePatient(at offsets: IndexSet) {
        // ... 刪除邏輯不變 ...
        for offset in offsets {
            modelContext.delete(patients[offset])
        }
    }
}
