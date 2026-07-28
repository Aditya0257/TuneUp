import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AboutPanel } from '@/components/AboutPanel';
import { SettingsPanel } from '@/components/SettingsPanel';

/**
 * Port of the `.fixed_side_navbar` block plus changePage.js.
 *
 * changePage.js did client-side routing by XHR-ing a full Jinja page, parsing
 * it into a detached div, pulling out one element by id and assigning its
 * `outerHTML` into the live DOM -- then calling `history.pushState` and
 * manually re-running the scripts whose listeners the replacement had just
 * destroyed. That is what react-router does properly.
 *
 * The icons below `NAV_ITEMS` were all decorative in the original layout --
 * present, but wired to nothing. Each now has a real destination: folder ->
 * Discover (read-only external YouTube Music playlists), layer-group -> My
 * Playlists (yours, created here), folder-closed -> play history, user -> an
 * About panel, gear -> real settings.
 *
 * The folder icon used to be labeled "Playlists" and point at /playlists;
 * once user-created playlists needed that name, the external-search page
 * moved to /discover and this icon relabeled to match, so the two concepts
 * (external, read-only vs yours, editable) don't share a label.
 *
 * There used to be a star icon too ("Favorites" -> Library's Liked Songs
 * section), removed because it pointed at the same page as the Library
 * icon above -- Liked Songs is already the first thing Library shows, so
 * the star never went anywhere Library didn't.
 */
const NAV_ITEMS = [
  { icon: 'fa-solid fa-house', label: 'Home', path: '/' },
  { icon: 'fa-solid fa-music', label: 'Library', path: '/music' },
] as const;

export function SideNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [openPanel, setOpenPanel] = useState<'about' | 'settings' | null>(null);

  return (
    <div className="fixed_side_navbar">
      <div className="logo_box">
        <img src="/assets/images/tuneup-icon.svg" alt="TuneUp" />
      </div>
      <div className="navbar_sub_column">
        {NAV_ITEMS.map((item) => (
          <i
            key={item.path}
            className={`${item.icon}${pathname === item.path ? ' nav_active' : ''}`}
            role="link"
            tabIndex={0}
            aria-label={item.label}
            aria-current={pathname === item.path ? 'page' : undefined}
            onClick={() => navigate(item.path)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate(item.path);
              }
            }}
          />
        ))}

        <i
          className={`fa-regular fa-folder${pathname === '/discover' ? ' nav_active' : ''}`}
          role="link"
          tabIndex={0}
          aria-label="Discover"
          aria-current={pathname === '/discover' ? 'page' : undefined}
          onClick={() => navigate('/discover')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') navigate('/discover');
          }}
        />
        <i
          className={`fa-solid fa-layer-group${pathname.startsWith('/playlists/mine') ? ' nav_active' : ''}`}
          role="link"
          tabIndex={0}
          aria-label="My Playlists"
          aria-current={pathname.startsWith('/playlists/mine') ? 'page' : undefined}
          onClick={() => navigate('/playlists/mine')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') navigate('/playlists/mine');
          }}
        />
        <i
          className={`fa-regular fa-folder-closed${pathname === '/history' ? ' nav_active' : ''}`}
          role="link"
          tabIndex={0}
          aria-label="Recently played"
          aria-current={pathname === '/history' ? 'page' : undefined}
          onClick={() => navigate('/history')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') navigate('/history');
          }}
        />
        <hr />
        {/* About and Settings are the only two icons that open a popup
            instead of navigating to a page -- grouped together below the
            divider, separate from the real pages above it, instead of
            About sitting in the middle of the page list. */}
        <button
          type="button"
          className="navbar_icon_button"
          aria-label="About"
          onClick={() => setOpenPanel('about')}
        >
          <i className="fa-regular fa-user" aria-hidden="true" />
        </button>
      </div>
      <div>
        <button
          type="button"
          className="navbar_icon_button"
          aria-label="Settings"
          onClick={() => setOpenPanel('settings')}
        >
          <i className="fa-solid fa-gear" aria-hidden="true" />
        </button>
      </div>

      {openPanel === 'about' && <AboutPanel onClose={() => setOpenPanel(null)} />}
      {openPanel === 'settings' && <SettingsPanel onClose={() => setOpenPanel(null)} />}
    </div>
  );
}
