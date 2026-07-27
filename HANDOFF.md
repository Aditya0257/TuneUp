# TuneUp v2 — Agent Handoff / Full Context

**Read this file top to bottom before touching anything.** It is the complete context for this project: what it is, what was changed and why, what has been verified, what has not, and what you are being asked to do.

You are picking up work that was done in a Linux sandbox with **no access to this machine and no network access to `music.youtube.com`**. That means the app has never actually been run against live data or rendered in a real browser. Your first job is to close that gap.

---

## 1. What this project is

A rebuild of a personal project — the author's first HTML/CSS/JS web project, written while moving from mobile development to web development.

**Reference repository (the original — fetch and read it):**

```
https://github.com/Aditya0257/TuneUp
```

Clone it somewhere outside this folder and read it, or browse it on GitHub. You will want it for comparison:

```bash
git clone https://github.com/Aditya0257/TuneUp.git /tmp/tuneup-original
```

The original was Flask + Jinja templates + vanilla JS + SCSS, using `ytmusicapi` for YouTube Music data and MongoDB for liked songs. It ran on the author's laptop only and was never hosted. Section 3 explains exactly why.

The original repo's layout:

```
app.py                      372 lines, 5 routes, Jinja rendering + audio scraping
templates/index.html        386 lines  (home + the persistent shell + the player)
templates/music.html        259 lines  (library / liked songs)
templates/search.html       210 lines  (search results)
static/javascript/*.js      9 files, ~1,300 lines (musicPlayer.js alone is 707)
static/scss/*.scss          3 files, 2,838 lines
requirements.txt            42 pinned packages
myenv/                      a 72 MB virtualenv, committed to git
```

**v2 stack** (each choice was made explicitly by the repo author, do not revisit them without asking):

| Layer | Choice |
| --- | --- |
| Frontend | React 18 + Vite 5 + TypeScript (strict) |
| Playback | Official YouTube IFrame Player API |
| Backend | Flask, converted to a JSON-only API |
| Database | MongoDB, with an in-memory fallback |

---

## 2. The single most important constraint

**The original SCSS is carried over unchanged, and the JSX reproduces the original DOM structure and class names exactly.** This is what makes v2 look identical to v1.

The only edit to the three original stylesheets was the `@font-face` URL, changed from a relative `../assets/fonts/...` path to an absolute `/assets/fonts/...` so Vite serves it from `public/`.

Consequences you must respect:

- **Do not rename, "clean up", or convert any class name** in `src/styles/main.scss`, `music.scss` or `search.scss`, or in the JSX that targets them. Names like `first_song_row`, `quickPicks_songs_column`, `artist_no_name_and_img`, `three_dot_x_icon`, `sno_play_pause_icon` and `home_DraggableDiv` are load-bearing.
- **Do not convert the SCSS to CSS modules, Tailwind, or styled-components.** The whole design depends on these being plain global stylesheets.
- New styling goes in `src/styles/overrides.scss` only, so a diff against the original repo stays clean.
- Each original stylesheet is scoped under its own page root (`.homepage`, `.musicpage`, `.searchpage`), which is *why* all three can load together in a single-page app without colliding. `src/main.tsx` imports all four.

Some classes and ids have no CSS rules — `.current-time`, `.ending-time`, `.play`, `#changable`, `#home_DraggableDiv`, `#playButton`, `#search-input`. That is correct; they had no rules in the original either. They are styled by ancestor/tag selectors or used only by JS. Do not "fix" this.

---

## 3. Why the original could not be hosted

Not a tooling problem. The old `POST /playSong` route scraped a raw audio stream URL out of YouTube:

```python
with youtube_dl.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(song_url, download=False)
    url = info['formats'][0]['url']     # raw googlevideo.com URL
```

Three independent blockers:

