import type { MouseEvent } from 'react';

import { useLikedSongs } from '@/liked/LikedSongsContext';
import type { Song } from '@/types';

/**
 * The like toggle.
 *
 * The original passed song metadata to a global handler through custom DOM
 * attributes on the icon itself (`title`, `artist_name`, `image_url`) and
 * derived the videoId by splitting the element's id on "-". The song object is
 * simply passed as a prop now.
 *
 * The id is kept for continuity with the original markup.
 */
export function HeartIcon({ song }: { song: Song }) {
  const { isLiked, toggleLike } = useLikedSongs();
  const liked = isLiked(song.videoId);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation(); // don't trigger the row's play handler
    void toggleLike(song);
  };

  return (
    <i
      id={`heart-icon-${song.videoId}`}
      className={liked ? 'fas fa-heart' : 'fa-regular fa-heart'}
      role="button"
      tabIndex={0}
      aria-pressed={liked}
      aria-label={liked ? `Remove ${song.title} from liked songs` : `Add ${song.title} to liked songs`}
      title={song.title}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          void toggleLike(song);
        }
      }}
    />
  );
}
