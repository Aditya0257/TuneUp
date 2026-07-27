import type { ChangeEvent } from 'react';

import { EmptyMessage, Loading } from '@/components/StatusMessage';
import { useLikedSongs } from '@/liked/LikedSongsContext';
import { usePlayer } from '@/player/PlayerContext';
import type { Song } from '@/types';
import { formatTime, handleThumbnailError, thumbnailOrFallback, truncate } from '@/utils/format';

/**
 * The `.backpage` -- the queue and the player, revealed by dragging the main
 * panel to the right.
 *
 * This markup lived inline in index.html only, which meant the player did not
 * exist on the Library or Search pages. Since it now sits above the router,
 * playback survives navigation instead of being destroyed by it.
 */
export function Backpage() {
  return (
    <div className="backpage">
      <div className="back_main_column">
        <QueuePanel />
        <NowPlaying />
      </div>
    </div>
  );
}

/** One `.first_song_box` card -- a JSX version of the old `createSongBox`. */
function QueueCard({ song, onPlay }: { song: Song; onPlay: () => void }) {
  return (
    <div
      className="first_song_box"
      role="button"
      tabIndex={0}
      aria-label={`Play ${song.title}`}
      onClick={onPlay}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPlay();
        }
      }}
    >
      <img
        src={thumbnailOrFallback(song.thumbnail)}
        alt=""
        loading="lazy"
        onError={(event) => handleThumbnailError(event, song.videoId)}
      />
      <div className="three_dot_x_icon">
        <i className="fa-solid fa-ellipsis" aria-hidden="true" />
      </div>
      <div className="inner_text_box">
        <div className="content_row">
          <div className="song_name_artist_column">
            <div>
              <h3>{truncate(song.title)}</h3>
            </div>
            <div className="artist_name_row">
              <i
                style={{ color: 'white', fontSize: '0.9rem' }}
                className="fa-solid fa-music"
                aria-hidden="true"
              />
              <p>{truncate(song.artist)}</p>
            </div>
          </div>
          <div className="play_button">
            <i className="fa-solid fa-play" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

function QueuePanel() {
  const { queue, isLoadingQueue, playTrack } = usePlayer();

  return (
    <div className="next_composition_block">
      <div className="next_composition_heading">
        <h2>Next Composition</h2>
      </div>
      {/*
        The original rendered `currentQueue.slice(1)` here because index 0 was
        the currently playing song. `queue` already means "up next".
      */}
      <div id="current-queue">
        {queue.map((song) => (
          <QueueCard key={song.videoId} song={song} onPlay={() => playTrack(song)} />
        ))}
        {queue.length === 0 &&
          (isLoadingQueue ? (
            <Loading label="Building your queue…" />
          ) : (
            <EmptyMessage message="Nothing queued yet. Play a song to get started." />
          ))}
      </div>
    </div>
  );
}

function NowPlaying() {
  const {
    currentTrack,
    isPlaying,
    isLooping,
    isShuffled,
    currentTime,
    duration,
    error,
    togglePlay,
    next,
    previous,
    seek,
    beginSeek,
    endSeek,
    toggleLoop,
    toggleShuffle,
  } = usePlayer();
  const { isLiked, toggleLike } = useLikedSongs();

  const liked = currentTrack ? isLiked(currentTrack.videoId) : false;

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    seek(Number(event.target.value));
  };

  return (
    <div className="current_music_block">
      {/*
        The `<audio id="song" class="audio-link">` element that used to live here
        is gone -- the hidden YouTube iframe rendered by PlayerProvider is the
        audio source now.
      */}
      <div className="music_play_column">
        <div className="img_box">
          <img
            id="song-image"
            src={thumbnailOrFallback(currentTrack?.thumbnail)}
            alt={currentTrack ? `${currentTrack.title} artwork` : 'No song playing'}
            onError={(event) => handleThumbnailError(event, currentTrack?.videoId)}
          />
        </div>
        <div>
          <h2 id="song-name">{currentTrack ? truncate(currentTrack.title) : '`Song Name`'}</h2>
        </div>
        <div>
          <p id="song-artist">{currentTrack?.artist ?? '`Artist`'}</p>
        </div>

        <div className="play_pause_loop_row">
          <div id="song-repeat-on-loop" className={isLooping ? 'active' : undefined}>
            <i
              className="fa-solid fa-repeat"
              role="button"
              tabIndex={0}
              aria-pressed={isLooping}
              aria-label="Repeat current song"
              onClick={toggleLoop}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggleLoop();
                }
              }}
            />
          </div>

          <div id="like-current-song" className={liked ? 'active' : undefined}>
            <i
              className="fa-solid fa-heart"
              role="button"
              tabIndex={0}
              aria-pressed={liked}
              aria-label={liked ? 'Unlike current song' : 'Like current song'}
              onClick={() => currentTrack && void toggleLike(currentTrack)}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && currentTrack) {
                  event.preventDefault();
                  void toggleLike(currentTrack);
                }
              }}
            />
          </div>

          <div className="mid_play_pause_row">
            <div>
              <i
                className="fa-solid fa-backward-step"
                role="button"
                tabIndex={0}
                aria-label="Previous song"
                onClick={previous}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    previous();
                  }
                }}
              />
            </div>
            <div className="play">
              <i
                id="playButton"
                /*
                  The original toggled this by reading the element's own class
                  list (`if (play.classList.contains('fa-pause'))`), so the DOM
                  was the state. It derives from `isPlaying` now, which the
                  player reports.
                */
                className={isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play'}
                role="button"
                tabIndex={0}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlay}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    togglePlay();
                  }
                }}
              />
            </div>
            <div>
              <i
                className="fa-solid fa-forward-step"
                role="button"
                tabIndex={0}
                aria-label="Next song"
                onClick={next}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    next();
                  }
                }}
              />
            </div>
          </div>

          <div id="shuffle-songs-icon" className={isShuffled ? 'active' : undefined}>
            <i
              className="fa-solid fa-shuffle"
              role="button"
              tabIndex={0}
              aria-pressed={isShuffled}
              aria-label="Shuffle queue"
              onClick={toggleShuffle}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggleShuffle();
                }
              }}
            />
          </div>
        </div>

        <div className="song_progress_bar_box">
          <p className="current-time">{formatTime(currentTime)}</p>
          <input
            type="range"
            id="music_progress_bar"
            min={0}
            max={duration || 0}
            step={1}
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSeek}
            onPointerDown={beginSeek}
            onPointerUp={endSeek}
            onBlur={endSeek}
            aria-label="Seek"
            disabled={!currentTrack}
          />
          <p className="ending-time">{duration ? formatTime(duration) : 't:tt'}</p>
        </div>
      </div>
      <div className="lyrics_column" />

      {error && <div className="player_notice">{error}</div>}
    </div>
  );
}
