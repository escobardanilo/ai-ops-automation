import Link from "next/link";

import { WorkflowTable } from "@/components/workflows/workflow-table";
import { Icon } from "@/components/ui/icons";
import {
  DatabaseSetupState,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/ui/page-elements";
import { DatabaseError } from "@/lib/database/supabase";
import { getDashboardData } from "@/lib/database/workflows";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

async function loadDashboard() {
  try {
    return { ok: true as const, data: await getDashboardData() };
  } catch (error) {
    if (error instanceof DatabaseError) return { ok: false as const };
    throw error;
  }
}

export default async function DashboardPage() {
  const state = await loadDashboard();

  if (!state.ok) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Operations"
          title="Dashboard"
          description="A current view of document processing and decisions."
        />
        <DatabaseSetupState />
      </div>
    );
  }

  const metrics = [
    { label: "Total processed", value: state.data.metrics.total, detail: "Completed workflows" },
    { label: "Auto processed", value: state.data.metrics.autoProcessed, detail: "Passed every rule" },
    { label: "Needs review", value: state.data.metrics.needsReview, detail: "Manual action required" },
    { label: "Blocked", value: state.data.metrics.blocked, detail: "Stopped by a rule" },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Operations"
        title="Dashboard"
        description="A current view of document processing and decisions."
        action={
          <Link className="button button-primary" href="/process">
            <Icon name="process" /> Process document
          </Link>
        }
      />
      <div className="metrics-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value.toLocaleString()}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </div>
      <Panel
        title="Recent workflows"
        description="The latest documents processed by the platform."
        action={
          state.data.recent.length ? (
            <Link className="text-link" href="/workflows">
              View all <Icon name="arrow" />
            </Link>
          ) : undefined
        }
      >
        {state.data.recent.length ? (
          <WorkflowTable workflows={state.data.recent} />
        ) : (
          <EmptyState
            title="No workflows yet"
            description="Process your first PDF or pasted email to populate the operational history."
            actionHref="/process"
            actionLabel="Process first document"
          />
        )}
      </Panel>
    </div>
  );
}
