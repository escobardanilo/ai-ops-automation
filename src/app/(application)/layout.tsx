import { AppShell } from "@/components/layout/app-shell";
import { isDatabaseConfigured } from "@/lib/database/supabase";

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  const servicesConfigured = isDatabaseConfigured() && Boolean(process.env.GROQ_API_KEY);
  return <AppShell servicesConfigured={servicesConfigured}>{children}</AppShell>;
}
