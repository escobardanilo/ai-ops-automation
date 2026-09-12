import "server-only";

import { getAiClient } from "@/lib/ai/client";
import type { DocumentClassification } from "@/lib/validation/classification";
import type { InvoiceDecision } from "@/lib/validation/decision";

type GenerateResponseInput = {
  classification: DocumentClassification;
  extractedData: Record<string, unknown>;
  decision: InvoiceDecision;
};

export async function generateSuggestedResponse(input: GenerateResponseInput) {
  const response = await getAiClient().chat.completions.create({
    model: "openai/gpt-oss-20b",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `Write a concise, professional acknowledgement for the sender of a business document.
Use two to four sentences. Do not expose internal rules, confidence scores, or system details.
Never claim that money was paid. For auto_process, say the document was accepted for processing.
For human_review, say it was received and requires review. For blocked, explain neutrally that it cannot proceed and request clarification when appropriate.
Return plain text only.`,
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI returned an empty generated response");
  }

  return content.slice(0, 3000);
}
