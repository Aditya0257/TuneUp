import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from '@/App';
import { LikedSongsProvider } from '@/liked/LikedSongsContext';
import { PlayerProvider } from '@/player/PlayerContext';
import { initTheme } from '@/utils/theme';

initTheme();

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
        <PlayerProvider>
          <App />
        </PlayerProvider>
      </LikedSongsProvider>
    </BrowserRouter>
  </StrictMode>,
);
