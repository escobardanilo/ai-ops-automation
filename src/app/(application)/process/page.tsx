import { PageHeader } from "@/components/ui/page-elements";
import { ProcessForm } from "@/components/process/process-form";

export const metadata = { title: "Process" };

export default function ProcessPage() {
  return <div className="page page-narrow"><PageHeader eyebrow="New workflow" title="Process a document" description="Upload a text-based PDF or paste an email. Every step is persisted in the audit trail." /><ProcessForm /></div>;
}
