import { useCallback, useEffect, useRef, useState } from 'react';

import type { Song } from '@/types';
import { handleArtworkError, preferredArtworkSrc, truncate } from '@/utils/format';

const SLIDE_INTERVAL_MS = 4000;

/**
 * Was a port of verticalCarouselSlider.js: four hardcoded "Upcoming Concert!"
 * slides pointing at external stock-photo URLs on four different hosts, none
 * of them under this app's control. Beyond the unreliable hosts, the
 * original CSS itself sets the slide `<img>` to `width: 240%` -- the image
 * loads fine, it's just scaled so far outside the visible frame that none of
 * it ever appears, leaving only the gradient overlay on top of nothing.
 *
 * Replaced with a real featured carousel: your actual Quick Picks, clickable
 * to play immediately. New markup/classnames rather than patching the
 * broken `.slide`/`.slider_text` rules -- the outer `.vertical_slider_box`
 * wrapper is kept so main.scss's sizing/position for this slot still applies.
 */
export function VerticalCarousel({
  songs,
  onSelect,
}: {
  songs: Song[];
  onSelect: (song: Song) => void;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const slides = songs.slice(0, 5);

  const advance = useCallback(() => {
    setActive((current) => (slides.length ? (current + 1) % slides.length : 0));
  }, [slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    timerRef.current = window.setInterval(advance, SLIDE_INTERVAL_MS);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [advance, paused, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div
      className="vertical_slider_box"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="tuneup_feature_track">
        {slides.map((song, index) => (
          <button
            type="button"
            key={song.videoId}
            className="tuneup_feature_slide"
            aria-hidden={index !== active}
            tabIndex={index === active ? 0 : -1}
            aria-label={`Play ${song.title} by ${song.artist}`}
            onClick={() => onSelect(song)}
            style={{ opacity: index === active ? 1 : 0, pointerEvents: index === active ? 'auto' : 'none' }}
          >
            <img
              src={preferredArtworkSrc(song.videoId, song.thumbnail)}
              alt=""
              loading="lazy"
              onError={(event) => handleArtworkError(event, song.thumbnail)}
            />
            <div className="tuneup_feature_scrim" />
            <div className="tuneup_feature_text">
              <span className="tuneup_feature_label">Featured</span>
              <h2>{truncate(song.title, 40)}</h2>
              <p>{song.artist}</p>
            </div>
            <i className="fa-solid fa-play tuneup_feature_play" aria-hidden="true" />
          </button>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="tuneup_feature_indicators">
          {slides.map((song, index) => (
            <span
              key={song.videoId}
              className={`tuneup_feature_indicator${index === active ? ' active' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => setActive(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setActive(index);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
