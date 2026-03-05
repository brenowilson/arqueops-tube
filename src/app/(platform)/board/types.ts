export type JobState =
  | "DRAFT"
  | "READY"
  | "SCRIPTING"
  | "SCRIPT_DONE"
  | "TTS_RUNNING"
  | "TTS_DONE"
  | "RENDER_READY"
  | "RENDER_RUNNING"
  | "DONE"
  | "FAILED"
  | "CANCELLED";

export interface Job {
  id: string;
  title: string;
  state: JobState;
  progress: number;
  recipe_key: string;
  language: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface Column {
  id: string;
  label: string;
  states: JobState[];
}
