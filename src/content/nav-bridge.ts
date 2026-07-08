// Runs in the page's MAIN world: content scripts live in an isolated world, so a history
// patch there never sees the page router's pushState/replaceState calls. This bridge
// patches them where they actually run and signals the isolated world via a DOM event
// (events cross worlds; JS objects don't).
const fire = () => window.dispatchEvent(new Event('pp:locationchange'));

for (const method of ['pushState', 'replaceState'] as const) {
  const orig = history[method];
  history[method] = function (this: History, ...args: unknown[]) {
    const r = (orig as (...a: unknown[]) => unknown).apply(this, args);
    fire();
    return r;
  } as History[typeof method];
}

window.addEventListener('popstate', fire);
