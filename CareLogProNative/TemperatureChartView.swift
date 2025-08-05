// TemperatureChartView.swift

import SwiftUI
import Charts

struct TemperatureChartView: View {
    let logs: [CareLog]
    
    private var temperatureData: [(date: Date, temp: Double)] {
        logs.compactMap { log in
            guard let temp = log.bodyTemp else { return nil }
            return (date: log.timestamp, temp: temp)
        }.sorted(by: { $0.date < $1.date })
    }
    
    private var chartDomain: ClosedRange<Date> {
        let calendar = Calendar.current
        let endDate = Date()
        let startDate = calendar.date(byAdding: .day, value: -6, to: endDate)!
        return startDate...endDate
    }
    
    // 【新增】定義發燒的臨界值
    private let feverThreshold = 38.0
    
    var body: some View {
        Chart {
            // 首先繪製數據點和線 (保持不變)
            ForEach(temperatureData, id: \.date) { dataPoint in
                LineMark(x: .value("日期", dataPoint.date), y: .value("體溫 (°C)", dataPoint.temp)).foregroundStyle(.red)
                PointMark(x: .value("日期", dataPoint.date), y: .value("體溫 (°C)", dataPoint.temp)).foregroundStyle(.red).symbolSize(CGSize(width: 8, height: 8))
            }
            
            // 【新增】在圖表上疊加一條水平的警戒線 (RuleMark)
            RuleMark(y: .value("發燒警戒", feverThreshold))
                .foregroundStyle(.red.opacity(0.8))
                .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [5])) // 設定為虛線樣式
                // 為警戒線加上文字標籤
                .annotation(position: .top, alignment: .trailing) {
                    Text("發燒警戒 (38.0°C)")
                        .font(.caption)
                        .padding(4)
                        .background(in: .rect(cornerRadius: 4))
                        .backgroundStyle(.red.opacity(0.1))
                        .foregroundColor(.red)
                }
        }
        .chartYScale(domain: 35...41)
        .chartYAxis { AxisMarks(position: .leading) }
        .chartXScale(domain: chartDomain)
        .chartXAxis {
            AxisMarks(values: .stride(by: .day)) { value in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.month(.defaultDigits).day(), centered: true)
            }
        }
        .padding(.horizontal)
        .padding(.top, 20) // 增加頂部空間給 annotation
        .overlay {
            if temperatureData.isEmpty {
                Text("沒有足夠的體溫數據來繪製圖表")
                    .font(.subheadline).foregroundColor(.secondary)
            }
        }
    }
}
