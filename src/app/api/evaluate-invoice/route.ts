import { NextResponse } from "next/server";
import { z } from "zod";

import { evaluateInvoice } from "@/lib/rules/evaluate-invoice";
import { invoiceExtractionSchema } from "@/lib/validation/invoice";

const requestSchema = z.object({
  invoice: invoiceExtractionSchema,
  supplierVerified: z.boolean(),
  isDuplicate: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const input = requestSchema.parse(body);

    const decision = evaluateInvoice(input);

    return NextResponse.json({
      ok: true,
      decision,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid input",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown business rules error",
      },
      { status: 500 }
    );
  }
}