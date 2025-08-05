// PulseChartView.swift

import SwiftUI
import Charts

struct PulseChartView: View {
    let logs: [CareLog]
    
    private var pulseData: [(date: Date, pulse: Int)] {
        logs.compactMap { log in
            guard let pulse = log.pulse else { return nil }
            return (date: log.timestamp, pulse: pulse)
        }.sorted(by: { $0.date < $1.date })
    }
    
    private var chartDomain: ClosedRange<Date> {
        let calendar = Calendar.current
        let endDate = Date()
        let startDate = calendar.date(byAdding: .day, value: -6, to: endDate)!
        return startDate...endDate
    }
    
    var body: some View {
        Chart(pulseData, id: \.date) { dataPoint in
            LineMark(
                x: .value("日期", dataPoint.date),
                y: .value("脈搏 (次/分)", dataPoint.pulse)
            )
            .foregroundStyle(.pink)
            
            PointMark(
                x: .value("日期", dataPoint.date),
                y: .value("脈搏 (次/分)", dataPoint.pulse)
            )
            .foregroundStyle(.pink)
            .symbolSize(CGSize(width: 8, height: 8))
        }
        .chartYScale(domain: 40...160)
        .chartYAxis { AxisMarks(position: .leading) }
        .chartXScale(domain: chartDomain)
        .chartXAxis {
            AxisMarks(values: .stride(by: .day)) { value in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.month(.defaultDigits).day(), centered: true)
            }
        }
        .padding()
        .overlay {
            if pulseData.isEmpty {
                Text("沒有足夠的脈搏數據來繪製圖表")
                    .font(.subheadline).foregroundColor(.secondary)
            }
        }
    }
}
