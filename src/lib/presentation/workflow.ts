import type { Workflow, WorkflowStatus } from "@/lib/validation/workflow";
import type { InvoiceDecision } from "@/lib/validation/decision";

export const decisionLabels: Record<InvoiceDecision["action"], string> = {
  auto_process: "Auto processed",
  human_review: "Needs review",
  blocked: "Blocked",
};

export const statusLabels: Record<WorkflowStatus, string> = {
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export const documentTypeLabels: Record<string, string> = {
  invoice: "Invoice",
  purchase_order: "Purchase order",
  customer_request: "Customer request",
  other: "Other",
};

export const eventLabels: Record<string, string> = {
  source_ingested: "Source received",
  document_classified: "Document classified",
  data_extracted: "Structured data extracted",
  business_context_resolved: "Business context checked",
  business_rules_evaluated: "Business rules evaluated",
  response_generated: "Suggested response generated",
  workflow_completed: "Workflow completed",
  workflow_failed: "Workflow failed",
};

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null) return "—";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency ?? "EUR",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency ?? ""}`.trim();
  }
}

export function formatConfidence(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export function workflowDocumentName(workflow: Workflow) {
  return workflow.original_filename ?? workflow.invoice_number ?? `Email ${workflow.id.slice(0, 8)}`;
}

export function formatFieldLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

export function formatFieldValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not available";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
