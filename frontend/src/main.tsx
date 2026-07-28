import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from '@/App';
import { LikedSongsProvider } from '@/liked/LikedSongsContext';
import { PlayerProvider } from '@/player/PlayerContext';
import { PlaylistsProvider } from '@/playlists/PlaylistsContext';
import { initTheme } from '@/utils/theme';

try {
  // A theme bug here runs before React ever mounts -- an uncaught error
  // blanks the entire app with no error overlay, no fallback UI, nothing.
  // That happened for real once already (a stored theme predating a new
  // field). Whatever goes wrong with a saved theme, the app has to boot.
  initTheme();
} catch (error) {
  console.error('Failed to apply saved theme, continuing with defaults:', error);
}

// The three original stylesheets, unmodified apart from the @font-face URL.
// Each is scoped under its own page root (.homepage / .musicpage / .searchpage),
// so loading all three together is safe -- which is what makes a single-page
// app possible without touching the CSS.
import '@/styles/main.scss';
import '@/styles/music.scss';
import '@/styles/search.scss';
import '@/styles/overrides.scss';
// The dev drawer is new tooling, not a port of anything in the original app,
// so it gets its own stylesheet rather than living in overrides.scss.
import '@/styles/devDrawer.scss';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <LikedSongsProvider>
        <PlaylistsProvider>
          <PlayerProvider>
            <App />
          </PlayerProvider>
        </PlaylistsProvider>
      </LikedSongsProvider>
    </BrowserRouter>
  </StrictMode>,
);
