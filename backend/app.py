"""TuneUp API -- JSON only.

The original app.py rendered Jinja templates and mixed data access, HTML
rendering and audio scraping into five routes. This version does one job:
serve JSON to the React client.

Route map (old -> new):
    GET  /                  ->  GET    /api/home
    GET  /search?search=    ->  GET    /api/search?q=
    POST /playSong          ->  GET    /api/songs/<videoId>
                                GET    /api/queue/random?count=
    GET  /music             ->  GET    /api/liked-songs
    POST /music             ->  PUT    /api/liked-songs        (bulk sync)
    POST /likeSong          ->  POST   /api/liked-songs        (like)
                                DELETE /api/liked-songs/<id>   (unlike)

The old ``POST /likeSong`` used one endpoint to mean both "like" and "unlike",
deciding which via an ``isLiked`` flag sent by the client. That made the client
the source of truth for its own toggle state, and a stale flag would silently
invert the action. Like and unlike are now separate, idempotent verbs.
"""
from __future__ import annotations

import logging
import time
import uuid

from flask import Flask, g, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from config import Config
from db import create_store
from ytmusic_service import YTMusicService, last_cache_hit

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)-8s %(name)s: %(message)s"
)
log = logging.getLogger("tuneup")

app = Flask(__name__)
app.config.from_object(Config)
app.secret_key = Config.SECRET_KEY

CORS(
    app,
    origins=Config.CORS_ORIGINS,
    supports_credentials=True,
    expose_headers=["X-Request-Id", "X-Response-Time-Ms", "X-Cache"],
)

store = create_store()
ytmusic = YTMusicService()


# --------------------------------------------------------------------------
# Request tracing -- read by the frontend's dev drawer (see frontend/src/dev).
# Plain diagnostics, never anything secret: a per-request id, timing, and
# whether a cacheable route was served from the TTL cache or fetched fresh.
# --------------------------------------------------------------------------

@app.before_request
def _start_request_trace():
    g.request_id = uuid.uuid4().hex[:12]
    g.start_time = time.monotonic()
    last_cache_hit.set(None)


@app.after_request
def _finish_request_trace(response):
    response.headers["X-Request-Id"] = g.get("request_id", "")
    start_time = g.get("start_time")
    if start_time is not None:
        response.headers["X-Response-Time-Ms"] = str(round((time.monotonic() - start_time) * 1000, 1))
    hit = last_cache_hit.get()
    if hit is not None:
        response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return response


# --------------------------------------------------------------------------
# Error handling -- always JSON, never an HTML error page
# --------------------------------------------------------------------------

@app.errorhandler(HTTPException)
def handle_http_error(exc: HTTPException):
    return jsonify({"error": exc.name, "detail": exc.description}), exc.code


@app.errorhandler(Exception)
def handle_unexpected_error(exc: Exception):
    log.exception("Unhandled error")
    return jsonify({"error": "Internal Server Error", "detail": str(exc)}), 500


# --------------------------------------------------------------------------
# Meta
# --------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "store": store.kind,
            "storeReachable": store.ping(),
            "ytmusic": ytmusic.health(),
        }
    )


# --------------------------------------------------------------------------
# Browse
# --------------------------------------------------------------------------

@app.get("/api/home")
def home():
    """Quick picks, new releases, recommended videos, genres and moods."""
    return jsonify(ytmusic.get_home())


@app.get("/api/search")
def search():
    query = (request.args.get("q") or "").strip()
    if not query:
        return jsonify({"error": "Bad Request", "detail": "Query parameter 'q' is required."}), 400

    try:
        limit = min(max(int(request.args.get("limit", 30)), 1), 50)
    except ValueError:
        limit = 30

    return jsonify(ytmusic.search(query, limit))


@app.get("/api/songs/<video_id>")
def song(video_id: str):
    result = ytmusic.get_song(video_id)
    if result is None:
        return jsonify({"error": "Not Found", "detail": f"No song for videoId {video_id!r}."}), 404
    return jsonify(result)


@app.get("/api/songs/<video_id>/lyrics")
def lyrics(video_id: str):
    return jsonify(ytmusic.get_lyrics(video_id))


@app.get("/api/queue/random")
def random_queue():
    """A batch of tracks to auto-populate the play queue."""
    try:
        count = int(request.args.get("count", 10))
    except ValueError:
        count = 10
    return jsonify({"songs": ytmusic.get_random_songs(count)})


# --------------------------------------------------------------------------
# Liked songs
# --------------------------------------------------------------------------

def _clean_song_payload(data: dict) -> dict | None:
    video_id = (data.get("videoId") or "").strip()
    if not video_id:
        return None
    return {
        "videoId": video_id,
        "title": (data.get("title") or "Unknown title").strip(),
        "artist": (data.get("artist") or "Unknown artist").strip(),
        "thumbnail": data.get("thumbnail"),
    }


@app.get("/api/liked-songs")
def list_liked_songs():
    return jsonify({"songs": store.list_liked_songs()})


@app.post("/api/liked-songs")
def like_song():
    payload = _clean_song_payload(request.get_json(silent=True) or {})
    if payload is None:
        return jsonify({"error": "Bad Request", "detail": "'videoId' is required."}), 400

    store.add_liked_song(payload)
    return jsonify({"liked": True, "song": payload, "songs": store.list_liked_songs()}), 201


@app.delete("/api/liked-songs/<video_id>")
def unlike_song(video_id: str):
    store.remove_liked_song(video_id)
    return jsonify({"liked": False, "videoId": video_id, "songs": store.list_liked_songs()})


@app.put("/api/liked-songs")
def sync_liked_songs():
    """Bulk replace -- used once to migrate a browser's localStorage cache."""
    body = request.get_json(silent=True) or {}
    incoming = body.get("songs")
    if not isinstance(incoming, list):
        return jsonify({"error": "Bad Request", "detail": "'songs' must be a list."}), 400

    cleaned = [s for s in (_clean_song_payload(item) for item in incoming if isinstance(item, dict)) if s]
    store.replace_liked_songs(cleaned)
    return jsonify({"songs": store.list_liked_songs()})


# --------------------------------------------------------------------------
# Play history
# --------------------------------------------------------------------------

@app.post("/api/history")
def record_play():
    payload = _clean_song_payload(request.get_json(silent=True) or {})
    if payload is None:
        return jsonify({"error": "Bad Request", "detail": "'videoId' is required."}), 400
    store.record_play(payload)
    return "", 204


@app.get("/api/history")
def play_history():
    try:
        limit = min(max(int(request.args.get("limit", 50)), 1), 200)
    except ValueError:
        limit = 50
    return jsonify({"songs": store.list_play_history(limit)})


if __name__ == "__main__":
    log.info("TuneUp API on http://127.0.0.1:%s (store=%s)", Config.PORT, store.kind)
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
