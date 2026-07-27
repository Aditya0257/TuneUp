# TuneUp v2 — React + TypeScript + Flask

A rebuild of [Aditya0257/TuneUp](https://github.com/Aditya0257/TuneUp) as a React SPA on a JSON API, with one goal the original could not reach: **it deploys.**

The look is unchanged. All 2,838 lines of the original SCSS are carried over as-is (one edit: the `@font-face` URL is now absolute so Vite can serve the font from `public/`), and the JSX reproduces the original DOM structure and class names exactly. Every `.first_song_row`, `.quickPicks_songs_column` and `.vertical_slider_box` rule still applies to the element it was written for.

---

## Why the original couldn't be hosted

Not a build-tooling problem — the old `/playSong` route was.

```python
with youtube_dl.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(song_url, download=False)
    url = info['formats'][0]['url']     # raw googlevideo.com stream URL
```

Three independent blockers:

1. `youtube-dl==2021.12.17` and `pytube==12.1.2` are both unmaintained; YouTube's signature ciphering broke them years ago.
2. YouTube blocks datacenter IP ranges. Even with current libraries this fails on Render, Railway, Fly and Vercel — it only ever worked because it ran on your laptop's residential IP.
3. Extracting stream URLs breaches YouTube's Terms of Service, so a public deploy is a takedown risk.

There was a fourth problem waiting: `ytmusic.get_home()` needs `headers_auth.json`, which is a **live Google session cookie for your personal account**. Hosting that means anyone who compromises the server inherits your YouTube Music session.

### The fix

Playback moved to the official **YouTube IFrame Player API**. A hidden `YT.Player` is the audio source; the backend only ever hands over a `videoId` plus metadata. No scraping, no cookie, no ToS problem.

The API exposes `playVideo`, `pauseVideo`, `seekTo`, `getCurrentTime` and `getDuration`, so the custom player UI — progress bar, queue, shuffle, loop, prev/next — works exactly as designed. Nothing visual was given up.

**The one real trade-off:** some rights holders disable off-site embedding (error 101/150). Those tracks can't play in any embedded player. `PlayerContext` detects the error and auto-skips, with a toast, and gives up after five consecutive failures rather than spinning.

---

## Architecture

```
tuneup-v2/
├── backend/                  Flask — JSON only, no templates
│   ├── app.py                routes + error handling
│   ├── ytmusic_service.py    YouTube Music access, normalising, TTL cache
│   ├── db.py                 MongoDB store + in-memory fallback
│   └── config.py             env-driven config
└── frontend/                 React 18 + Vite + TypeScript
    └── src/
        ├── player/           PlayerContext — the ported musicPlayer.js
        ├── liked/            LikedSongsContext
        ├── api/client.ts     typed API client
        ├── components/       SongRow, Backpage, SideNav, carousel…
        ├── pages/            Home, Library, Search
        └── styles/           the original SCSS, unchanged
```

### Route mapping

| Original | Now |
| --- | --- |
| `GET /` (renders index.html) | `GET /api/home` |
| `GET /search?search=` (renders search.html) | `GET /api/search?q=` |
| `POST /playSong` (scrapes stream URL) | `GET /api/songs/<videoId>` + `GET /api/queue/random?count=` |
| `GET /music` (renders music.html) | `GET /api/liked-songs` |
| `POST /music` (session round-trip) | `PUT /api/liked-songs` (bulk sync) |
| `POST /likeSong` (like *and* unlike) | `POST /api/liked-songs`, `DELETE /api/liked-songs/<id>` |

---

## Running it locally

Two terminals. Neither step needs a database or a Google account.

**Backend**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # optional — every value has a default
python app.py                 # http://127.0.0.1:5000
```

With no `MONGODB_URI` it uses an in-memory store, so a fresh clone runs immediately. Liked songs won't survive a restart until you point it at a database.

**Frontend**

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Vite proxies `/api` to Flask, so there is no CORS setup in development.

Check the wiring with `curl localhost:5000/api/health`:

```json
{ "status": "ok", "store": "memory", "ytmusic": { "reachable": true, "authenticated": false } }
```

---

## Deploying

**Frontend → Vercel or Netlify.** `npm run build` outputs `dist/`. Set `VITE_API_BASE_URL` to your backend URL. `vercel.json` and `public/_redirects` are included so client-side routes don't 404 on refresh.

**Backend → Render, Fly.io or Railway.**

```
Build:  pip install -r requirements.txt
Start:  gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 60
```

Set `CORS_ORIGINS` to your deployed frontend origin and `FLASK_SECRET_KEY` to a real secret. A `Dockerfile` is included if you'd rather ship a container.

**Database → MongoDB Atlas.** The free M0 tier is plenty. Set `MONGODB_URI` to the `mongodb+srv://` string.

Leave `YTMUSIC_AUTH_FILE` and `YTMUSIC_HEADERS_JSON` **blank in production.** Search, song lookup and the random queue all work anonymously. Authentication only unlocks the personalised home feed, and `_home_from_search()` approximates that by blending three of your original seed queries.

---

## Bugs found in the original, fixed here

Reading the old code closely turned up a handful of real defects, not just style issues:

**A shared `isLiked` flag.** `updateLikedSongs.js` kept one module-level `let isLiked = false` for the whole page. Liking song B after song A read A's state, so the toggle inverted after the first use.

**Stale tabs could delete your library.** `POST /music` stashed the browser's localStorage in the Flask *session*; the next `GET /music` compared it against MongoDB and, on any difference, ran `collection_liked_songs.delete_many({})` followed by a reinsert. An old tab with a shorter list would wipe the collection. The reconcile is now upload-only, and the server is authoritative.

**XSS in the search box.** `searchSong.js` did `heading.innerHTML = searchedText`, so typing `<img src=x onerror=alert(1)>` executed. React escapes text nodes; the query is also a routed, encoded param now.

**Unencoded query strings.** `` `/search?search=${searchedText}` `` truncated silently on `&` or `#`. Now `encodeURIComponent`.

**Nine unguarded `JSON.parse(localStorage.getItem(...))` calls.** One corrupt entry took down the player. All reads go through a `readJson` helper that cannot throw.

**Every request silently swallowed failure.** `xhr.onload` only handled `status === 200`; anything else was a no-op, leaving a blank page. There are now loading, empty and error states throughout.

**Two committed-missing images.** `box_heart_icon.png` and `play_vibration_icon.png` are referenced by the templates but were never committed — they rendered as broken-image placeholders. Replaced with Font Awesome icons.

**A personal Font Awesome kit.** Kit `79727bd9ce` was hardcoded in all three templates. Kits are account-bound and domain-allowlisted, so icons would have vanished on any other host. Now the public CDN.

**Hardcoded absolute paths.** `/Users/adityasingh/Developer/projects/music_website/...` appeared twice, which is the direct reason nobody else could run the repo. All config is env-driven.

**End-of-track detection.** The old code compared `song.currentTime === song.duration` on every `timeupdate` tick — a float equality check that often missed, stalling the queue. The IFrame API fires a real `ENDED` event.

**A Web Worker that no longer needs to exist.** `fetchSongsWorker.js` existed because filling a 25-song queue meant 25 sequential stream-URL scrapes. One `/api/queue/random` call now returns the whole batch.

**Play/pause state lived in the DOM.** `if (play.classList.contains('fa-pause'))` made the class list the source of truth. It derives from player state now.

**The player only existed on the home page.** Its markup was inline in `index.html`, so navigating to Library or Search destroyed it — music stopped. `Backpage` sits above the router, so playback survives navigation.

---

## Known limitations

- **Embed-blocked tracks** (error 101/150) can't be played by any embedded player. Auto-skipped.
- **Autoplay** needs a user gesture, per browser policy. The first click starts it; everything after works.
- **`get_home()` needs auth.** Anonymous mode approximates the feed via search.
- **Playlists and Saved Artists are placeholder data**, exactly as in the original template.
- **Mobile layout** is inherited as-is. The original was desktop-first with only two `@media` blocks; the drag gesture now works on touch, but the grids still need work.

---

## Verification

```bash
cd frontend && npx tsc --noEmit    # clean
cd frontend && npm run build       # 58 modules, 64 kB CSS
cd backend  && python3 -m py_compile *.py
```

All routes were exercised against the in-memory store, including the liked-songs lifecycle (like → duplicate like is idempotent → bulk sync → unlike) and the 400/404 error paths. With YouTube Music unreachable, every endpoint still returns well-formed JSON rather than a 500 — worth confirming, since the original had no fallback at all.

## Licence

MIT, as the original.
