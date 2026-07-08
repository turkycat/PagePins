import { matchKeyForUrl } from '../shared/match';
import { PagePin, Settings } from '../shared/types';
import {
  getPin, savePin, deletePin, getSettings, onChanged, storageKeyFor, QuotaError,
} from '../shared/store';
import { renderPill, renderBar, clearSurfaces, clearToasts, showToast } from './bar';
import { comboHasModifier, eventMatchesCombo } from './hotkeys';
import { openOverview, closeOverview, isOverviewOpen } from './overview';

export interface Controller {
  reload(): Promise<void>;
  summonToggle(): void;
  onKeydown(e: KeyboardEvent): void;
  notifyLocationChange(): void;
}

export async function startController(root: ShadowRoot): Promise<Controller> {
  let settings: Settings = await getSettings();
  let matchKey = '';
  let pin: PagePin | null = null;
  let mode: 'pill' | 'bar' = 'pill';
  let lastRemoved: PagePin | null = null;
  let lastHref = location.href;

  function shortLabel(url: string): string {
    try {
      const u = new URL(url);
      const m = u.pathname.match(/\/(?:pull|issues)\/(\d+)/);
      if (m) return `#${m[1]}`;
      return u.hostname.replace(/^www\./, '');
    } catch {
      return 'PagePins';
    }
  }

  function label(): string {
    return pin ? shortLabel(pin.url) : 'PagePins';
  }

  function render(opts: { focus?: boolean; draft?: string } = {}): void {
    if (isOverviewOpen()) return; // overlay owns the screen
    const count = pin?.items.length ?? 0;
    const open = pin?.items.filter((i) => !i.done).length ?? 0;
    if (mode === 'bar') {
      renderBar(
        root, pin, label(),
        {
          onAdd: addItem,
          onToggleDone: toggleDone,
          onRemove: removeItem,
          onReorder: moveItem,
          onClearAll: clearAllDone,
          onCollapse: collapse,
        },
        opts,
      );
    } else if (settings.showPill || count > 0) {
      renderPill(root, open, { onExpand: expand }, count > 0 && open === 0);
    } else {
      clearSurfaces(root);
    }
  }

  function expand(): void { mode = 'bar'; render({ focus: true }); }
  function collapse(): void { mode = 'pill'; render(); }
  function toggle(): void {
    mode = mode === 'bar' ? 'pill' : 'bar';
    render(mode === 'bar' ? { focus: true } : {});
  }

  function newId(): string {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    // randomUUID is secure-context-only; http:// pages take this path.
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
      b.toString(16).padStart(2, '0')).join('');
  }

  async function addItem(text: string): Promise<void> {
    // Re-read before writing: a whole-snapshot save from stale local state would
    // silently drop items added concurrently in another tab or synced device.
    const base = (await getPin(matchKey))
      ?? pin
      ?? { matchKey, url: location.href, title: document.title, items: [], updatedAt: Date.now() };
    const next: PagePin = {
      ...base,
      items: [...base.items, { id: newId(), text, createdAt: Date.now() }],
      updatedAt: Date.now(),
    };
    try {
      await savePin(next);
    } catch (e) {
      const msg = e instanceof QuotaError
        ? 'Pin too large to sync — trim items'
        : "PagePins couldn't save — sync storage full or rate-limited";
      mode = 'bar';
      render({ focus: true, draft: text }); // give the typed text back
      showToast(root, msg, undefined, 4000);
      return;
    }
    pin = next;
    render();
  }

  async function removeItem(id: string): Promise<void> {
    if (!pin) return;
    const undoSnapshot = structuredClone(pin);
    const base = (await getPin(pin.matchKey)) ?? pin;
    const next: PagePin = {
      ...base,
      items: base.items.filter((i) => i.id !== id),
      updatedAt: Date.now(),
    };
    try {
      if (next.items.length === 0) {
        await deletePin(next.matchKey);
        pin = null;
        mode = 'pill';
      } else {
        await savePin(next);
        pin = next;
      }
    } catch {
      render();
      showToast(root, "PagePins couldn't save — item not removed", undefined, 4000);
      return;
    }
    lastRemoved = undoSnapshot;
    render();
    showToast(root, 'Item removed', { label: 'Undo', onClick: () => void undoRemove() });
  }

  async function toggleDone(id: string): Promise<void> {
    if (!pin) return;
    const base = (await getPin(pin.matchKey)) ?? pin;
    const items = base.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    const next: PagePin = { ...base, items, updatedAt: Date.now() };
    try {
      await savePin(next);
    } catch {
      render();
      showToast(root, "PagePins couldn't save", undefined, 4000);
      return;
    }
    pin = next;
    render();
  }

  async function clearAllDone(): Promise<void> {
    if (!pin) return;
    const undoSnapshot = structuredClone(pin);
    try {
      await deletePin(pin.matchKey);
    } catch {
      showToast(root, "PagePins couldn't clear the pin", undefined, 4000);
      return;
    }
    pin = null;
    mode = 'pill';
    lastRemoved = undoSnapshot;
    render();
    showToast(root, 'Pin cleared', { label: 'Undo', onClick: () => void undoRemove() });
  }

  async function moveItem(fromId: string, toId: string): Promise<void> {
    if (!pin || fromId === toId) return;
    const base = (await getPin(pin.matchKey)) ?? pin;
    const items = [...base.items];
    const fromIdx = items.findIndex((i) => i.id === fromId);
    const toIdx = items.findIndex((i) => i.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = items.splice(fromIdx, 1);
    // Post-removal, toIdx lands the item after the target when dragging rightward and
    // before it when dragging leftward — the standard sortable-list feel.
    items.splice(toIdx, 0, moved);
    const next: PagePin = { ...base, items, updatedAt: Date.now() };
    try {
      await savePin(next);
    } catch {
      render();
      showToast(root, "PagePins couldn't save — order unchanged", undefined, 4000);
      return;
    }
    pin = next;
    render();
  }

  async function undoRemove(): Promise<void> {
    // Undo is only valid for the page it happened on — never resurrect across navigation.
    if (!lastRemoved || lastRemoved.matchKey !== matchKey) return;
    const restore = lastRemoved;
    lastRemoved = null;
    try {
      await savePin(restore);
    } catch {
      showToast(root, "PagePins couldn't restore the item", undefined, 4000);
      return;
    }
    pin = restore;
    mode = 'bar';
    render();
  }

  function isEditable(el: unknown): boolean {
    if (!(el instanceof HTMLElement)) return false;
    return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
  }

  function inEditableTarget(e: KeyboardEvent): boolean {
    // For a window listener, composedPath()[0] retargets to the closed-root HOST when
    // the user types in our own bar input — root.activeElement sees through that.
    return isEditable(root.activeElement) || isEditable(e.composedPath()[0]);
  }

  // A modifier-less binding (options page allows it) must not fire while typing, and
  // AltGr chords report as Ctrl+Alt on Windows layouts — don't eat typed characters.
  function comboHit(e: KeyboardEvent, combo: string): boolean {
    if (e.getModifierState?.('AltGraph')) return false;
    return eventMatchesCombo(e, combo) && (comboHasModifier(combo) || !inEditableTarget(e));
  }

  function onKeydown(e: KeyboardEvent): void {
    if (comboHit(e, settings.overviewHotkey)) {
      e.preventDefault();
      if (isOverviewOpen()) { closeOverview(); render(); }
      else { void openOverview(root, render); }
      return;
    }
    if (comboHit(e, settings.summonHotkey)) {
      e.preventDefault();
      if (isOverviewOpen()) closeOverview();
      toggle();
    }
  }

  function summonToggle(): void {
    if (isOverviewOpen()) closeOverview();
    toggle();
  }

  let reloadSeq = 0;

  async function reload(): Promise<void> {
    const seq = ++reloadSeq;
    const key = matchKeyForUrl(location.href);
    if (key === matchKey) {
      // Same logical page (e.g. a GitHub PR sub-tab) — keep mode, draft, and toasts.
      render();
      return;
    }
    lastRemoved = null;
    clearToasts(root); // a live Undo toast must not survive navigation
    const loaded = await getPin(key);
    if (seq !== reloadSeq) return; // a newer navigation superseded this load
    matchKey = key;
    pin = loaded;
    mode = pin && pin.items.length > 0 ? 'bar' : 'pill';
    render();
  }

  function notifyLocationChange(): void {
    if (location.href === lastHref) return;
    lastHref = location.href;
    void reload();
  }

  onChanged((changes) => {
    const pinChange = changes[storageKeyFor(matchKey)];
    if (pinChange) {
      const next = (pinChange.newValue as PagePin | undefined) ?? null;
      // Ignore a hash-collision write from another page, and skip the echo of our own
      // writes (deep-equal state) so the bar isn't rebuilt under the user.
      const collision = next !== null && next.matchKey !== matchKey;
      if (!collision && JSON.stringify(next) !== JSON.stringify(pin)) {
        pin = next;
        if (mode === 'bar' && !pin) mode = 'pill';
        // The pre-removal snapshot is stale now — Undo would erase the remote edit.
        lastRemoved = null;
        clearToasts(root);
        render();
      }
    }
    if (changes['settings']) {
      settings = { ...settings, ...(changes['settings'].newValue as Partial<Settings>) };
      render();
    }
  });

  await reload();
  return { reload, summonToggle, onKeydown, notifyLocationChange };
}
