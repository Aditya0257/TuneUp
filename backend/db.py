"""Persistence layer for liked songs and play history.

Backed by MongoDB when MONGODB_URI is set, otherwise by an in-process dict so
the app boots with no database installed. Both backends expose the same
interface, so nothing upstream needs to care which one is live.
"""
from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone
from typing import Any

from config import Config

log = logging.getLogger(__name__)

Song = dict[str, Any]


class InMemoryStore:
    """Zero-dependency fallback. Data is lost on restart."""

    kind = "memory"

    def __init__(self) -> None:
        self._liked: dict[str, Song] = {}
        self._history: list[Song] = []
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


class MongoStore:
    """MongoDB-backed store. Works with a local mongod or MongoDB Atlas."""

    kind = "mongodb"

    def __init__(self, uri: str, db_name: str) -> None:
        from pymongo import ASCENDING, MongoClient

        self._client = MongoClient(uri, serverSelectionTimeoutMS=5000, tz_aware=True)
        db = self._client[db_name]
        self._liked = db.liked_songs
        self._history = db.play_history
        # videoId is the natural key; a unique index makes likes idempotent.
        self._liked.create_index([("videoId", ASCENDING)], unique=True)
        self._history.create_index([("playedAt", ASCENDING)])

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