1. `youtube-dl==2021.12.17` and `pytube==12.1.2` are both unmaintained; YouTube's signature ciphering broke them years ago.
2. YouTube blocks datacenter IP ranges. This fails on Render, Railway, Fly and Vercel regardless of library version — it only ever worked from a residential IP.
3. Extracting stream URLs breaches YouTube's Terms of Service, making a public deploy a takedown risk.

A fourth problem was waiting: `ytmusic.get_home()` requires `headers_auth.json`, which is **a live Google session cookie for the author's personal account**. Hosting that means anyone who compromises the server inherits that YouTube Music session.

### The fix, and its one real trade-off

Playback moved to the official **YouTube IFrame Player API**. A hidden `YT.Player` (rendered by `PlayerProvider`) is the audio source. The backend only ever returns a `videoId` plus metadata — **it never produces a stream URL**. No scraping, no cookie, no ToS problem.

The IFrame API exposes `playVideo`, `pauseVideo`, `seekTo`, `getCurrentTime` and `getDuration`, so the original custom player UI (progress bar, queue, shuffle, loop, prev/next) works exactly as designed. Nothing visual was sacrificed.

**Trade-off:** some rights holders disable off-site embedding (player error 101/150). Those tracks cannot play in *any* embedded player. `PlayerContext` detects the error, shows a toast, auto-skips, and gives up after 5 consecutive failures instead of spinning forever. This is expected behaviour, not a bug — do not try to "fix" it by reintroducing stream extraction.

### 🚫 Hard rule

**Never reintroduce `youtube-dl`, `yt-dlp`, `pytube`, or any other stream-extraction library**, and never make the backend return an audio URL. If asked to make more tracks playable, the legitimate options are: use the embed and accept the skips, or switch catalogue to a licensed source with a real audio API (Jamendo, Audius) — not scraping.

---

## 4. File inventory

Nothing here is generated. `node_modules/`, `.venv/` and `dist/` are **not** present — they are created on first run.

### Backend (`backend/`, Python, ~1,000 lines)

| File | Purpose |
| --- | --- |
| `app.py` | Flask app: routes, JSON error handlers, wiring. No templates, no HTML. |
| `ytmusic_service.py` | All YouTube Music access. Normalisers, TTL cache, home fallback, random-song pool. |
| `db.py` | `MongoStore` and `InMemoryStore`, same interface. `create_store()` picks one. |
| `config.py` | Env-driven config. No hardcoded paths. |
| `requirements.txt` | 6 runtime deps. Comments list what was removed from the original 42 and why. |
| `tests/test_api.py` | 24 tests using real `ytmusicapi` response fixtures. No network needed. |
| `Dockerfile` | Non-root, gunicorn, 2 workers × 4 threads. |
| `Procfile` | For Render / Railway / Heroku-style hosts. |
| `.env.example` | Every value optional; documents the auth-cookie warning. |

### Frontend (`frontend/src/`, TypeScript, ~2,400 lines)

