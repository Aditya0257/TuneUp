import { EmptyMessage, ErrorMessage, Loading } from '@/components/StatusMessage';
import { useLikedSongs } from '@/liked/LikedSongsContext';
import { usePlayer } from '@/player/PlayerContext';
import { thumbnailOrFallback, trackNumber } from '@/utils/format';

/**
 * Port of templates/music.html.
 *
 * The original reached this page through `changePage('music', ...)`, which
 * POSTed the browser's localStorage to Flask, stored it in the session, then
 * re-fetched the page so Jinja could render it -- a full round trip plus a
 * database rewrite just to display a list the browser already had. The liked
 * songs come straight from context now.
 *
 * The Playlists and Saved Artists blocks were hardcoded placeholder data in the
 * original template. Kept as-is so the layout matches.
 */
const PLACEHOLDER_PLAYLISTS = [
  { title: 'Relaxing Melodies', creator: 'John Doe', image: 'https://picsum.photos/id/1015/300/180' },
  { title: 'Chill Vibes', creator: 'Jane Smith', image: 'https://picsum.photos/id/1016/300/180' },
  { title: 'Dizzy Morning', creator: 'Weekend', image: 'https://picsum.photos/id/1019/300/180' },
];

const PLACEHOLDER_ARTISTS = [
  { name: 'John Smith', genre: 'Pop', famousFor: 'Beautiful Day', image: 'https://images.pexels.com/photos/1916824/pexels-photo-1916824.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'Jane Doe', genre: 'Rock', famousFor: "Sweet Child o' Mine", image: 'https://images.pexels.com/photos/2479312/pexels-photo-2479312.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'Mike Johnson', genre: 'Hip Hop', famousFor: 'Lose Yourself', image: 'https://images.pexels.com/photos/920992/pexels-photo-920992.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'Emily Williams', genre: 'R&B', famousFor: 'Love on Top', image: 'https://images.pexels.com/photos/920992/pexels-photo-920992.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'David Lee', genre: 'Country', famousFor: 'Tennessee Whiskey', image: 'https://images.pexels.com/photos/920992/pexels-photo-920992.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'Sarah Brown', genre: 'Jazz', famousFor: 'Fly Me to the Moon', image: 'https://images.pexels.com/photos/920992/pexels-photo-920992.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'Alex Turner', genre: 'Indie Rock', famousFor: 'Do I Wanna Know?', image: 'https://images.pexels.com/photos/920992/pexels-photo-920992.jpeg?auto=compress&cs=tinysrgb&w=800' },
];

const LIKED_SONGS_COVER =
  'https://images.unsplash.com/photo-1504680177321-2e6a879aac86?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80';

export function LibraryPage() {
  const { likedSongs, loading, error } = useLikedSongs();
  const { playTrack } = usePlayer();

  return (
    <div className="musicpage">
      <div className="test_div">
        <div className="vl" />
      </div>

      <div className="music_main_row">
        <div className="covering_container" />

        <div className="music_first_column">
          <div className="first_music_row">
            <h1>Library</h1>
          </div>

          <div className="second_music_row">
            <div className="image_column">
              <div className="image_title">
                <h2>Liked Songs</h2>
              </div>
              <div className="image_box">
                <img src={LIKED_SONGS_COVER} alt="Liked Songs" />
              </div>
            </div>

            <div className="songs_column">
              <div className="see_more_row">
                <p>
                  <u>See all</u>
                </p>
              </div>

              <div className="liked_song_container">
                {loading && likedSongs.length === 0 && <Loading label="Loading your library…" />}
                {error && likedSongs.length === 0 && <ErrorMessage message={error} />}
                {!loading && likedSongs.length === 0 && (
                  <EmptyMessage message="No liked songs yet. Tap the heart on any track." />
                )}

                {likedSongs.map((song, index) => (
                  <div className="song_container" key={song.videoId}>
                    <div className="first_song_row">
                      <div className="clickable_row">
                        <div
                          className="artist_no_name_and_img"
                          role="button"
                          tabIndex={0}
                          aria-label={`Play ${song.title} by ${song.artist}`}
                          onClick={() =>
                            playTrack({
                              videoId: song.videoId,
                              title: song.title,
                              artist: song.artist,
                              thumbnail: song.thumbnail,
                            })
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              playTrack({
                                videoId: song.videoId,
                                title: song.title,
                                artist: song.artist,
                                thumbnail: song.thumbnail,
                              });
                            }
                          }}
                        >
                          <div className="sno_play_pause_icon">
                            <h2>{trackNumber(index + 1)}</h2>
                          </div>
                          <div className="spacer_x_small" />
                          <div className="song_thumbnail">
                            <img
                              src={thumbnailOrFallback(song.thumbnail)}
                              alt="Song Thumbnail"
                              loading="lazy"
                            />
                          </div>
                          <div className="spacer_x_small" />
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
                        <div className="space_x_medium" />
                        <div className="three_dot_x_icon">
                          <p>Plays: N/A</p>
                          <p>Duration: N/A</p>
                          <i className="fa-solid fa-ellipsis" aria-hidden="true" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="third_music_row">
            <div className="heading_playlist">
              <h2>Playlists</h2>
            </div>
            <div className="playlist_grid_blocks">
              {PLACEHOLDER_PLAYLISTS.map((playlist) => (
                <div className="playlist_block" key={playlist.title}>
                  <div className="playlist_image">
                    <img src={playlist.image} alt={playlist.title} loading="lazy" />
                  </div>
                  <div className="playlist_details">
                    <h3>{playlist.title}</h3>
                    <p>Created by: {playlist.creator}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="music_second_column">
          <div className="artists_container">
            <h2>Saved Artists</h2>
            <div className="elevated_card">
              <div className="artist_list">
                {PLACEHOLDER_ARTISTS.map((artist) => (
                  <div className="artist_item" key={artist.name}>
                    <div className="artist_image">
                      <img src={artist.image} alt={artist.name} loading="lazy" />
                    </div>
                    <div className="artist_details">
                      <h3>{artist.name}</h3>
                      <p>Genre: {artist.genre}</p>
                      <p>Famous for: {artist.famousFor}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
