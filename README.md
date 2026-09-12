# AI Ops Automation

AI Ops Automation is an auditable document-processing platform for finance and operations teams. It turns text-based invoices and business emails into structured workflows by combining AI interpretation with deterministic business rules, persistent audit records, and a review-oriented interface.

**Live demo:** [ai-ops-automation.vercel.app](https://ai-ops-automation.vercel.app)

## Overview

Business documents often arrive in inconsistent formats and require repetitive manual checks before a team can act on them. This project demonstrates a safer automation pattern: AI handles interpretation and extraction, while explicit TypeScript rules control operational decisions.

The current V1 focuses on invoice processing. It classifies each document, extracts validated fields, resolves supplier context, detects duplicates, evaluates financial rules, stores every workflow step, and drafts a suggested response for an operator to review.

## How it works

```text
Text-based PDF or pasted email
              │
              ▼
     Document ingestion
              │
              ▼
  Groq classification and extraction
              │
              ▼
       Zod validation boundary
              │
              ▼
 Supplier lookup and duplicate check
              │
              ▼
 Deterministic TypeScript rules
              │
              ▼
 Supabase workflow + audit events
              │
              ▼
 Dashboard, history, detail, and response draft
```

AI output never directly approves or rejects a financial document. The final V1 decision is produced by code as one of `auto_process`, `human_review`, or `blocked`.

## Implemented features

- Upload of text-based PDF files up to 10 MB
- Processing of pasted business-email content
- AI classification into invoice, purchase order, customer request, or other
- Schema-validated structured data extraction
- Supplier registry with verification state
- Duplicate invoice detection by supplier and invoice number
- Deterministic invoice decisions with human-readable reasons
- Suggested response generation without automatic delivery
- Persisted workflow status and append-only audit events
- Operational dashboard, searchable workflow history, detailed workflow view, and supplier overview
- Server-side PDF parsing compatible with local Next.js development and Vercel

## Business rules

Invoice decisions are intentionally transparent:

- Duplicate invoice numbers are blocked.
- Missing supplier, invoice number, or amount requires human review.
- Unverified suppliers require human review.
- Amounts above EUR 5,000 require human review.
- An invoice is eligible for automatic processing only when required fields are present, the supplier is verified, no duplicate exists, and the amount is within the limit.
- Non-invoice document types are routed to human review in V1.

These rules live in TypeScript rather than in the model prompt, making the decision path testable and auditable.

## Architecture

- **Presentation:** Next.js App Router, React Server Components, and a focused client-side processing form
- **API boundary:** a Node.js Route Handler at `/api/process`
- **AI layer:** Groq for classification, structured extraction, and response drafting
- **Validation:** Zod schemas at request and AI-output boundaries
- **Decision engine:** deterministic TypeScript rules isolated from AI interpretation
- **Persistence:** Supabase/PostgreSQL repositories available only to server modules
- **Auditability:** `workflow_events` records each material processing step
- **Deployment:** Vercel, with platform rate limiting protecting the production processing endpoint

## Technology stack

- Next.js 16 and React 19
- TypeScript 5
- Tailwind CSS 4 toolchain and custom application styles
- Groq SDK
- Zod 4
- Supabase and PostgreSQL
- `pdf-parse` for server-side PDF text extraction
- Vercel for production deployment

## Security and operational safeguards

- `GROQ_API_KEY` and `SUPABASE_SECRET_KEY` are read only by server-side modules.
- `.env.local` and other environment files are ignored; `.env.example` contains names only and no values.
- No secrets are exposed through `NEXT_PUBLIC_` variables except the public Supabase project URL.
- Input size, source type, and AI output are validated before use.
- Row-level security is enabled by the Supabase migration; application database access uses server credentials.
- The production `/api/process` endpoint is protected by Vercel rate limiting.
- Suggested responses are stored for review and are never sent automatically.

## Current scope and limitations

This repository is a production-deployed V1 and a portfolio demonstration, not a complete accounts-payable product.

- Invoice processing is the fully developed path; other document types require manual handling.
- PDFs must contain selectable text. OCR for scanned or image-only documents is not included.
- Email content is pasted into the application; there is no mailbox integration yet.
- Supplier verification is currently managed directly in Supabase.
- Authentication, organizations, role-based access, and configurable approval policies are not yet implemented.
- AI extraction can be imperfect, so operational review remains part of the design.

## Application routes

- `/dashboard` — processing metrics and recent workflows
- `/process` — PDF upload and pasted-email processing
- `/workflows` — searchable operational history
- `/workflows/[id]` — source, extraction, decision, response, and audit timeline
- `/suppliers` — supplier verification and invoice activity

## Local development

Requirements: Node.js 22.3 or newer and a Supabase project.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and provide local values:

   ```text
   GROQ_API_KEY=
   NEXT_PUBLIC_SUPABASE_URL=
   SUPABASE_SECRET_KEY=
   ```

3. Run the V1 migration manually in the Supabase SQL editor:

   ```text
   supabase/migrations/202609120001_ai_ops_v1.sql
   ```

   The migration safely upgrades the earlier V0 schema without dropping tables or deleting records.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). The root route redirects to `/dashboard`.

## Project structure

```text
src/
├── app/                 # App Router pages, layouts, and API route
├── components/          # Application shell, forms, tables, and UI primitives
└── lib/
    ├── ai/              # Groq client, classification, extraction, and responses
    ├── database/        # Supabase client, types, and repositories
    ├── documents/       # Server-side PDF text extraction
    ├── rules/           # Deterministic business decisions
    ├── validation/      # Zod schemas
    └── workflow/        # End-to-end document orchestration
supabase/
└── migrations/          # Idempotent V0-to-V1 database migration
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Roadmap

- OCR for scanned documents
- Direct email and shared-inbox ingestion
- Authentication, organizations, and role-based access
- Configurable approval thresholds and workflow policies
- Supplier verification management in the application
- Background queues, retries, and richer observability
- Automated tests and continuous integration
- Human approval actions and downstream accounting integrations

## Live demo

Explore the deployed application at [https://ai-ops-automation.vercel.app](https://ai-ops-automation.vercel.app).

The demo is intended to show the workflow architecture and interface. Use non-sensitive sample data only.
