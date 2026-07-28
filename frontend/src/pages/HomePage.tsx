import { useNavigate } from 'react-router-dom';

import { api } from '@/api/client';
import { ArtistRow } from '@/components/ArtistRow';
import { SeeAllToggle } from '@/components/SeeAllToggle';
import { SongRow } from '@/components/SongRow';
import { EmptyMessage, ErrorMessage, Loading } from '@/components/StatusMessage';
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

  const recommendedList = useExpandable(recommended, 3);
  const quickPicksList = useExpandable(quickPicks, 5);

  // One GET /api/home call feeds every section on this page -- Recommended
  // Artist, Quick Picks and New Releases were each showing their own
  // "loading" card at the same time, so the page looked like a scatter of
  // disconnected gray boxes instead of one page loading. One unified state
  // for the whole page instead, same fix as the search results row.
  const statusOnly = loading || Boolean(error);

  return (
    <div id="changable">
      <div className="test_div">
        <div className="vl" />
      </div>
      <div className="main_column">
        <div className="first_home_row">
          <div className="homepage_name">
            <h1>Home</h1>
          </div>
        </div>

        {statusOnly ? (
          <div className="home_status_row">
            {loading && <Loading label="Loading your home feed…" />}
            {error && (
              <ErrorMessage message={error} hint="Check that the Flask backend is running and reachable." />
            )}
          </div>
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
                  <SeeAllToggle
                    isExpandable={recommendedList.isExpandable}
                    expanded={recommendedList.expanded}
                    onToggle={recommendedList.toggle}
                  />
                </div>
                <div className="spacer_y_small" />

                <div className="recommended_artist_list">
                  {recommended.length === 0 && (
                    <EmptyMessage message="No recommendations right now. Try a search instead." />
                  )}
                  {/*
                    These come from the "Recommended music videos" shelf, so each
                    entry is really a track. The original rendered them as artist
                    cards but left them inert; clicking one plays it now.
                  */}
                  {recommendedList.visible.map((song) => (
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
