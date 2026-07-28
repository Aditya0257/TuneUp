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
 * The five icons below `NAV_ITEMS` were all decorative in the original
 * layout -- present, but wired to nothing. Each now has a real destination:
 * folder -> a dedicated Playlists page, star -> Library's Liked Songs
 * section, folder-closed -> play history, user -> an About panel, gear ->
 * real settings.
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
          className={`fa-regular fa-folder${pathname === '/playlists' ? ' nav_active' : ''}`}
          role="link"
          tabIndex={0}
          aria-label="Playlists"
          aria-current={pathname === '/playlists' ? 'page' : undefined}
          onClick={() => navigate('/playlists')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') navigate('/playlists');
          }}
        />
        <button
          type="button"
          className="navbar_icon_button"
          aria-label="About"
          onClick={() => {
            // TEMPORARY diagnostic -- remove once About/Settings opening is
            // confirmed working. If this alert doesn't appear on click, the
            // click isn't reaching React at all (an extension or something
            // else is intercepting it); if it does appear but the panel
            // still doesn't show, the bug is in the panel's own rendering.
            window.alert('About button clicked -- opening panel now.');
            setOpenPanel('about');
          }}
        >
          <i className="fa-regular fa-user" aria-hidden="true" />
        </button>
        <hr />
        <i
          className={`fa-regular fa-star${pathname === '/music' ? ' nav_active' : ''}`}
          role="link"
          tabIndex={0}
          aria-label="Favorites"
          onClick={() => navigate('/music#liked-songs')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') navigate('/music#liked-songs');
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
      </div>
      <div>
        <button
          type="button"
          className="navbar_icon_button"
          aria-label="Settings"
          onClick={() => {
            // TEMPORARY diagnostic -- see the matching note on the About button.
            window.alert('Settings button clicked -- opening panel now.');
            setOpenPanel('settings');
          }}
        >
          <i className="fa-solid fa-gear" aria-hidden="true" />
        </button>
      </div>

      {openPanel === 'about' && <AboutPanel onClose={() => setOpenPanel(null)} />}
      {openPanel === 'settings' && <SettingsPanel onClose={() => setOpenPanel(null)} />}
    </div>
  );
}
