"""End-to-end tests with a faked YouTube Music client.

Run with:  python -m unittest discover -s tests -v

These use realistic ytmusicapi response shapes as fixtures, which is the part
worth testing: the original code indexed into those dicts directly from Jinja
templates (`song['thumbnails'][song['thumbnails']|length-1]['url']`), so any
upstream shape change produced a 500 with no clue where. The normalisers are now
the single place that mapping happens, and these lock the behaviour in.

No network access required.
"""
from __future__ import annotations

import unittest
from unittest.mock import patch

# --- Fixtures: real ytmusicapi response shapes -----------------------------

THUMBS = [
    {"url": "https://lh3.googleusercontent.com/x=w60-h60", "width": 60, "height": 60},
    {"url": "https://lh3.googleusercontent.com/x=w544-h544", "width": 544, "height": 544},
]

SONG_RESULT = {
    "category": "Songs",
    "resultType": "song",
    "title": "Get Lucky",
    "videoId": "5NV6Rdv1a3I",
    "artists": [
        {"name": "Daft Punk", "id": "UC_kRDKYrUlrbtrSiyu5Tflg"},
        {"name": "Pharrell Williams", "id": "UCLQaHbC6aZzs6NLLdyfr6nA"},
    ],
    "album": {"name": "Random Access Memories", "id": "MPREb_abc"},
    "duration": "6:09",
    "duration_seconds": 369,
    "thumbnails": THUMBS,
    "isExplicit": False,
}

ALBUM_RESULT = {
    "category": "Albums",
    "resultType": "album",
    "browseId": "MPREb_abc",
    "playlistId": "OLAK5uy_abc",
    "title": "Random Access Memories",
    "type": "Album",
    "artists": [{"name": "Daft Punk", "id": "UC_kRD"}],
    "year": "2013",
    "thumbnails": THUMBS,
}

ARTIST_RESULT = {
    "category": "Artists",
    "resultType": "artist",
    "browseId": "UC_kRDKYrUlrbtrSiyu5Tflg",
    # Note: artist hits use "artist", not "title" -- the original search.html
    # relied on this and it is easy to get wrong.
    "artist": "Daft Punk",
    "subscribers": "5.2M",
    "thumbnails": THUMBS,
}

PLAYLIST_RESULT = {
    "category": "Community playlists",
    "resultType": "playlist",
    "title": "Daft Punk Essentials",
    "playlistId": "PLabc",
    "browseId": "VLPLabc",
    "author": "Music Fan",
    "itemCount": "50",
    "thumbnails": THUMBS,
}

GET_SONG_RESPONSE = {
    "videoDetails": {
        "videoId": "5NV6Rdv1a3I",
        "title": "Get Lucky",
        "lengthSeconds": "369",
        "author": "Daft Punk",
        "thumbnail": {
            "thumbnails": [
                {"url": "https://i.ytimg.com/vi/x/default.jpg", "width": 120},
                {"url": "https://i.ytimg.com/vi/x/maxres.jpg", "width": 1920},
            ]
        },
    }
}

HOME_RESPONSE = [
    {"title": "Quick picks", "contents": [SONG_RESULT]},
    {"title": "New releases", "contents": [ALBUM_RESULT]},
    {"title": "Recommended music videos", "contents": [SONG_RESULT]},
]


class FakeYTMusic:
    """Stands in for ytmusicapi.YTMusic. Records calls for assertions."""

    def __init__(self, *args, **kwargs):
        self.calls: list[tuple[str, str | None]] = []

    def search(self, query, filter=None, limit=20):  # noqa: A002 - mirrors upstream
        self.calls.append((query, filter))
        return {
            "songs": [SONG_RESULT],
            "albums": [ALBUM_RESULT],
            "artists": [ARTIST_RESULT],
            "community_playlists": [PLAYLIST_RESULT],
        }.get(filter, [SONG_RESULT])

    def get_song(self, videoId):  # noqa: N803 - mirrors upstream
        return GET_SONG_RESPONSE if videoId == "5NV6Rdv1a3I" else {}

    def get_home(self, limit=10):
        return HOME_RESPONSE


def build_service():
    from ytmusic_service import YTMusicService

    with patch("ytmusic_service.YTMusic", FakeYTMusic):
        return YTMusicService()


