/**
 * Loads the YouTube IFrame Player API exactly once and resolves when it is
 * ready. The API insists on a single global `onYouTubeIframeAPIReady`
 * callback, so this has to be a module-level singleton.
 */

const SCRIPT_SRC = 'https://www.youtube.com/iframe_api';

let readyPromise: Promise<typeof YT> | null = null;

export function loadYouTubeApi(): Promise<typeof YT> {
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<typeof YT>((resolve, reject) => {
    // Already present (e.g. a hot reload kept it around).
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const timeout = window.setTimeout(() => {
      reject(new Error('The YouTube player failed to load. Check for an ad blocker or a network block on youtube.com.'));
    }, 15000);

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      window.clearTimeout(timeout);
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error('The YouTube API loaded but exposed no Player constructor.'));
      }
    };

    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Could not download the YouTube player script.'));
      };
      document.head.appendChild(script);
    }
  });

  // A rejected singleton would poison every later attempt, so clear it.
  readyPromise.catch(() => {
    readyPromise = null;
  });

  return readyPromise;
}
