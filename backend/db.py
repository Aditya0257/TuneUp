"""Persistence layer for liked songs and play history.

Backed by MongoDB when MONGODB_URI is set, otherwise by an in-process dict so
the app boots with no database installed. Both backends expose the same
interface, so nothing upstream needs to care which one is live.
"""
from __future__ import annotations

import logging
import threading
import uuid
from datetime import datetime, timezone
from typing import Any

from config import Config

log = logging.getLogger(__name__)

Song = dict[str, Any]
# A user-created collection of songs -- distinct from the `Playlist` type
# used elsewhere in this codebase for read-only external YouTube Music
# search results (see ytmusic_service.normalise_playlist). This one is
# owned and mutable; that one never is.
UserPlaylist = dict[str, Any]


class InMemoryStore:
    """Zero-dependency fallback. Data is lost on restart."""

    kind = "memory"

    def __init__(self) -> None:
        self._liked: dict[str, Song] = {}
        self._history: list[Song] = []
        self._playlists: dict[str, UserPlaylist] = {}
        self._lock = threading.Lock()

    def list_liked_songs(self) -> list[Song]:
        with self._lock:
            return list(self._liked.values())

    def is_liked(self, video_id: str) -> bool:
        with self._lock:
            return video_id in self._liked

    def add_liked_song(self, song: Song) -> None:
        with self._lock:
            self._liked[song["videoId"]] = song

    def remove_liked_song(self, video_id: str) -> None:
        with self._lock:
            self._liked.pop(video_id, None)

    def replace_liked_songs(self, songs: list[Song]) -> None:
        with self._lock:
            self._liked = {s["videoId"]: s for s in songs if s.get("videoId")}

    def record_play(self, song: Song) -> None:
        with self._lock:
            self._history.append(song)
            del self._history[:-500]

    def list_play_history(self, limit: int = 50) -> list[Song]:
        with self._lock:
            return list(reversed(self._history[-limit:]))

    def ping(self) -> bool:
        return True

    # -- user-created playlists ------------------------------------------

    def list_playlists(self) -> list[UserPlaylist]:
        with self._lock:
            return sorted(self._playlists.values(), key=lambda p: p["createdAt"], reverse=True)

    def get_playlist(self, playlist_id: str) -> UserPlaylist | None:
        with self._lock:
            return self._playlists.get(playlist_id)

    def create_playlist(self, name: str) -> UserPlaylist:
        now = datetime.now(timezone.utc)
        playlist: UserPlaylist = {
            "id": uuid.uuid4().hex,
            "name": name,
            "createdAt": now,
            "updatedAt": now,
            "songs": [],
        }
        with self._lock:
            self._playlists[playlist["id"]] = playlist
        return playlist

    def rename_playlist(self, playlist_id: str, name: str) -> UserPlaylist | None:
        with self._lock:
            playlist = self._playlists.get(playlist_id)
            if playlist is None:
                return None
            playlist["name"] = name
            playlist["updatedAt"] = datetime.now(timezone.utc)
            return playlist

    def delete_playlist(self, playlist_id: str) -> None:
        with self._lock:
            self._playlists.pop(playlist_id, None)

    def add_song_to_playlist(self, playlist_id: str, song: Song) -> UserPlaylist | None:
        with self._lock:
            playlist = self._playlists.get(playlist_id)
            if playlist is None:
                return None
            if not any(s["videoId"] == song["videoId"] for s in playlist["songs"]):
                playlist["songs"].append({**song, "addedAt": datetime.now(timezone.utc)})
                playlist["updatedAt"] = datetime.now(timezone.utc)
            return playlist

    def remove_song_from_playlist(self, playlist_id: str, video_id: str) -> UserPlaylist | None:
        with self._lock:
            playlist = self._playlists.get(playlist_id)
            if playlist is None:
                return None
            playlist["songs"] = [s for s in playlist["songs"] if s["videoId"] != video_id]
            playlist["updatedAt"] = datetime.now(timezone.utc)
            return playlist


