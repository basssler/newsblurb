"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export interface PDFExportOptions {
  filename?: string;
  title?: string;
  includeTimestamp?: boolean;
}

/**
 * Custom hook for exporting analysis view to PDF
 * Uses html2canvas for rendering and jsPDF for PDF generation
 */
export function usePDFExport() {
  /**
   * Generate and download PDF from a specific element
   */
  const generatePDF = async (
    elementId: string,
    options: PDFExportOptions = {}
  ): Promise<void> => {
    try {
      const {
        filename = "newsblurb-analysis.pdf",
        title = "NewsBlurb Analysis",
        includeTimestamp = true,
      } = options;

      // Get the element to export
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with id "${elementId}" not found`);
      }

      // Create canvas from HTML element
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2, // Better resolution
        logging: false,
        useCORS: true,
        allowTaint: true,
      } as any);

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      let position = 0;

      // Add metadata
      pdf.setProperties({
        title: title,
        author: "NewsBlurb",
        subject: "Stock Analysis Export",
      });

      // Add content to PDF (handle multiple pages)
      const imageData = canvas.toDataURL("image/png");

      while (heightLeft >= 0) {
        pdf.addImage(imageData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        position = heightLeft;

        // Add new page if needed
        if (heightLeft > 0) {
          pdf.addPage();
        }
      }

      // Add footer with timestamp
      if (includeTimestamp) {
        const pageCount = pdf.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(128, 128, 128);
          pdf.text(
            `Generated on ${new Date().toLocaleString()}`,
            10,
            pdf.internal.pageSize.getHeight() - 10
          );
          pdf.text(
            `Page ${i} of ${pageCount}`,
            pdf.internal.pageSize.getWidth() - 30,
            pdf.internal.pageSize.getHeight() - 10
          );
        }
      }

      // Download PDF
      pdf.save(filename);
      console.log(`[PDF Export] Successfully exported to ${filename}`);
    } catch (error) {
      console.error("[PDF Export] Error generating PDF:", error);
      throw error;
    }
  };

  return { generatePDF };
}
