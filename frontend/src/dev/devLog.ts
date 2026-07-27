/**
 * In-memory log of every API call the app makes, read by <DevDrawer>.
 *
 * Deliberately dumb: a capped ring buffer plus a subscribe/notify list. No
 * persistence, no network calls of its own -- it only ever reads what
 * api/client.ts hands it. Never throws: a logging bug must not be able to
 * break the app that's being logged.
 */

export interface ApiCallLog {
  id: number;
  method: string;
  path: string;
  /** Absolute URL actually requested, for reference. */
  url: string;
  status: number | 'error';
  ok: boolean;
  durationMs: number;
  startedAt: number;
  requestId: string | null;
  cache: 'HIT' | 'MISS' | null;
  requestBody: unknown;
  responseBody: unknown;
  error: string | null;
}

const MAX_ENTRIES = 200;
const entries: ApiCallLog[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function notify(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A subscriber's own error is not this module's problem.
    }
  });
}

export function logApiCall(entry: Omit<ApiCallLog, 'id'>): void {
  entries.unshift({ ...entry, id: nextId++ });
  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }
  notify();
}

export function getApiCallLog(): ApiCallLog[] {
  return entries;
}

export function clearApiCallLog(): void {
  entries.length = 0;
  notify();
}

export function subscribeApiCallLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
