import { describe, it, expect, beforeEach } from 'vitest';
import { installFakeChrome } from './helpers/fakeChrome';
import { savePin } from '../src/shared/store';
import { openOverview, isOverviewOpen, closeOverview, rowText } from '../src/content/overview';
import { PagePin } from '../src/shared/types';

function makeRoot(): ShadowRoot {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host.attachShadow({ mode: 'open' });
}
const p = (mk: string, texts: string[]): PagePin => ({
  matchKey: mk, url: mk, title: 'Title ' + mk, updatedAt: 1,
  items: texts.map((t, i) => ({ id: `${mk}-${i}`, text: t, createdAt: 1 })),
});

describe('rowText', () => {
  it('summarizes items and falls back to url for a blank title', () => {
    expect(rowText({ ...p('u', ['a', 'b']), title: '' })).toEqual({ title: 'u', meta: '2 items · a' });
    expect(rowText(p('u', ['solo'])).meta).toBe('1 item · solo');
  });

  it('leads with the first open item and celebrates all-done', () => {
    const base = p('u', ['a', 'b']);
    const oneDone = { ...base, items: [{ ...base.items[0], done: true }, base.items[1]] };
    expect(rowText(oneDone).meta).toBe('2 items · b');
    const allDone = { ...base, items: base.items.map((i) => ({ ...i, done: true })) };
    expect(rowText(allDone).meta).toBe('2 items · all done ✓');
  });
});

describe('overview overlay', () => {
  beforeEach(() => {
    installFakeChrome();
    (globalThis as any).chrome.runtime = { sendMessage: () => {} };
  });

  it('renders a row per pin', async () => {
    const root = makeRoot();
    await savePin(p('https://x/pull/1', ['merge']));
    await savePin(p('https://x/pull/2', ['deploy', 'leash']));
    await openOverview(root, () => {});
    expect(isOverviewOpen()).toBe(true);
    expect(root.querySelectorAll('.pp-ovrow').length).toBe(2);
    closeOverview();
    expect(isOverviewOpen()).toBe(false);
  });
});
