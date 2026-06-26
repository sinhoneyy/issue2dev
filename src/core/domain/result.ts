export type ResultMeta = {
  durationMs: number;
  degraded: boolean;
  toolVersion: string;
  events: Array<{ stage: string; status: "started" | "completed" | "degraded"; durationMs?: number; message?: string }>;
};

export type Issue2DevError = {
  code: "USAGE" | "VALIDATION" | "UNEXPECTED";
  message: string;
  hint?: string;
};

export type Result<T> =
  | { ok: true; data: T; error: null; meta: ResultMeta }
  | { ok: false; data: null; error: Issue2DevError; meta: ResultMeta };