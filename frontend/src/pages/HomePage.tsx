import { useNavigate } from 'react-router-dom';

import { api } from '@/api/client';
import { ArtistRow } from '@/components/ArtistRow';
import { SeeAllToggle } from '@/components/SeeAllToggle';
import { Skeleton } from '@/components/Skeleton';
import { SongRow } from '@/components/SongRow';
import { EmptyMessage, ErrorMessage } from '@/components/StatusMessage';
import { VerticalCarousel } from '@/components/VerticalCarousel';
import { useAsync } from '@/hooks/useAsync';
import { useExpandable } from '@/hooks/useExpandable';
import { usePlayer } from '@/player/PlayerContext';
import { handleThumbnailError, thumbnailOrFallback } from '@/utils/format';

/**
 * Port of templates/index.html (the `#changable` subtree).
 *
 * Same DOM structure and class names as the original, so main.scss applies
 * unchanged. The Jinja `{% for %}` loops are now `.map()` calls over typed data
 * from GET /api/home.
 */
export function HomePage() {
  const { playTrack } = usePlayer();
  const navigate = useNavigate();
  const goToSearch = (term: string) => navigate(`/search?q=${encodeURIComponent(term)}`);
  const { data, loading, error } = useAsync(() => api.getHome(), []);

  const quickPicks = data?.quickPicks ?? [];
  const newReleases = data?.newReleases ?? [];
  const recommended = data?.recommendedMusic ?? [];
  const genres = data?.genres ?? [];
  const moods = data?.moods ?? [];

  const quickPicksList = useExpandable(quickPicks, 5);

  return (
    <div id="changable">
      <div className="test_div" title="Drag to reveal the queue and player">
        <div className="vl" />
      </div>
      <div className="main_column">
        <div className="first_home_row">
          <div className="homepage_name">
            <h1>Home</h1>
          </div>
        </div>

        {error ? (
          <div className="home_status_row">
            <ErrorMessage message={error} hint="Check that the Flask backend is running and reachable." />
          </div>
        ) : loading ? (
          <>
            <div className="second_home_row">
              <Skeleton className="vertical_slider_box" width="62%" height="90%" radius="35px" />
              <div className="column_songs_section">
                <div className="top_artist_heading_row">
                  <div className="inner_heading_row">
                    <div>
                      <h2>Recommended Artist</h2>
                    </div>
                  </div>
                </div>
                <div className="spacer_y_small" />
                <div className="recommended_artist_list">
                  {/* Reuses the real .first_artist_row markup (not a
                      generic skeleton box) so the shimmer sits in exactly
                      the same spot the real row's image/text will. */}
                  {[0, 1, 2, 3].map((i) => (
                    <div className="first_artist_row" key={i}>
                      <div className="artist_name_and_img">
                        <div className="image_box">
                          <Skeleton width="100%" height="100%" radius="50%" />
                        </div>
                        <div className="artist_text_column">
                          <Skeleton width="65%" height="16px" />
                          <div className="spacer_y_small" />
                          <div className="artist_detail_row">
                            <Skeleton width="80px" height="12px" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="third_home_row">
              <div className="song_genre_column">
                <div className="genre">
                  <h1>For You</h1>
                  <div className="tuneup_skeleton_row">
                    <Skeleton width="70px" height="28px" radius="12px" />
                    <Skeleton width="70px" height="28px" radius="12px" />
                    <Skeleton width="70px" height="28px" radius="12px" />
                  </div>
                </div>
              </div>

              <div className="quickPicks_column_section">
                <div className="quickPicks_heading_row">
                  <div className="inner_heading_row">
                    <div>
                      <h2>Quick Picks</h2>
                    </div>
                  </div>
                </div>
                <div className="quickPicks_songs_column">
                  {/* Reuses the real .first_song_row markup for the same reason. */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div className="first_song_row" key={i}>
                      <div className="artist_no_name_and_img">
                        <div className="spacer_x_small" />
                        <div className="sno_play_pause_icon">
                          <Skeleton width="18px" height="16px" />
                        </div>
                        <div className="image_box">
                          <Skeleton width="100%" height="100%" radius="13px" />
                        </div>
                        <div className="song_text_column">
                          <Skeleton width="70%" height="16px" />
                          <div className="spacer_y_small" />
                          <div className="artist_name_row">
                            <Skeleton width="45%" height="12px" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mixed_column_section">
                <div className="mixed_heading">
                  <div className="inner_heading_row">
                    <h2>New Releases</h2>
                  </div>
                </div>
                <div className="mixed_grid_data">
                  {[0, 1, 2, 3].map((i) => (
                    <div className="first_grid_block" key={i}>
                      <div className="image_box">
                        <Skeleton width="100%" height="100%" radius="0" />
                      </div>
                      <div className="text_column">
                        <Skeleton width="70%" height="16px" />
                        <Skeleton width="45%" height="12px" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="second_home_row">
              <VerticalCarousel songs={quickPicks} onSelect={playTrack} />

              <div className="column_songs_section">
                <div className="top_artist_heading_row">
                  <div className="inner_heading_row">
                    <div>
                      <h2>Recommended Artist</h2>
                    </div>
                  </div>
                </div>
                <div className="spacer_y_small" />

                {/*
                  No "See all"/"Show less" toggle here on purpose -- for a
                  short list like this, a click-to-expand adds friction a
                  plain scrollable list doesn't need. Shows 4 without
                  scrolling (the column's sized for exactly that); a fade
                  at the bottom hints there's more to scroll to when the
                  list runs longer than that.
                */}
                <div className="recommended_artist_list">
                  {recommended.length === 0 && (
                    <EmptyMessage message="No recommendations right now. Try a search instead." />
                  )}
                  {/*
                    These come from the "Recommended music videos" shelf, so each
                    entry is really a track. The original rendered them as artist
                    cards but left them inert; clicking one plays it now.
                  */}
                  {recommended.map((song) => (
                    <ArtistRow
                      key={song.videoId}
                      variant="home"
                      name={song.artist}
                      thumbnail={song.thumbnail}
                      onSelect={() => playTrack(song)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="third_home_row">
              <div className="song_genre_column">
                <div className="genre">
                  {/*
                    These were plain static tags in the original -- no click
                    handler at all. Each one now searches for that genre/mood,
                    the same thing clicking a genre chip does on the real
                    YouTube Music.
                  */}
                  <h1>For You</h1>
                  {genres.slice(0, 8).map((genre) => (
                    <div
                      className="category"
                      key={genre}
                      role="button"
                      tabIndex={0}
                      onClick={() => goToSearch(genre)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          goToSearch(genre);
                        }
                      }}
                    >
                      <p>{genre}</p>
                    </div>
                  ))}
                  <h1>Moods &amp; moments</h1>
                  {moods.slice(0, 8).map((mood) => (
                    <div
                      className="category"
                      key={mood}
                      role="button"
                      tabIndex={0}
                      onClick={() => goToSearch(mood)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          goToSearch(mood);
                        }
                      }}
                    >
                      <p>{mood}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="quickPicks_column_section">
                <div className="quickPicks_heading_row">
                  <div className="inner_heading_row">
                    <div>
                      <h2>Quick Picks</h2>
                    </div>
                  </div>
                  <SeeAllToggle
                    isExpandable={quickPicksList.isExpandable}
                    expanded={quickPicksList.expanded}
                    onToggle={quickPicksList.toggle}
                  />
                </div>
                <div className="quickPicks_songs_column">
                  {quickPicks.length === 0 && (
                    <EmptyMessage message="No picks right now. Try a search instead." />
                  )}
                  {quickPicksList.visible.map((song, index) => (
                    <SongRow key={song.videoId} song={song} index={index + 1} />
                  ))}
                </div>
              </div>

              <div className="mixed_column_section">
                <div className="mixed_heading">
                  <div className="inner_heading_row">
                    <h2>New Releases</h2>
                  </div>
                </div>
                <div className="mixed_grid_data">
                  {newReleases.length === 0 && (
                    <EmptyMessage message="No new releases right now." />
                  )}
                  {newReleases.map((album) => (
                    <div className="first_grid_block" key={`${album.browseId ?? album.title}`}>
                      <div className="image_box">
                        <img
                          src={thumbnailOrFallback(album.thumbnail)}
                          alt=""
                          loading="lazy"
                          onError={handleThumbnailError}
                        />
                      </div>
                      <div className="text_column">
                        <h2>{album.title}</h2>
                        <p>{album.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
