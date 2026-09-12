# AI Ops Automation

A focused V1 for auditable business-document processing. The application accepts text-based PDFs or pasted emails, classifies the document with Groq, extracts structured data, applies deterministic TypeScript rules, persists the result in Supabase, and presents the complete workflow history.

## V1 workflow

```text
PDF with embedded text or pasted email
→ classification
→ structured extraction and validation
→ supplier and duplicate checks
→ deterministic business rules
→ Supabase persistence and audit events
→ suggested response
→ dashboard and workflow history
```

Invoice processing is the deeply supported path. Other document types are classified and extracted, then routed to human review.

## Routes

- `/dashboard` — real processing metrics and recent workflows
- `/process` — PDF upload or pasted-email processing
- `/workflows` — searchable operational history
- `/workflows/[id]` — source, result, decision, response, and persisted audit trail
- `/suppliers` — supplier verification registry and invoice activity

## Local setup

Requirements: Node.js 22.3 or newer and a Supabase project.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and provide:

   ```text
   GROQ_API_KEY=
   NEXT_PUBLIC_SUPABASE_URL=
   SUPABASE_SECRET_KEY=
   ```

   `GROQ_API_KEY` and `SUPABASE_SECRET_KEY` are server-only. Never prefix them with `NEXT_PUBLIC_`.

3. In the Supabase SQL editor, manually run:

   ```text
   supabase/migrations/202609120001_ai_ops_v1.sql
   ```

   The migration is additive and contains no destructive data operations. It enables row-level security and expects all database access to use the server-side secret key.

4. Start the application:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`. The root route redirects to the dashboard.

## Testing the workflow

For an email test, open **Process**, choose **Paste email**, and use invoice text containing a supplier, invoice number, amount, currency, issue date, and due date. A newly encountered supplier is created as unverified, so the first invoice normally requires human review until that supplier is marked verified in Supabase.

For a PDF test, upload a PDF under 10 MB with selectable embedded text. Scanned or image-only PDFs return an explicit V1 limitation message because OCR is intentionally not included.

Run local verification with:

```bash
npm run lint
npm run typecheck
npm run build
```

## Architecture

- Next.js App Router and React Server Components for database-backed screens
- One client component for the interactive processing form
- One `/api/process` Route Handler as the orchestration boundary
- Groq for interpretation, structured extraction, and suggested responses
- Zod validation at request and AI-output boundaries
- Deterministic TypeScript financial decisions with a V1 EUR 5,000 threshold
- Supabase repositories kept behind `server-only` modules
- Real `workflow_events` records for the audit timeline

## Security notes

All `.env*` files are ignored except the value-free `.env.example`. The browser never receives the Groq or Supabase secret keys. Generated responses are suggestions only and are not sent automatically.
