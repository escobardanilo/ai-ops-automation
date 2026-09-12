import type { InvoiceExtraction } from "@/lib/validation/invoice";
import type { InvoiceDecision } from "@/lib/validation/decision";

type EvaluateInvoiceInput = {
  invoice: InvoiceExtraction;
  supplierVerified: boolean;
  isDuplicate: boolean;
};

export function evaluateInvoice({
  invoice,
  supplierVerified,
  isDuplicate,
}: EvaluateInvoiceInput): InvoiceDecision {
  const reasons: string[] = [];

  if (isDuplicate) {
    return {
      action: "blocked",
      reasons: ["Invoice number already exists in the system."],
    };
  }

  if (!invoice.invoiceNumber) {
    reasons.push("Invoice number is missing.");
  }

  if (invoice.amount === null) {
    reasons.push("Invoice amount is missing.");
  }

  if (!supplierVerified) {
    reasons.push("Supplier is not verified.");
  }

  if (
    invoice.amount !== null &&
    invoice.amount > 5000
  ) {
    reasons.push(
      "Invoice amount exceeds the automatic processing limit of EUR 5000."
    );
  }

  if (reasons.length > 0) {
    return {
      action: "human_review",
      reasons,
    };
  }

  return {
    action: "auto_process",
    reasons: [
      "Supplier is verified.",
      "Invoice is not duplicated.",
      "Required fields are present.",
      "Amount is within the automatic processing limit.",
    ],
  };
}