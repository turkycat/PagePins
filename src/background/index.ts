import { openPin } from './openpin';

const MENU_ID = 'pagepins-open';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Open PagePins bar',
    contexts: ['action'],
  });
});

chrome.action.onClicked.addListener((tab) => {
  toggleOnTab(tab.id);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID) toggleOnTab(tab?.id);
});

async function toggleOnTab(tabId?: number): Promise<void> {
  if (tabId == null) return;
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'toggle-bar' });
  } catch {
    // No receiver — the tab predates install/reload. Inject and retry; restricted pages
    // (chrome://, Web Store) throw again and stay a quiet no-op.
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
      await chrome.scripting.executeScript({ target: { tabId }, files: ['nav-bridge.js'], world: 'MAIN' });
      await chrome.tabs.sendMessage(tabId, { type: 'toggle-bar' });
    } catch { /* restricted page */ }
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'open-pin' && typeof msg.url === 'string') {
    void openPin(msg.url);
  }
});
