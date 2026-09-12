import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyDocument } from "@/lib/ai/classify";

const requestSchema = z.object({
  text: z.string().min(10).max(50000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { text } = requestSchema.parse(body);

    const classification = await classifyDocument(text);

    return NextResponse.json({
      ok: true,
      classification,
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

    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown classification error",
      },
      { status: 500 }
    );
  }
}