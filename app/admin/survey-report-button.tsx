"use client";

import { Download } from "lucide-react";
import { jsPDF } from "jspdf";

import type { SurveyAnalytics } from "@/lib/types";

function wrapText(doc: jsPDF, text: string, maxWidth: number) {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

function addPageHeader(doc: jsPDF, survey: SurveyAnalytics, pageNumber: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Survey Studio - Reporte de encuesta", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Titulo: ${survey.title}`, 14, 24);
  doc.text(`Pagina ${pageNumber}`, 170, 16, { align: "right" });
  doc.setDrawColor(210, 199, 185);
  doc.line(14, 28, 196, 28);
}

export function SurveyReportButton({ survey }: { survey: SurveyAnalytics }) {
  function downloadPdf() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const left = 14;
    const right = pageWidth - 14;
    const contentWidth = right - left;

    let y = 40;
    let pageNumber = 1;

    const ensureSpace = (neededHeight: number) => {
      if (y + neededHeight <= pageHeight - 16) {
        return;
      }

      doc.addPage();
      pageNumber += 1;
      addPageHeader(doc, survey, pageNumber);
      y = 36;
    };

    addPageHeader(doc, survey, pageNumber);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(survey.title, left, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const descriptionLines = wrapText(doc, survey.description, contentWidth);
    doc.text(descriptionLines, left, y);
    y += descriptionLines.length * 5 + 4;

    doc.setFontSize(11);
    doc.text(`Preguntas: ${survey.questionCount}`, left, y);
    doc.text(`Respuestas: ${survey.responseCount}`, left + 70, y);
    doc.text(`Estado: ${survey.isActive ? "Activa" : "Borrador"}`, left + 130, y);
    y += 12;

    survey.results.forEach((result, index) => {
      const sectionHeight = result.type === "text" ? 50 : 40 + result.distribution.length * 6;
      ensureSpace(sectionHeight);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      const questionLines = wrapText(doc, `${index + 1}. ${result.prompt}`, contentWidth);
      doc.text(questionLines, left, y);
      y += questionLines.length * 6 + 3;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      if (result.type === "text") {
        doc.text(`Respuestas de texto: ${result.totalAnswers}`, left, y);
        y += 6;

        if (result.textAnswers.length === 0) {
          doc.text("Sin respuestas registradas.", left, y);
          y += 8;
        } else {
          result.textAnswers.slice(0, 8).forEach((answer, answerIndex) => {
            const lines = wrapText(doc, `- ${answer}`, contentWidth);
            ensureSpace(lines.length * 5 + 2);
            doc.text(lines, left, y);
            y += lines.length * 5 + 2;
            if (answerIndex < 7 && result.textAnswers.length > 8) {
              // no-op, kept for readability of the exported report
            }
          });
        }
      } else {
        result.distribution.forEach((entry) => {
          const percentage = result.totalAnswers === 0 ? 0 : Math.round((entry.count / result.totalAnswers) * 100);
          const line = `${entry.label}: ${entry.count} (${percentage}%)`;
          const lines = wrapText(doc, line, contentWidth);
          ensureSpace(lines.length * 5 + 2);
          doc.text(lines, left, y);
          y += lines.length * 5 + 2;
        });
      }

      y += 4;
    });

    doc.save(`${survey.slug}-reporte.pdf`);
  }

  return (
    <button
      type="button"
      onClick={downloadPdf}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm font-medium text-[color:rgba(18,33,23,0.78)]"
    >
      <Download className="size-4" />
      Descargar PDF
    </button>
  );
}