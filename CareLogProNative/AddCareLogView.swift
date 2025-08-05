// AddCareLogView.swift

import SwiftUI

// ================================================================
// MARK: - 輔助元件 (全部包含在此檔案中)
// ================================================================

struct FormSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .padding(.leading)
            
            VStack {
                content
            }
            .padding()
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)
        }
    }
}

struct StepperField: View {
    let title: String
    @Binding var valueString: String
    let step: Double
    let decimalPlaces: Int

    init(title: String, valueString: Binding<String>, step: Double = 1.0, decimalPlaces: Int = 0) {
        self.title = title
        self._valueString = valueString
        self.step = step
        self.decimalPlaces = decimalPlaces
    }

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            Image(systemName: "minus.circle.fill").font(.title2).foregroundColor(.secondary)
                .gesture(longPressGesture(direction: -1))
            TextField("0", text: $valueString)
                .keyboardType(decimalPlaces > 0 ? .decimalPad : .numberPad)
                .multilineTextAlignment(.center).frame(width: 70).font(.title3.monospacedDigit())
            Image(systemName: "plus.circle.fill").font(.title2).foregroundColor(.secondary)
                .gesture(longPressGesture(direction: 1))
        }
    }
    
    @State private var timer: Timer?
    @State private var isLongPressing = false
    @State private var currentStepAmount: Double = 1.0
    
    private func longPressGesture(direction: Double) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { _ in if !isLongPressing { isLongPressing = true; updateValue(by: step * direction); startRepeatingTimer(direction: direction) } }
            .onEnded { _ in isLongPressing = false; stopRepeatingTimer() }
    }
    
    private func startRepeatingTimer(direction: Double) {
        stopRepeatingTimer(); currentStepAmount = step
        timer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { _ in updateValue(by: currentStepAmount * direction); currentStepAmount += step }
    }
    
    private func stopRepeatingTimer() { timer?.invalidate(); timer = nil }
    private func updateValue(by amount: Double) {
        let currentValue = Double(valueString) ?? 0
        let newValue = (Decimal(currentValue) + Decimal(amount)).doubleValue
        valueString = String(format: "%.\(decimalPlaces)f", max(0, newValue))
    }
}

struct QuickAddButtons: View {
    @Binding var valueString: String
    let amounts = [50, 100, 150]
    
    var body: some View {
        HStack {
            ForEach(amounts, id: \.self) { amount in
                Button("+\(amount)") {
                    let currentValue = Int(valueString) ?? 0
                    let newValue = currentValue + amount
                    valueString = String(newValue)
                }.font(.caption).buttonStyle(.bordered).tint(.secondary)
            }
        }.frame(maxWidth: .infinity, alignment: .trailing)
    }
}

// ================================================================
// MARK: - 主 View
// ================================================================

struct AddCareLogView: View {
    let patient: Patient
    @Environment(\.dismiss) private var dismiss
    
    @State private var timestamp = Date()
    @State private var notes = ""
    @State private var dietItems: [String] = []
    @State private var medications: [Medication] = []
    @State private var waterAmountString = ""
    @State private var urineOutputString = ""
    @State private var drainageString = ""
    @State private var bowelMovement = ""
    @State private var bodyTempString = ""
    @State private var pulseString = ""
    @State private var respirationString = ""
    @State private var bpSystolicString = ""
    @State private var bpDiastolicString = ""
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    FormSection(title: "紀錄時間") { DatePicker("紀錄時間", selection: $timestamp).labelsHidden() }
                    FormSection(title: "飲食內容") { DietSelectionView(selectedItems: $dietItems) }
                    
                    FormSection(title: "用藥紀錄") {
                        if medications.isEmpty {
                            Text("點擊下方按鈕以新增用藥")
                                .foregroundColor(.secondary).frame(maxWidth: .infinity, alignment: .center).padding(.vertical)
                        } else {
                            ForEach($medications) { $med in
                                VStack(alignment: .leading) {
                                    HStack {
                                        TextField("藥品名稱", text: $med.name)
                                        Spacer()
                                        Button(role: .destructive) {
                                            removeMedication(med)
                                        } label: { Image(systemName: "trash.fill").foregroundColor(.red) }
                                        .buttonStyle(.plain)
                                    }
                                    HStack {
                                        Picker("用藥方式", selection: $med.route) {
                                            ForEach(MedicationRoute.allCases, id: \.self) { route in
                                                Text(route.rawValue).tag(route)
                                            }
                                        }
                                        .pickerStyle(.menu).tint(.secondary)
                                        Spacer()
                                        TextField("劑量/頻率", text: $med.dosage).multilineTextAlignment(.trailing).frame(width: 120)
                                    }
                                }
                                if med.id != medications.last?.id { Divider().padding(.vertical, 4) }
                            }
                        }
                        Button("＋ 新增用藥項目") { medications.append(Medication()) }.frame(maxWidth: .infinity, alignment: .center).padding(.top, 10)
                    }
                    
