type LogEvent =
  | "compilation_started"
  | "compilation_succeeded"
  | "compilation_failed"
  | "validation_failed"
  | "human_feedback";

export function logEvent(event: LogEvent, details: Record<string, unknown> = {}): void {
  const safeDetails = Object.fromEntries(
    Object.entries(details).filter(([key]) => !/key|secret|authorization|rawInput/i.test(key)),
  );
  console.info(JSON.stringify({ event, timestamp: new Date().toISOString(), ...safeDetails }));
}
