"use client";

import { useState } from "react";
import { usePDFExport } from "@/hooks/usePDFExport";

interface PDFExportButtonProps {
  ticker: string;
  elementId?: string;
}

export default function PDFExportButton({
  ticker,
  elementId = "analysis-export",
}: PDFExportButtonProps) {
  const { generatePDF } = usePDFExport();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    setError("");
    setIsExporting(true);

    try {
      const timestamp = new Date().toISOString().split("T")[0];
      await generatePDF(elementId, {
        filename: `${ticker}_analysis_${timestamp}.pdf`,
        title: `${ticker} Analysis Report`,
        includeTimestamp: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("[PDFExportButton] Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleExport}
        disabled={isExporting}
        title="Export analysis to PDF"
        className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            📄 Export PDF
          </>
        )}
      </button>

      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-xs">
          ✕ {error}
        </div>
      )}
    </div>
  );
}