| File | Purpose |
| --- | --- |
| `main.tsx` | Entry. Mounts providers, imports all four stylesheets. |
| `App.tsx` | Persistent shell: SearchBar + router outlet + Backpage + SideNav. |
| `types.ts` | `Song`, `Album`, `Artist`, `Playlist`, `HomeFeed`, `SearchResults`, `LikedSong`. |
| `api/client.ts` | Typed API client. Single `request()` with real error handling. |
| `player/PlayerContext.tsx` | **The core.** Port of the 707-line `musicPlayer.js`. Queue, history, shuffle, loop, seek, prefetch, error recovery. |
| `player/youtubeApi.ts` | Loads the IFrame API script once; singleton promise. |
| `player/constants.ts` | Queue limits, player state codes, unplayable error codes, localStorage keys. |
| `liked/LikedSongsContext.tsx` | Liked songs: server-authoritative, localStorage cache, optimistic toggle with rollback. |
| `pages/HomePage.tsx` | Port of `index.html` (`#changable` subtree). |
| `pages/LibraryPage.tsx` | Port of `music.html`. |
| `pages/SearchPage.tsx` | Port of `search.html`. |
| `components/Backpage.tsx` | The queue panel + now-playing player (`.backpage`). |
| `components/SongRow.tsx` | The `.first_song_row` markup shared by Home and Search. |
| `components/SideNav.tsx` | `.fixed_side_navbar`, replaces `changePage.js`. |
| `components/SearchBar.tsx` | `.homepage_searchbar`, replaces `searchSong.js`. |
| `components/VerticalCarousel.tsx` | Port of `verticalCarouselSlider.js`. |
| `components/ArtistRow.tsx` | Artist card, shared by Home and Search. |
| `components/HeartIcon.tsx` | Like toggle. |
| `components/TrackDropdown.tsx` | "Add to Queue" / "Play Next" menu. |
| `components/StatusMessage.tsx` | Loading / error / empty states (the original had none). |
| `hooks/useAsync.ts` | Fetch + loading/error state with cancellation. |
| `hooks/useHorizontalDrag.ts` | Port of `draggableDiv.js`, now pointer-events based. |
| `utils/format.ts` | `truncate` (was `setSongNameWithEllipsis`), `formatTime`, `trackNumber`. |
| `utils/storage.ts` | localStorage reads that cannot throw. |
| `styles/*.scss` | The three originals, unchanged, + `overrides.scss`. |
| `vite-env.d.ts` | Hand-rolled YouTube IFrame API typings. |

### Root

| File | Purpose |
| --- | --- |
| `start.sh` | One-command dev startup. Sets up, tests, runs both servers. |
| `README.md` | Human-facing setup and deploy guide. |
| `HANDOFF.md` | This file. |
| `.gitignore` | Excludes secrets, `node_modules`, `.venv`, `myenv`, `__pycache__`, `dist`. |

---

## 5. API contract

Old → new route mapping:

| Original | Now |
| --- | --- |
| `GET /` → renders index.html | `GET /api/home` |
| `GET /search?search=` → renders search.html | `GET /api/search?q=&limit=` |
| `POST /playSong` → scraped stream URL | `GET /api/songs/<videoId>`, `GET /api/queue/random?count=` |
| `GET /music` → renders music.html | `GET /api/liked-songs` |
| `POST /music` → session round-trip | `PUT /api/liked-songs` (bulk sync) |
| `POST /likeSong` → like *and* unlike via a flag | `POST /api/liked-songs`, `DELETE /api/liked-songs/<videoId>` |
| — | `GET /api/health`, `GET`/`POST /api/history` |

**Why like/unlike were split:** the old endpoint took an `isLiked` boolean *from the client* and inverted based on it, which made the browser the source of truth for its own toggle state. A stale flag silently performed the opposite action. They are now separate, idempotent verbs.

Every song-shaped response is normalised server-side to:

```ts
{ videoId, title, artist, thumbnail, album?, duration?, durationSeconds? }
```

The original templates indexed raw `ytmusicapi` dicts directly in Jinja (`song['thumbnails'][song['thumbnails']|length-1]['url']`), so any upstream shape drift produced a 500 with no clue where. That mapping now lives only in `ytmusic_service.py`, behind `.get()` guards, and is locked in by tests.

---

## 6. Behaviour deliberately preserved

Do not "simplify" these away — they are intentional ports of the original's feel:

