import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { SeeAllToggle } from '@/components/SeeAllToggle';
import { Skeleton } from '@/components/Skeleton';
import { EmptyMessage, ErrorMessage } from '@/components/StatusMessage';
import { useExpandable } from '@/hooks/useExpandable';
import { useLikedSongs } from '@/liked/LikedSongsContext';
import { usePlayer } from '@/player/PlayerContext';
import { handleThumbnailError, thumbnailOrFallback, trackNumber } from '@/utils/format';

/**
 * Port of templates/music.html.
 *
 * The original reached this page through `changePage('music', ...)`, which
 * POSTed the browser's localStorage to Flask, stored it in the session, then
 * re-fetched the page so Jinja could render it -- a full round trip plus a
 * database rewrite just to display a list the browser already had. The liked
 * songs come straight from context now.
 *
 * Saved Artists was hardcoded placeholder data (fake names, stock photos) in
 * the original template -- now derived straight from your liked songs. This
 * page used to also have its own Playlists grid (a real YouTube Music
 * search seeded by your most-liked artist), but that's redundant with the
 * dedicated Playlists page now, so it's gone from here -- Liked Songs is the
 * only thing left, with the room that freed up.
 */
const LIKED_SONGS_COVER =
  'https://images.unsplash.com/photo-1504680177321-2e6a879aac86?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80';

export function LibraryPage() {
  const { likedSongs, loading, error } = useLikedSongs();
  const { playTrack } = usePlayer();
  const { hash } = useLocation();

  // react-router doesn't scroll to a hash target on client-side navigation
  // the way a full page load would -- the sidebar's Favorites/Playlists
  // shortcuts rely on this to actually land on the right section.
  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  const likedSongsList = useExpandable(likedSongs, 8);

  const savedArtists = Array.from(
    likedSongs.reduce((map, song) => {
      const existing = map.get(song.artist);
      if (existing) {
        existing.likedCount += 1;
      } else {
        map.set(song.artist, { name: song.artist, thumbnail: song.thumbnail, exampleTrack: song.title, likedCount: 1 });
      }
      return map;
    }, new Map<string, { name: string; thumbnail: string | null; exampleTrack: string; likedCount: number }>()),
    ([, artist]) => artist,
  );
  const savedArtistsList = useExpandable(savedArtists, 6);

  return (
    <div className="musicpage">

      <div className="music_main_row">
        <div className="covering_container" />

        <div className="music_first_column">
          <div className="first_music_row">
            <h1>Library</h1>
          </div>

          <div className="second_music_row" id="liked-songs">
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
                <SeeAllToggle
                  isExpandable={likedSongsList.isExpandable}
                  expanded={likedSongsList.expanded}
                  onToggle={likedSongsList.toggle}
                />
              </div>

              <div className="liked_song_container">
                {/* Reuses the real .first_song_row/.song_thumbnail markup
                    (not a generic skeleton box) so the shimmer sits in
                    exactly the spot the real row's image/text will. */}
                {loading &&
                  likedSongs.length === 0 &&
                  [0, 1, 2, 3].map((i) => (
                    <div className="song_container" key={i}>
                      <div className="first_song_row">
                        <div className="clickable_row">
                          <div className="artist_no_name_and_img">
                            <div className="sno_play_pause_icon">
                              <Skeleton width="16px" height="14px" />
                            </div>
                            <div className="spacer_x_small" />
                            <div className="song_thumbnail">
                              <Skeleton width="100%" height="100%" radius="8px" />
                            </div>
                            <div className="spacer_x_small" />
                            <div className="song_text_column">
                              <Skeleton width="60%" height="15px" />
                              <div className="spacer_y_small" />
                              <div className="artist_name_row">
                                <Skeleton width="35%" height="11px" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {error && likedSongs.length === 0 && <ErrorMessage message={error} />}
                {!loading && likedSongs.length === 0 && (
                  <EmptyMessage message="No liked songs yet. Tap the heart on any track." />
                )}

                {likedSongsList.visible.map((song, index) => (
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
                              onError={(event) => handleThumbnailError(event, song.videoId)}
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
                          {/* Plays has no real source -- ytmusicapi doesn't
                              expose a play count at all, so "N/A" here is
                              honest, not a placeholder that was never wired
                              up. Duration WAS available (it's on the Song
                              object at like-time) but got dropped by
                              LikedSong only keeping videoId/title/artist/
                              thumbnail -- now carried through. */}
                          <p>Plays: N/A</p>
                          <p>Duration: {song.duration ?? 'N/A'}</p>
                          <i className="fa-solid fa-ellipsis" aria-hidden="true" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="music_second_column">
          <div className="artists_container">
            <h2>Saved Artists</h2>
            <div className="elevated_card">
              <div className="artist_list">
                {loading && savedArtists.length === 0 &&
                  [0, 1, 2].map((i) => (
                    <div className="artist_item" key={i} aria-hidden="true">
                      <div className="artist_image">
                        <Skeleton width="100%" height="100%" radius="50%" />
                      </div>
                      <div className="artist_details">
                        <Skeleton width="70%" height="15px" />
                        <Skeleton width="50%" height="11px" style={{ marginTop: 6 }} />
                      </div>
                    </div>
                  ))}
                {!loading && savedArtists.length === 0 && (
                  <EmptyMessage message="No artists yet -- artists you like show up here." />
                )}
                {savedArtistsList.visible.map((artist) => (
                  <div className="artist_item" key={artist.name}>
                    <div className="artist_image">
                      <img
                        src={thumbnailOrFallback(artist.thumbnail)}
                        alt={artist.name}
                        loading="lazy"
                        onError={handleThumbnailError}
                      />
                    </div>
                    <div className="artist_details">
                      <h3>{artist.name}</h3>
                      <p>{artist.likedCount} liked song{artist.likedCount === 1 ? '' : 's'}</p>
                      <p className="artist_example_track">e.g. {artist.exampleTrack}</p>
                    </div>
                  </div>
                ))}
                <SeeAllToggle
                  isExpandable={savedArtistsList.isExpandable}
                  expanded={savedArtistsList.expanded}
                  onToggle={savedArtistsList.toggle}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
