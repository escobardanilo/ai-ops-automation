import { decisionLabels, statusLabels } from "@/lib/presentation/workflow";
import type { WorkflowStatus } from "@/lib/validation/workflow";
import type { InvoiceDecision } from "@/lib/validation/decision";

export function DecisionBadge({ decision }: { decision: InvoiceDecision["action"] | null }) {
  if (!decision) return <span className="badge badge-neutral">Pending</span>;
  return <span className={`badge badge-${decision}`}>{decisionLabels[decision]}</span>;
}

export function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  return <span className={`badge badge-status-${status}`}>{statusLabels[status]}</span>;
}

export function VerificationBadge({ verified }: { verified: boolean }) {
  return <span className={`badge ${verified ? "badge-verified" : "badge-unverified"}`}>{verified ? "Verified" : "Unverified"}</span>;
}
