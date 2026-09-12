import { ai } from "@/lib/ai/client";
import { invoiceExtractionSchema } from "@/lib/validation/invoice";

export async function extractInvoiceData(text: string) {
  const cleanText = text.trim();

  if (!cleanText) {
    throw new Error("Invoice text is required");
  }

  const response = await ai.chat.completions.create({
    model: "openai/gpt-oss-20b",
    temperature: 0,

    response_format: {
      type: "json_object",
    },

    messages: [
      {
        role: "system",
        content: `
You extract structured data from invoices.

Return ONLY valid JSON.

Required format:

{
  "supplier": "Company name",
  "invoiceNumber": "INV-123",
  "amount": 1250.50,
  "currency": "EUR",
  "issueDate": "2026-09-12",
  "dueDate": "2026-10-12"
}

Rules:

- supplier must contain the supplier/company name.
- invoiceNumber must be null if not present.
- amount must be a number, not a string.
- currency should use ISO currency codes such as EUR, USD or GBP.
- issueDate and dueDate must use YYYY-MM-DD format.
- If a value is not present, return null.
- Never invent missing information.
- Do not include markdown.
- Do not include text outside the JSON.
        `.trim(),
      },
      {
        role: "user",
        content: cleanText,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("AI returned an empty response");
  }

  const parsed = JSON.parse(content);

  return invoiceExtractionSchema.parse(parsed);
}