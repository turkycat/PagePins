import { Controller, startController } from './controller';

const HOST_ID = 'pagepins-host';

function mount(): ShadowRoot {
  // Closed root: page JS must not be able to read pin contents. A leftover host from a
  // previous injection has an unreachable closed root, so replace it wholesale.
  document.getElementById(HOST_ID)?.remove();
  const host = document.createElement('div');
  host.id = HOST_ID;
  document.documentElement.appendChild(host);
  return host.attachShadow({ mode: 'closed' });
}

function watchSpaNav(controller: Controller): void {
  // pp:locationchange comes from nav-bridge.ts in the MAIN world; popstate crosses
  // worlds natively, so listen for both here.
  const check = () => controller.notifyLocationChange();
  window.addEventListener('pp:locationchange', check);
  window.addEventListener('popstate', check);
}

async function init(): Promise<void> {
  if (window.top !== window) return; // top frame only
  const controller = await startController(mount());

  window.addEventListener('keydown', (e) => controller.onKeydown(e), true);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'toggle-bar') controller.summonToggle();
  });

  watchSpaNav(controller);
}

void init();
