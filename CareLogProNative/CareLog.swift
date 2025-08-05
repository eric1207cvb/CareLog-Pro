import Foundation
import SwiftData

@Model
class CareLog {
    var timestamp: Date
    var notes: String?
    var waterAmount: Int?
    var dietItems: [String] = []
    var urineOutput: Int?
    var bowelMovement: String?
    var drainage: Int?
    var bodyTemp: Double?
    var pulse: Int?
    var respiration: Int?
    var bpSystolic: Int?
    var bpDiastolic: Int?
    var medications: [Medication] = []
    
    init(timestamp: Date, notes: String? = nil, waterAmount: Int? = nil, dietItems: [String] = [],
        urineOutput: Int? = nil, bowelMovement: String? = nil, drainage: Int? = nil,
        bodyTemp: Double? = nil, pulse: Int? = nil, respiration: Int? = nil,
        bpSystolic: Int? = nil, bpDiastolic: Int? = nil, medications: [Medication] = []
    ) {
        self.timestamp = timestamp; self.notes = notes; self.waterAmount = waterAmount; self.dietItems = dietItems
        self.urineOutput = urineOutput; self.bowelMovement = bowelMovement; self.drainage = drainage
        self.bodyTemp = bodyTemp; self.pulse = pulse; self.respiration = respiration
        self.bpSystolic = bpSystolic; self.bpDiastolic = bpDiastolic; self.medications = medications
    }
}
