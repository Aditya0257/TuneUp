"""Environment-driven configuration.

Nothing here is hardcoded to a developer machine -- that was the main reason the
original app.py could only ever run on one laptop.
"""
import os

from dotenv import load_dotenv

load_dotenv()


def _csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


class Config:
    # --- Flask ---
    SECRET_KEY: str = os.environ.get("FLASK_SECRET_KEY", "dev-only-change-me")
    PORT: int = int(os.environ.get("PORT", 5000))
    DEBUG: bool = os.environ.get("FLASK_DEBUG", "0") == "1"

    # --- CORS ---
    # The frontend is now a separate origin, so it has to be allowlisted.
    CORS_ORIGINS: list[str] = _csv(
        os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    )

    # --- MongoDB ---
    # Optional. With no URI the app falls back to an in-memory store so a fresh
    # clone runs with zero infrastructure.
    MONGODB_URI: str | None = os.environ.get("MONGODB_URI") or None
    MONGODB_DB: str = os.environ.get("MONGODB_DB", "tuneup")

    # --- YouTube Music ---
    # Path to a ytmusicapi browser-auth file, OR the same JSON inline as an env
    # var (handy on hosts where you cannot upload files).
    #
    # Authentication is OPTIONAL and only unlocks the personalised home feed.
    # Search, song lookup and charts all work unauthenticated -- which is what
    # you want in production, because that file contains a live Google session
    # cookie for your personal account.
    YTMUSIC_AUTH_FILE: str | None = os.environ.get("YTMUSIC_AUTH_FILE") or None
    YTMUSIC_HEADERS_JSON: str | None = os.environ.get("YTMUSIC_HEADERS_JSON") or None
    YTMUSIC_LOCATION: str = os.environ.get("YTMUSIC_LOCATION", "US")

    # --- Caching ---
    # ytmusicapi calls are slow (1-3s) and rate limited. Cache aggressively.
    HOME_CACHE_TTL: int = int(os.environ.get("HOME_CACHE_TTL", 900))     # 15 min
    SEARCH_CACHE_TTL: int = int(os.environ.get("SEARCH_CACHE_TTL", 600))  # 10 min
    SONG_CACHE_TTL: int = int(os.environ.get("SONG_CACHE_TTL", 3600))     # 1 hour

    MAX_TITLE_LENGTH: int = int(os.environ.get("MAX_TITLE_LENGTH", 40))
