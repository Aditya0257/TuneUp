import { useEffect, useState } from 'react';

import type { AsyncState } from '@/types';

/**
 * Runs an async producer and tracks loading/error state, cancelling the state
 * update if the component unmounts or `deps` change mid-flight.
 *
 * The original code had no loading or error states at all -- `xhr.onload` only
 * handled `status === 200` and every other outcome was a silent no-op, so a
 * failed request just left the page blank.
 */
export function useAsync<T>(
  producer: () => Promise<T>,
  deps: readonly unknown[],
  enabled = true,
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    producer()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: (cause as Error).message ?? 'Something went wrong.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  return state;
}
