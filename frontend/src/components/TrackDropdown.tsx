import { useEffect, useRef, useState, type MouseEvent } from 'react';

import { CreatePlaylistModal } from '@/components/CreatePlaylistModal';
import { usePlayer } from '@/player/PlayerContext';
import { usePlaylists } from '@/playlists/PlaylistsContext';
import type { Song } from '@/types';

/**
 * "Add to Queue" / "Play Next" menu.
 *
 * The original `toggleDropdown` queried every `.dropdown-content` on the page
 * and set inline `display` on each one to emulate "close the others". Local
 * state plus an outside-click listener does the same thing without touching
 * other components' DOM.
 *
 * Both actions used to cost a network round trip per click (the old
 * /playSong route had to resolve a stream URL). We already hold the metadata,
 * so they are now instant.
 */
export function TrackDropdown({ song }: { song: Song }) {
  const { addToQueue, playNext } = usePlayer();
  const { playlists, playlistsContaining, createPlaylist, addSongToPlaylist, removeSongFromPlaylist } =
    usePlaylists();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const memberOf = playlistsContaining(song.videoId);

  useEffect(() => {
    if (!open) return;

    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onDocumentPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onDocumentPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (event: MouseEvent, action: 'queue' | 'next') => {
    event.preventDefault();
    event.stopPropagation();
    if (action === 'queue') addToQueue(song);
    else playNext(song);
    setOpen(false);
  };

  // Toggling playlist membership doesn't close the dropdown -- adding a
  // song to several playlists in one go is the whole point of a
  // checklist, and closing after the first click would turn that into
  // "reopen the menu N times" instead.
  const toggleMembership = (event: MouseEvent, playlistId: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (memberOf.has(playlistId)) {
      void removeSongFromPlaylist(playlistId, song.videoId);
    } else {
      void addSongToPlaylist(playlistId, song);
    }
  };

  return (
    <div className="dropdown" ref={containerRef}>
      <i
        className="fa-solid fa-ellipsis"
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More options for ${song.title}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            setOpen((value) => !value);
          }
        }}
      />
      <div className="dropdown-content" style={{ display: open ? 'block' : 'none' }} role="menu">
        <a href="#" role="menuitem" onClick={(event) => choose(event, 'queue')}>
          Add to Queue
        </a>
        <a href="#" role="menuitem" onClick={(event) => choose(event, 'next')}>
          Play Next
        </a>
        <div className="dropdown-divider" role="separator" />
        <div className="dropdown-section-label">Add to Playlist</div>
        {playlists.length === 0 && (
          <div className="dropdown-empty-hint">No playlists yet</div>
        )}
        {playlists.map((playlist) => (
          <a
            href="#"
            role="menuitemcheckbox"
            aria-checked={memberOf.has(playlist.id)}
            key={playlist.id}
            onClick={(event) => toggleMembership(event, playlist.id)}
          >
            <i
              className={memberOf.has(playlist.id) ? 'fa-solid fa-check-square' : 'fa-regular fa-square'}
              aria-hidden="true"
            />
            <span>{playlist.name}</span>
          </a>
        ))}
        <a
          href="#"
          role="menuitem"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setCreating(true);
          }}
        >
          <i className="fa-solid fa-plus" aria-hidden="true" />
          <span>New playlist…</span>
        </a>
      </div>

      {creating && (
        <CreatePlaylistModal
          onClose={() => setCreating(false)}
          onCreate={async (name) => {
            const playlist = await createPlaylist(name);
            await addSongToPlaylist(playlist.id, song);
            setCreating(false);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
