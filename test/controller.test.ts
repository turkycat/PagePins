import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installFakeChrome } from './helpers/fakeChrome';
import { startController } from '../src/content/controller';
import { savePin, getPin, storageKeyFor, saveSettings } from '../src/shared/store';
import { matchKeyForUrl } from '../src/shared/match';
import { DEFAULT_SETTINGS, PagePin } from '../src/shared/types';

function makeRoot(): ShadowRoot {
  const host = document.createElement('div');
  document.body.appendChild(host);
  // closed, like production mount() — composedPath retargeting differs from open roots
  return host.attachShadow({ mode: 'closed' });
}

function pinFor(url: string, texts: string[]): PagePin {
  const matchKey = matchKeyForUrl(url);
  return {
    matchKey, url, title: 'T', updatedAt: Date.now(),
    items: texts.map((t, i) => ({ id: `${matchKey}-${i}`, text: t, createdAt: 1 })),
  };
}

const input = (root: ShadowRoot) => root.querySelector('.pp-add') as HTMLInputElement;
const pressEnter = (el: HTMLInputElement) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

describe('content controller', () => {
  let root: ShadowRoot;

  beforeEach(() => {
    installFakeChrome();
    history.replaceState(null, '', '/');
    root = makeRoot();
  });

  it('adds an item through the bar input and persists it', async () => {
    const c = await startController(root);
    c.summonToggle();
    input(root).value = 'wait for merge';
    pressEnter(input(root));
    await vi.waitFor(async () => {
      const pin = await getPin(matchKeyForUrl(location.href));
      expect(pin?.items.map((i) => i.text)).toEqual(['wait for merge']);
    });
    expect(root.querySelectorAll('.pp-item').length).toBe(1);
  });

  it('rolls back and toasts when the pin exceeds the size guard', async () => {
    const c = await startController(root);
    c.summonToggle();
    input(root).value = 'z'.repeat(9000);
    pressEnter(input(root));
    await vi.waitFor(() => {
      expect(root.querySelector('.pp-toast')?.textContent).toContain('too large');
    });
    expect(await getPin(matchKeyForUrl(location.href))).toBeNull();
    expect(root.querySelectorAll('.pp-item').length).toBe(0);
    expect(input(root).value).toBe('z'.repeat(9000)); // typed text handed back, not lost
  });

  it('does not steal focus when a pinned page loads', async () => {
    await savePin(pinFor(location.href, ['a']));
    await startController(root);
    expect(root.querySelector('.pp-bar')).not.toBeNull();
    expect(root.activeElement).toBeNull();
  });

  it('focuses the input when explicitly summoned', async () => {
    const c = await startController(root);
    c.summonToggle();
    expect(root.activeElement).toBe(input(root));
  });

  it('removing the last item deletes the pin and reverts to the pill', async () => {
    await savePin(pinFor(location.href, ['solo']));
    await startController(root);
    (root.querySelector('.pp-x') as HTMLElement).click();
    await vi.waitFor(async () => {
      expect(await getPin(matchKeyForUrl(location.href))).toBeNull();
    });
    expect(root.querySelector('.pp-pill')).not.toBeNull();
    expect(root.querySelector('.pp-bar')).toBeNull();
  });

  it('undo restores the removed item on the same page', async () => {
    await savePin(pinFor(location.href, ['a', 'b']));
    await startController(root);
    (root.querySelector('.pp-x') as HTMLElement).click();
    await vi.waitFor(() => {
      expect(root.querySelector('.pp-toast button')).not.toBeNull();
    });
    (root.querySelector('.pp-toast button') as HTMLElement).click();
    await vi.waitFor(async () => {
      const pin = await getPin(matchKeyForUrl(location.href));
      expect(pin?.items.length).toBe(2);
    });
  });

  it('dragging a chip onto another persists the new order', async () => {
    await savePin(pinFor(location.href, ['a', 'b', 'c']));
    await startController(root);
    const chips = root.querySelectorAll('.pp-item');
    chips[0].dispatchEvent(new Event('dragstart', { bubbles: true }));
    chips[2].dispatchEvent(new Event('drop', { bubbles: true }));
    await vi.waitFor(async () => {
      const pin = await getPin(matchKeyForUrl(location.href));
      expect(pin?.items.map((i) => i.text)).toEqual(['b', 'c', 'a']);
    });
    const rendered = [...root.querySelectorAll('.pp-text')].map((n) => n.textContent);
    expect(rendered).toEqual(['b', 'c', 'a']);
  });

  it('checking an item marks it done, persists, and is reversible', async () => {
    await savePin(pinFor(location.href, ['a', 'b']));
    await startController(root);
    (root.querySelector('.pp-check') as HTMLElement).click();
    await vi.waitFor(async () => {
      const pin = await getPin(matchKeyForUrl(location.href));
      expect(pin?.items[0].done).toBe(true);
      expect(pin?.items[1].done).toBeUndefined();
    });
    expect(root.querySelectorAll('.pp-item')[0].classList.contains('pp-done')).toBe(true);
    (root.querySelectorAll('.pp-check')[0] as HTMLElement).click(); // reopen
    await vi.waitFor(async () => {
      const pin = await getPin(matchKeyForUrl(location.href));
      expect(pin?.items[0].done).toBe(false);
    });
  });

  it('Clear all pins deletes the pin with undo', async () => {
    await savePin(pinFor(location.href, ['a', 'b']));
    await startController(root);
    (root.querySelectorAll('.pp-check')[0] as HTMLElement).click();
    await vi.waitFor(() => {
      expect(root.querySelectorAll('.pp-item.pp-done').length).toBe(1);
    });
    (root.querySelector('.pp-clearall') as HTMLElement).click();
    await vi.waitFor(async () => {
      expect(await getPin(matchKeyForUrl(location.href))).toBeNull();
    });
    expect(root.querySelector('.pp-pill')).not.toBeNull();
    (root.querySelector('.pp-toast button') as HTMLElement).click(); // undo
    await vi.waitFor(async () => {
      const pin = await getPin(matchKeyForUrl(location.href));
      expect(pin?.items.map((i) => i.done)).toEqual([true, undefined]);
    });
  });

  it('the pill shows a checkmark when everything is done', async () => {
    await savePin({
      ...pinFor(location.href, ['a']),
      items: [{ id: 'x', text: 'a', createdAt: 1, done: true }],
    });
    const c = await startController(root);
    c.summonToggle(); // bar -> pill
    expect(root.querySelector('.pp-pill')?.textContent).toBe('📌 ✓');
  });

  it('navigation clears the undo toast and reloads the new page pin', async () => {
    const originalUrl = location.href;
    await savePin(pinFor(originalUrl, ['a', 'b']));
    await savePin(pinFor(new URL('/other', originalUrl).toString(), ['elsewhere']));
    const c = await startController(root);
    (root.querySelector('.pp-x') as HTMLElement).click();
    await vi.waitFor(() => {
      expect(root.querySelector('.pp-toast button')).not.toBeNull();
    });
    history.pushState(null, '', '/other');
    c.notifyLocationChange();
    await vi.waitFor(() => {
      expect(root.querySelector('.pp-toast')).toBeNull();
      expect(root.querySelector('.pp-bar')?.textContent).toContain('elsewhere');
    });
    expect((await getPin(matchKeyForUrl(originalUrl)))?.items.length).toBe(1);
  });

  it('a remote update to the current pin keeps the in-progress draft', async () => {
    await savePin(pinFor(location.href, ['a']));
    await startController(root);
    input(root).value = 'half-typed';
    await savePin(pinFor(location.href, ['a', 'from-other-device']));
    await vi.waitFor(() => {
      expect(root.querySelectorAll('.pp-item').length).toBe(2);
    });
    expect(input(root).value).toBe('half-typed');
  });

  it('a bare-key hotkey does not fire while typing in the pin bar itself', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, summonHotkey: 'P' });
    const c = await startController(root);
    const fwd = (e: KeyboardEvent) => c.onKeydown(e);
    window.addEventListener('keydown', fwd, true);
    c.summonToggle();
    input(root).value = 'ty';
    input(root).dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyP', key: 'p', bubbles: true, composed: true }),
    );
    window.removeEventListener('keydown', fwd, true);
    expect(root.querySelector('.pp-bar')).not.toBeNull();
    expect(input(root).value).toBe('ty');
  });

  it('same-page SPA navigation keeps the bar and the draft', async () => {
    const c = await startController(root);
    c.summonToggle();
    input(root).value = 'draft';
    history.pushState(null, '', '/?tab=files'); // query is stripped — same matchKey
    c.notifyLocationChange();
    await new Promise((r) => setTimeout(r, 10));
    expect(root.querySelector('.pp-bar')).not.toBeNull();
    expect(input(root).value).toBe('draft');
  });

  it('ignores a hash-collision write to the same storage key', async () => {
    await savePin(pinFor(location.href, ['mine']));
    await startController(root);
    const key = storageKeyFor(matchKeyForUrl(location.href));
    const foreign = pinFor('https://elsewhere.example/x', ['theirs']);
    await chrome.storage.sync.set({ [key]: foreign });
    await new Promise((r) => setTimeout(r, 0));
    expect(root.querySelector('.pp-bar')?.textContent).toContain('mine');
    expect(root.querySelector('.pp-bar')?.textContent).not.toContain('theirs');
  });
});
