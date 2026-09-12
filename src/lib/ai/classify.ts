import { getAiClient } from "@/lib/ai/client";
import { documentClassificationSchema } from "@/lib/validation/classification";

export async function classifyDocument(text: string) {
  const cleanText = text.trim();

  if (!cleanText) {
    throw new Error("Document text is required");
  }

  const response = await getAiClient().chat.completions.create({
    model: "openai/gpt-oss-20b",
    temperature: 0,

    response_format: {
      type: "json_object",
    },

    messages: [
      {
        role: "system",
        content: `
You classify business documents.

The document must be classified as exactly one of:

- invoice
- purchase_order
- customer_request
- other

Return ONLY valid JSON.

Required format:

{
  "documentType": "invoice",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this classification was selected."
}

confidence must be a number between 0 and 1.
Do not add markdown.
Do not add any text outside the JSON.
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

  return documentClassificationSchema.parse(parsed);
}
