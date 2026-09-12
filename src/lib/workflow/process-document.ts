import "server-only";

import type { Json } from "@/lib/database/types";
import { classifyDocument } from "@/lib/ai/classify";
import { extractDocumentData } from "@/lib/ai/extract-document";
import { extractInvoiceData } from "@/lib/ai/extract-invoice";
import { generateSuggestedResponse } from "@/lib/ai/generate-response";
import {
  createWorkflow,
  getOrCreateSupplier,
  getWorkflowDetail,
  isDuplicateInvoice,
  recordWorkflowEvent,
  updateWorkflow,
} from "@/lib/database/workflows";
import { extractPdfText, UnsupportedPdfError } from "@/lib/documents/extract-pdf-text";
import { evaluateInvoice } from "@/lib/rules/evaluate-invoice";
import type { InvoiceDecision } from "@/lib/validation/decision";
import type { SourceType } from "@/lib/validation/workflow";

const MAX_TEXT_LENGTH = 100_000;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

export class ProcessingInputError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "ProcessingInputError";
  }
}

type ProcessSource =
  | { sourceType: "email"; text: string }
  | { sourceType: "pdf"; file: File };

async function ingestSource(source: ProcessSource) {
  if (source.sourceType === "email") {
    const rawText = source.text.trim();
    if (rawText.length < 10) {
      throw new ProcessingInputError("Paste at least 10 characters of email text.");
    }
    if (rawText.length > MAX_TEXT_LENGTH) {
      throw new ProcessingInputError("Email text exceeds the 100,000 character limit.", 413);
    }
    return { rawText, originalFilename: null };
  }

  if (source.file.size === 0) {
    throw new ProcessingInputError("Choose a non-empty PDF file.");
  }
  if (source.file.size > MAX_PDF_BYTES) {
    throw new ProcessingInputError("PDF files are limited to 10 MB.", 413);
  }
  if (source.file.type !== "application/pdf" && !source.file.name.toLowerCase().endsWith(".pdf")) {
    throw new ProcessingInputError("Only PDF files are supported in V1.");
  }

  try {
    const rawText = await extractPdfText(source.file);
    if (rawText.length > MAX_TEXT_LENGTH) {
      throw new ProcessingInputError("Extracted PDF text exceeds the 100,000 character limit.", 413);
    }
    return { rawText, originalFilename: source.file.name.slice(0, 255) };
  } catch (error) {
    if (error instanceof UnsupportedPdfError) {
      throw new ProcessingInputError(error.message, 422);
    }
    throw error;
  }
}

export async function processDocument(source: ProcessSource) {
  const { rawText, originalFilename } = await ingestSource(source);
  let workflowId: string | null = null;

  try {
    let workflow = await createWorkflow({
      sourceType: source.sourceType,
      originalFilename,
      rawText,
    });
    workflowId = workflow.id;

    await recordWorkflowEvent(workflow.id, "source_ingested", {
      sourceType: source.sourceType,
      originalFilename,
      characterCount: rawText.length,
    });

    const classification = await classifyDocument(rawText);
    workflow = await updateWorkflow(workflow.id, {
      document_type: classification.documentType,
      classification_confidence: classification.confidence,
    });
    await recordWorkflowEvent(workflow.id, "document_classified", {
      documentType: classification.documentType,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
    });

    const extracted =
      classification.documentType === "invoice"
        ? await extractInvoiceData(rawText)
        : await extractDocumentData(rawText, classification);
    const extractedData = { ...extracted } as Record<string, Json | undefined>;

    let supplierId: string | null = null;
    let supplierVerified = false;
    let isDuplicate = false;

    if (classification.documentType === "invoice") {
      const invoice = await extractInvoiceDataSchemaGuard(extractedData);
      if (invoice.supplier) {
        const resolved = await getOrCreateSupplier(invoice.supplier);
        supplierId = resolved.supplier.id;
        supplierVerified = resolved.supplier.verified;
      }

      workflow = await updateWorkflow(workflow.id, {
        extracted_data: extractedData,
        supplier_id: supplierId,
        invoice_number: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
      });

      if (invoice.invoiceNumber) {
        isDuplicate = await isDuplicateInvoice(workflow.id, invoice.invoiceNumber, supplierId);
      }
    } else {
      workflow = await updateWorkflow(workflow.id, { extracted_data: extractedData });
    }

    await recordWorkflowEvent(workflow.id, "data_extracted", {
      fieldsExtracted: Object.keys(extractedData).filter((key) => extractedData[key] !== null),
    });
    await recordWorkflowEvent(workflow.id, "business_context_resolved", {
      supplierVerified,
      isDuplicate,
      supplierId,
    });

    const decision: InvoiceDecision =
      classification.documentType === "invoice"
        ? evaluateInvoice({
            invoice: await extractInvoiceDataSchemaGuard(extractedData),
            supplierVerified,
            isDuplicate,
          })
        : {
            action: "human_review",
            reasons: ["This document type requires manual handling in V1."],
          };

    workflow = await updateWorkflow(workflow.id, { decision: decision.action });
    await recordWorkflowEvent(workflow.id, "business_rules_evaluated", {
      decision: decision.action,
      reasons: decision.reasons,
    });

    const generatedResponse = await generateSuggestedResponse({
      classification,
      extractedData,
      decision,
    });
    await recordWorkflowEvent(workflow.id, "response_generated", {});

    workflow = await updateWorkflow(workflow.id, {
      generated_response: generatedResponse,
      status: "completed",
    });
    await recordWorkflowEvent(workflow.id, "workflow_completed", {
      decision: workflow.decision,
    });

    const detail = await getWorkflowDetail(workflow.id);
    if (!detail) throw new Error("Completed workflow could not be loaded");
    return detail;
  } catch (error) {
    if (workflowId) {
      try {
        await updateWorkflow(workflowId, { status: "failed" });
        await recordWorkflowEvent(workflowId, "workflow_failed", {
          message: "Processing did not complete.",
        });
      } catch (persistenceError) {
        console.error("Failed to persist workflow failure state", persistenceError);
      }
    }
    throw error;
  }
}

async function extractInvoiceDataSchemaGuard(data: Record<string, unknown>) {
  const { invoiceExtractionSchema } = await import("@/lib/validation/invoice");
  return invoiceExtractionSchema.parse(data);
}

export type { SourceType };
