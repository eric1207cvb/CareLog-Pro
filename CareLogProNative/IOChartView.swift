// IOChartView.swift

import SwiftUI
import Charts

// DailyIO struct 保持不變
struct DailyIO: Identifiable {
    let id = UUID()
    let date: Date
    var intake: Double = 0
    var output: Double = 0
}

struct IOChartView: View {
    let logs: [CareLog]
    
    private var dailyData: [DailyIO] {
        // ... 資料處理邏輯不變 ...
        let calendar = Calendar.current
        let groupedLogs = Dictionary(grouping: logs) { log in
            calendar.startOfDay(for: log.timestamp)
        }
        return groupedLogs.map { (date, logs) in
            var dailyIO = DailyIO(date: date)
            for log in logs {
                dailyIO.intake += Double(log.waterAmount ?? 0)
                dailyIO.output += Double((log.urineOutput ?? 0) + (log.drainage ?? 0))
            }
            return dailyIO
        }.sorted(by: { $0.date < $1.date })
    }
    
    // 【新增】計算圖表的顯示範圍 (最近7天)
    private var chartDomain: ClosedRange<Date> {
        let calendar = Calendar.current
        let endDate = calendar.startOfDay(for: .now)
        let startDate = calendar.date(byAdding: .day, value: -6, to: endDate)!
        return startDate...endDate
    }
    
    var body: some View {
        Chart {
            ForEach(dailyData) { day in
                BarMark(
                    x: .value("日期", day.date, unit: .day),
                    y: .value("攝入量 (ml)", day.intake)
                )
                .foregroundStyle(by: .value("類型", "總攝入量"))
                
                BarMark(
                    x: .value("日期", day.date, unit: .day),
                    y: .value("排出量 (ml)", day.output)
                )
                .foregroundStyle(by: .value("類型", "總排出量"))
            }
        }
        .chartForegroundStyleScale(["總攝入量": .blue, "總排出量": .cyan])
        // 【新增】設定 X 軸的顯示範圍
        .chartXScale(domain: chartDomain)
        // 【新增】設定 X 軸的刻度，以「天」為單位，並顯示「月/日」
        .chartXAxis {
            AxisMarks(values: .stride(by: .day)) { value in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.month(.defaultDigits).day())
            }
        }
        .padding()
        .overlay {
            if dailyData.isEmpty {
                Text("沒有足夠的 I/O 數據來繪製圖表")
                    .font(.subheadline).foregroundColor(.secondary)
            }
        }
    }
}
