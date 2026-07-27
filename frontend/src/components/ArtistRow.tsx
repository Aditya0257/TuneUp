import { thumbnailOrFallback } from '@/utils/format';

interface ArtistRowProps {
  name: string;
  thumbnail: string | null;
  followers: string;
  plays: string;
  /** `first_artist_row` on the home page, `artist_row` on the search page. */
  variant: 'home' | 'search';
  onSelect?: () => void;
}

/**
 * The artist card, shared by the home "Recommended Artist" list and the search
 * page's artist column -- two near-identical copies in the original templates.
 *
 * The follower and play counts were hardcoded in both ("250M Followers",
 * "111M Views"), with a comment in index.html noting the YouTube Music API
 * does not expose view counts. They stay as passed-in strings so the real
 * `subscribers` value is used wherever the API does return one.
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
          <img src={thumbnailOrFallback(thumbnail)} alt="" loading="lazy" />
        </div>
        <div className="artist_text_column">
          <div>
            <h2>{name}</h2>
          </div>
          <div className="spacer_y_small" />
          <div className="artist_detail_row">
            <div className="followers_row">
              {/* assets/images/box_heart_icon.png was never committed to the repo */}
              <i className="fa-solid fa-heart stat_icon" aria-hidden="true" />
              <p>{followers}</p>
            </div>
            <div className="plays_row">
              {/* assets/images/play_vibration_icon.png was never committed either */}
              <i className="fa-solid fa-signal stat_icon" aria-hidden="true" />
              <p>{plays}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="three_dot_x_icon">
        <i className="fa-solid fa-ellipsis" aria-hidden="true" />
      </div>
    </div>
  );
}
