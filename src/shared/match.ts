interface Canonicalizer {
  test: (u: URL) => boolean;
  transform: (u: URL) => string; // returns the pathname to use
}

const githubIssueOrPr: Canonicalizer = {
  test: (u) =>
    u.hostname === 'github.com' &&
    /^\/[^/]+\/[^/]+\/(pull|issues)\/\d+(\/|$)/.test(u.pathname),
  transform: (u) => {
    const m = u.pathname.match(/^(\/[^/]+\/[^/]+\/(?:pull|issues)\/\d+)/);
    return m ? m[1] : u.pathname;
  },
};

const CANONICALIZERS: Canonicalizer[] = [githubIssueOrPr];

export function matchKeyForUrl(rawUrl: string): string {
  const u = new URL(rawUrl);
  let pathname = u.pathname;
  for (const c of CANONICALIZERS) {
    if (c.test(u)) {
      pathname = c.transform(u);
      break;
    }
  }
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  return `${u.origin}${pathname}`;
}
