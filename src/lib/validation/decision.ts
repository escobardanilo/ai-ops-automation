import { z } from "zod";

export const invoiceDecisionSchema = z.object({
  action: z.enum([
    "auto_process",
    "human_review",
    "blocked",
  ]),
  reasons: z.array(z.string()),
});

export type InvoiceDecision = z.infer<
  typeof invoiceDecisionSchema
>;