import { describe, it, expect, beforeEach } from 'vitest';
import { installFakeChrome } from './helpers/fakeChrome';
import {
  getPin, savePin, deletePin, getAllPins, getSettings, saveSettings,
  storageKeyFor, onChanged, QuotaError, clearAllPins,
} from '../src/shared/store';
import { DEFAULT_SETTINGS, PagePin } from '../src/shared/types';

function pin(matchKey: string, n = 1): PagePin {
  return {
    matchKey, url: matchKey, title: 'T', updatedAt: Date.now(),
    items: Array.from({ length: n }, (_, i) => ({ id: `i${i}`, text: `t${i}`, createdAt: 1 })),
  };
}

describe('store', () => {
  beforeEach(() => { installFakeChrome(); });

  it('returns null for an unknown pin', async () => {
    expect(await getPin('https://ex.com/x')).toBeNull();
  });

  it('round-trips a pin', async () => {
    const p = pin('https://ex.com/a');
    await savePin(p);
    expect(await getPin('https://ex.com/a')).toEqual(p);
  });

  it('deletes a pin', async () => {
    const p = pin('https://ex.com/a');
    await savePin(p);
    await deletePin('https://ex.com/a');
    expect(await getPin('https://ex.com/a')).toBeNull();
  });

  it('lists all pins newest-first and ignores non-pin keys', async () => {
    await saveSettings(DEFAULT_SETTINGS);
    const a = { ...pin('https://ex.com/a'), updatedAt: 100 };
    const b = { ...pin('https://ex.com/b'), updatedAt: 200 };
    await savePin(a); await savePin(b);
    const all = await getAllPins();
    expect(all.map((p) => p.matchKey)).toEqual(['https://ex.com/b', 'https://ex.com/a']);
  });

  it('merges settings over defaults', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
    await saveSettings({ ...DEFAULT_SETTINGS, showPill: false });
    expect((await getSettings()).showPill).toBe(false);
  });

  it('throws QuotaError for oversized pins', async () => {
    const big = pin('https://ex.com/big');
    big.items = [{ id: 'x', text: 'z'.repeat(9000), createdAt: 1 }];
    await expect(savePin(big)).rejects.toBeInstanceOf(QuotaError);
  });

  it('notifies onChanged subscribers', async () => {
    let hit = 0;
    const off = onChanged(() => { hit++; });
    await savePin(pin('https://ex.com/a'));
    expect(hit).toBe(1);
    off();
    await savePin(pin('https://ex.com/b'));
    expect(hit).toBe(1);
  });

  it('returns null when the stored pin belongs to a colliding matchKey', async () => {
    const foreign = pin('https://ex.com/other');
    await chrome.storage.sync.set({ [storageKeyFor('https://ex.com/mine')]: foreign });
    expect(await getPin('https://ex.com/mine')).toBeNull();
  });

  it('clearAllPins removes every pin but leaves settings', async () => {
    await saveSettings(DEFAULT_SETTINGS);
    await savePin(pin('https://ex.com/a'));
    await savePin(pin('https://ex.com/b'));
    expect(await clearAllPins()).toBe(2);
    expect(await getAllPins()).toEqual([]);
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('derives distinct storage keys', () => {
    expect(storageKeyFor('a')).not.toBe(storageKeyFor('b'));
    expect(storageKeyFor('a').startsWith('pin:')).toBe(true);
  });
});
