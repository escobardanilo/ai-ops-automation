import { NextResponse } from "next/server";
import { ai } from "@/lib/ai/client";

export async function GET() {
  try {
    const response = await ai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "user",
          content: 'Return exactly this sentence: "AI connection working correctly."',
        },
      ],
    });

    return NextResponse.json({
      ok: true,
      response: response.choices[0]?.message?.content ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}