import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { api } from '@/api/client';
import { SeeAllToggle } from '@/components/SeeAllToggle';
import { Skeleton } from '@/components/Skeleton';
import { EmptyMessage, ErrorMessage } from '@/components/StatusMessage';
import { useAsync } from '@/hooks/useAsync';
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
 * Playlists and Saved Artists were hardcoded placeholder data (fake names,
 * stock photos) in the original template. Both are now derived from real
 * data instead: Saved Artists comes straight from your liked songs, and
 * Playlists is a real YouTube Music search seeded by your most-liked artist
 * (falls back to a generic query if you haven't liked anything yet).
 */
const LIKED_SONGS_COVER =
  'https://images.unsplash.com/photo-1504680177321-2e6a879aac86?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80';

function topArtist(likedSongs: { artist: string }[]): string | null {
  const counts = new Map<string, number>();
  for (const song of likedSongs) {
    counts.set(song.artist, (counts.get(song.artist) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [artist, count] of counts) {
    if (count > bestCount) {
      best = artist;
      bestCount = count;
    }
  }
  return best;
}

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

  const playlistQuery = topArtist(likedSongs) ?? 'Popular Music';
  const { data: playlistData } = useAsync(() => api.search(playlistQuery, 6), [playlistQuery], true);
  const playlists = playlistData?.playlists ?? [];

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

          <div className="third_music_row" id="playlists">
            <div className="heading_playlist">
              <h2>Playlists</h2>
            </div>
            <div className="playlist_grid_blocks">
              {playlists.length === 0 && (
                <EmptyMessage message="No playlists to show yet -- like a few songs to seed recommendations." />
              )}
              {playlists.map((playlist) => {
                const id = playlist.playlistId ?? playlist.browseId;
                return (
                  <a
                    className="playlist_block"
                    key={id ?? playlist.title}
                    href={id ? `https://music.youtube.com/playlist?list=${id}` : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!id || undefined}
                    onClick={(event) => {
                      if (!id) event.preventDefault();
                    }}
                  >
                    <div className="playlist_image">
                      <img
                        src={thumbnailOrFallback(playlist.thumbnail)}
                        alt={playlist.title}
                        loading="lazy"
                        onError={handleThumbnailError}
                      />
                    </div>
                    <div className="playlist_details">
                      <h3>{playlist.title}</h3>
                      {playlist.author && <p>By: {playlist.author}</p>}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="music_second_column">
          <div className="artists_container">
            <h2>Saved Artists</h2>
            <div className="elevated_card">
              <div className="artist_list">
                {savedArtists.length === 0 && (
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
                      <p>e.g. {artist.exampleTrack}</p>
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