                    FormSection(title: "攝入 / 排出") {
                        StepperField(title: "喝水量 (ml)", valueString: $waterAmountString); QuickAddButtons(valueString: $waterAmountString); Divider()
                        StepperField(title: "排尿量 (ml)", valueString: $urineOutputString); QuickAddButtons(valueString: $urineOutputString); Divider()
                        StepperField(title: "引流管 (ml)", valueString: $drainageString); QuickAddButtons(valueString: $drainageString); Divider()
                        HStack { Text("排便情況"); TextField("例如: 正常", text: $bowelMovement).multilineTextAlignment(.trailing) }
                    }
                    
                    FormSection(title: "生命徵象") {
                        StepperField(title: "體溫 (°C)", valueString: $bodyTempString, step: 0.1, decimalPlaces: 1); Divider()
                        StepperField(title: "脈搏 (次/分)", valueString: $pulseString); Divider()
                        StepperField(title: "呼吸 (次/分)", valueString: $respirationString); Divider()
                        HStack {
                            Text("血壓 (mmHg)"); Spacer()
                            TextField("收縮壓", text: $bpSystolicString).keyboardType(.numberPad).multilineTextAlignment(.trailing).frame(width: 70)
                            Text("/"); TextField("舒張壓", text: $bpDiastolicString).keyboardType(.numberPad).multilineTextAlignment(.trailing).frame(width: 70)
                        }
                    }
                    
                    FormSection(title: "備註") {
                        TextEditor(text: $notes).frame(minHeight: 100)
                            .overlay(alignment: .topLeading) { if notes.isEmpty { Text("特殊觀察...").foregroundColor(Color(UIColor.placeholderText)).padding(.top, 8).padding(.leading, 5).allowsHitTesting(false) } }
                    }
                }.padding()
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("新增照護紀錄").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("儲存") { saveLog(); dismiss() }.disabled(!isFormValid()) }
            }
            .onAppear(perform: clearFormState)
        }
    }
    
    // MARK: - 輔助方法
    private func removeMedication(_ medication: Medication) {
        if let index = medications.firstIndex(where: { $0.id == medication.id }) {
            medications.remove(at: index)
        }
    }
    
    private func clearFormState() {
        timestamp = Date(); notes = ""; dietItems.removeAll(); medications = []; waterAmountString = ""
        urineOutputString = ""; drainageString = ""; bowelMovement = ""; bodyTempString = ""; pulseString = ""
        respirationString = ""; bpSystolicString = ""; bpDiastolicString = ""
    }
    
    private func saveLog() {
        let tenMinutesInSeconds: TimeInterval = 10 * 60; let lastLog = patient.logs.sorted(by: { $0.timestamp > $1.timestamp }).first; var mergeTarget: CareLog? = nil
        if let lastLog = lastLog { if Date().timeIntervalSince(lastLog.timestamp) < tenMinutesInSeconds { mergeTarget = lastLog } }
        let water = Int(waterAmountString); let urine = Int(urineOutputString); let drainage = Int(drainageString); let temp = Double(bodyTempString); let pulse = Int(pulseString); let resp = Int(respirationString); let systolic = Int(bpSystolicString); let diastolic = Int(bpDiastolicString)
        let newMeds = self.medications.filter { !$0.name.trimmingCharacters(in: .whitespaces).isEmpty }
        if let target = mergeTarget {
            if let water = water { target.waterAmount = (target.waterAmount ?? 0) + water }; if let urine = urine { target.urineOutput = (target.urineOutput ?? 0) + urine }; if let drainage = drainage { target.drainage = (target.drainage ?? 0) + drainage }; if let temp = temp { target.bodyTemp = temp }; if let pulse = pulse { target.pulse = pulse }; if let resp = resp { target.respiration = resp }; if let systolic = systolic { target.bpSystolic = systolic }; if let diastolic = diastolic { target.bpDiastolic = diastolic }; if !notes.isEmpty { target.notes = notes }; if !bowelMovement.isEmpty { target.bowelMovement = bowelMovement }; let combinedDiet = target.dietItems + self.dietItems; target.dietItems = Array(Set(combinedDiet)); target.medications.append(contentsOf: newMeds); target.timestamp = self.timestamp
        } else {
            let newLog = CareLog(timestamp: timestamp, notes: notes.isEmpty ? nil : notes, waterAmount: water, dietItems: self.dietItems, urineOutput: urine, bowelMovement: bowelMovement.isEmpty ? nil : bowelMovement, drainage: drainage, bodyTemp: temp, pulse: pulse, respiration: resp, bpSystolic: systolic, bpDiastolic: diastolic, medications: newMeds)
            patient.logs.append(newLog)
        }
    }
    
    private func isFormValid() -> Bool {
        return !dietItems.isEmpty || !medications.contains(where: { !$0.name.isEmpty || !$0.dosage.isEmpty }) || !waterAmountString.isEmpty || !urineOutputString.isEmpty || !drainageString.isEmpty || !bowelMovement.isEmpty || !bodyTempString.isEmpty || !pulseString.isEmpty || !respirationString.isEmpty || !bpSystolicString.isEmpty || !bpDiastolicString.isEmpty || !notes.isEmpty
    }
}

// MARK: - 輔助 Decimal Extension
extension Decimal { var doubleValue: Double { return NSDecimalNumber(decimal:self).doubleValue } }
