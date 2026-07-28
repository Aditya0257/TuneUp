"""YouTube Music data access, normalised and cached.

Two things changed versus the original app.py:

1. No audio extraction. The old ``/playSong`` route used youtube_dl + pytube to
   scrape a raw audio stream URL. Both libraries are unmaintained, YouTube
   blocks datacenter IPs, and it breaches YouTube's terms. Playback now happens
   client-side through the official YouTube IFrame Player API, so the backend
   only ever needs to hand over a ``videoId`` plus metadata.

2. Every response is normalised to one flat ``Song`` shape. The old templates
   indexed into raw ytmusicapi dicts (``song['thumbnails'][-1]['url']``), which
   broke whenever the upstream shape drifted. That mapping now lives here, in
   one place, behind ``.get()`` guards.
"""
from __future__ import annotations

import contextvars
import json
import logging
import random
import threading
import time
from typing import Any, Callable

from ytmusicapi import YTMusic

from config import Config

log = logging.getLogger(__name__)

Json = dict[str, Any]

# Set by TTLCache.get_or_set for the duration of the current request, so
# app.py can report a hit/miss without threading it through every service
# method signature (which would ripple into the 24 existing tests).
last_cache_hit: contextvars.ContextVar[bool | None] = contextvars.ContextVar(
    "last_cache_hit", default=None
)

# Carried over verbatim from the original app.py.
SEARCH_QUERIES = [
    "Top English Songs",
    "Classic English Songs",
    "Indie English Songs",
    "English Rock Songs",
    "English Hip-Hop Songs",
    "English Pop Songs",
    "English Country Songs",
    "English R&B Songs",
    "English Electronic Songs",
    "English Acoustic Songs",
]

GENRES = ["Pop", "Rock", "Orchestral", "Hip Hop", "Electronic", "Classical", "Jazz"]
MOODS = ["Happy", "Sad", "Energetic", "Romantic", "Motivated", "Classic Country", "Chill"]


class TTLCache:
    """Small thread-safe TTL cache. Avoids a Redis dependency for this scale."""

    def __init__(self) -> None:
        self._data: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get_or_set(self, key: str, ttl: int, producer: Callable[[], Any]) -> Any:
        now = time.monotonic()
        with self._lock:
            hit = self._data.get(key)
            if hit and hit[0] > now:
                last_cache_hit.set(True)
                return hit[1]
        # Produce outside the lock: these calls take seconds.
        value = producer()
        with self._lock:
            self._data[key] = (now + ttl, value)
        last_cache_hit.set(False)
        return value

    def clear(self) -> None:
        with self._lock:
            self._data.clear()


# --------------------------------------------------------------------------
# Normalisers
# --------------------------------------------------------------------------

def _largest_thumbnail(item: Json) -> str | None:
    thumbs = item.get("thumbnails") or []
    if not thumbs:
        thumbs = ((item.get("thumbnail") or {}).get("thumbnails")) or []
    if not thumbs:
        return None
    # ytmusicapi returns these smallest-first.
    return thumbs[-1].get("url")


def _artist_name(item: Json) -> str:
    artists = item.get("artists") or []
    names = [a.get("name") for a in artists if isinstance(a, dict) and a.get("name")]
    if names:
        return ", ".join(names[:2])
    for key in ("author", "artist", "description", "subtitle"):
        value = item.get(key)
        if isinstance(value, str) and value:
            return value
    return "Unknown artist"


def normalise_song(item: Json) -> Json | None:
    video_id = item.get("videoId")
    title = item.get("title")
    if not video_id or not title:
        return None
    return {
        "videoId": video_id,
        "title": title,
        "artist": _artist_name(item),
        "thumbnail": _largest_thumbnail(item),
        "album": (item.get("album") or {}).get("name") if isinstance(item.get("album"), dict) else item.get("album"),
        "duration": item.get("duration"),
        "durationSeconds": item.get("duration_seconds"),
    }


def normalise_album(item: Json) -> Json | None:
    title = item.get("title")
    if not title:
        return None
    return {
        "browseId": item.get("browseId"),
        "playlistId": item.get("playlistId"),
        "title": title,
        "artist": _artist_name(item),
        "year": item.get("year"),
        "thumbnail": _largest_thumbnail(item),
    }


def normalise_artist(item: Json) -> Json | None:
    # Artist search hits use "artist" rather than "title".
    name = item.get("artist") or item.get("title")
    if not name:
        return None
    return {
        "browseId": item.get("browseId"),
        "name": name,
        "subscribers": item.get("subscribers"),
        "thumbnail": _largest_thumbnail(item),
    }


