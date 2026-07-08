# Chrome Web Store listing copy

Everything the developer dashboard asks for, ready to paste.

## Store icon

`store/store-icon-128.png` (128×128). The manifest icons in `icons/` ship inside the
package itself.

## Screenshots (1280×800)

- `store/screenshot-bar.png` — the pin bar on a page: checked-off item, open items,
  add input, Clear all pins, collapse pin.
- `store/screenshot-overview.png` — the Ctrl+Alt+P overview listing every pinned page.

## Short description (≤132 chars)

> Pin a durable checklist to any web page. Track PR follow-ups where they live, and
> sync your pins across devices.

## Detailed description

> Ever close a pull request tab and forget the follow-up? PagePins attaches a small
> checklist — a "pin" — directly to the page it belongs to.
>
> 📌 A slim pill sits on each page; click it (or press Alt+P) to open the pin bar
> and jot items: "wait for merge", "deploy to prod", "update the flag".
>
> ✓ Check items off with a satisfying pop — or ✕ to delete (with undo). Drag to
> re-order. Clear the whole pin when you're done.
>
> 🔭 Press Ctrl+Alt+P for an overview of every pinned page — click one to jump to
> its tab, or reopen it if the tab is long gone.
>
> 🔁 Pins are keyed to the URL (GitHub PR sub-tabs share one pin) and sync across
> every machine signed into your Chrome profile.
>
> ⚙️ Remap both hotkeys, hide the pill, or wipe everything from the options page.
>
> Private by design: no servers, no accounts, no analytics. Your pins live in your
> own Chrome storage and nowhere else.

## Category

Productivity → Tools. Language: English.

## Single-purpose statement

> PagePins lets the user attach a personal checklist to individual web pages and
> revisit those pages. All functionality (the in-page checklist UI, the overview,
> settings, and sync storage) serves that single purpose.

## Permission justifications

| Permission | Justification |
| --- | --- |
| `storage` | Pins and settings are persisted in `chrome.storage.sync` so they survive tab/browser restarts and follow the user's Chrome profile across devices. No data is sent anywhere else. |
| `contextMenus` | Adds one "Open PagePins bar" item to the toolbar icon's context menu as an alternative way to open the checklist. |
| `scripting` | When the toolbar icon is clicked on a tab that was open before install/update, the content script is injected on demand so the click works without a page refresh. |
| Host permissions (`http://*/*`, `https://*/*`) | The core feature is drawing the user's own checklist on whatever page they choose to pin — that page can be any site, so the content script must be able to run on any http(s) URL. It renders UI and reads only `location.href`/`document.title` to key and label the pin; page content is never read, collected, or transmitted. |
| Remote code | None — all code ships in the package (esbuild-bundled, no CDNs, no eval). |

## Data-use disclosures (Privacy tab)

- Collects: **Website content?** No. **Personally identifiable info?** No.
  **User activity?** No. The only stored data is user-authored checklist text plus
  the URL/title of pages the user explicitly pins — stored locally in
  `chrome.storage.sync`, never transmitted to the developer or any third party.
- Certify: data is not sold, not used for unrelated purposes, not used for
  creditworthiness.
- Privacy policy URL: `https://github.com/turkycat/PagePins/blob/main/PRIVACY.md`
