import { describe, it, expect, beforeEach } from 'vitest';
import { renderPill, renderBar, clearSurfaces, showToast } from '../src/content/bar';
import { PagePin, PinItem } from '../src/shared/types';

function makeRoot(): ShadowRoot {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host.attachShadow({ mode: 'open' });
}
const samplePin = (items?: PinItem[]): PagePin => ({
  matchKey: 'k', url: 'https://x/pull/1', title: 'T', updatedAt: 1,
  items: items ?? [{ id: 'a', text: 'merge', createdAt: 1 }, { id: 'b', text: 'deploy', createdAt: 1 }],
});

type Handlers = Parameters<typeof renderBar>[3];
const handlers = (over: Partial<Handlers> = {}): Handlers => ({
  onAdd: () => {}, onToggleDone: () => {}, onRemove: () => {},
  onReorder: () => {}, onClearAll: () => {}, onCollapse: () => {},
  ...over,
});

describe('bar rendering', () => {
  let root: ShadowRoot;
  beforeEach(() => { root = makeRoot(); });

  it('renders a pill with the open count', () => {
    renderPill(root, 3, { onExpand: () => {} });
    expect(root.querySelector('.pp-pill')?.textContent).toContain('3');
  });

  it('renders a checkmark pill when everything is done', () => {
    renderPill(root, 0, { onExpand: () => {} }, true);
    expect(root.querySelector('.pp-pill')?.textContent).toBe('📌 ✓');
  });

  it('expand handler fires on pill click', () => {
    let fired = false;
    renderPill(root, 0, { onExpand: () => { fired = true; } });
    (root.querySelector('.pp-pill') as HTMLElement).click();
    expect(fired).toBe(true);
  });

  it('renders one row per item', () => {
    renderBar(root, samplePin(), '#1', handlers());
    expect(root.querySelectorAll('.pp-item').length).toBe(2);
  });

  it('the check fires onToggleDone; the X fires onRemove', () => {
    const toggled: string[] = [];
    const removed: string[] = [];
    renderBar(root, samplePin(), '#1', handlers({
      onToggleDone: (id) => toggled.push(id),
      onRemove: (id) => removed.push(id),
    }));
    (root.querySelector('.pp-check') as HTMLElement).click();
    (root.querySelector('.pp-x') as HTMLElement).click();
    expect(toggled).toEqual(['a']);
    expect(removed).toEqual(['a']);
  });

  it('done items render checked and struck through', () => {
    renderBar(root, samplePin([
      { id: 'a', text: 'merge', createdAt: 1, done: true },
      { id: 'b', text: 'deploy', createdAt: 1 },
    ]), '#1', handlers());
    const chips = root.querySelectorAll('.pp-item');
    expect(chips[0].classList.contains('pp-done')).toBe(true);
    expect(chips[0].querySelector('.pp-check')?.textContent).toBe('✓');
    expect(chips[1].classList.contains('pp-done')).toBe(false);
  });

  it('shows Clear all pins whenever items exist, and it fires onClearAll', () => {
    let cleared = 0;
    renderBar(root, samplePin(), '#1', handlers({ onClearAll: () => { cleared++; } }));
    const btn = root.querySelector('.pp-clearall') as HTMLElement;
    expect(btn?.textContent).toBe('Clear all pins');
    btn.click();
    expect(cleared).toBe(1);
  });

  it('hides Clear all pins when the bar has no items', () => {
    renderBar(root, null, 'PagePins', handlers());
    expect(root.querySelector('.pp-clearall')).toBeNull();
  });

  it('dragging one chip onto another fires onReorder with both ids', () => {
    const moves: Array<[string, string]> = [];
    renderBar(root, samplePin(), '#1', handlers({ onReorder: (f, t) => moves.push([f, t]) }));
    const chips = root.querySelectorAll('.pp-item');
    chips[0].dispatchEvent(new Event('dragstart', { bubbles: true }));
    chips[1].dispatchEvent(new Event('drop', { bubbles: true }));
    expect(moves).toEqual([['a', 'b']]);
  });

  it('dropping a chip on itself does not fire onReorder', () => {
    const moves: Array<[string, string]> = [];
    renderBar(root, samplePin(), '#1', handlers({ onReorder: (f, t) => moves.push([f, t]) }));
    const chips = root.querySelectorAll('.pp-item');
    chips[0].dispatchEvent(new Event('dragstart', { bubbles: true }));
    chips[0].dispatchEvent(new Event('drop', { bubbles: true }));
    expect(moves).toEqual([]);
  });

  it('clearSurfaces removes pill and bar but not toast', () => {
    renderBar(root, samplePin(), '#1', handlers());
    showToast(root, 'hi');
    clearSurfaces(root);
    expect(root.querySelector('.pp-bar')).toBeNull();
    expect(root.querySelector('.pp-toast')).not.toBeNull();
  });
});
