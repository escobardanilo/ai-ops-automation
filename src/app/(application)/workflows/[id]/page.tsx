import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyButton } from "@/components/ui/copy-button";
import { Icon } from "@/components/ui/icons";
import { DatabaseSetupState, PageHeader, Panel } from "@/components/ui/page-elements";
import { DecisionBadge, WorkflowStatusBadge } from "@/components/ui/status-badge";
import { DatabaseError } from "@/lib/database/supabase";
import { getWorkflowDetail } from "@/lib/database/workflows";
import { documentTypeLabels, eventLabels, formatAmount, formatConfidence, formatDateTime, formatFieldLabel, formatFieldValue, workflowDocumentName } from "@/lib/presentation/workflow";

export const dynamic = "force-dynamic";

async function loadWorkflow(id: string) {
  try {
    return { ok: true as const, data: await getWorkflowDetail(id) };
  } catch (error) {
    if (error instanceof DatabaseError) return { ok: false as const };
    throw error;
  }
}

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await loadWorkflow(id);
  if (!state.ok) {
    return <div className="page"><PageHeader title="Workflow" description="The persisted workflow could not be loaded." /><DatabaseSetupState /></div>;
  }
  const detail = state.data;
    if (!detail) notFound();
    const { workflow, events, businessChecks } = detail;
    const classificationReasoning = events.find((event) => event.event_type === "document_classified")?.payload.reasoning;
    const decisionReasonsValue = events.find((event) => event.event_type === "business_rules_evaluated")?.payload.reasons;
    const decisionReasons = Array.isArray(decisionReasonsValue) ? decisionReasonsValue.filter((value): value is string => typeof value === "string") : [];
    return <div className="page"><Link className="back-link" href="/workflows">← Back to workflows</Link><PageHeader eyebrow={`Workflow #${workflow.id.slice(0, 8)}`} title={workflowDocumentName(workflow)} description={`${workflow.supplier?.name ?? (workflow.source_type === "email" ? "Pasted email" : "Unknown supplier")} · ${formatDateTime(workflow.created_at)}`} action={<div className="header-badges"><WorkflowStatusBadge status={workflow.status} /><DecisionBadge decision={workflow.decision} /></div>} /><div className="detail-layout"><div className="detail-main"><Panel title="Original source" description={workflow.source_type === "pdf" ? workflow.original_filename ?? "PDF document" : "Pasted email"}><details className="source-details"><summary>View source text</summary><pre>{workflow.raw_text}</pre></details></Panel><div className="detail-summary-grid"><Panel title="Classification"><div className="classification-value"><strong>{workflow.document_type ? documentTypeLabels[workflow.document_type] : "Pending"}</strong><span>{formatConfidence(workflow.classification_confidence)} confidence</span></div>{typeof classificationReasoning === "string" ? <p className="muted-copy">{classificationReasoning}</p> : null}</Panel><Panel title="Invoice summary"><dl className="compact-definition"><div><dt>Invoice number</dt><dd>{workflow.invoice_number ?? "—"}</dd></div><div><dt>Amount</dt><dd>{formatAmount(workflow.amount, workflow.currency)}</dd></div></dl></Panel></div><Panel title="Extracted data" description="Structured output persisted after validation."><dl className="key-value-list">{Object.entries(workflow.extracted_data).map(([key, value]) => <div key={key}><dt>{formatFieldLabel(key)}</dt><dd>{formatFieldValue(value)}</dd></div>)}</dl></Panel><Panel title="Business checks" description="Deterministic checks used for the financial decision."><ul className="check-list check-list-columns">{businessChecks.map((check) => <li key={check.label} className={`check-${check.outcome}`}><span><Icon name={check.outcome === "passed" ? "check" : "alert"} /></span><div><strong>{check.label}</strong><p>{check.detail}</p></div></li>)}</ul></Panel><Panel title="Final decision" description="AI did not make this decision." action={<DecisionBadge decision={workflow.decision} />}><ul className="reason-list">{decisionReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></Panel>{workflow.generated_response ? <Panel title="Suggested response" description="Review before sending through your communication channel." action={<CopyButton value={workflow.generated_response} />}><p className="generated-response">{workflow.generated_response}</p></Panel> : null}</div><aside className="audit-panel"><div className="audit-heading"><p className="eyebrow">Persisted record</p><h2>Audit trail</h2><p>Events stored in Supabase.</p></div><ol className="timeline">{events.map((event) => <li key={event.id}><span className={event.event_type === "workflow_failed" ? "timeline-dot timeline-dot-error" : "timeline-dot"} /><div><strong>{eventLabels[event.event_type] ?? formatFieldLabel(event.event_type)}</strong><time dateTime={event.created_at}>{formatDateTime(event.created_at)}</time></div></li>)}</ol></aside></div></div>;
}