class MongoStore:
    """MongoDB-backed store. Works with a local mongod or MongoDB Atlas."""

    kind = "mongodb"

    def __init__(self, uri: str, db_name: str) -> None:
        from pymongo import ASCENDING, MongoClient

        self._client = MongoClient(uri, serverSelectionTimeoutMS=5000, tz_aware=True)
        db = self._client[db_name]
        self._liked = db.liked_songs
        self._history = db.play_history
        self._playlists = db.user_playlists
        # videoId is the natural key; a unique index makes likes idempotent.
        self._liked.create_index([("videoId", ASCENDING)], unique=True)
        self._history.create_index([("playedAt", ASCENDING)])
        self._playlists.create_index([("id", ASCENDING)], unique=True)

    def list_liked_songs(self) -> list[Song]:
        return list(self._liked.find({}, {"_id": 0}).sort("likedAt", -1))

    def is_liked(self, video_id: str) -> bool:
        return self._liked.count_documents({"videoId": video_id}, limit=1) > 0

    def add_liked_song(self, song: Song) -> None:
        payload = {**song, "likedAt": datetime.now(timezone.utc)}
        self._liked.update_one(
            {"videoId": song["videoId"]}, {"$set": payload}, upsert=True
        )

    def remove_liked_song(self, video_id: str) -> None:
        self._liked.delete_one({"videoId": video_id})

    def replace_liked_songs(self, songs: list[Song]) -> None:
        self._liked.delete_many({})
        rows = [
            {**s, "likedAt": datetime.now(timezone.utc)}
            for s in songs
            if s.get("videoId")
        ]
        if rows:
            self._liked.insert_many(rows)

    def record_play(self, song: Song) -> None:
        self._history.insert_one({**song, "playedAt": datetime.now(timezone.utc)})

    def list_play_history(self, limit: int = 50) -> list[Song]:
        cursor = self._history.find({}, {"_id": 0}).sort("playedAt", -1).limit(limit)
        return list(cursor)

    def ping(self) -> bool:
        try:
            self._client.admin.command("ping")
            return True
        except Exception:
            return False

    # -- user-created playlists ------------------------------------------

    def list_playlists(self) -> list[UserPlaylist]:
        return list(self._playlists.find({}, {"_id": 0}).sort("createdAt", -1))

    def get_playlist(self, playlist_id: str) -> UserPlaylist | None:
        return self._playlists.find_one({"id": playlist_id}, {"_id": 0})

    def create_playlist(self, name: str) -> UserPlaylist:
        now = datetime.now(timezone.utc)
        playlist: UserPlaylist = {
            "id": uuid.uuid4().hex,
            "name": name,
            "createdAt": now,
            "updatedAt": now,
            "songs": [],
        }
        self._playlists.insert_one(dict(playlist))
        return playlist

    def rename_playlist(self, playlist_id: str, name: str) -> UserPlaylist | None:
        self._playlists.update_one(
            {"id": playlist_id},
            {"$set": {"name": name, "updatedAt": datetime.now(timezone.utc)}},
        )
        return self.get_playlist(playlist_id)

    def delete_playlist(self, playlist_id: str) -> None:
        self._playlists.delete_one({"id": playlist_id})

    def add_song_to_playlist(self, playlist_id: str, song: Song) -> UserPlaylist | None:
        song_entry = {**song, "addedAt": datetime.now(timezone.utc)}
        # The "songs.videoId": {"$ne": ...} filter is what makes this
        # idempotent -- a matching update no-ops (matchedCount 0 further
        # down doesn't matter, we just re-read either way) instead of
        # needing a read-then-write to check membership first.
        self._playlists.update_one(
            {"id": playlist_id, "songs.videoId": {"$ne": song["videoId"]}},
            {"$push": {"songs": song_entry}, "$set": {"updatedAt": datetime.now(timezone.utc)}},
        )
        return self.get_playlist(playlist_id)

    def remove_song_from_playlist(self, playlist_id: str, video_id: str) -> UserPlaylist | None:
        self._playlists.update_one(
            {"id": playlist_id},
            {
                "$pull": {"songs": {"videoId": video_id}},
                "$set": {"updatedAt": datetime.now(timezone.utc)},
            },
        )
        return self.get_playlist(playlist_id)


def create_store() -> InMemoryStore | MongoStore:
    if not Config.MONGODB_URI:
        log.warning("MONGODB_URI not set -- using in-memory store (data is not saved).")
        return InMemoryStore()
    try:
        store = MongoStore(Config.MONGODB_URI, Config.MONGODB_DB)
        store.ping()
        log.info("Connected to MongoDB database %r", Config.MONGODB_DB)
        return store
    except Exception as exc:
        log.error("MongoDB unavailable (%s) -- falling back to in-memory store.", exc)
        return InMemoryStore()
