import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DatabaseError } from "@/lib/database/supabase";
import { processDocument, ProcessingInputError } from "@/lib/workflow/process-document";
import { sourceTypeSchema } from "@/lib/validation/workflow";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "The processing request must use valid multipart form data." },
      { status: 400 }
    );
  }

  try {
    const sourceType = sourceTypeSchema.parse(formData.get("sourceType"));

    const result =
      sourceType === "email"
        ? await processDocument({
            sourceType,
            text: z.string().parse(formData.get("text")),
          })
        : await processDocument({
            sourceType,
            file: z.instanceof(File).parse(formData.get("file")),
          });

    revalidatePath("/dashboard");
    revalidatePath("/workflows");
    revalidatePath("/suppliers");

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof ProcessingInputError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "The processing request is incomplete or invalid." },
        { status: 400 }
      );
    }
    if (error instanceof DatabaseError) {
      console.error("Database processing error", error.code, error.message);
      return NextResponse.json(
        {
          ok: false,
          error: "The database is not ready. Run the V1 Supabase migration and verify the server credentials.",
        },
        { status: 503 }
      );
    }

    console.error("Document processing failed", error);
    return NextResponse.json(
      { ok: false, error: "Processing failed. Please verify the document and try again." },
      { status: 500 }
    );
  }
}
