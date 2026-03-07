export interface RecipeStep {
  key: string;
  type: "llm" | "tts" | "image" | "render" | "transform";
  label: string;
}

export interface StepResult {
  output: string;
  artifacts?: { path: string; mime_type: string; size?: number }[];
  usage?: { input_tokens: number; output_tokens: number };
  duration_ms: number;
}

export interface ExecutionContext {
  jobId: string;
  stepKey: string;
  language: string;
  input: Record<string, unknown>;
  previousOutputs: Record<string, string>;
}

/** Definition of a step within a recipe */
export interface StepDefinition {
  key: string;
  kind?: string;
  name: string;
  type?: string;
  label?: string;
}

/** Resolved configuration for a step (bindings to prompts, providers, presets, etc.) */
export interface ResolvedConfig {
  prompt?: { id: string; name: string; source?: string };
  provider?: { id: string; name: string; source?: string };
  preset_voice?: { id: string; name: string; source?: string };
  preset_ssml?: { id: string; name: string; source?: string };
  preset_video?: { id: string; name: string; source?: string };
  preset_effects?: { id: string; name: string; source?: string };
  validators?: { items: Array<{ id: string; name: string }>; source?: string };
  kb?: { items: Array<{ id: string; name: string }>; source?: string };
  [key: string]: unknown;
}

/** Structured log entry emitted during pipeline execution */
export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  stepKey?: string;
  meta?: Record<string, unknown>;
}

/** Manifest for a single step execution */
export interface StepManifest {
  key: string;
  kind: string;
  status: "running" | "success" | "failed" | "skipped";
  config: ResolvedConfig;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  request?: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response?: Record<string, any>;
  artifacts?: Array<{ uri: string; content_type: string; size_bytes?: number; duration_sec?: number }>;
  error?: { code: string; message: string };
  validations?: unknown;
}
