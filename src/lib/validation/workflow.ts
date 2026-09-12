import { z } from "zod";

import { documentClassificationSchema } from "@/lib/validation/classification";
import { invoiceDecisionSchema } from "@/lib/validation/decision";

export const sourceTypeSchema = z.enum(["pdf", "email"]);
export const workflowStatusSchema = z.enum([
  "processing",
  "completed",
  "failed",
]);

export const genericExtractionSchema = z.object({
  summary: z.string().min(1),
  sender: z.string().nullable(),
  reference: z.string().nullable(),
  requestedAction: z.string().nullable(),
  dueDate: z.string().nullable(),
});

const jsonObjectSchema = z.record(z.string(), z.unknown());
const nullableAmountSchema = z.union([z.number(), z.string()]).nullable().transform(
  (value) => (value === null ? null : Number(value))
);

export const supplierSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  verified: z.boolean(),
  created_at: z.string(),
});

export const workflowSchema = z.object({
  id: z.string().uuid(),
  source_type: sourceTypeSchema,
  original_filename: z.string().nullable(),
  raw_text: z.string(),
  document_type: documentClassificationSchema.shape.documentType.nullable(),
  classification_confidence: z.number().min(0).max(1).nullable(),
  extracted_data: jsonObjectSchema,
  decision: invoiceDecisionSchema.shape.action.nullable(),
  status: workflowStatusSchema,
  generated_response: z.string().nullable(),
  supplier_id: z.string().uuid().nullable(),
  invoice_number: z.string().nullable(),
  amount: nullableAmountSchema,
  currency: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const workflowEventSchema = z.object({
  id: z.string().uuid(),
  workflow_id: z.string().uuid(),
  event_type: z.string().min(1),
  payload: jsonObjectSchema,
  created_at: z.string(),
});

export type SourceType = z.infer<typeof sourceTypeSchema>;
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;
export type GenericExtraction = z.infer<typeof genericExtractionSchema>;
export type Supplier = z.infer<typeof supplierSchema>;
export type Workflow = z.infer<typeof workflowSchema> & {
  supplier: Supplier | null;
};
export type WorkflowEvent = z.infer<typeof workflowEventSchema>;

export type WorkflowDetail = {
  workflow: Workflow;
  events: WorkflowEvent[];
  businessChecks: BusinessCheck[];
};

export type BusinessCheck = {
  label: string;
  detail: string;
  outcome: "passed" | "attention" | "failed";
};
