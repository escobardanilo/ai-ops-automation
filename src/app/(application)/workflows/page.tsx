import { WorkflowTable } from "@/components/workflows/workflow-table";
import { Icon } from "@/components/ui/icons";
import {
  DatabaseSetupState,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/ui/page-elements";
import { DatabaseError } from "@/lib/database/supabase";
import { listWorkflows, type WorkflowFilters } from "@/lib/database/workflows";

export const dynamic = "force-dynamic";
export const metadata = { title: "Workflows" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function loadWorkflows(filters: WorkflowFilters) {
  try {
    return { ok: true as const, data: await listWorkflows(filters) };
  } catch (error) {
    if (error instanceof DatabaseError) return { ok: false as const };
    throw error;
  }
}

export default async function WorkflowsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const decisionValue = typeof params.decision === "string" ? params.decision : "";
  const documentTypeValue = typeof params.type === "string" ? params.type : "";
  const search = typeof params.search === "string" ? params.search.slice(0, 100) : "";
  const decision = ["auto_process", "human_review", "blocked"].includes(decisionValue)
    ? (decisionValue as NonNullable<WorkflowFilters["decision"]>)
    : undefined;
  const documentType = ["invoice", "purchase_order", "customer_request", "other"].includes(documentTypeValue)
    ? (documentTypeValue as NonNullable<WorkflowFilters["documentType"]>)
    : undefined;
  const state = await loadWorkflows({ decision, documentType, search: search || undefined });

  if (!state.ok) {
    return (
      <div className="page">
        <PageHeader eyebrow="Operations history" title="Workflows" description="Search and review every persisted processing decision." />
        <DatabaseSetupState />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Operations history" title="Workflows" description="Search and review every persisted processing decision." />
      <Panel>
        <form className="filter-bar" method="get">
          <label className="search-field">
            <Icon name="search" />
            <span className="sr-only">Search workflows</span>
            <input type="search" name="search" defaultValue={search} placeholder="Search filename or invoice number" />
          </label>
          <label>
            <span className="sr-only">Decision</span>
            <select name="decision" defaultValue={decisionValue}>
              <option value="">All decisions</option>
              <option value="auto_process">Auto processed</option>
              <option value="human_review">Needs review</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Document type</span>
            <select name="type" defaultValue={documentTypeValue}>
              <option value="">All document types</option>
              <option value="invoice">Invoice</option>
              <option value="purchase_order">Purchase order</option>
              <option value="customer_request">Customer request</option>
              <option value="other">Other</option>
            </select>
          </label>
          <button className="button button-secondary" type="submit">Apply filters</button>
        </form>
        {state.data.length ? (
          <WorkflowTable workflows={state.data} />
        ) : (
          <EmptyState
            icon="workflows"
            title="No matching workflows"
            description={search || decision || documentType ? "Try changing the filters or process a new document." : "Processed documents will appear here with their decision and status."}
            actionHref="/process"
            actionLabel="Process document"
          />
        )}
      </Panel>
    </div>
  );
}
