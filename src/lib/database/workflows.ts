import "server-only";

import { getSupabase, assertDatabaseResult } from "@/lib/database/supabase";
import type { Database, Json } from "@/lib/database/types";
import type { DocumentClassification } from "@/lib/validation/classification";
import {
  supplierSchema,
  workflowEventSchema,
  workflowSchema,
  type BusinessCheck,
  type Supplier,
  type Workflow,
  type WorkflowDetail,
  type WorkflowEvent,
} from "@/lib/validation/workflow";

type CreateWorkflowInput = {
  sourceType: "pdf" | "email";
  originalFilename: string | null;
  rawText: string;
};

type WorkflowUpdates = Omit<
  Database["public"]["Tables"]["workflows"]["Update"],
  "source_type" | "original_filename" | "raw_text" | "updated_at"
>;

export type WorkflowFilters = {
  decision?: "auto_process" | "human_review" | "blocked";
  documentType?: DocumentClassification["documentType"];
  search?: string;
};

function parseSupplier(value: unknown): Supplier | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ? supplierSchema.parse(value[0]) : null;
  return supplierSchema.parse(value);
}

function parseWorkflow(value: unknown): Workflow {
  const row = workflowSchema.parse(value);
  const supplierValue =
    typeof value === "object" && value !== null && "suppliers" in value
      ? (value as { suppliers?: unknown }).suppliers
      : null;

  return { ...row, supplier: parseSupplier(supplierValue) };
}

function parseEvent(value: unknown): WorkflowEvent {
  return workflowEventSchema.parse(value);
}

export async function createWorkflow(input: CreateWorkflowInput) {
  const { data, error } = await getSupabase()
    .from("workflows")
    .insert({
      source_type: input.sourceType,
      original_filename: input.originalFilename,
      raw_text: input.rawText,
      extracted_data: {},
      status: "processing",
      updated_at: new Date().toISOString(),
    })
    .select("*, suppliers(id, name, verified, created_at)")
    .single();

  assertDatabaseResult(error);
  return parseWorkflow(data);
}

export async function updateWorkflow(id: string, updates: WorkflowUpdates) {
  const { data, error } = await getSupabase()
    .from("workflows")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, suppliers(id, name, verified, created_at)")
    .single();

  assertDatabaseResult(error);
  return parseWorkflow(data);
}

export async function recordWorkflowEvent(
  workflowId: string,
  eventType: string,
  payload: Record<string, Json | undefined> = {}
) {
  const { data, error } = await getSupabase()
    .from("workflow_events")
    .insert({ workflow_id: workflowId, event_type: eventType, payload })
    .select("*")
    .single();

  assertDatabaseResult(error);
  return parseEvent(data);
}

export async function getOrCreateSupplier(name: string) {
  const database = getSupabase();
  const { data: existing, error: findError } = await database
    .from("suppliers")
    .select("*")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();

  assertDatabaseResult(findError);
  if (existing) return { supplier: supplierSchema.parse(existing), created: false };

  const { data, error } = await database
    .from("suppliers")
    .insert({ name, verified: false })
    .select("*")
    .single();

  if (error?.code === "23505") {
    const { data: raced, error: racedError } = await database
      .from("suppliers")
      .select("*")
      .ilike("name", name)
      .limit(1)
      .single();
    assertDatabaseResult(racedError);
    return { supplier: supplierSchema.parse(raced), created: false };
  }

  assertDatabaseResult(error);
  return { supplier: supplierSchema.parse(data), created: true };
}

export async function isDuplicateInvoice(
  workflowId: string,
  invoiceNumber: string,
  supplierId: string | null
) {
  let query = getSupabase()
    .from("workflows")
    .select("id", { count: "exact", head: true })
    .eq("invoice_number", invoiceNumber)
    .neq("id", workflowId);

  query = supplierId
    ? query.eq("supplier_id", supplierId)
    : query.is("supplier_id", null);

  const { count, error } = await query;
  assertDatabaseResult(error);
  return (count ?? 0) > 0;
}

