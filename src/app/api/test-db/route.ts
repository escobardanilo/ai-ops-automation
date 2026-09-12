import { NextResponse } from "next/server";
import { supabase } from "@/lib/database/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("workflows")
    .select("id")
    .limit(1);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    database: "connected",
    rows: data.length,
  });
}
