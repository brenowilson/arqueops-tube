export const BRAND = {
  name: "ArqueOps Tube",
  tagline: "Fábrica de Vídeos com IA",
  colors: {
    gold: "#D4AF37",
    goldHover: "#C4A030",
    background: "#0A0A0A",
    card: "#111111",
    cardElevated: "#1A1A1A",
  },
} as const;

export const PIPELINE_COLUMNS = [
  { id: "a_fazer",   label: "A Fazer",   states: ["DRAFT", "READY"] },
  { id: "roteiro",   label: "Roteiro",   states: ["SCRIPTING", "SCRIPT_DONE"] },
  { id: "narracao",  label: "Narração",  states: ["TTS_RUNNING", "TTS_DONE"] },
  { id: "video",     label: "Vídeo",     states: ["RENDER_READY", "RENDER_RUNNING"] },
  { id: "concluido", label: "Concluído", states: ["DONE"] },
] as const;

export const JOB_STATES = [
  "DRAFT",
  "READY",
  "SCRIPTING",
  "SCRIPT_DONE",
  "TTS_RUNNING",
  "TTS_DONE",
  "RENDER_READY",
  "RENDER_RUNNING",
  "DONE",
  "FAILED",
  "CANCELLED",
] as const;

export type JobState = (typeof JOB_STATES)[number];
export type PipelineColumnId = (typeof PIPELINE_COLUMNS)[number]["id"];