def normalise_playlist(item: Json) -> Json | None:
    title = item.get("title")
    if not title:
        return None
    # Community-playlist search results don't carry a "playlistId" field at
    # all -- only "browseId", prefixed "VL" (e.g. "VLPLxxxx"). Using that
    # prefixed value straight in a music.youtube.com/playlist?list= URL
    # isn't a playlist id YouTube recognises, so the link silently landed
    # on the site's home page instead of the actual playlist. Stripping the
    # "VL" prefix recovers the real playlist id ("PLxxxx").
    browse_id = item.get("browseId")
    playlist_id = item.get("playlistId") or (
        browse_id[2:] if browse_id and browse_id.startswith("VL") else browse_id
    )
    return {
        "browseId": browse_id,
        "playlistId": playlist_id,
        "title": title,
        "author": _artist_name(item),
        "itemCount": item.get("itemCount"),
        "thumbnail": _largest_thumbnail(item),
    }


def _dedupe(rows: list[Json], key: str) -> list[Json]:
    seen: set[str] = set()
    out: list[Json] = []
    for row in rows:
        value = row.get(key)
        if not value or value in seen:
            continue
        seen.add(value)
        out.append(row)
    return out


# --------------------------------------------------------------------------
# Service
# --------------------------------------------------------------------------

