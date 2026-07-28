import { createPortal } from 'react-dom';

import { TrackDropdown } from '@/components/TrackDropdown';
import { useFloatingMenu } from '@/hooks/useFloatingMenu';
import type { Song } from '@/types';
import { handleThumbnailError, thumbnailOrFallback } from '@/utils/format';

interface ArtistRowProps {
  name: string;
  thumbnail: string | null;
  /** Omit when there's no real number to show -- see note below. */
  followers?: string;
  plays?: string;
  /** `first_artist_row` on the home page, `artist_row` on the search page. */
  variant: 'home' | 'search';
  onSelect?: () => void;
  /** Home rows are actually tracks under the hood (see the note in
   * HomePage.tsx) -- passing the song through gets the real Add to
   * Queue/Play Next/Add to Playlist menu instead of a decorative icon. */
  song?: Song;
  /** Search rows are real artists with no backing track -- this opens
   * their YouTube Music page instead. */
  browseId?: string | null;
}

/** A one-item menu for search artists: no backing track to queue or add
 * to a playlist, just a real artist page to open. Small enough not to
 * warrant its own file, but kept separate from TrackDropdown since the
 * two have nothing in common beyond "an ellipsis that opens something". */
function ArtistExternalMenu({ name, browseId }: { name: string; browseId: string }) {
  const { open, setOpen, coords, triggerRef, menuRef } = useFloatingMenu<HTMLElement>();

  return (
    <div className="dropdown">
      <i
        ref={triggerRef}
        className="fa-solid fa-ellipsis"
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More options for ${name}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            setOpen((value) => !value);
          }
        }}
      />
      {open &&
        coords &&
        createPortal(
          <div
            className="dropdown-content"
            ref={menuRef}
            style={{ top: coords.top, right: coords.right, display: 'block' }}
            role="menu"
          >
            <a
              href={`https://music.youtube.com/channel/${browseId}`}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
              }}
            >
              View on YouTube Music
            </a>
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * The artist card, shared by the home "Recommended Artist" list and the search
 * page's artist column -- two near-identical copies in the original templates.
 *
 * The original hardcoded identical follower/play counts on every single card
 * ("250M Followers" / "111M Views" on Home, "28k Followers" / "128M Plays" on
 * Search) -- the exact same fake numbers under every artist, real or not.
 * ytmusicapi doesn't expose view/play counts at all, and only sometimes
 * returns a real subscriber count, so each stat only renders when there's an
 * actual number behind it.
 */
export function ArtistRow({
  name,
  thumbnail,
  followers,
  plays,
  variant,
  onSelect,
  song,
  browseId,
}: ArtistRowProps) {
  const interactive = Boolean(onSelect);
  const hasStats = Boolean(followers || plays);

  return (
    <div className={variant === 'home' ? 'first_artist_row' : 'artist_row'}>
      <div
        className="artist_name_and_img"
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? `Play ${name}` : undefined}
        onClick={onSelect}
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect?.();
                }
              }
            : undefined
        }
      >
        <div className="image_box">
          <img
            src={thumbnailOrFallback(thumbnail)}
            alt=""
            loading="lazy"
            onError={handleThumbnailError}
          />
        </div>
        <div className="artist_text_column">
          <div>
            <h2>{name}</h2>
          </div>
          {hasStats && (
            <>
              <div className="spacer_y_small" />
              <div className="artist_detail_row">
                {followers && (
                  <div className="followers_row">
                    {/* assets/images/box_heart_icon.png was never committed to the repo */}
                    <i className="fa-solid fa-heart stat_icon" aria-hidden="true" />
                    <p>{followers}</p>
                  </div>
                )}
                {plays && (
                  <div className="plays_row">
                    {/* assets/images/play_vibration_icon.png was never committed either */}
                    <i className="fa-solid fa-signal stat_icon" aria-hidden="true" />
                    <p>{plays}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="three_dot_x_icon">
        {/* Was a decorative <i>, no menu behind it at all -- see the two
            helpers above for why home/search need different menus here. */}
        {song ? (
          <TrackDropdown song={song} />
        ) : browseId ? (
          <ArtistExternalMenu name={name} browseId={browseId} />
        ) : (
          <i className="fa-solid fa-ellipsis" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
