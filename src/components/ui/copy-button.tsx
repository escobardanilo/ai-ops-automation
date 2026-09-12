"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" className="button button-secondary button-small" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }}><Icon name={copied ? "check" : "copy"} />{copied ? "Copied" : "Copy"}</button>;
}
