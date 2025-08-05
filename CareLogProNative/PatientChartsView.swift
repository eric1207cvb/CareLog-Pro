// PatientChartsView.swift

import SwiftUI
import Charts

enum ChartType: String, CaseIterable, Identifiable {
    case io = "水份 I/O"
    case temperature = "體溫"
    case pulse = "心率"
    case bloodPressure = "血壓"
    
    var id: String { self.rawValue }
}

struct PatientChartsView: View {
    let logs: [CareLog]
    var animationsDisabled: Bool = false
    
    @State private var selectedChartType: ChartType = .io
    
    var body: some View {
        VStack {
            if !animationsDisabled {
                Picker("選擇圖表", selection: $selectedChartType) {
                    ForEach(ChartType.allCases) { type in
                        Text(type.rawValue).tag(type)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
            }
            
            switch selectedChartType {
            case .io:
                IOChartView(logs: logs)
            case .temperature:
                TemperatureChartView(logs: logs)
            case .pulse:
                PulseChartView(logs: logs)
            case .bloodPressure:
                BloodPressureChartView(logs: logs)
            }
        }
        .animation(animationsDisabled ? nil : .easeInOut, value: selectedChartType)
    }
}
