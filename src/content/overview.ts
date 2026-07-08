import { getAllPins } from '../shared/store';
import { PagePin } from '../shared/types';
import { ensureStyle } from './bar';

let overlay: HTMLElement | null = null;
let ovRoot: ShadowRoot | null = null;
let escHandler: ((e: KeyboardEvent) => void) | null = null;

export function isOverviewOpen(): boolean {
  return overlay !== null;
}

export function rowText(pin: PagePin): { title: string; meta: string } {
  const n = pin.items.length;
  const allDone = n > 0 && pin.items.every((i) => i.done);
  const firstOpen = pin.items.find((i) => !i.done)?.text ?? '';
  const tail = allDone ? 'all done ✓' : firstOpen;
  return {
    title: pin.title?.trim() || pin.url,
    meta: `${n} item${n === 1 ? '' : 's'}${tail ? ` · ${tail}` : ''}`,
  };
}

function teardown(): void {
  // Sweep by selector, not just the tracked node — a re-open during the pin fetch must
  // never strand an untracked full-screen overlay.
  ovRoot?.querySelectorAll('.pp-overlay').forEach((n) => n.remove());
  overlay = null;
  ovRoot = null;
  if (escHandler) {
    window.removeEventListener('keydown', escHandler, true);
    escHandler = null;
  }
}

export function closeOverview(): void {
  teardown();
}

export async function openOverview(root: ShadowRoot, onClose: () => void): Promise<void> {
  ensureStyle(root);
  teardown();

  // Mount the shell before awaiting storage so isOverviewOpen() is true for the whole
  // open lifetime — a second hotkey press during the fetch toggles instead of stacking.
  ovRoot = root;
  overlay = document.createElement('div');
  overlay.className = 'pp-overlay';
  const panel = document.createElement('div');
  panel.className = 'pp-ovpanel';
  overlay.appendChild(panel);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { teardown(); onClose(); }
  });
  root.appendChild(overlay);

  escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { teardown(); onClose(); }
  };
  window.addEventListener('keydown', escHandler, true);

  const opened = overlay;
  const pins = await getAllPins();
  if (overlay !== opened) return; // closed (or reopened) while fetching

  const title = document.createElement('div');
  title.className = 'pp-ovtitle';
  title.textContent = `📌 Pinned pages (${pins.length})`;
  panel.appendChild(title);

  if (pins.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'pp-ovempty';
    empty.textContent = 'No pins yet.';
    panel.appendChild(empty);
  }

  for (const pin of pins) {
    const { title: t, meta } = rowText(pin);
    const row = document.createElement('div');
    row.className = 'pp-ovrow';
    const rt = document.createElement('div');
    rt.className = 'pp-ovrowtitle';
    rt.textContent = t;
    const rm = document.createElement('div');
    rm.className = 'pp-ovmeta';
    rm.textContent = meta;
    row.append(rt, rm);
    row.addEventListener('click', () => {
      try {
        // Invalidated extension context (extension reloaded under a live tab) throws.
        void (chrome.runtime.sendMessage({ type: 'open-pin', url: pin.url }) as Promise<unknown> | undefined)?.catch?.(() => {});
      } catch { /* context gone — nothing to jump to */ }
      teardown();
      onClose();
    });
    panel.appendChild(row);
  }
}
