import "server-only";

import { PDFParse } from "pdf-parse";

export class UnsupportedPdfError extends Error {}

export async function extractPdfText(file: File) {
  const data = new Uint8Array(await file.arrayBuffer());
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    const text = result.text.replace(/\u0000/g, "").trim();

    if (text.replace(/\s/g, "").length < 10) {
      throw new UnsupportedPdfError(
        "No usable embedded text was found in this PDF. OCR is not supported in V1."
      );
    }

    return text;
  } finally {
    await parser.destroy();
  }
}
