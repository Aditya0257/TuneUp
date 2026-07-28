import { useSearchParams } from 'react-router-dom';

import { api } from '@/api/client';
import { ArtistRow } from '@/components/ArtistRow';
import { Skeleton } from '@/components/Skeleton';
import { SongRow } from '@/components/SongRow';
import { EmptyMessage, ErrorMessage } from '@/components/StatusMessage';
import { useAsync } from '@/hooks/useAsync';
import { handleThumbnailError, thumbnailOrFallback } from '@/utils/format';

/**
 * Reuses the real .first_song_row/.artist_row markup rather than a generic
 * skeleton box, so the shimmer sits in exactly the spot the real row's
 * image/text will -- a generic box of the wrong size/position was reading
 * as "misaligned" against the content it was standing in for.
 */
function SkeletonRow({ variant }: { variant: 'song' | 'artist' }) {
  if (variant === 'artist') {
    return (
      <div className="artist_row">
        <div className="artist_name_and_img">
          <div className="image_box">
            {/* .image_box itself isn't square here (22% wide, full row
                height), and the real <img> only fills 65% of it with a 15%
                left margin at a 13px rounded-rect radius -- not a circle.
                Matching that exactly instead of a generic 100%/50% circle
                is what was rendering as a squashed oval. */}
            <Skeleton width="65%" height="100%" radius="13px" style={{ marginLeft: '15%' }} />
          </div>
          <div className="artist_text_column">
            <Skeleton width="65%" height="16px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="first_song_row">
      <div className="artist_no_name_and_img">
        <div className="spacer_x_small" />
        <div className="sno_play_pause_icon">
          <Skeleton width="16px" height="14px" />
        </div>
        <div className="image_box">
          <Skeleton width="100%" height="100%" radius="13px" />
        </div>
        <div className="song_text_column">
          <Skeleton width="70%" height="15px" />
          <div className="spacer_y_small" />
          <div className="artist_name_row">
            <Skeleton width="45%" height="11px" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Matches .community_playlist's real box model (see search.scss). */
function CommunitySkeletonCard({ index }: { index: number }) {
  return (
    <div className="community_playlist" aria-hidden="true">
      <div className="community_playlist_cover">
        <Skeleton width="100%" height="100%" radius="0" />
      </div>
      <Skeleton width={index % 2 === 0 ? '70%' : '55%'} height="14px" style={{ marginTop: 10 }} />
    </div>
  );
}

/** Matches .album's real box model (see search.scss). */
function AlbumSkeletonCard() {
  return (
    <div className="album" aria-hidden="true">
      <div className="album_cover">
        <Skeleton width="100%" height="220px" radius="20px" />
      </div>
      <Skeleton width="80%" height="14px" style={{ marginTop: 10 }} />
    </div>
  );
}

/**
 * Port of templates/search.html.
 *
 * The query lives in the URL, so results are shareable and survive a refresh --
 * the original pushed `/search` with no query string, so reloading that URL hit
 * a Flask branch that printed an error dict and returned `None`, which Flask
 * turned into a 500.
 */
/* No "See all" toggle here (unlike Home's shelves) -- search results are
   already the thing you asked for, and the whole page is one continuous
   scroll now (see overrides.scss #29), so gating them behind a click added
   a step between "searched" and "can see everything" for no real benefit. */
function SectionHeading({ title, className }: { title: string; className: string }) {
  return (
    <div className={className}>
      <div className="inner_heading_row">
        <div>
          <h2>{title}</h2>
        </div>
      </div>
    </div>
  );
}

// Search can return a genuinely long tail of song matches (30-40+) --
// showing every one of them turned "Songs" into a single column many
// screens tall, with Community and Albums (each naturally short) stuck
// far below it and a lot of dead space on the shorter side. Capping to
// the most relevant handful keeps the top row balanced without bringing
// back a click-to-expand step.
const SONGS_LIMIT = 8;
const ARTISTS_LIMIT = 6;

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();

  const { data, loading, error } = useAsync(
    () => api.search(query),
    [query],
    query.length > 0,
  );

  const songs = (data?.songs ?? []).slice(0, SONGS_LIMIT);
  const albums = data?.albums ?? [];
  const artists = (data?.artists ?? []).slice(0, ARTISTS_LIMIT);
  const playlists = data?.playlists ?? [];

  const hasNoResults =
    !loading &&
    !error &&
    query.length > 0 &&
    songs.length === 0 &&
    albums.length === 0 &&
    artists.length === 0 &&
    playlists.length === 0;

  // .second_search_row is absolutely positioned in the original CSS, so a
  // status message rendered as an extra sibling doesn't push it down --
  // it just overlaps. When there's nothing to show columns for at all (no
  // query yet, an error, or truly zero results), the status message
  // replaces the row's content instead of floating in front of it.
  // Loading gets its own branch below: skeleton placeholders shaped like
  // the real four columns, rather than collapsing to one status message.
  const statusOnly = query.length === 0 || Boolean(error) || hasNoResults;

  return (
    <div className="searchpage">
      <div className="main_column">
        <div className="first_search_row">
          <div className="search_song_name">
            {/* Text content, not innerHTML -- see the note in SearchBar. */}
            <h1 id="search-heading">{query}</h1>
          </div>
        </div>

        <div className={statusOnly ? 'second_search_row search_status_row' : 'second_search_row'}>
          {query.length === 0 && (
            <EmptyMessage message="Type something in the search bar to get started." />
          )}
          {error && (
            <ErrorMessage message={error} hint="Check that the Flask backend is running and reachable." />
          )}
          {hasNoResults && (
            <EmptyMessage
              message={`Nothing found for “${query}”.`}
              hint="Try a different spelling, or a broader term. If every search comes up empty, YouTube Music may be unreachable right now."
            />
          )}

          {loading && (
            <>
              {/* Songs and Artists share a top row (both naturally short
                  now that Songs is capped); Community and Albums each get
                  the full page width below instead of being confined to
                  whichever half-column they used to live in -- there's no
                  reason a playlist/album grid should stop at 50% width
                  when nothing else is competing for the other half. */}
              <div className="search_top_columns">
                <div className="first_song_community_search_column">
                  <div className="first_song_search_heading_row">
                    <div className="inner_heading_row">
                      <h2>Songs</h2>
                    </div>
                  </div>
                  <div className="songs_column">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <SkeletonRow variant="song" key={i} />
                    ))}
                  </div>
                </div>
                <div className="space_x_medium" />
                <div className="second_artist_album_search_column">
                  <div className="second_artist_search_heading_row">
                    <div className="inner_heading_row">
                      <h2>Artists</h2>
                    </div>
                  </div>
                  <div className="artist_search_column">
                    {[0, 1, 2].map((i) => (
                      <SkeletonRow variant="artist" key={i} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="first_community_search_heading_row">
                <div className="inner_heading_row">
                  <h2>Community</h2>
                </div>
              </div>
              <div className="community_column">
                <div className="playlists_container">
                  {[0, 1, 2, 3].map((i) => (
                    <CommunitySkeletonCard index={i} key={i} />
                  ))}
                </div>
              </div>

              <div className="second_album_search_heading_row">
                <div className="inner_heading_row">
                  <h2>Albums</h2>
                </div>
              </div>
              <div className="album_search_column">
                <div className="flex_container">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <AlbumSkeletonCard key={i} />
                  ))}
                </div>
              </div>
            </>
          )}

          {!statusOnly && !loading && (
          <>
          <div className="search_top_columns">
            <div className="first_song_community_search_column">
              <SectionHeading title="Songs" className="first_song_search_heading_row" />
              <div className="songs_column">
                {songs.map((song, index) => (
                  <SongRow
                    key={song.videoId}
                    song={song}
                    index={index + 1}
                    withDropdown={false}
                  />
                ))}
              </div>
            </div>

            <div className="space_x_medium" />

            <div className="second_artist_album_search_column">
              <SectionHeading title="Artists" className="second_artist_search_heading_row" />
              <div className="artist_search_column">
                {artists.map((artist) => (
                  <ArtistRow
                    key={artist.browseId ?? artist.name}
                    variant="search"
                    name={artist.name}
                    thumbnail={artist.thumbnail}
                    /* ytmusicapi doesn't expose play counts at all, and only
                       sometimes returns a real subscriber count -- no fallback
                       to a fake number when it doesn't. */
                    followers={artist.subscribers ? `${artist.subscribers} Followers` : undefined}
                    browseId={artist.browseId}
                  />
                ))}
              </div>
            </div>
          </div>

          <SectionHeading title="Community" className="first_community_search_heading_row" />
          <div className="community_column">
            <div className="playlists_container">
              {playlists.map((playlist) => {
                const id = playlist.playlistId ?? playlist.browseId;
                return (
                  <a
                    className="community_playlist"
                    key={id ?? playlist.title}
                    href={id ? `https://music.youtube.com/playlist?list=${id}` : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!id || undefined}
                    onClick={(event) => {
                      if (!id) event.preventDefault();
                    }}
                  >
                    <div className="community_playlist_cover">
                      <img
                        src={thumbnailOrFallback(playlist.thumbnail)}
                        alt=""
                        loading="lazy"
                        onError={handleThumbnailError}
                      />
                    </div>
                    <p>{playlist.title}</p>
                  </a>
                );
              })}
            </div>
          </div>

          <SectionHeading title="Albums" className="second_album_search_heading_row" />
          <div className="album_search_column">
            <div className="flex_container">
              {albums.map((album) => (
                <a
                  className="album"
                  key={album.browseId ?? album.title}
                  href={album.browseId ? `https://music.youtube.com/browse/${album.browseId}` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!album.browseId || undefined}
                  onClick={(event) => {
                    if (!album.browseId) event.preventDefault();
                  }}
                >
                  <div className="album_cover">
                    <img
                      src={thumbnailOrFallback(album.thumbnail)}
                      alt=""
                      loading="lazy"
                      onError={handleThumbnailError}
                    />
                  </div>
                  <p>{album.title}</p>
                </a>
              ))}
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