export function getBusinessChecks(
  workflow: Workflow,
  events: WorkflowEvent[]
): BusinessCheck[] {
  if (workflow.document_type !== "invoice") {
    return [
      {
        label: "Document routing",
        detail: "This document type requires manual handling in V1.",
        outcome: "attention",
      },
    ];
  }

  const context = events.find((event) => event.event_type === "business_context_resolved")?.payload;
  const supplierVerified = context?.supplierVerified === true;
  const duplicate = context?.isDuplicate === true;
  const amountInRange = workflow.amount !== null && workflow.amount <= 5000;

  return [
    {
      label: "Supplier verification",
      detail: supplierVerified ? "Supplier is verified." : "Supplier is not verified.",
      outcome: supplierVerified ? "passed" : "attention",
    },
    {
      label: "Duplicate check",
      detail: duplicate ? "A matching invoice already exists." : "No duplicate was found.",
      outcome: duplicate ? "failed" : "passed",
    },
    {
      label: "Required fields",
      detail:
        workflow.invoice_number && workflow.amount !== null
          ? "Invoice number and amount are present."
          : "Invoice number or amount is missing.",
      outcome:
        workflow.invoice_number && workflow.amount !== null ? "passed" : "attention",
    },
    {
      label: "Automatic limit",
      detail: amountInRange
        ? "Amount is within the EUR 5,000 limit."
        : "Amount is missing or exceeds the EUR 5,000 limit.",
      outcome: amountInRange ? "passed" : "attention",
    },
  ];
}

const workflowSelect = "*, suppliers(id, name, verified, created_at)";

export async function listWorkflows(filters: WorkflowFilters = {}) {
  let query = getSupabase()
    .from("workflows")
    .select(workflowSelect)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.decision) query = query.eq("decision", filters.decision);
  if (filters.documentType) query = query.eq("document_type", filters.documentType);
  if (filters.search) {
    const safeSearch = filters.search.replace(/[,%()]/g, " ").trim();
    if (safeSearch) {
      query = query.or(
        `original_filename.ilike.%${safeSearch}%,invoice_number.ilike.%${safeSearch}%`
      );
    }
  }

  const { data, error } = await query;
  assertDatabaseResult(error);
  return (data ?? []).map(parseWorkflow);
}

export async function getWorkflowDetail(id: string): Promise<WorkflowDetail | null> {
  const database = getSupabase();
  const [workflowResult, eventsResult] = await Promise.all([
    database.from("workflows").select(workflowSelect).eq("id", id).maybeSingle(),
    database
      .from("workflow_events")
      .select("*")
      .eq("workflow_id", id)
      .order("created_at", { ascending: true }),
  ]);

  assertDatabaseResult(workflowResult.error);
  assertDatabaseResult(eventsResult.error);
  if (!workflowResult.data) return null;

  const workflow = parseWorkflow(workflowResult.data);
  const events = (eventsResult.data ?? []).map(parseEvent);
  return { workflow, events, businessChecks: getBusinessChecks(workflow, events) };
}

export async function getDashboardData() {
  const database = getSupabase();
  const [totalResult, autoResult, reviewResult, blockedResult, recentResult] =
    await Promise.all([
      database.from("workflows").select("id", { count: "exact", head: true }).eq("status", "completed"),
      database.from("workflows").select("id", { count: "exact", head: true }).eq("decision", "auto_process"),
      database.from("workflows").select("id", { count: "exact", head: true }).eq("decision", "human_review"),
      database.from("workflows").select("id", { count: "exact", head: true }).eq("decision", "blocked"),
      database.from("workflows").select(workflowSelect).order("created_at", { ascending: false }).limit(8),
    ]);

  for (const result of [totalResult, autoResult, reviewResult, blockedResult, recentResult]) {
    assertDatabaseResult(result.error);
  }

  return {
    metrics: {
      total: totalResult.count ?? 0,
      autoProcessed: autoResult.count ?? 0,
      needsReview: reviewResult.count ?? 0,
      blocked: blockedResult.count ?? 0,
    },
    recent: (recentResult.data ?? []).map(parseWorkflow),
  };
}

export async function listSuppliers() {
  const database = getSupabase();
  const [supplierResult, workflowResult] = await Promise.all([
    database.from("suppliers").select("*").order("name", { ascending: true }),
    database.from("workflows").select("supplier_id, created_at").not("supplier_id", "is", null),
  ]);

  assertDatabaseResult(supplierResult.error);
  assertDatabaseResult(workflowResult.error);

  const activity = new Map<string, { count: number; lastActivity: string | null }>();
  for (const row of workflowResult.data ?? []) {
    if (!row.supplier_id) continue;
    const current = activity.get(row.supplier_id) ?? { count: 0, lastActivity: null };
    current.count += 1;
    if (!current.lastActivity || row.created_at > current.lastActivity) {
      current.lastActivity = row.created_at;
    }
    activity.set(row.supplier_id, current);
  }

  return (supplierResult.data ?? []).map((row) => {
    const supplier = supplierSchema.parse(row);
    return {
      ...supplier,
      processedInvoices: activity.get(supplier.id)?.count ?? 0,
      lastActivity: activity.get(supplier.id)?.lastActivity ?? null,
    };
  });
}
