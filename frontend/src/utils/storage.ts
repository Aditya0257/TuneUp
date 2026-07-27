/**
 * localStorage access that cannot throw.
 *
 * The original code called `JSON.parse(localStorage.getItem(...))` in nine
 * places with no guard, so one corrupt entry (or Safari private browsing,
 * where writes throw) took the whole player down.
 */

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled -- in-memory state still works.
  }
}

export function readArray<T>(key: string): T[] {
  const value = readJson<T[]>(key, []);
  return Array.isArray(value) ? value : [];
}

export function removeJson(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage disabled -- nothing to clear anyway.
  }
}
