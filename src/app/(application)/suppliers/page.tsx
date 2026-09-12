import {
  DatabaseSetupState,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/ui/page-elements";
import { VerificationBadge } from "@/components/ui/status-badge";
import { DatabaseError } from "@/lib/database/supabase";
import { listSuppliers } from "@/lib/database/workflows";
import { formatDateTime } from "@/lib/presentation/workflow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Suppliers" };

async function loadSuppliers() {
  try {
    return { ok: true as const, data: await listSuppliers() };
  } catch (error) {
    if (error instanceof DatabaseError) return { ok: false as const };
    throw error;
  }
}

export default async function SuppliersPage() {
  const state = await loadSuppliers();

  if (!state.ok) {
    return (
      <div className="page">
        <PageHeader eyebrow="Supplier register" title="Suppliers" description="Verification status and invoice activity used by deterministic rules." />
        <DatabaseSetupState />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Supplier register" title="Suppliers" description="Verification status and invoice activity used by deterministic rules." />
      <Panel>
        {state.data.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Supplier</th><th>Verification</th><th className="align-right">Processed invoices</th><th>Last activity</th></tr>
              </thead>
              <tbody>
                {state.data.map((supplier) => (
                  <tr key={supplier.id}>
                    <td><strong>{supplier.name}</strong><small>#{supplier.id.slice(0, 8)}</small></td>
                    <td><VerificationBadge verified={supplier.verified} /></td>
                    <td className="align-right amount-cell">{supplier.processedInvoices.toLocaleString()}</td>
                    <td>{supplier.lastActivity ? formatDateTime(supplier.lastActivity) : "No activity"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="suppliers"
            title="No suppliers yet"
            description="Suppliers are created automatically when an invoice is processed. New suppliers start as unverified."
            actionHref="/process"
            actionLabel="Process an invoice"
          />
        )}
      </Panel>
    </div>
  );
}
