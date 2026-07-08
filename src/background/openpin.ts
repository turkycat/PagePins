import { matchKeyForUrl } from '../shared/match';

export function tabKey(url: string): string {
  try {
    return matchKeyForUrl(url);
  } catch {
    return url.split('#')[0];
  }
}

export async function openPin(url: string): Promise<void> {
  // Match by pin key, not raw URL — a tab on /pull/123 IS the pin saved from
  // /pull/123/files?diff=split.
  const target = tabKey(url);
  const tabs = await chrome.tabs.query({});
  const found = tabs.find((t) => t.url && tabKey(t.url) === target);
  if (found?.id != null) {
    await chrome.tabs.update(found.id, { active: true });
    if (found.windowId != null) await chrome.windows.update(found.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }
}
