import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Port of verticalCarouselSlider.js.
 *
 * Original issues fixed here: the slide count was hardcoded to 4 in the
 * auto-advance branch while the indicators were derived from the DOM (so the
 * two could disagree), the `setInterval` was never cleared, and the transform
 * was recomputed from `getBoundingClientRect()` on every tick instead of using
 * percentages, so a mid-animation resize desynced the track.
 */
const SLIDE_INTERVAL_MS = 2000;

const SLIDES = [
  {
    heading: 'Upcoming Concert!',
    body:
      'Get ready to groove to the beats of your favorite artists at our upcoming music concert! 🎶 ' +
      'From soulful melodies to foot-tapping rhythms, this concert promises to be a musical extravaganza.',
    image: 'https://i1.sndcdn.com/artworks-000196826838-9zhk1f-t500x500.jpg',
  },
  {
    heading: 'Upcoming Concert!',
    body:
      'Get ready to groove to the beats of your favorite artists at our upcoming music concert! 🎶 ' +
      'From soulful melodies to foot-tapping rhythms, this concert promises to be a musical extravaganza.',
    image: 'https://i.scdn.co/image/ab67616d0000b27315145482a542a9adb282250b',
  },
  {
    heading: 'Upcoming Concert!',
    body:
      'Get ready to groove to the beats of your favorite artists at our upcoming music concert! 🎶 ' +
      'From soulful melodies to foot-tapping rhythms, this concert promises to be a musical extravaganza.',
    image: 'https://wallpapercave.com/wp/wp8422295.jpg',
  },
  {
    heading: 'Upcoming Concert!',
    body:
      'Get ready to groove to the beats of your favorite artists at our upcoming music concert! 🎶 ' +
      'From soulful melodies to foot-tapping rhythms, this concert promises to be a musical extravaganza.',
    image: 'https://upload.wikimedia.org/wikipedia/en/d/da/Alan_Walker_-_Faded.png',
  },
];

export function VerticalCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  const advance = useCallback(() => {
    setActive((current) => (current + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    timerRef.current = window.setInterval(advance, SLIDE_INTERVAL_MS);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [advance, paused]);

  return (
    <div
      className="vertical_slider_box"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="carousel_gradient_container" />
      <div className="slider">
        <div
          className="slides"
          style={{
            transform: `translateY(-${active * 100}%)`,
            transition: 'transform 0.6s ease',
          }}
        >
          {SLIDES.map((slide, index) => (
            <div className="slide" key={slide.image} aria-hidden={index !== active}>
              <div className="slider_text">
                <h2>{slide.heading}</h2>
                <p>{slide.body}</p>
              </div>
              <div>
                <img src={slide.image} alt="" loading="lazy" />
              </div>
            </div>
          ))}
        </div>
        <div className="indicators">
          {SLIDES.map((slide, index) => (
            <span
              key={slide.image}
              className={`indicator${index === active ? ' active' : ''}`}
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
      </div>
    </div>
  );
}
