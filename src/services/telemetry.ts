type TelemetryLevel = 'info' | 'warn' | 'error';

export type TelemetryEntry = {
  ts: number;
  event: string;
  level: TelemetryLevel;
  details?: Record<string, unknown>;
};

const MAX_ENTRIES = 100;
const store: TelemetryEntry[] = [];

function push(entry: TelemetryEntry): void {
  store.push(entry);
  if (store.length > MAX_ENTRIES) {
    store.splice(0, store.length - MAX_ENTRIES);
  }
}

export function trackEvent(event: string, details?: Record<string, unknown>): void {
  push({ ts: Date.now(), event, level: 'info', details });
}

export function trackWarn(event: string, details?: Record<string, unknown>): void {
  push({ ts: Date.now(), event, level: 'warn', details });
}

export function trackError(event: string, details?: Record<string, unknown>): void {
  push({ ts: Date.now(), event, level: 'error', details });
}

export function readTelemetry(): TelemetryEntry[] {
  return [...store];
}

export function clearTelemetry(): void {
  store.splice(0, store.length);
}
