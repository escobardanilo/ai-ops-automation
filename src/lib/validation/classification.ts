import { z } from "zod";

export const documentClassificationSchema = z.object({
  documentType: z.enum([
    "invoice",
    "purchase_order",
    "customer_request",
    "other",
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
});

export type DocumentClassification = z.infer<
  typeof documentClassificationSchema
>;