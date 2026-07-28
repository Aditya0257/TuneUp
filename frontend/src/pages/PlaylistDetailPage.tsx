import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CreatePlaylistModal } from '@/components/CreatePlaylistModal';
import { Skeleton } from '@/components/Skeleton';
import { SongRow } from '@/components/SongRow';
import { EmptyMessage } from '@/components/StatusMessage';
import { usePlaylists } from '@/playlists/PlaylistsContext';

/**
 * One playlist's contents. Reuses .playlistspage for the same page-panel
 * framing every other page gets, and the real SongRow component for each
 * track -- its TrackDropdown already has the Add to Playlist checklist
 * (built for this feature), which doubles as "remove from this playlist":
 * toggling this playlist's checkbox off removes the song, so there's no
 * separate remove control needed here.
 */
export function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { playlists, loading, renamePlaylist, deletePlaylist } = usePlaylists();
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const playlist = playlists.find((p) => p.id === id);

  if (loading) {
    return (
      <div className="playlistspage">
        <Skeleton width="40%" height="3.2rem" />
        <div className="spacer_y_small" />
        <div className="playlistdetailpage_songs">
          {[0, 1, 2, 3].map((i) => (
            <div className="first_song_row" key={i} aria-hidden="true">
              <div className="artist_no_name_and_img">
                <div className="spacer_x_small" />
                <div className="sno_play_pause_icon">
                  <Skeleton width="16px" height="14px" />
                </div>
                <div className="image_box">
                  <Skeleton width="100%" height="100%" radius="8px" />
                </div>
                <div className="song_text_column">
                  <Skeleton width="60%" height="15px" />
                  <div className="spacer_y_small" />
                  <div className="artist_name_row">
                    <Skeleton width="35%" height="11px" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="playlistspage">
        <EmptyMessage
          message="This playlist doesn't exist."
          hint="It may have been deleted, or the link is wrong."
        />
      </div>
    );
  }

  return (
    <div className="playlistspage">
      <div className="playlistdetailpage_header">
        <h1>{playlist.name}</h1>
        <div className="playlistdetailpage_actions">
          <button type="button" onClick={() => setRenaming(true)}>
            Rename
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirmingDelete) {
                setConfirmingDelete(true);
                return;
              }
              void deletePlaylist(playlist.id);
              navigate('/playlists/mine');
            }}
            onBlur={() => setConfirmingDelete(false)}
          >
            {confirmingDelete ? 'Confirm delete?' : 'Delete'}
          </button>
        </div>
      </div>

      {playlist.songs.length === 0 && (
        <EmptyMessage message="No songs yet -- add some from the Add to Playlist menu on any track." />
      )}

      <div className="playlistdetailpage_songs">
        {playlist.songs.map((song, index) => (
          <SongRow key={song.videoId} song={song} index={index + 1} />
        ))}
      </div>

      {renaming && (
        <CreatePlaylistModal
          title="Rename Playlist"
          submitLabel="Save"
          submittingLabel="Saving…"
          initialName={playlist.name}
          onClose={() => setRenaming(false)}
          onCreate={async (name) => {
            await renamePlaylist(playlist.id, name);
            setRenaming(false);
          }}
        />
      )}
    </div>
  );
}
