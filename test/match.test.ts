import { describe, it, expect } from 'vitest';
import { matchKeyForUrl } from '../src/shared/match';

describe('matchKeyForUrl', () => {
  it('strips query and hash', () => {
    expect(matchKeyForUrl('https://ex.com/a/b?x=1#frag')).toBe('https://ex.com/a/b');
  });
  it('drops a trailing slash (non-root)', () => {
    expect(matchKeyForUrl('https://ex.com/foo/')).toBe('https://ex.com/foo');
  });
  it('collapses GitHub PR sub-tabs to the PR base', () => {
    const base = 'https://github.com/acme/petstore/pull/128';
    expect(matchKeyForUrl(base)).toBe(base);
    expect(matchKeyForUrl(base + '/files')).toBe(base);
    expect(matchKeyForUrl(base + '/commits/abc123')).toBe(base);
    expect(matchKeyForUrl(base + '?diff=split#r99')).toBe(base);
  });
  it('collapses GitHub issue sub-paths', () => {
    const base = 'https://github.com/acme/petstore/issues/42';
    expect(matchKeyForUrl(base + '/')).toBe(base);
  });
  it('does not collide /pull/12 with /pull/128', () => {
    expect(matchKeyForUrl('https://github.com/o/r/pull/12'))
      .not.toBe(matchKeyForUrl('https://github.com/o/r/pull/128'));
  });
  it('leaves non-GitHub paths on the default rule', () => {
    expect(matchKeyForUrl('https://dash.example.com/d/abc/board?from=now'))
      .toBe('https://dash.example.com/d/abc/board');
  });
});
