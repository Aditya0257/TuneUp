import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { CreatePlaylistModal } from '@/components/CreatePlaylistModal';
import { Skeleton } from '@/components/Skeleton';
import { EmptyMessage } from '@/components/StatusMessage';
import { usePlaylists } from '@/playlists/PlaylistsContext';
import { thumbnailOrFallback, handleThumbnailError } from '@/utils/format';

/**
 * Your own playlists -- create, name, and add songs to from anywhere in the
 * app (see TrackDropdown's Add to Playlist checklist). Reuses .playlistspage/
 * .playlistspage_grid/.playlistspage_card from the Discover page (formerly
 * this route's own name, before it was renamed to disambiguate from this
 * feature) -- same card-grid look, never rendered at the same time.
 */
export function MyPlaylistsPage() {
  const { playlists, loading, createPlaylist } = usePlaylists();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="playlistspage">
      <h1>My Playlists</h1>
      <p className="playlistspage_subtitle">
        Playlists you've made yourself -- add songs to one from the Add to Playlist menu on any
        track, anywhere in the app.
      </p>

      <button type="button" className="myplaylistspage_create_button" onClick={() => setCreating(true)}>
        <i className="fa-solid fa-plus" aria-hidden="true" />
        New Playlist
      </button>

      {!loading && playlists.length === 0 && (
        <EmptyMessage message="No playlists yet. Create one, then add songs to it from any track's menu." />
      )}

      <div className="playlistspage_grid">
        {loading &&
          [0, 1, 2].map((i) => (
            <div className="playlistspage_card" key={i} aria-hidden="true">
              <Skeleton height="180px" radius="0" />
              <div style={{ padding: '10px 12px 12px' }}>
                <Skeleton width="80%" height="14px" />
                <div style={{ height: 6 }} />
                <Skeleton width="50%" height="11px" />
              </div>
            </div>
          ))}
        {playlists.map((playlist) => (
          <Link className="playlistspage_card" key={playlist.id} to={`/playlists/mine/${playlist.id}`}>
            <img
              src={thumbnailOrFallback(playlist.songs[0]?.thumbnail ?? null)}
              alt=""
              loading="lazy"
              onError={handleThumbnailError}
            />
            <p className="playlistspage_card_title">{playlist.name}</p>
            <p className="playlistspage_card_author">
              {playlist.songs.length} song{playlist.songs.length === 1 ? '' : 's'}
            </p>
          </Link>
        ))}
      </div>

      {creating && (
        <CreatePlaylistModal
          onClose={() => setCreating(false)}
          onCreate={async (name) => {
            const playlist = await createPlaylist(name);
            setCreating(false);
            navigate(`/playlists/mine/${playlist.id}`);
          }}
        />
      )}
    </div>
  );
}
