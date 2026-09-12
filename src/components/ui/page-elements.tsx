import Link from "next/link";
import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/icons";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </header>
  );
}

export function Panel({ title, description, action, children, className = "" }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`.trim()}>
      {title || action ? (
        <header className="panel-header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({ icon = "document", title, description, actionHref, actionLabel }: { icon?: IconName; title: string; description: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><Icon name={icon} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {actionHref && actionLabel ? <Link className="button button-primary" href={actionHref}>{actionLabel}<Icon name="arrow" /></Link> : null}
    </div>
  );
}

export function DatabaseSetupState() {
  return (
    <div className="setup-state" role="status">
      <span className="empty-state-icon"><Icon name="database" /></span>
      <div>
        <p className="eyebrow">Database setup required</p>
        <h2>Connect the V1 schema</h2>
        <p>Run <code>supabase/migrations/202609120001_ai_ops_v1.sql</code> in the Supabase SQL editor, then verify the server environment variables.</p>
      </div>
    </div>
  );
}
