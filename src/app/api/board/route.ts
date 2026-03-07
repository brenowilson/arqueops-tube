import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
    type BoardColumn,
    type JobState,
    getColumnForState,
    BADGE_STATES,
} from "@/lib/engine/job-state-machine";

/**
 * GET /api/board
 * Dedicated endpoint for Kanban Board polling.
 */
export async function GET() {
    try {
        const supabase = createServiceClient();

        const { data: allJobs, error } = await supabase
            .from("jobs")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const columns: Record<BoardColumn, typeof allJobs> = {
            A_FAZER: [],
            ROTEIRO: [],
            NARRACAO: [],
            VIDEO: [],
            CONCLUIDO: [],
        };

        for (const job of allJobs || []) {
            const state = (job.state || "DRAFT") as JobState;

            if (BADGE_STATES.includes(state)) {
                columns.A_FAZER.push(job);
                continue;
            }

            const column = getColumnForState(state);
            columns[column].push(job);
        }

        const transformedColumns: Record<BoardColumn, {
            id: string;
            title: string;
            state: JobState;
            language: string;
            recipe_key: string;
            progress: number;
            created_at: string;
        }[]> = {
            A_FAZER: [],
            ROTEIRO: [],
            NARRACAO: [],
            VIDEO: [],
            CONCLUIDO: [],
        };

        for (const [column, jobList] of Object.entries(columns)) {
            transformedColumns[column as BoardColumn] = (jobList || []).map((job) => ({
                id: job.id,
                title: job.title || "Sem título",
                state: (job.state || "DRAFT") as JobState,
                language: job.language || "pt-BR",
                recipe_key: job.recipe_key || "video-completo",
                progress: job.progress || 0,
                created_at: job.created_at,
            }));
        }

        return NextResponse.json({
            columns: transformedColumns,
            autoVideoEnabled: true,
        });
    } catch (error) {
        console.error("Error in GET /api/board:", error);
        return NextResponse.json({ error: "Failed to load board" }, { status: 500 });
    }
}
