import { useSearchParams } from 'react-router-dom';

import { api } from '@/api/client';
import { ArtistRow } from '@/components/ArtistRow';
import { SeeAllToggle } from '@/components/SeeAllToggle';
import { SongRow } from '@/components/SongRow';
import { EmptyMessage, ErrorMessage, Loading } from '@/components/StatusMessage';
import { useAsync } from '@/hooks/useAsync';
import { useExpandable } from '@/hooks/useExpandable';
import { handleThumbnailError, thumbnailOrFallback } from '@/utils/format';

/**
 * Port of templates/search.html.
 *
 * The query lives in the URL, so results are shareable and survive a refresh --
 * the original pushed `/search` with no query string, so reloading that URL hit
 * a Flask branch that printed an error dict and returned `None`, which Flask
 * turned into a 500.
 */
function SectionHeading({
  title,
  className,
  isExpandable,
  expanded,
  onToggle,
}: {
  title: string;
  className: string;
  isExpandable: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={className}>
      <div className="inner_heading_row">
        <div>
          <h2>{title}</h2>
        </div>
      </div>
      <SeeAllToggle isExpandable={isExpandable} expanded={expanded} onToggle={onToggle} />
    </div>
  );
}

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();

  const { data, loading, error } = useAsync(
    () => api.search(query),
    [query],
    query.length > 0,
  );

  const songs = data?.songs ?? [];
  const albums = data?.albums ?? [];
  const artists = data?.artists ?? [];
  const playlists = data?.playlists ?? [];

  const songsList = useExpandable(songs, 5);
  const playlistsList = useExpandable(playlists, 4);
  const artistsList = useExpandable(artists, 5);
  const albumsList = useExpandable(albums, 5);

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
  // it just overlaps. When there's nothing to show columns for, the status
  // message replaces the row's content instead of floating in front of it.
  const statusOnly = query.length === 0 || loading || Boolean(error) || hasNoResults;

  return (
    <div className="searchpage">
      <div className="test_div">
        <div className="vl" />
      </div>
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
          {loading && <Loading label={`Searching for “${query}”…`} />}
          {error && (
            <ErrorMessage message={error} hint="Check that the Flask backend is running and reachable." />
          )}
          {hasNoResults && (
            <EmptyMessage
              message={`Nothing found for “${query}”.`}
              hint="Try a different spelling, or a broader term. If every search comes up empty, YouTube Music may be unreachable right now."
            />
          )}

          {!statusOnly && (
          <>
          <div className="first_song_community_search_column">
            <SectionHeading
              title="Songs"
              className="first_song_search_heading_row"
              isExpandable={songsList.isExpandable}
              expanded={songsList.expanded}
              onToggle={songsList.toggle}
            />
            <div className="songs_column">
              {songsList.visible.map((song, index) => (
                <SongRow
                  key={song.videoId}
                  song={song}
                  index={index + 1}
                  withDropdown={false}
                />
              ))}
            </div>

            <SectionHeading
              title="Community"
              className="first_community_search_heading_row"
              isExpandable={playlistsList.isExpandable}
              expanded={playlistsList.expanded}
              onToggle={playlistsList.toggle}
            />
            <div className="community_column">
              <div className="playlists_container">
                {playlistsList.visible.map((playlist) => {
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
          </div>

          <div className="space_x_medium" />

          <div className="second_artist_album_search_column">
            <SectionHeading
              title="Artists"
              className="second_artist_search_heading_row"
              isExpandable={artistsList.isExpandable}
              expanded={artistsList.expanded}
              onToggle={artistsList.toggle}
            />
            <div className="artist_search_column">
              {artistsList.visible.map((artist) => (
                <ArtistRow
                  key={artist.browseId ?? artist.name}
                  variant="search"
                  name={artist.name}
                  thumbnail={artist.thumbnail}
                  /* Real subscriber counts when the API returns them, else the
                     original's hardcoded placeholder. */
                  followers={artist.subscribers ? `${artist.subscribers} Followers` : '28k Followers'}
                  plays="128M Plays"
                />
              ))}
            </div>

            <SectionHeading
              title="Albums"
              className="second_album_search_heading_row"
              isExpandable={albumsList.isExpandable}
              expanded={albumsList.expanded}
              onToggle={albumsList.toggle}
            />
            <div className="album_search_column">
              <div className="flex_container">
                {albumsList.visible.map((album) => (
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
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
