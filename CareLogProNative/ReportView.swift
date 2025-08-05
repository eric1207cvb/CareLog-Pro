// ReportView.swift

import SwiftUI
import Charts

struct ReportView: View {
    let patient: Patient
    
    private var sortedLogs: [CareLog] {
        patient.logs.sorted(by: { $0.timestamp < $1.timestamp })
    }
    
    // 【修正】我們用一個更清晰的計算屬性來判斷是否需要顯示圖表
    private var shouldShowCharts: Bool {
        // .contains(where:) 會遍歷所有紀錄，只要找到任何一筆符合條件的紀錄，就會回傳 true
        patient.logs.contains { log in
            log.bodyTemp != nil ||
            log.pulse != nil ||
            log.bpSystolic != nil ||
            log.waterAmount != nil ||
            log.urineOutput != nil ||
            log.drainage != nil
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            
            // 1. 報告標頭
            VStack(alignment: .leading, spacing: 5) {
                Text(patient.name).font(.system(size: 36, weight: .bold))
                Text("照護紀錄報告").font(.system(size: 24, weight: .light)).foregroundColor(.gray)
                Divider().padding(.bottom, 5)
                HStack {
                    Text("床號: \(patient.bedNumber ?? "未提供")")
                    Spacer()
                    Text("報告產生時間: \(Date().formatted(.dateTime.year().month().day().hour().minute()))")
                }
                .font(.footnote).foregroundColor(.gray)
            }
            .padding(.bottom)
            
            // 2. 詳細紀錄
            Text("詳細紀錄").font(.system(size: 22, weight: .semibold))
            Grid(alignment: .topLeading, horizontalSpacing: 10) {
                GridRow {
                    Text("時間").font(.headline.bold())
                    Text("紀錄內容").font(.headline.bold())
                }
                .padding(.bottom, 5)
                
                Divider().gridCellUnsizedAxes(.horizontal)
                
                ForEach(sortedLogs) { log in
                    GridRow {
                        Text(log.timestamp, format: .dateTime.month().day().hour().minute())
                            .font(.system(size: 10))
                            .frame(width: 100, alignment: .topLeading)
                        LogEntryRowView(log: log)
                    }
                    Divider().gridCellUnsizedAxes(.horizontal)
                }
            }
            .padding(.bottom)
            
            // 3. 趨勢圖表總覽
            if shouldShowCharts {
                VStack(alignment: .leading) {
                    Text("趨勢圖表總覽").font(.system(size: 22, weight: .semibold)).padding(.top)
                }
                
                VStack(spacing: 25) {
                    chartSection(title: "水份 I/O", chartView: IOChartView(logs: patient.logs))
                    chartSection(title: "體溫", chartView: TemperatureChartView(logs: patient.logs))
                    chartSection(title: "心率", chartView: PulseChartView(logs: patient.logs))
                    chartSection(title: "血壓", chartView: BloodPressureChartView(logs: patient.logs))
                }
            }
            
            Spacer()
        }
        .padding(40)
        .frame(width: 595)
        .foregroundColor(.black)
        .background(.white)
    }
    
    @ViewBuilder
    private func chartSection<Chart: View>(title: String, chartView: Chart) -> some View {
        VStack(alignment: .leading) {
            Text(title).font(.headline.bold())
            chartView
                .frame(height: 180)
                .border(Color.gray, width: 0.5)
        }
    }
}
