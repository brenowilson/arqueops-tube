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
