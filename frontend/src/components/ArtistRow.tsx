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
        <i className="fa-solid fa-ellipsis" aria-hidden="true" />
      </div>
    </div>
  );
}
