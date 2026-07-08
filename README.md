# PagePins

A Chrome (MV3) extension that pins a durable, URL-anchored checklist over any
page — built for tracking PR follow-ups ("wait for merge → deploy → flip the flag").

## Develop

```bash
npm install
npm run build      # bundles to dist/
npm run watch      # rebuild on change
npm test           # vitest unit tests
npm run typecheck  # tsc --noEmit
```

## Load in Chrome

1. `npm run build`
2. `chrome://extensions` → enable Developer mode → **Load unpacked** → select `dist/`.
3. After code changes: `npm run build`, then click the reload icon on the PagePins card.

## Use

- **Pill / bar:** a `📌` pill shows on each page; click it (or `Alt+P`, or the
  toolbar icon) to open the pin bar. Type an item + `Enter`. The checkbox marks an
  item done (click again to reopen); `✕` deletes it (5-second Undo). The
  **Clear all pins** button next to collapse deletes the lot (also undo-able).
  Drag an item onto another to re-order. `Esc` collapses to the pill. Pins are keyed
  to the URL and sync across your Chrome profile; the pill shows the open count, or
  `✓` when the page's items are all done.
- **Overview:** `Ctrl+Alt+P` lists every pinned page; click one to jump to or open it.
- **Settings:** remap hotkeys, toggle the pill, clear all pins.

## Defaults

- Summon/toggle: `Alt+P` · Overview: `Ctrl+Alt+P` (both remappable in Settings)
- GitHub PR/issue sub-tabs share one pin.

## Package for the Chrome Web Store

```bash
npm run package    # builds and zips dist/ into pagepins.zip
```

Upload `pagepins.zip` in the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole).
Listing copy, screenshots, the store icon, and permission justifications live in
[store/listing.md](store/listing.md); the privacy policy is [PRIVACY.md](PRIVACY.md).

## Privacy note

Pin contents render inside a closed shadow root, so page scripts cannot read your
stored pins or the overview. One residual gap: keyboard events are `composed`, so a
hostile page using capture-phase listeners could observe keys as you type into the pin
bar on that page. Don't type secrets into pins on pages you don't trust.

All pin data lives in `chrome.storage.sync` inside your own Chrome profile — nothing
is sent to any server.
