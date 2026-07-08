import { describe, it, expect } from 'vitest';
import { eventMatchesCombo, comboFromEvent, comboHasModifier } from '../src/content/hotkeys';

function kev(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', init);
}

describe('eventMatchesCombo', () => {
  it('matches Alt+P via code (layout-safe)', () => {
    expect(eventMatchesCombo(kev({ altKey: true, code: 'KeyP' }), 'Alt+P')).toBe(true);
  });
  it('rejects when a modifier differs', () => {
    expect(eventMatchesCombo(kev({ altKey: true, ctrlKey: true, code: 'KeyP' }), 'Alt+P')).toBe(false);
  });
  it('matches Ctrl+Alt+P', () => {
    expect(eventMatchesCombo(kev({ ctrlKey: true, altKey: true, code: 'KeyP' }), 'Ctrl+Alt+P')).toBe(true);
  });
  it('rejects a different letter', () => {
    expect(eventMatchesCombo(kev({ altKey: true, code: 'KeyO' }), 'Alt+P')).toBe(false);
  });
});

describe('space main key', () => {
  it('round-trips through comboFromEvent/eventMatchesCombo', () => {
    const e = kev({ ctrlKey: true, code: 'Space', key: ' ' });
    const combo = comboFromEvent(e);
    expect(combo).toBe('Ctrl+space');
    expect(eventMatchesCombo(e, combo)).toBe(true);
  });
});

describe("'+' main key", () => {
  it('round-trips as a named key instead of colliding with the delimiter', () => {
    const e = kev({ ctrlKey: true, shiftKey: true, code: 'Equal', key: '+' });
    const combo = comboFromEvent(e);
    expect(combo).toBe('Ctrl+Shift+plus');
    expect(eventMatchesCombo(e, combo)).toBe(true);
  });
});

describe('comboHasModifier', () => {
  it('detects the presence and absence of modifiers', () => {
    expect(comboHasModifier('Alt+P')).toBe(true);
    expect(comboHasModifier('Ctrl+Alt+P')).toBe(true);
    expect(comboHasModifier('P')).toBe(false);
  });
});

describe('comboFromEvent', () => {
  it('builds a canonical string', () => {
    expect(comboFromEvent(kev({ ctrlKey: true, altKey: true, code: 'KeyP' }))).toBe('Ctrl+Alt+P');
  });
  it('returns only modifiers for a bare modifier press', () => {
    expect(comboFromEvent(kev({ altKey: true, code: 'AltLeft', key: 'Alt' }))).toBe('Alt');
  });
});
