import { z } from "zod";

export const invoiceExtractionSchema = z.object({
  supplier: z.string().min(1),
  invoiceNumber: z.string().nullable(),
  amount: z.number().nonnegative().nullable(),
  currency: z.string().nullable(),
  issueDate: z.string().nullable(),
  dueDate: z.string().nullable(),
});

export type InvoiceExtraction = z.infer<
  typeof invoiceExtractionSchema
>;