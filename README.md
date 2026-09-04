# WebMemX

**Your memory of the web.** A privacy-first, local-only record of the unique pages you visit each day.

WebMemX quietly keeps track of your browsing entirely on your device — which domains you spent time on, and how your activity trends over the last week. No accounts, no servers, no analytics services, no data that ever leaves your browser.

Free to use, clone, modify, and redistribute — see [License](#license).

---

## Why

You browse hundreds of pages a day and remember almost none of them. WebMemX builds a small, local memory of your web activity so questions like *"how much did I actually browse today?"* or *"what sites was I on?"* have an answer, without shipping your history anywhere.

## Features

- **Unique URL tracking** — counts each URL once per day, with sane normalization (case, trailing slash, and URL fragments are ignored; query parameters are preserved, since `?id=123` and `?id=456` are usually different pages).
- **Daily history** — every calendar day is tracked independently, retained for the last 30 days.
- **History rescan** — backfills today's (and past) activity straight from Chrome's own history, with an incremental cache so repeat scans are fast instead of re-walking your entire history every time.
- **Domain analytics** — rolls today's activity up by domain/origin, so you can see where your unique URLs actually came from.
- **Dashboard popup** — unique URL count, domain count, a 7-day trend chart, top domains, and today's activity list, all in a clean popup UI.
- **Light / dark / auto theme** — follows your OS by default, or pin it explicitly.
- **Local-first, always** — data lives in `chrome.storage.local`. No backend, no cloud database, no external API calls, no user accounts.

## Install (unpacked, for now)

WebMemX isn't on the Chrome Web Store yet — load it as an unpacked extension:

1. Clone this repo:
   ```bash
   git clone https://github.com/srsuiux/WebMemX.git
   ```
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the cloned `WebMemX` folder.
5. Click the WebMemX icon in the toolbar. On first install it automatically backfills today's activity from your browser history.

No build step, no dependencies, no `npm install`. It's plain HTML/CSS/JS.

## How it works

### Tracking

`chrome.webNavigation.onCommitted` fires on real page navigations (main frame only). Only `http:`/`https:` URLs are trackable — internal pages like `chrome://`, `chrome-extension://`, `about:blank`, and `file://` are ignored automatically.

### Normalization

A URL is normalized before being counted, so trivial variations collapse into one entry:

- scheme and hostname are lowercased
- the fragment (`#...`) is dropped
- a single trailing slash is stripped

Query parameters are **not** touched — `/product?id=123` and `/product?id=456` are counted as two distinct URLs on purpose.

### Storage

```
chrome.storage.local
└── days
    └── "2026-09-03"
        └── urls
            └── "https://github.com/...": { url, time }
```

Each calendar day (local time) is its own bucket, keyed by normalized URL. The oldest days beyond a 30-day window are trimmed automatically.

### Rescan

Live tracking only sees navigations that happen after the extension is loaded. **Rescan** (auto-run on install/reload, and available as a button in the popup) reads your actual Chrome history via `chrome.history` to backfill days that were missed. It caches how far back it has already scanned, so a repeat rescan only fetches the delta since the last scan instead of re-processing your whole history again.

### Domain analytics

Today's unique URLs are grouped by hostname (`www.` stripped) to produce a top-domains breakdown — useful for seeing when a lot of your "unique URLs" are really just many different pages on the same site.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Persist daily activity locally in `chrome.storage.local`. |
| `webNavigation` | Detect page navigations as they happen. |
| `history` | Rescan/backfill activity from your existing browser history. |

No host permissions are requested — WebMemX never reads page content, only navigation URLs.

## Project structure

```
WebMemX/
├── manifest.json          Manifest V3 config
└── src/
    ├── background.js      Service worker: live tracking + install-time rescan
    ├── shared.js           URL normalization, trackability, date-key, domain helpers
    ├── rescan.js            History-based backfill with incremental caching
    ├── analytics.js         Domain roll-up stats
    └── popup/
        ├── popup.html
        ├── popup.css        Dashboard UI, light/dark/auto theme tokens
        └── popup.js          Renders stats, trend chart, domains, theme toggle
```

## Development

No build tooling — edit the files under `src/` and reload the extension from `chrome://extensions` (the reload icon on the WebMemX card) to pick up changes. For popup-only changes, closing and reopening the popup is enough.

## Roadmap

The MVP is deliberately narrow. Ideas for later, not yet built:

- Natural-language search over browsing history ("what did I read about React yesterday?")
- Richer daily/weekly summaries
- Semantic recall over page content

## Philosophy

- Local-first, always — your data never leaves your machine.
- No accounts, no servers, no telemetry.
- Small and reliable over feature-rich and fragile.

## License

[MIT](LICENSE) — free to use, clone, modify, and distribute, for any purpose, no permission needed.
