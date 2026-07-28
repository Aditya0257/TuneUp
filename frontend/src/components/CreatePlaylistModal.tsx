import { useState, type FormEvent } from 'react';

import { Modal } from '@/components/Modal';

/**
 * Shared by every place a playlist name gets entered: the "New Playlist"
 * button on MyPlaylistsPage, the "New playlist..." row inside TrackDropdown's
 * Add to Playlist checklist (which also adds the current song to it on
 * success), and PlaylistDetailPage's rename control -- one name field, same
 * validation, same modal chrome, just different title/submit copy and
 * (for rename) a pre-filled value.
 */
export function CreatePlaylistModal({
  title = 'New Playlist',
  submitLabel = 'Create',
  submittingLabel = 'Creating…',
  initialName = '',
  onClose,
  onCreate,
}: {
  title?: string;
  submitLabel?: string;
  submittingLabel?: string;
  initialName?: string;
  onClose: () => void;
  onCreate: (name: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    await onCreate(trimmed);
    setSubmitting(false);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label className="tuneup_text_field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="My Playlist"
            maxLength={80}
            autoFocus
          />
        </label>
        <button type="submit" disabled={!name.trim() || submitting}>
          {submitting ? submittingLabel : submitLabel}
        </button>
      </form>
    </Modal>
  );
}
