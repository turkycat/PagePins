interface Combo {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  key: string; // lowercased main key, '' if none
}

function eventKey(e: KeyboardEvent): string {
  if (e.code.startsWith('Key')) return e.code.slice(3).toLowerCase(); // KeyP -> p
  if (e.code.startsWith('Digit')) return e.code.slice(5); // Digit1 -> 1
  if (e.code === 'Space') return 'space'; // e.key is ' ', which dies in the '+' split
  if (e.key === '+') return 'plus'; // literal '+' is the combo delimiter — name it
  return (e.key || '').toLowerCase();
}

function parseCombo(s: string): Combo {
  const combo: Combo = { ctrl: false, alt: false, shift: false, meta: false, key: '' };
  for (const raw of s.split('+')) {
    const p = raw.trim().toLowerCase();
    if (p === 'ctrl' || p === 'control') combo.ctrl = true;
    else if (p === 'alt' || p === 'option') combo.alt = true;
    else if (p === 'shift') combo.shift = true;
    else if (p === 'meta' || p === 'cmd' || p === 'command') combo.meta = true;
    else if (p) combo.key = p;
  }
  return combo;
}

export function comboHasModifier(comboStr: string): boolean {
  const c = parseCombo(comboStr);
  return c.ctrl || c.alt || c.shift || c.meta;
}

export function eventMatchesCombo(e: KeyboardEvent, comboStr: string): boolean {
  const c = parseCombo(comboStr);
  return (
    e.ctrlKey === c.ctrl &&
    e.altKey === c.alt &&
    e.shiftKey === c.shift &&
    e.metaKey === c.meta &&
    eventKey(e) === c.key
  );
}

export function comboFromEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Meta');
  const isModifier = ['Control', 'Alt', 'Shift', 'Meta'].includes(e.key);
  if (!isModifier) {
    const k = eventKey(e);
    parts.push(k.length === 1 ? k.toUpperCase() : k);
  }
  return parts.join('+');
}
