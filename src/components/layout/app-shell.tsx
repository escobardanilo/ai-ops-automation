"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Icon, type IconName } from "@/components/ui/icons";

const navigation: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/process", label: "Process", icon: "process" },
  { href: "/workflows", label: "Workflows", icon: "workflows" },
  { href: "/suppliers", label: "Suppliers", icon: "suppliers" },
];

export function AppShell({ children, servicesConfigured }: { children: React.ReactNode; servicesConfigured: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <button className="mobile-menu-button" type="button" aria-label="Open navigation" onClick={() => setOpen(true)}><Icon name="menu" /></button>
      {open ? <button className="sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand-row">
          <Link href="/dashboard" className="brand" onClick={() => setOpen(false)}>
            <span className="brand-mark">AO</span>
            <span><strong>AI Ops</strong><small>Automation</small></span>
          </Link>
          <button className="sidebar-close" type="button" aria-label="Close navigation" onClick={() => setOpen(false)}><Icon name="close" /></button>
        </div>
        <nav aria-label="Primary navigation" className="sidebar-nav">
          {navigation.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            return (
              <Link key={item.href} href={item.href} className={active ? "nav-link nav-link-active" : "nav-link"} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
                <Icon name={item.icon} />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-status">
          <span className={`status-dot ${servicesConfigured ? "status-dot-ok" : "status-dot-warning"}`} />
          <div><strong>{servicesConfigured ? "Configuration detected" : "Setup required"}</strong><small>{servicesConfigured ? "Server credentials are present" : "Check environment variables"}</small></div>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