class NormaliserTests(unittest.TestCase):
    def test_song_takes_largest_thumbnail_and_joins_artists(self):
        from ytmusic_service import normalise_song

        song = normalise_song(SONG_RESULT)
        assert song is not None
        self.assertEqual(song["videoId"], "5NV6Rdv1a3I")
        self.assertEqual(song["title"], "Get Lucky")
        # ytmusicapi returns thumbnails smallest-first.
        self.assertEqual(song["thumbnail"], THUMBS[-1]["url"])
        self.assertEqual(song["artist"], "Daft Punk, Pharrell Williams")
        self.assertEqual(song["album"], "Random Access Memories")

    def test_song_without_video_id_is_dropped(self):
        from ytmusic_service import normalise_song

        # Real search results include rows with no videoId (podcasts, headers).
        # The original template would render a broken, unplayable row.
        self.assertIsNone(normalise_song({"title": "No id here"}))
        self.assertIsNone(normalise_song({"videoId": "x"}))  # no title

    def test_artist_uses_artist_key_not_title(self):
        from ytmusic_service import normalise_artist

        artist = normalise_artist(ARTIST_RESULT)
        assert artist is not None
        self.assertEqual(artist["name"], "Daft Punk")
        self.assertEqual(artist["subscribers"], "5.2M")

    def test_missing_thumbnails_yield_none_not_an_exception(self):
        from ytmusic_service import normalise_song

        song = normalise_song({"videoId": "a", "title": "b"})
        assert song is not None
        self.assertIsNone(song["thumbnail"])
        self.assertEqual(song["artist"], "Unknown artist")

    def test_get_song_reads_nested_thumbnail_shape(self):
        service = build_service()
        song = service.get_song("5NV6Rdv1a3I")
        assert song is not None
        self.assertEqual(song["durationSeconds"], 369)
        self.assertEqual(song["thumbnail"], "https://i.ytimg.com/vi/x/maxres.jpg")
        # Critically: no stream URL is ever produced.
        self.assertNotIn("url", song)

    def test_unknown_song_returns_none(self):
        service = build_service()
        self.assertIsNone(service.get_song("does-not-exist"))


class SearchTests(unittest.TestCase):
    def test_search_fills_every_column(self):
        service = build_service()
        results = service.search("daft punk")

        self.assertEqual(len(results["songs"]), 1)
        self.assertEqual(len(results["albums"]), 1)
        self.assertEqual(len(results["artists"]), 1)
        self.assertEqual(len(results["playlists"]), 1)

    def test_search_uses_filtered_calls(self):
        """The original ran one unfiltered search and bucketed by 'category',
        so an unlucky query returned empty artist/album columns."""
        service = build_service()
        service.search("daft punk")
        filters = {call[1] for call in service._client.calls}
        self.assertEqual(
            filters, {"songs", "albums", "artists", "community_playlists"}
        )

    def test_results_are_cached(self):
        service = build_service()
        service.search("daft punk")
        first = len(service._client.calls)
        service.search("daft punk")
        self.assertEqual(len(service._client.calls), first, "second call should hit cache")


class HomeTests(unittest.TestCase):
    def test_authenticated_home_uses_get_home_shelves(self):
        from ytmusic_service import YTMusicService

        with patch("ytmusic_service.YTMusic", FakeYTMusic):
            service = YTMusicService()
        service.authenticated = True

        home = service.get_home()
        self.assertEqual(home["source"], "get_home")
        self.assertEqual(home["quickPicks"][0]["title"], "Get Lucky")
        self.assertEqual(home["newReleases"][0]["title"], "Random Access Memories")
        self.assertEqual(len(home["genres"]), 7)
        self.assertEqual(len(home["moods"]), 7)

    def test_anonymous_home_falls_back_to_search(self):
        service = build_service()
        home = service.get_home()
        self.assertEqual(home["source"], "search")
        self.assertGreater(len(home["quickPicks"]), 0)
        self.assertEqual(len(home["genres"]), 7)

    def test_long_titles_are_filtered(self):
        """Carried over from the original `is_name_length_allowed` (max 40)."""
        from config import Config
        from ytmusic_service import YTMusicService

        long_song = {**SONG_RESULT, "title": "T" * (Config.MAX_TITLE_LENGTH + 5)}

        class LongTitleClient(FakeYTMusic):
            def get_home(self, limit=10):
                return [{"title": "Quick picks", "contents": [long_song, SONG_RESULT]}]

        with patch("ytmusic_service.YTMusic", LongTitleClient):
            service = YTMusicService()
        service.authenticated = True

        self.assertEqual(len(service.get_home()["quickPicks"]), 1)


