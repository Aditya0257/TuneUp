import { HeartIcon } from '@/components/HeartIcon';
import { TrackDropdown } from '@/components/TrackDropdown';
import { usePlayer } from '@/player/PlayerContext';
import type { Song } from '@/types';
import { handleThumbnailError, thumbnailOrFallback, trackNumber } from '@/utils/format';

interface SongRowProps {
  song: Song;
  index: number;
  /** Home shows the queue menu; the search page showed a plain ellipsis. */
  withDropdown?: boolean;
}

/**
 * The `.first_song_row` markup shared by Quick Picks and search results.
 *
 * In the original this block was copy-pasted between index.html and
 * search.html with slightly different attributes in each, which is how the
 * two ended up with subtly different like behaviour.
 */
export function SongRow({ song, index, withDropdown = true }: SongRowProps) {
  const { playTrack, currentTrack } = usePlayer();
  const isCurrent = currentTrack?.videoId === song.videoId;

  return (
    <div className="first_song_row" data-playing={isCurrent || undefined}>
      <div
        className="artist_no_name_and_img"
        role="button"
        tabIndex={0}
        aria-label={`Play ${song.title} by ${song.artist}`}
        onClick={() => playTrack(song)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            playTrack(song);
          }
        }}
      >
        <div className="spacer_x_small" />
        <div className="sno_play_pause_icon">
          <h2>{trackNumber(index)}</h2>
        </div>
        <div className="image_box">
          <img
            src={thumbnailOrFallback(song.thumbnail)}
            alt=""
            loading="lazy"
            onError={(event) => handleThumbnailError(event, song.videoId)}
          />
        </div>
        <div className="song_text_column">
          <div>
            <h2 className="song-title">{song.title}</h2>
          </div>
          <div className="spacer_y_small" />
          <div className="artist_name_row">
            <i className="fa-solid fa-user" aria-hidden="true" />
            <p>{song.artist}</p>
          </div>
        </div>
      </div>
      <div className="three_dot_x_icon">
        <div className="heart_three_dot_row">
          <HeartIcon song={song} />
          {withDropdown ? (
            <TrackDropdown song={song} />
          ) : (
            <i className="fa-solid fa-ellipsis" aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}
