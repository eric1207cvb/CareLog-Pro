// BloodPressureChartView.swift

import SwiftUI
import Charts

struct BloodPressureChartView: View {
    let logs: [CareLog]
    
    private var bpData: [(date: Date, systolic: Int, diastolic: Int)] {
        logs.compactMap { log in
            guard let systolic = log.bpSystolic, let diastolic = log.bpSystolic else { return nil }
            return (date: log.timestamp, systolic: systolic, diastolic: diastolic)
        }.sorted(by: { $0.date < $1.date })
    }
    
    private var chartDomain: ClosedRange<Date> {
        let calendar = Calendar.current
        let endDate = Date()
        let startDate = calendar.date(byAdding: .day, value: -6, to: endDate)!
        return startDate...endDate
    }

    // 【新增】定義高血壓的臨界值
    private let systolicThreshold = 140
    private let diastolicThreshold = 90
    
    var body: some View {
        Chart {
            // 繪製數據線 (保持不變)
            ForEach(bpData, id: \.date) { dataPoint in
                LineMark(x: .value("日期", dataPoint.date), y: .value("收縮壓 (mmHg)", dataPoint.systolic)).foregroundStyle(by: .value("類型", "收縮壓"))
                LineMark(x: .value("日期", dataPoint.date), y: .value("舒張壓 (mmHg)", dataPoint.diastolic)).foregroundStyle(by: .value("類型", "舒張壓"))
            }
            
            // 【新增】收縮壓警戒線
            RuleMark(y: .value("收縮壓警戒", systolicThreshold))
                .foregroundStyle(.purple.opacity(0.7))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [5]))
                .annotation(position: .top, alignment: .trailing) {
                    Text("收縮壓警戒 (140)")
                        .font(.caption).foregroundColor(.purple)
                }
            
            // 【新增】舒張壓警戒線
            RuleMark(y: .value("舒張壓警戒", diastolicThreshold))
                .foregroundStyle(.green.opacity(0.7))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [5]))
                .annotation(position: .top, alignment: .trailing) {
                    Text("舒張壓警戒 (90)")
                        .font(.caption).foregroundColor(.green)
                }
        }
        .chartForegroundStyleScale(["收縮壓": .purple, "舒張壓": .green])
        .chartYScale(domain: 40...200)
        .chartYAxis { AxisMarks(position: .leading) }
        .chartXScale(domain: chartDomain)
        .chartXAxis {
            AxisMarks(values: .stride(by: .day)) { value in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.month(.defaultDigits).day(), centered: true)
            }
        }
        .padding(.horizontal)
        .padding(.top, 20)
        .overlay {
            if bpData.isEmpty {
                Text("沒有足夠的血壓數據來繪製圖表")
                    .font(.subheadline).foregroundColor(.secondary)
            }
        }
    }
}
