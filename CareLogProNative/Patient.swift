import Foundation
import SwiftData

@Model
class Patient {
    var name: String
    var bedNumber: String?
    @Relationship(deleteRule: .cascade) var logs: [CareLog] = []
    
    init(name: String, bedNumber: String?) {
        self.name = name
        self.bedNumber = bedNumber
    }
}