- Queue caps at **25**; history caps at **10**.
- Queue refills when fewer than **4** tracks remain.
- Background prefetch every **5 minutes**, 7 tracks.
- Fisher–Yates shuffle (same algorithm as the original `shuffleArray`).
- On queue overflow, evict at **random past index 2**, never the next couple of tracks (they are visible in the queue panel).
- Titles truncate at **30** chars in the player, filtered at **40** on the home feed (the original's `is_name_length_allowed`).
- **Same localStorage keys** — `songsQueue` and `likedSongs` — so data from the original app carries over.
- The 10 seed search queries in `ytmusic_service.SEARCH_QUERIES` are verbatim from the original `app.py`.
- The 7 genres and 7 moods are verbatim.
- The 4 carousel slides keep their original hardcoded text and image URLs.
- Library "Playlists" and "Saved Artists" remain placeholder data, exactly as in the original template.

**One structural change to the queue model.** The original kept the currently-playing song at `currentQueue[0]`, inserted with `splice(1, 0, song)`, and rendered `currentQueue.slice(1)` as "up next" — an off-by-one threaded through nearly every function in `musicPlayer.js`. In v2, `currentTrack` is separate from `queue`, so `queue` means exactly "what plays next", with no slicing.

---

## 7. Bugs found in the original and fixed

Real defects, not style preferences. Useful context if behaviour looks different from the old app.

1. **Shared `isLiked` flag.** `updateLikedSongs.js` had one module-level `let isLiked = false` for the entire page. Liking song B after song A read A's state, so the toggle inverted after first use.
2. **Stale tabs could delete the library.** `POST /music` stashed the browser's localStorage in the Flask *session*; the next `GET /music` compared it to MongoDB and, on any difference, ran `collection_liked_songs.delete_many({})` then reinserted. An old tab with a shorter list wiped the collection. Reconciliation is now **upload-only**, and the server is authoritative.
3. **XSS in the search box.** `searchSong.js` did `heading.innerHTML = searchedText`, so typing `<img src=x onerror=alert(1)>` executed. Now a routed, encoded param rendered as a text node.
4. **Unencoded query strings.** `` `/search?search=${searchedText}` `` truncated silently on `&` or `#`. Now `encodeURIComponent`.
5. **Nine unguarded `JSON.parse(localStorage.getItem(...))` calls.** One corrupt entry took down the player; writes also throw in Safari private mode. All reads go through `utils/storage.ts`.
6. **Silent failure everywhere.** `xhr.onload` only handled `status === 200`; every other outcome was a no-op, leaving a blank page. There are now loading, empty and error states throughout.
7. **HTML error pages from a JSON client.** Flask's default error page broke the client's `response.json()`. All errors are JSON now.
8. **Float-equality end-of-track detection.** `song.currentTime === song.duration` on every `timeupdate` tick often missed, stalling the queue. Now the real `ENDED` event.
9. **Play/pause state lived in the DOM.** `if (play.classList.contains('fa-pause'))` made the class list the source of truth. Now derived from player state.
10. **The player only existed on the home page.** Its markup was inline in `index.html`, so navigating to Library or Search destroyed it and music stopped. `Backpage` now sits above the router — **playback survives navigation**, which it could not before.
11. **Two missing images.** `assets/images/box_heart_icon.png` and `play_vibration_icon.png` are referenced by the templates but were never committed; they rendered as broken-image placeholders. Replaced with Font Awesome icons (`.stat_icon` in `overrides.scss`).
12. **A personal Font Awesome kit.** Kit `79727bd9ce` was hardcoded in all three templates. Kits are account-bound and domain-allowlisted, so icons would vanish on any other host. Now the public cdnjs stylesheet.
13. **Hardcoded absolute paths.** `/Users/adityasingh/Developer/projects/music_website/...` appeared twice — the direct reason nobody else could run the repo.
14. **A Web Worker that no longer needs to exist.** `fetchSongsWorker.js` existed because filling a 25-song queue meant 25 sequential stream-URL scrapes. One `/api/queue/random` call now returns the whole batch.
15. **Unfiltered search bucketed by category.** One `search(limit=100)` call sorted results by `element['category']`, so an unlucky query returned empty Artists or Albums columns. Now four filtered calls, one per column.
16. **Leaked `setInterval`.** The carousel's interval was never cleared.
17. **Dependency bloat.** 42 pinned packages → 6. Removed: `youtube-dl`, `pytube` (broken), `spotipy`, `Authlib`, `colorthief`, `Pillow`, `youtube-search` (never imported), `Beaker`, `redis`, `cachelib`, `Flask-Session` (sessions no longer used), `Js2Py`, `pyjsparser` (transitive).

---

## 8. Verification status — read carefully

### ✅ Verified in the sandbox

- `npx tsc --noEmit` — clean, strict mode, `noUnusedLocals` + `noUnusedParameters` on.
- `npx vite build` — succeeds. 58 modules, 64.29 kB CSS, 198 kB JS.
- `python3 -m unittest discover -s tests` — **24/24 pass.** Covers normalisers (missing thumbnails, missing videoId, the `artist` vs `title` key), search fan-out, TTL caching, authenticated vs anonymous home, title-length filtering, random-pool batching and non-overlap, and the full like → duplicate-like → bulk-sync → unlike lifecycle plus 400/404 paths.
- Flask boots; `GET /api/health` returns 200.
- Vite dev server serves the SPA; `/`, `/music`, `/search?q=x` all return HTML; the `/api` proxy reaches Flask.
- All four stylesheets compile and are served (46 kB + 14 kB + 19 kB + 4 kB).
- Font and images serve correctly from `public/`.
- Every `.tsx` module transforms without error.
- A script cross-checked every class name used in JSX against the SCSS — no orphans beyond the intentional ones listed in section 2.

### ❌ NOT verified — this is your job

- **Live YouTube Music data.** The sandbox proxy blocks `music.youtube.com` (403), so `/api/health` reported `"ytmusic": {"reachable": false}`. Every endpoint still returned well-formed JSON with it down (good proof of the fallback), but **no real song has ever flowed through this code.**
- **React actually mounting.** curl only sees the HTML shell. No component has rendered.
- **Visual fidelity.** Nobody has compared the running app to the original screenshots (`homePage.png`, `musicPage.png`, `searchresult_img.png` in the reference repo).
- **Audio playback.** No sound has been produced. Play/pause, seek, next/prev, shuffle, loop are untested at runtime.
- **MongoDB.** Only the in-memory store has been exercised.
- **Any deployment.**

---

## 9. YOUR TASK

### Step 1 — Start it

```bash
cd ~/project-dev/music-application/tuneup-v2
./start.sh
```

`start.sh` creates the venv, installs both dependency sets, generates `backend/.env` with a real secret key, runs the tests, starts Flask on :5000, health-checks it, then starts Vite. Ctrl-C stops both. First run takes a minute for `npm install`.

If you prefer two terminals, see `README.md`.

Then open **http://localhost:5173** and confirm:

```bash
curl localhost:5000/api/health
```

You want `"ytmusic": {"reachable": true}`. If it says `false` on this machine, YouTube Music is unreachable — check network/VPN before debugging anything else.

### Step 2 — Verify, in this order

1. **Console clean?** Open DevTools. Report any error verbatim before moving on.
2. **Layout matches?** Compare against `homePage.png`, `musicPage.png` and `searchresult_img.png` in the reference repo. This is the highest-value check — a CSS regression means a class name got lost in the port.
3. **Home populates?** Quick Picks, New Releases, Recommended Artist, genres and moods all filled.
4. **Playback?** Click a Quick Pick. Expect audio within a second or two, the artwork/title/artist updating in the player, and the progress bar advancing.
5. **Player controls?** Pause/resume, seek by dragging the progress bar, next, previous, shuffle, loop (should replay the same track).
6. **Queue?** "Next Composition" fills. The `⋯` menu offers "Add to Queue" and "Play Next", and both work.
7. **Likes?** Heart a track — icon fills immediately. Reload; it stays filled. Check it appears in Library. Unheart from Library.
8. **Navigation?** Move between Home / Library / Search while audio plays. **Audio must not stop** — this is new in v2 and worth confirming.
9. **Search?** Search something. All four columns (Songs, Community, Artists, Albums) should populate. Refresh the results URL — it should still work.
10. **Drag?** Grab the leftmost ~38px of the main panel and drag right to reveal the player.

### Step 3 — Report back

For each failure give: what you did, what you expected, what happened, and the exact console/terminal output. Do not fix and move on silently.

---

## 10. Likely failure modes

| Symptom | Cause and fix |
| --- | --- |
| "The YouTube player failed to load" | An ad blocker or DNS filter is blocking `youtube.com/iframe_api`. Disable it for localhost. This message exists specifically for this case. |
| Toast: "can't be played here", auto-skips | Expected. That track's owner disabled embedding (error 101/150). Not a bug. |
| Nothing plays until a second click | Browser autoplay policy requires a user gesture. Expected on a cold page. |
| Home empty, `reachable: false` | YouTube Music unreachable from this network. |
| Home populated but sparse | You are anonymous, so `_home_from_search()` is standing in for `get_home()`. Expected. |
| Liked songs reset on restart | No `MONGODB_URI`, so the in-memory store is active. Expected. Set the URI to persist. |
| Layout broken / unstyled | A class name was lost in the port. Diff the JSX against the original template in the reference repo. **Do not fix by editing the SCSS.** |
| CORS error in console | You bypassed the Vite proxy. In dev, call `/api/...` relative — never `http://localhost:5000` directly. |
| `/music` 404s on refresh in production | SPA fallback missing. `vercel.json` and `public/_redirects` handle Vercel and Netlify. |

---

## 11. Environment variables

Everything is optional; the app boots with none. See `backend/.env.example` and `frontend/.env.example`.

**Backend:** `FLASK_SECRET_KEY`, `FLASK_DEBUG`, `PORT`, `CORS_ORIGINS`, `MONGODB_URI`, `MONGODB_DB`, `YTMUSIC_AUTH_FILE`, `YTMUSIC_HEADERS_JSON`, `YTMUSIC_LOCATION`, `HOME_CACHE_TTL`, `SEARCH_CACHE_TTL`, `SONG_CACHE_TTL`, `MAX_TITLE_LENGTH`

**Frontend:** `VITE_API_BASE_URL` (blank in dev — the proxy handles it), `VITE_PROXY_TARGET`

### 🔒 Secrets

- **Never commit `.env`, `headers_auth.json`, `browser.json` or `oauth.json`.** All are in `.gitignore`.
- **Leave `YTMUSIC_AUTH_FILE` and `YTMUSIC_HEADERS_JSON` blank in production.** They hold a live Google session cookie for the author's personal account. Search, song lookup and the random queue all work anonymously; auth only unlocks the personalised home feed.
- If you ever need auth locally: `python -c "import ytmusicapi; ytmusicapi.setup()"`.

---

## 12. Deploying (after local verification passes)

- **Frontend** → Vercel or Netlify. `npm run build` → `dist/`. Set `VITE_API_BASE_URL` to the backend URL.
- **Backend** → Render, Fly.io or Railway. Build `pip install -r requirements.txt`, start `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 60`. Set `CORS_ORIGINS` to the frontend origin and a real `FLASK_SECRET_KEY`. `Dockerfile` included.
- **Database** → MongoDB Atlas free M0. Set `MONGODB_URI`.

---

## 13. Ground rules

1. Never reintroduce stream extraction (`youtube-dl`, `yt-dlp`, `pytube`) or make the backend return an audio URL.
2. Do not rename SCSS class names or the JSX that targets them. New styles go in `overrides.scss`.
3. Do not commit secrets, `node_modules/`, `.venv/` or `dist/`.
4. Keep `tsc --noEmit` clean and the 24 tests passing. Add tests for new backend behaviour.
5. Do not change the stack choices in section 1 without asking.
6. Report what actually happened, including failures. The verification gap in section 8 is real — treat untested code as untested.