class RandomQueueTests(unittest.TestCase):
    def test_returns_requested_count_without_duplicates(self):
        class ManySongsClient(FakeYTMusic):
            def search(self, query, filter=None, limit=20):
                self.calls.append((query, filter))
                return [
                    {**SONG_RESULT, "videoId": f"id{i}", "title": f"Song {i}"}
                    for i in range(40)
                ]

        with patch("ytmusic_service.YTMusic", ManySongsClient):
            from ytmusic_service import YTMusicService

            service = YTMusicService()

        songs = service.get_random_songs(10)
        self.assertEqual(len(songs), 10)
        self.assertEqual(len({s["videoId"] for s in songs}), 10)

        # A second batch must not repeat the first -- the pool is consumed.
        more = service.get_random_songs(10)
        self.assertFalse(
            {s["videoId"] for s in songs} & {s["videoId"] for s in more},
            "batches should not overlap",
        )

    def test_count_is_clamped(self):
        service = build_service()
        self.assertLessEqual(len(service.get_random_songs(9999)), 30)


class ApiRouteTests(unittest.TestCase):
    """HTTP-level checks against the in-memory store."""

    def setUp(self):
        import app as application
        from db import InMemoryStore

        application.store = InMemoryStore()
        application.ytmusic = build_service()
        self.client = application.app.test_client()

    def test_home_route(self):
        response = self.client.get("/api/home")
        self.assertEqual(response.status_code, 200)
        self.assertIn("quickPicks", response.get_json())

    def test_search_requires_query(self):
        self.assertEqual(self.client.get("/api/search").status_code, 400)
        self.assertEqual(self.client.get("/api/search?q=%20").status_code, 400)

    def test_search_returns_all_sections(self):
        body = self.client.get("/api/search?q=daft+punk").get_json()
        for key in ("songs", "albums", "artists", "playlists"):
            self.assertIn(key, body)

    def test_song_route_404s_cleanly(self):
        response = self.client.get("/api/songs/nope")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.content_type.split(";")[0], "application/json")

    def test_errors_are_json_not_html(self):
        """The original returned Flask's HTML error page, which broke the
        client's `response.json()` call and surfaced as a parse error."""
        response = self.client.get("/api/definitely-not-a-route")
        self.assertEqual(response.content_type.split(";")[0], "application/json")
        self.assertIn("error", response.get_json())

    def test_like_unlike_lifecycle(self):
        song = {
            "videoId": "abc123",
            "title": "Test",
            "artist": "Tester",
            "thumbnail": None,
        }

        created = self.client.post("/api/liked-songs", json=song)
        self.assertEqual(created.status_code, 201)
        self.assertEqual(len(created.get_json()["songs"]), 1)

        # Liking twice must not duplicate -- the old POST /likeSong toggled
        # based on a client-supplied flag and could double-insert.
        self.client.post("/api/liked-songs", json=song)
        self.assertEqual(len(self.client.get("/api/liked-songs").get_json()["songs"]), 1)

        removed = self.client.delete("/api/liked-songs/abc123")
        self.assertEqual(removed.status_code, 200)
        self.assertEqual(len(removed.get_json()["songs"]), 0)

        # Deleting something absent is still a success (idempotent).
        self.assertEqual(self.client.delete("/api/liked-songs/abc123").status_code, 200)

    def test_like_requires_video_id(self):
        self.assertEqual(self.client.post("/api/liked-songs", json={}).status_code, 400)
        self.assertEqual(
            self.client.post("/api/liked-songs", json={"title": "x"}).status_code, 400
        )

    def test_bulk_sync_replaces_and_validates(self):
        payload = {
            "songs": [
                {"videoId": "a", "title": "A", "artist": "X"},
                {"videoId": "b", "title": "B", "artist": "Y"},
                {"title": "no id -- must be dropped"},
            ]
        }
        body = self.client.put("/api/liked-songs", json=payload).get_json()
        self.assertEqual(len(body["songs"]), 2)

        bad = self.client.put("/api/liked-songs", json={"songs": "not a list"})
        self.assertEqual(bad.status_code, 400)

    def test_history_round_trip(self):
        song = {"videoId": "h1", "title": "Played", "artist": "Someone"}
        self.assertEqual(self.client.post("/api/history", json=song).status_code, 204)
        body = self.client.get("/api/history").get_json()
        self.assertEqual(body["songs"][0]["videoId"], "h1")

    def test_health_reports_backends(self):
        body = self.client.get("/api/health").get_json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["store"], "memory")
        self.assertIn("authenticated", body["ytmusic"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
