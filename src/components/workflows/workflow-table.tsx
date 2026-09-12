import Link from "next/link";

import { DecisionBadge, WorkflowStatusBadge } from "@/components/ui/status-badge";
import { documentTypeLabels, formatAmount, formatConfidence, formatDate, workflowDocumentName } from "@/lib/presentation/workflow";
import type { Workflow } from "@/lib/validation/workflow";

export function WorkflowTable({ workflows }: { workflows: Workflow[] }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr><th>Document</th><th>Type</th><th>Supplier / source</th><th className="align-right">Amount</th><th>Decision</th><th>Status</th><th>Created</th><th className="align-right">Confidence</th></tr></thead>
        <tbody>
          {workflows.map((workflow) => (
            <tr key={workflow.id}>
              <td><Link className="table-primary-link" href={`/workflows/${workflow.id}`}>{workflowDocumentName(workflow)}</Link><small>#{workflow.id.slice(0, 8)}</small></td>
              <td>{workflow.document_type ? documentTypeLabels[workflow.document_type] : "Pending"}</td>
              <td>{workflow.supplier?.name ?? (workflow.source_type === "email" ? "Pasted email" : "—")}</td>
              <td className="align-right amount-cell">{formatAmount(workflow.amount, workflow.currency)}</td>
              <td><DecisionBadge decision={workflow.decision} /></td>
              <td><WorkflowStatusBadge status={workflow.status} /></td>
              <td>{formatDate(workflow.created_at)}</td>
              <td className="align-right confidence-cell">{formatConfidence(workflow.classification_confidence)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
