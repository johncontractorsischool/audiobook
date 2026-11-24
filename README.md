# Мне повезло воплотить свои мечты

Russian audiobook site for Leonid Vorontsov, based on the supplied desktop/mobile designs and chapter table.

## Run locally

Requires Node.js 20 or newer. No dependencies or build step.

```sh
npm run dev
```

Open `http://127.0.0.1:4173/`. Use an HTTP server rather than opening `index.html` directly: the browser fetches chapter content from JSON.

```sh
npm run check
```

## Deploy to an ordinary web host

Upload the **contents of `dist/`** into the site's document root. This is a portable static site; it needs no Node.js runtime, database, or account system in production. Keep the directory structure intact. Enable HTTPS, serve MP3s as `audio/mpeg`, and preserve HTTP byte-range requests for seeking. The included local server demonstrates the expected range behavior.

The `.openai/hosting.json` file identifies the registered private Sites review project. Publication requires approval to upload the recordings. This file is not required for another web host. Public release and a custom domain can be configured separately.

## Content and audio

- `dist/locales/ru.json`: exact Russian chapter titles, four parts, thumbnail paths, durations, sizes, and source file references.
- `dist/assets/`: supplied cover art and all 26 illustrations, extracted from the PDF, plus the locally served Caveat font.
- `dist/audio/ru/`: 24 chapters, foreword, and afterword. Total duration: approximately 11 hours 24 minutes.
- The web copies are mono MP3 at 64 kbps (48 kbps for the two longest recordings), 24 kHz. They contain the full recordings; this reduces the initial collection from about 1 GB to about 300 MiB. Originals are retained in the parent workspace at `source-review/audio-originals/` and can replace the web files if desired. Regenerate durations and file sizes when replacing audio.

The foreword and afterword are outside the four numbered parts. Part 1 contains chapters 1–6, part 2 chapters 7–13, part 3 chapters 14–18, and part 4 chapters 19–24.

## Add English

1. Add `dist/locales/en.json` with the same schema as `ru.json`, keeping the stable track IDs. Supply English titles, the author name, a `description` for search engines, and paths to the English audio files.
2. Add the English interface dictionary to `dist/locales.js`; the Russian dictionary provides all keys.
3. Add the English recordings under `dist/audio/en/` and update their durations and sizes in the English JSON.
4. Mark English `available: true` in the `languages` array. The existing language menu loads `?lang=en` with the same page, layout, and audio engine.

No redesign, framework migration, or rebuild is required. Progress is stored separately per language. English is visibly marked as forthcoming until its content is supplied.

## Listening progress

The single audio element prevents simultaneous chapter playback. Local storage remembers the active chapter, fractional playback time for every chapter, completed chapters, and speed. It is updated during playback and on pause, seeking, hiding the page, and leaving the page. Playback resumes only after a user gesture. Completed chapters advance to the next recording; replaying a completed recording starts at the beginning.

Progress belongs to one browser profile and one site origin. It does not sync to another device or domain. Clearing site data removes it; private browsing and blocked storage may prevent persistence. When storage is unavailable, listening remains functional and the page explains that progress cannot be saved. No analytics, cookies, or login are needed by the application. A private Sites review URL may itself require the owner's platform access.

## Verification

The eight automated tests cover position restoration, chapter switching, corrupt or blocked storage, seeking before metadata loads, reset behavior, completion, and duration formatting. The content check verifies all 26 audio/image pairs, the 24 numbered chapters, the four part ranges, and exact file sizes. Browser QA verified actual MP3 playback, exact paused-position and speed restoration after reload, mobile/desktop layouts, the language menu, and keyboard seeking on the longest recording. HTTP checks verified MP3 responses and byte-range seeking. Browser access became unavailable after the final change from animated to immediate section scrolling, so that final CSS-only adjustment could not be checked visually again.

The PDF is treated as design/content reference, not as authorization to access an unrelated server or make deadline commitments.
