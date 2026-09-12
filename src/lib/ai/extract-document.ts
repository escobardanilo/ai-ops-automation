import "server-only";

import { getAiClient } from "@/lib/ai/client";
import { genericExtractionSchema } from "@/lib/validation/workflow";
import type { DocumentClassification } from "@/lib/validation/classification";

export async function extractDocumentData(
  text: string,
  classification: DocumentClassification
) {
  const response = await getAiClient().chat.completions.create({
    model: "openai/gpt-oss-20b",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You extract operational data from business documents.
Return only valid JSON with exactly these fields:
{
  "summary": "Concise operational summary",
  "sender": "Sender or company, or null",
  "reference": "Order, request, or document reference, or null",
  "requestedAction": "Requested action, or null",
  "dueDate": "YYYY-MM-DD, or null"
}
Never invent missing information. Do not return markdown.`,
      },
      {
        role: "user",
        content: `Document type: ${classification.documentType}\n\n${text.trim()}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI returned an empty extraction response");
  }

  return genericExtractionSchema.parse(JSON.parse(content));
}
