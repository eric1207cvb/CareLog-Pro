import SwiftUI
import SwiftData

struct DebugPatientView: View {
    let patient: Patient
    var body: some View {
        VStack {
            Text("除錯畫面")
            Text("病患: \(patient.name)")
            Text("紀錄數量: \(patient.logs.count)")
        }
    }
}
