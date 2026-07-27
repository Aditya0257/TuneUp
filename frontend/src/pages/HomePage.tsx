import { api } from '@/api/client';
import { ArtistRow } from '@/components/ArtistRow';
import { SongRow } from '@/components/SongRow';
import { EmptyMessage, ErrorMessage, Loading } from '@/components/StatusMessage';
import { VerticalCarousel } from '@/components/VerticalCarousel';
import { useAsync } from '@/hooks/useAsync';
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
  const { data, loading, error } = useAsync(() => api.getHome(), []);

  const quickPicks = data?.quickPicks ?? [];
  const newReleases = data?.newReleases ?? [];
  const recommended = data?.recommendedMusic ?? [];
  const genres = data?.genres ?? [];
  const moods = data?.moods ?? [];

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

        <div className="second_home_row">
          <VerticalCarousel />

          <div className="column_songs_section">
            <div className="top_artist_heading_row">
              <div className="inner_heading_row">
                <div>
                  <h2>Recommended Artist</h2>
                </div>
              </div>
              <div>
                <p>
                  <u>See all</u>
                </p>
              </div>
            </div>
            <div className="spacer_y_small" />

            {loading && <Loading label="Loading recommendations…" />}
            {error && <ErrorMessage message={error} />}
            {/*
              These come from the "Recommended music videos" shelf, so each
              entry is really a track. The original rendered them as artist
              cards but left them inert; clicking one plays it now.
            */}
            {recommended.slice(0, 3).map((song) => (
              <ArtistRow
                key={song.videoId}
                variant="home"
                name={song.artist}
                thumbnail={song.thumbnail}
                followers="250M Followers"
                plays="111M Views"
                onSelect={() => playTrack(song)}
              />
            ))}
          </div>
        </div>

        <div className="third_home_row">
          <div className="song_genre_column">
            <div className="genre">
              <h1>For You</h1>
              {genres.slice(0, 8).map((genre) => (
                <div className="category" key={genre}>
                  <p>{genre}</p>
                </div>
              ))}
              <h1>Moods &amp; moments</h1>
              {moods.slice(0, 8).map((mood) => (
                <div className="category" key={mood}>
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
              <div>
                <p>
                  <u>See all</u>
                </p>
              </div>
            </div>
            <div className="quickPicks_songs_column">
              {loading && <Loading label="Loading Quick Picks…" />}
              {error && <ErrorMessage message={error} />}
              {!loading && !error && quickPicks.length === 0 && (
                <EmptyMessage message="No picks right now. Try a search instead." />
              )}
              {quickPicks.map((song, index) => (
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
      </div>
    </div>
  );
}
