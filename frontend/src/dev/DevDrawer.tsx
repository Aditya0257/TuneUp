import { useEffect, useMemo, useState } from 'react';

import { describeCall } from '@/dev/callMeanings';
import { clearApiCallLog, getApiCallLog, subscribeApiCallLog, type ApiCallLog } from '@/dev/devLog';
import { InfoTip } from '@/dev/InfoTip';
import { JsonView } from '@/dev/JsonView';

/**
 * A slide-over panel that makes the app's API activity readable from inside
 * the running UI -- no browser devtools needed. Always mounted, always
 * visible (this app has no secrets in the browser and no audience beyond the
 * author and anyone reviewing the portfolio piece).
 *
 * Deliberately has no props and no external state: it only ever reads the
 * call log in dev/devLog.ts, which api/client.ts writes to. A bug in here
 * cannot take down the rest of the app -- worst case the drawer looks wrong.
 */
export function DevDrawer() {
  const [open, setOpen] = useState(false);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [calls, setCalls] = useState<ApiCallLog[]>(() => getApiCallLog());
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeApiCallLog(() => setCalls(getApiCallLog())), []);

  // Keeps the "calls in the last minute" meter honest even when nothing new
  // has been logged -- old calls need to age out of the window over time.
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 5000);
    return () => window.clearInterval(id);
  }, [open]);

  const visible = errorsOnly ? calls.filter((call) => !call.ok) : calls;

  const meters = useMemo(() => {
    void tick; // recompute periodically even without new calls
    const now = Date.now();
    const lastMinute = calls.filter((call) => now - call.startedAt <= 60_000);
    const total = calls.length;
    const okCount = calls.filter((call) => call.ok).length;
    const cacheable = calls.filter((call) => call.cache !== null);
    const hits = cacheable.filter((call) => call.cache === 'HIT').length;
    return {
      callsPerMin: lastMinute.length,
      successRate: total ? Math.round((okCount / total) * 100) : 100,
      cacheHitRate: cacheable.length ? Math.round((hits / cacheable.length) * 100) : null,
      cacheableCount: cacheable.length,
      total,
    };
  }, [calls, tick]);

  return (
    <>
      <button
        type="button"
        className="devdrawer_pill"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Toggle developer drawer"
      >
        dev {calls.length}
      </button>

      {open && (
        <div className="devdrawer_panel" role="dialog" aria-label="Developer drawer">
          <div className="devdrawer_header">
            <div>
              <h2>Dev Drawer</h2>
              <p className="devdrawer_subtitle">
                Live API activity for this app. No devtools required.
                <InfoTip text="Everything here comes from calls this browser tab made -- nothing is fetched from a server just to populate this panel, and no secret keys ever pass through the browser." />
              </p>
            </div>
            <div className="devdrawer_header_actions">
              <label className="devdrawer_toggle">
                <input
                  type="checkbox"
                  checked={errorsOnly}
                  onChange={(event) => setErrorsOnly(event.target.checked)}
                />
                Errors only
              </label>
              <button type="button" onClick={() => clearApiCallLog()}>
                Clear
              </button>
              <button type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>

          <div className="devdrawer_meters">
            <div className="devdrawer_meter_primary">
              <div className="devdrawer_meter_label">
                Success rate
                <InfoTip text="Share of logged calls that returned a non-error HTTP status. A drop here usually means the backend or YouTube Music is having trouble." />
              </div>
              <div className="devdrawer_bar">
                <div
                  className="devdrawer_bar_fill"
                  data-tone={meters.successRate >= 95 ? 'good' : meters.successRate >= 80 ? 'warn' : 'bad'}
                  style={{ width: `${meters.successRate}%` }}
                />
              </div>
              <div className="devdrawer_meter_sub">
                {meters.successRate}% of {meters.total} logged call{meters.total === 1 ? '' : 's'}
              </div>
            </div>

            <details className="devdrawer_other_meters">
              <summary>Other meters</summary>
              <div className="devdrawer_meter_row">
                <span>
                  Calls / min
                  <InfoTip text="How many calls this tab has made in the last 60 seconds. No daily reset -- this is a live rate, not a quota." />
                </span>
                <strong>{meters.callsPerMin}</strong>
              </div>
              <div className="devdrawer_meter_row">
                <span>
                  Cache hit rate
                  <InfoTip text="Of calls to a cacheable route (home/search/song), the share served from the backend's in-memory TTL cache instead of a fresh ytmusicapi request." />
                </span>
                <strong>{meters.cacheHitRate === null ? 'no cacheable calls yet' : `${meters.cacheHitRate}% of ${meters.cacheableCount}`}</strong>
              </div>
            </details>
          </div>

          <div className="devdrawer_trail">
            {visible.length === 0 && (
              <p className="devdrawer_empty">
                {errorsOnly ? 'No errors logged yet.' : 'No API calls logged yet -- use the app.'}
              </p>
            )}
            {visible.map((call) => (
              <CallRow
                key={call.id}
                call={call}
                expanded={expandedId === call.id}
                onToggle={() => setExpandedId((id) => (id === call.id ? null : call.id))}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function CallRow({
  call,
  expanded,
  onToggle,
}: {
  call: ApiCallLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meaning = describeCall(call.method, call.path);

  return (
    <div className="devdrawer_call" data-expanded={expanded || undefined}>
      <button type="button" className="devdrawer_call_summary" onClick={onToggle} aria-expanded={expanded}>
        <span className="devdrawer_call_method">{call.method}</span>
        <span className="devdrawer_call_path">{call.path}</span>
        <span
          className="devdrawer_call_status"
          data-tone={call.ok ? 'good' : 'bad'}
        >
          {call.status}
        </span>
        {call.cache && <span className="devdrawer_call_cache">{call.cache}</span>}
        <span className="devdrawer_call_duration">{call.durationMs}ms</span>
      </button>

      {expanded && (
        <div className="devdrawer_call_detail">
          <div className="devdrawer_meaning">
            <div>
              <strong>User:</strong> {meaning.user}
            </div>
            <div>
              <strong>Dev:</strong> {meaning.dev}
            </div>
            <div>
              <strong>Business:</strong> {meaning.business}
            </div>
            <div className="devdrawer_flow">{meaning.flow}</div>
          </div>

          {call.requestId && (
            <div className="devdrawer_reqid">
              request-id: <code>{call.requestId}</code>
            </div>
          )}

          {call.error && <div className="devdrawer_call_error">{call.error}</div>}

          {call.requestBody !== null && call.requestBody !== undefined && (
            <div className="devdrawer_json_block">
              <div className="devdrawer_json_label">Request body</div>
              <JsonView value={call.requestBody} />
            </div>
          )}

          {call.responseBody !== null && call.responseBody !== undefined && (
            <div className="devdrawer_json_block">
              <div className="devdrawer_json_label">Response body</div>
              <JsonView value={call.responseBody} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
