import { NextResponse } from "next/server";
import { runJob } from "@/lib/engine/runner";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "Job ID required" }, { status: 400 });
  }

  // Run in background — don't await
  runJob(jobId).catch((err) => {
    console.error(`[ENGINE] Job ${jobId} failed:`, err);
  });

  return NextResponse.json({ status: "started", job_id: jobId });
}
