import { NextResponse } from "next/server";
import { z } from "zod";
import { extractInvoiceData } from "@/lib/ai/extract-invoice";

const requestSchema = z.object({
  text: z.string().min(10).max(50000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { text } = requestSchema.parse(body);

    const invoice = await extractInvoiceData(text);

    return NextResponse.json({
      ok: true,
      invoice,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid input or AI output",
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
            : "Unknown invoice extraction error",
      },
      { status: 500 }
    );
  }
}