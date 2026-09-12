"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Icon } from "@/components/ui/icons";
import { CopyButton } from "@/components/ui/copy-button";
import { DecisionBadge } from "@/components/ui/status-badge";
import { documentTypeLabels, formatAmount, formatConfidence, formatFieldLabel, formatFieldValue } from "@/lib/presentation/workflow";
import type { SourceType, WorkflowDetail } from "@/lib/validation/workflow";

type ApiResponse = { ok: true; result: WorkflowDetail } | { ok: false; error: string };

export function ProcessForm() {
  const [mode, setMode] = useState<SourceType>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WorkflowDetail | null>(null);
  const textPreview = useMemo(() => text.trim().slice(0, 420), [text]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(null); setResult(null);
    const body = new FormData(); body.set("sourceType", mode);
    if (mode === "pdf" && file) body.set("file", file);
    if (mode === "email") body.set("text", text);
    try {
      const response = await fetch("/api/process", { method: "POST", body });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.ok ? "Processing failed." : payload.error);
      setResult(payload.result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Processing failed. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <div className="process-stack">
      <form className="panel process-input" onSubmit={submit}>
        <div className="mode-tabs" role="tablist" aria-label="Source type">
          <button type="button" role="tab" aria-selected={mode === "pdf"} className={mode === "pdf" ? "mode-tab mode-tab-active" : "mode-tab"} onClick={() => { setMode("pdf"); setError(null); }}><Icon name="upload" />Upload PDF</button>
          <button type="button" role="tab" aria-selected={mode === "email"} className={mode === "email" ? "mode-tab mode-tab-active" : "mode-tab"} onClick={() => { setMode("email"); setError(null); }}><Icon name="mail" />Paste email</button>
        </div>

        {mode === "pdf" ? (
          <div className="input-section">
            <label className="file-drop" htmlFor="pdf-file">
              <span className="file-drop-icon"><Icon name="document" /></span>
              <strong>{file ? file.name : "Choose a text-based PDF"}</strong>
              <span>{file ? `${(file.size / 1024).toFixed(1)} KB · Ready to process` : "PDF with embedded text · Maximum 10 MB"}</span>
              <span className="button button-secondary">Browse file</span>
              <input id="pdf-file" type="file" accept="application/pdf,.pdf" required onChange={(event) => { setFile(event.target.files?.[0] ?? null); setResult(null); setError(null); }} />
            </label>
            {file ? <div className="source-preview"><div><span className="preview-label">Source preview</span><strong>{file.name}</strong><small>File content will be extracted securely on the server.</small></div><button type="button" className="icon-button" aria-label="Remove selected file" onClick={() => setFile(null)}><Icon name="close" /></button></div> : null}
          </div>
        ) : (
          <div className="input-section">
            <label className="field-label" htmlFor="email-text">Email content</label>
            <textarea id="email-text" className="text-input" value={text} onChange={(event) => { setText(event.target.value); setResult(null); setError(null); }} placeholder="Paste the complete email, including the subject and sender when available…" minLength={10} maxLength={100000} required rows={12} />
            <div className="field-hint"><span>{textPreview ? "Preview updates as you type" : "Plain text only"}</span><span>{text.length.toLocaleString()} / 100,000</span></div>
          </div>
        )}

        {error ? <div className="inline-alert inline-alert-error" role="alert"><Icon name="alert" /><div><strong>Unable to process document</strong><p>{error}</p></div></div> : null}
        <div className="form-actions"><p>AI interprets the document. TypeScript rules make the final decision.</p><button className="button button-primary" type="submit" disabled={loading || (mode === "pdf" ? !file : text.trim().length < 10)}>{loading ? <span className="spinner" /> : <Icon name="process" />}{loading ? "Processing…" : "Process with AI"}</button></div>
        {loading ? <p className="processing-note" role="status">Classification, extraction, business rules, persistence, and response generation are running.</p> : null}
      </form>

      {result ? <ProcessResult result={result} /> : null}
    </div>
  );
}

function ProcessResult({ result }: { result: WorkflowDetail }) {
  const { workflow, businessChecks } = result;
  return (
    <section className="result-section" aria-labelledby="processing-result-title">
      <div className="result-heading"><div><p className="eyebrow">Processing complete</p><h2 id="processing-result-title">Document result</h2></div><DecisionBadge decision={workflow.decision} /></div>
      <div className="result-summary-grid">
        <div className="result-card"><span>Classification</span><strong>{workflow.document_type ? documentTypeLabels[workflow.document_type] : "Pending"}</strong><small>{formatConfidence(workflow.classification_confidence)} confidence</small></div>
        <div className="result-card"><span>Amount</span><strong>{formatAmount(workflow.amount, workflow.currency)}</strong><small>{workflow.invoice_number ?? "No reference"}</small></div>
      </div>
      <div className="result-grid">
        <div className="panel"><header className="panel-header"><div><h2>Extracted data</h2><p>Structured fields validated before persistence.</p></div></header><dl className="key-value-list">{Object.entries(workflow.extracted_data).map(([key, value]) => <div key={key}><dt>{formatFieldLabel(key)}</dt><dd>{formatFieldValue(value)}</dd></div>)}</dl></div>
        <div className="panel"><header className="panel-header"><div><h2>Business checks</h2><p>Deterministic checks used for the decision.</p></div></header><ul className="check-list">{businessChecks.map((check) => <li key={check.label} className={`check-${check.outcome}`}><span><Icon name={check.outcome === "passed" ? "check" : "alert"} /></span><div><strong>{check.label}</strong><p>{check.detail}</p></div></li>)}</ul></div>
      </div>
      <div className="panel decision-panel"><header className="panel-header"><div><h2>Decision</h2><p>The financial decision was made by deterministic TypeScript rules.</p></div><DecisionBadge decision={workflow.decision} /></header><ul className="reason-list">{getDecisionReasons(result).map((reason) => <li key={reason}>{reason}</li>)}</ul></div>
      {workflow.generated_response ? <div className="panel"><header className="panel-header"><div><h2>Suggested response</h2><p>Review before sending through your normal communication channel.</p></div><CopyButton value={workflow.generated_response} /></header><p className="generated-response">{workflow.generated_response}</p></div> : null}
      <div className="result-footer"><Link className="button button-primary" href={`/workflows/${workflow.id}`}>Open workflow<Icon name="arrow" /></Link></div>
    </section>
  );
}

function getDecisionReasons(result: WorkflowDetail) {
  const value = result.events.find((event) => event.event_type === "business_rules_evaluated")?.payload.reasons;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
