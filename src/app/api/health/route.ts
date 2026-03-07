import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Health Check API
 *
 * GET /api/health
 * Returns system status including database connectivity.
 */
export async function GET() {
  let dbStatus: "ok" | "error" = "error";

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("recipes").select("id").limit(1);
    dbStatus = error ? "error" : "ok";
  } catch {
    dbStatus = "error";
  }

  const allOk = dbStatus === "ok";

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
      services: {
        database: dbStatus,
        llm: "pending",
        tts: "pending",
      },
    },
    { status: allOk ? 200 : 503 },
  );
}
