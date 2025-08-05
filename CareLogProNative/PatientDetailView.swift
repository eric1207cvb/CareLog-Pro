// PatientDetailView.swift

import SwiftUI
import Charts

struct LogEntryRowView: View {
    let log: CareLog
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(log.timestamp, format: .dateTime).font(.headline)
            if let notes = log.notes, !notes.isEmpty {
                Text(notes).font(.subheadline).padding(8).frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.yellow.opacity(0.2)).cornerRadius(6)
            }
            Grid(alignment: .leading, horizontalSpacing: 12, verticalSpacing: 5) {
                if !log.dietItems.isEmpty { GridRow(alignment: .top) { Image(systemName: "fork.knife.circle.fill").foregroundColor(.blue); Text(log.dietItems.joined(separator: ", ")); Color.clear.gridCellUnsizedAxes(.vertical) } }
                if !log.medications.isEmpty { GridRow(alignment: .top) { Image(systemName: "pills.circle.fill").foregroundColor(.green); VStack(alignment: .leading) { ForEach(log.medications) { med in Text("\(med.name) - \(med.route.rawValue) (\(med.dosage))") } } } }
                GridRow { Image(systemName: "drop.circle.fill").foregroundColor(.cyan); Text("攝入/出: \(log.waterAmount ?? 0)ml / \( (log.urineOutput ?? 0) + (log.drainage ?? 0) )ml") }
                if let drainage = log.drainage, drainage > 0 { GridRow { Color.clear.frame(width: 1, height: 1); Text("(排尿 \(log.urineOutput ?? 0)ml, 引流 \(drainage)ml)").font(.caption) } }
                if let bowel = log.bowelMovement, !bowel.isEmpty { GridRow { Image(systemName: "circle.square.fill").foregroundColor(.brown); Text("排便: \(bowel)") } }
                if log.bodyTemp != nil || log.pulse != nil || log.bpSystolic != nil {
                    Divider().padding(.vertical, 2)
                    if let temp = log.bodyTemp { GridRow { Image(systemName: "thermometer.medium").foregroundColor(.red); Text("體溫: \(String(format: "%.1f", temp)) °C") } }
                    if let pulse = log.pulse { GridRow { Image(systemName: "heart.circle.fill").foregroundColor(.pink); Text("脈搏: \(pulse) 次/分") } }
                    if let systolic = log.bpSystolic, let diastolic = log.bpDiastolic { GridRow { Image(systemName: "gauge.high").foregroundColor(.purple); Text("血壓: \(systolic) / \(diastolic) mmHg") } }
                }
            }.font(.subheadline)
        }.padding(.vertical, 6)
    }
}

struct PatientDetailView: View {
    @State private var isShowingAddLogSheet = false
    let patient: Patient
    
    // 用於觸發分享畫面的 @State 變數
    @State private var pdfURL: URL?
    
    private var sortedLogs: [CareLog] { patient.logs.sorted(by: { $0.timestamp > $1.timestamp }) }
    
    var body: some View {
        List {
            Section("基本資料") {
                LabeledContent("姓名", value: patient.name)
                if let bedNumber = patient.bedNumber, !bedNumber.isEmpty {
                    LabeledContent("床號/房號", value: bedNumber)
                } else { LabeledContent("床號/房號", value: "未提供") }
            }
            
            if !patient.logs.isEmpty {
                Section("趨勢圖表") {
                    PatientChartsView(logs: patient.logs).frame(height: 250)
                }
            }
            
            Section("照護紀錄") {
                if sortedLogs.isEmpty {
                    Text("目前沒有任何照護紀錄。").foregroundColor(.secondary)
                } else {
                    ForEach(sortedLogs) { log in LogEntryRowView(log: log) }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(patient.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .navigationBarTrailing) {
                // 匯出按鈕
                Button {
                    Task { @MainActor in
                        self.pdfURL = PDFGenerator.generate(for: patient)
                    }
                } label: {
                    Image(systemName: "square.and.arrow.up")
                }
                
                // 新增紀錄按鈕
                Button("新增紀錄") {
                    isShowingAddLogSheet = true
                }
            }
        }
        .sheet(isPresented: $isShowingAddLogSheet) {
            AddCareLogView(patient: patient)
        }
        // 當 pdfURL 有值時，彈出 ShareSheet
        // .sheet(item:...) 會在 pdfURL 被賦值時觸發
        .sheet(item: $pdfURL) { url in
            ShareSheet(activityItems: [url])
        }
    }
}

// 為了讓 .sheet(item:...) 能夠運作，我們需要讓 URL 遵循 Identifiable 協定
extension URL: Identifiable {
    public var id: String { self.absoluteString }
}
