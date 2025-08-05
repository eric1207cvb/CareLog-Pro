// PDFGenerator.swift

import SwiftUI

@MainActor
class PDFGenerator {
    static func generate(for patient: Patient) -> URL? {
        let reportView = ReportView(patient: patient)
        let renderer = ImageRenderer(content: reportView)
        
        let url = URL.documentsDirectory.appending(path: "CareLog_Report_\(patient.name).pdf")
        
        renderer.render { size, context in
            var box = CGRect(x: 0, y: 0, width: 595, height: 842) // A4
            
            guard var pdf = CGContext(url as CFURL, mediaBox: &box, nil) else {
                return
            }
            
            let totalHeight = size.height
            let pageHeight = box.height
            let pageCount = Int(ceil(totalHeight / pageHeight))
            
            for i in 0..<pageCount {
                pdf.beginPDFPage(nil)
                pdf.translateBy(x: 0, y: -pageHeight * CGFloat(i))
                context(pdf)
                pdf.endPDFPage()
            }
            pdf.closePDF()
            
            print("PDF 已儲存至: \(url.path())")
        }
        
        return url
    }
}