class YTMusicService:
    def __init__(self) -> None:
        self._cache = TTLCache()
        self._pool_lock = threading.Lock()
        self._random_pool: list[Json] = []
        self.authenticated = False
        self._client = self._build_client()

    def _build_client(self) -> YTMusic:
        """Authenticated if credentials were supplied, anonymous otherwise.

        Anonymous is the recommended production setup: the auth file holds a
        live Google session cookie, and it buys us nothing except the
        personalised home feed (which we can approximate).
        """
        location = Config.YTMUSIC_LOCATION
        if Config.YTMUSIC_HEADERS_JSON:
            try:
                client = YTMusic(json.loads(Config.YTMUSIC_HEADERS_JSON), location=location)
                self.authenticated = True
                log.info("YTMusic client authenticated from YTMUSIC_HEADERS_JSON.")
                return client
            except Exception as exc:
                log.error("YTMUSIC_HEADERS_JSON rejected (%s) -- continuing anonymously.", exc)
        elif Config.YTMUSIC_AUTH_FILE:
            try:
                client = YTMusic(Config.YTMUSIC_AUTH_FILE, location=location)
                self.authenticated = True
                log.info("YTMusic client authenticated from %s.", Config.YTMUSIC_AUTH_FILE)
                return client
            except Exception as exc:
                log.error("Auth file unusable (%s) -- continuing anonymously.", exc)

        log.info("YTMusic client running anonymously.")
        return YTMusic(location=location)

    # -- home ------------------------------------------------------------
    def get_home(self) -> Json:
        return self._cache.get_or_set("home", Config.HOME_CACHE_TTL, self._fetch_home)

    def _fetch_home(self) -> Json:
        payload = {
            "quickPicks": [],
            "newReleases": [],
            "recommendedMusic": [],
            "genres": GENRES,
            "moods": MOODS,
            "source": "search",
        }

        if self.authenticated:
            try:
                payload.update(self._home_from_api())
                payload["source"] = "get_home"
                return payload
            except Exception as exc:
                log.warning("get_home() failed (%s) -- falling back to search.", exc)

        payload.update(self._home_from_search())
        return payload

    def _home_from_api(self) -> Json:
        """The original logic: pull the real personalised YouTube Music home."""
        sections = self._client.get_home(10)
        quick_picks: list[Json] = []
        new_releases: list[Json] = []
        recommended: list[Json] = []

        for section in sections:
            title = section.get("title") or ""
            contents = section.get("contents") or []
            if title == "Quick picks" or title.startswith("Welcome"):
                quick_picks = [
                    s for s in (normalise_song(c) for c in contents)
                    if s and len(s["title"]) <= Config.MAX_TITLE_LENGTH
                ]
            elif title == "New releases":
                new_releases = [a for a in (normalise_album(c) for c in contents) if a]
            elif title == "Recommended music videos":
                recommended = [s for s in (normalise_song(c) for c in contents) if s]

        return {
            "quickPicks": _dedupe(quick_picks, "videoId"),
            "newReleases": new_releases,
            "recommendedMusic": _dedupe(recommended, "videoId"),
        }

    def _home_from_search(self) -> Json:
        """Anonymous stand-in for the personalised feed.

        Blends a few of the original seed queries so the home page still looks
        populated without needing anyone's Google cookie.
        """
        queries = random.sample(SEARCH_QUERIES, 3)
        songs: list[Json] = []
        for query in queries:
            for item in self._raw_search(query, "songs", 20):
                song = normalise_song(item)
                if song and len(song["title"]) <= Config.MAX_TITLE_LENGTH:
                    songs.append(song)

        albums: list[Json] = []
        for item in self._raw_search("new album releases", "albums", 12):
            album = normalise_album(item)
            if album:
                albums.append(album)

        songs = _dedupe(songs, "videoId")
        random.shuffle(songs)

        return {
            "quickPicks": songs[:12],
            "newReleases": albums[:8],
            "recommendedMusic": songs[12:18],
        }

    # -- search ----------------------------------------------------------
    def search(self, query: str, limit: int = 30) -> Json:
        key = f"search:{query.lower()}:{limit}"
        return self._cache.get_or_set(
            key, Config.SEARCH_CACHE_TTL, lambda: self._fetch_search(query, limit)
        )

    def _fetch_search(self, query: str, limit: int) -> Json:
        """Four filtered calls instead of one unfiltered call.

        The original ran a single ``search(limit=100)`` and bucketed results by
        ``element['category']``, which meant an unlucky query could return zero
        albums or zero artists. Filtered calls guarantee each column fills.
        """
        return {
            "query": query,
            "songs": [
                s for s in (normalise_song(i) for i in self._raw_search(query, "songs", limit)) if s
            ],
            "albums": [
                a for a in (normalise_album(i) for i in self._raw_search(query, "albums", 20)) if a
            ],
            "artists": [
                a for a in (normalise_artist(i) for i in self._raw_search(query, "artists", 20)) if a
            ],
            "playlists": [
                p for p in (normalise_playlist(i) for i in self._raw_search(query, "community_playlists", 20)) if p
            ],
        }

    def _raw_search(self, query: str, filter_: str | None, limit: int) -> list[Json]:
        try:
            return self._client.search(query, filter=filter_, limit=limit) or []
        except Exception as exc:
            log.warning("search(%r, filter=%r) failed: %s", query, filter_, exc)
            return []

    # -- single song -----------------------------------------------------
    def get_song(self, video_id: str) -> Json | None:
        return self._cache.get_or_set(
            f"song:{video_id}", Config.SONG_CACHE_TTL, lambda: self._fetch_song(video_id)
        )

    def _fetch_song(self, video_id: str) -> Json | None:
        try:
            detail = self._client.get_song(videoId=video_id) or {}
        except Exception as exc:
            log.warning("get_song(%r) failed: %s", video_id, exc)
            return None

        details = detail.get("videoDetails") or {}
        if not details.get("videoId"):
            return None

        seconds = details.get("lengthSeconds")
        try:
            seconds = int(seconds) if seconds is not None else None
        except (TypeError, ValueError):
            seconds = None

        return {
            "videoId": details["videoId"],
            "title": details.get("title") or "Unknown title",
            "artist": details.get("author") or "Unknown artist",
            "thumbnail": _largest_thumbnail(details),
            "durationSeconds": seconds,
            # Deliberately absent: a stream URL. Playback is client-side.
        }

    # -- lyrics ------------------------------------------------------------
    def get_lyrics(self, video_id: str) -> Json:
        """The queue/player panel's .lyrics_column was an empty placeholder
        (background-color: lightgreen, never built out) in the original.
        Not every track has lyrics on YouTube Music -- absence is a normal
        200, not an error.
        """
        return self._cache.get_or_set(
            f"lyrics:{video_id}", Config.SONG_CACHE_TTL, lambda: self._fetch_lyrics(video_id)
        )

    def _fetch_lyrics(self, video_id: str) -> Json:
        try:
            watch = self._client.get_watch_playlist(videoId=video_id, limit=1) or {}
        except Exception as exc:
            log.warning("get_watch_playlist(%r) failed: %s", video_id, exc)
            return {"available": False, "lyrics": None, "source": None}

        browse_id = watch.get("lyrics")
        if not browse_id:
            return {"available": False, "lyrics": None, "source": None}

        try:
            result = self._client.get_lyrics(browse_id) or {}
        except Exception as exc:
            log.warning("get_lyrics(%r) failed: %s", browse_id, exc)
            return {"available": False, "lyrics": None, "source": None}

        lyrics = result.get("lyrics")
        if not lyrics:
            return {"available": False, "lyrics": None, "source": None}

        return {"available": True, "lyrics": lyrics, "source": result.get("source")}

    # -- random queue ----------------------------------------------------
    def get_random_songs(self, count: int = 10) -> list[Json]:
        """Replaces the old fetch_1000_video_ids + per-song scrape loop.

        The original made one HTTP request *per song* to resolve a stream URL,
        which is why the frontend needed a Web Worker. One search call now
        returns a whole batch of playable metadata.
        """
        count = max(1, min(count, 30))
        with self._pool_lock:
            if len(self._random_pool) < count:
                self._refill_pool()
            taken = self._random_pool[:count]
            del self._random_pool[:count]
        return taken

    def _refill_pool(self) -> None:
        """Caller must hold ``_pool_lock``."""
        collected: list[Json] = list(self._random_pool)
        for query in random.sample(SEARCH_QUERIES, 3):
            for item in self._raw_search(query, "songs", 40):
                song = normalise_song(item)
                if song:
                    collected.append(song)
        collected = _dedupe(collected, "videoId")
        random.shuffle(collected)
        self._random_pool = collected
        log.info("Random song pool refilled: %d tracks.", len(collected))

    # -- diagnostics -----------------------------------------------------
    def health(self) -> Json:
        ok = bool(self._raw_search("test", "songs", 1))
        return {"reachable": ok, "authenticated": self.authenticated}
