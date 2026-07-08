import { PagePin, Settings, DEFAULT_SETTINGS } from './types';

const PIN_PREFIX = 'pin:';
const SETTINGS_KEY = 'settings';
export const MAX_PIN_BYTES = 8000;

export class QuotaError extends Error {}

function fnv1a(s: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function hashKey(s: string): string {
  // Two independently-seeded 32-bit passes -> 64 bits. At 32 bits a birthday collision
  // was plausible and savePin would silently clobber the colliding page's pin.
  return `${fnv1a(s, 0x811c9dc5).toString(36)}${fnv1a(s, 0x0badf00d).toString(36)}`;
}

export function storageKeyFor(matchKey: string): string {
  return `${PIN_PREFIX}${hashKey(matchKey)}`;
}

export function serializedSize(pin: PagePin): number {
  return new TextEncoder().encode(JSON.stringify(pin)).length;
}

export async function getPin(matchKey: string): Promise<PagePin | null> {
  const key = storageKeyFor(matchKey);
  const res = await chrome.storage.sync.get(key);
  const stored = res[key] as PagePin | undefined;
  // Keys are truncated 32-bit hashes; verify so a collision reads as missing instead of
  // silently serving (and later clobbering) another page's pin.
  return stored && stored.matchKey === matchKey ? stored : null;
}

export async function savePin(pin: PagePin): Promise<void> {
  if (serializedSize(pin) > MAX_PIN_BYTES) {
    throw new QuotaError('Pin is too large to sync (over 8 KB). Trim some items.');
  }
  await chrome.storage.sync.set({ [storageKeyFor(pin.matchKey)]: pin });
}

export async function deletePin(matchKey: string): Promise<void> {
  await chrome.storage.sync.remove(storageKeyFor(matchKey));
}

export async function getAllPins(): Promise<PagePin[]> {
  const all = await chrome.storage.sync.get(null);
  return Object.entries(all)
    .filter(([k]) => k.startsWith(PIN_PREFIX))
    .map(([, v]) => v as PagePin)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function clearAllPins(): Promise<number> {
  const all = await chrome.storage.sync.get(null);
  const keys = Object.keys(all).filter((k) => k.startsWith(PIN_PREFIX));
  await chrome.storage.sync.remove(keys);
  return keys.length;
}

export async function getSettings(): Promise<Settings> {
  const res = await chrome.storage.sync.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(res[SETTINGS_KEY] as Partial<Settings> | undefined) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

type ChangeMap = Record<string, { oldValue?: unknown; newValue?: unknown }>;

export function onChanged(cb: (changes: ChangeMap) => void): () => void {
  const listener = (changes: ChangeMap, area: string) => {
    if (area === 'sync') cb(changes);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
