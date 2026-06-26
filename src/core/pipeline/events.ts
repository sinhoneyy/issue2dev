export type StageStatus = "started" | "completed" | "degraded";

export type StageEvent = {
  stage: string;
  status: StageStatus;
  durationMs?: number;
  message?: string;
};

export class PipelineEvents {
  private readonly events: StageEvent[] = [];

  start(stage: string): () => void {
    this.events.push({ stage, status: "started" });
    const started = performance.now();
    return () => this.events.push({ stage, status: "completed", durationMs: Math.round(performance.now() - started) });
  }

  degraded(stage: string, message: string): void {
    this.events.push({ stage, status: "degraded", message });
  }

  list(): StageEvent[] {
    return [...this.events];
  }
}