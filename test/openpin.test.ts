import { describe, it, expect, beforeEach } from 'vitest';
import { openPin, tabKey } from '../src/background/openpin';

interface FakeTab { id: number; windowId: number; url: string }

let tabs: FakeTab[];
let activated: number[];
let focusedWindows: number[];
let created: string[];

function installFakeTabs(): void {
  tabs = [];
  activated = [];
  focusedWindows = [];
  created = [];
  (globalThis as unknown as { chrome: unknown }).chrome = {
    tabs: {
      async query() { return tabs; },
      async update(id: number, props: { active?: boolean }) {
        if (props.active) activated.push(id);
      },
      async create({ url }: { url: string }) { created.push(url); },
    },
    windows: {
      async update(id: number) { focusedWindows.push(id); },
    },
  };
}

describe('tabKey', () => {
  it('canonicalizes like the pin match key and falls back for unparseable urls', () => {
    expect(tabKey('https://github.com/o/r/pull/123/files?diff=split'))
      .toBe('https://github.com/o/r/pull/123');
    expect(tabKey('not a url#frag')).toBe('not a url');
  });
});

describe('openPin', () => {
  beforeEach(() => { installFakeTabs(); });

  it('focuses an existing tab on the same logical page', async () => {
    tabs.push({ id: 7, windowId: 42, url: 'https://github.com/o/r/pull/123' });
    await openPin('https://github.com/o/r/pull/123/files?diff=split');
    expect(activated).toEqual([7]);
    expect(focusedWindows).toEqual([42]);
    expect(created).toEqual([]);
  });

  it('opens a new tab when no tab matches', async () => {
    tabs.push({ id: 7, windowId: 42, url: 'https://github.com/o/r/pull/999' });
    await openPin('https://github.com/o/r/pull/123');
    expect(activated).toEqual([]);
    expect(created).toEqual(['https://github.com/o/r/pull/123']);
  });
});
