import { clearAllPins, getSettings, saveSettings } from '../shared/store';
import { comboFromEvent, eventMatchesCombo } from '../content/hotkeys';
import { Settings } from '../shared/types';

const el = (id: string) => document.getElementById(id) as HTMLElement;

function status(msg: string): void {
  el('status').textContent = msg;
  window.setTimeout(() => { el('status').textContent = ''; }, 1500);
}

async function patch(p: Partial<Settings>): Promise<void> {
  const s = await getSettings();
  await saveSettings({ ...s, ...p });
  status('Saved');
}

let cancelActiveCapture: (() => void) | null = null;

function captureHotkey(btn: HTMLButtonElement, apply: (combo: string) => void): void {
  btn.addEventListener('click', () => {
    cancelActiveCapture?.(); // only one live capture, or one keypress binds both settings
    const prev = btn.textContent;
    btn.textContent = 'Press keys… (Esc cancels)';
    const cancel = () => {
      window.removeEventListener('keydown', onKey, true);
      btn.textContent = prev;
      cancelActiveCapture = null;
    };
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return; // wait for a non-modifier
      if (e.key === 'Escape') {
        cancel();
        return;
      }
      const combo = comboFromEvent(e);
      // Keys like '+' don't survive the combo round-trip — keep capturing, never save
      // a binding that can't match.
      if (!combo || !eventMatchesCombo(e, combo)) return;
      btn.textContent = combo;
      window.removeEventListener('keydown', onKey, true);
      cancelActiveCapture = null;
      apply(combo);
    };
    window.addEventListener('keydown', onKey, true);
    cancelActiveCapture = cancel;
  });
}

async function load(): Promise<void> {
  const s = await getSettings();
  (el('summon') as HTMLButtonElement).textContent = s.summonHotkey;
  (el('overview') as HTMLButtonElement).textContent = s.overviewHotkey;
  (el('pill') as HTMLInputElement).checked = s.showPill;
}

captureHotkey(el('summon') as HTMLButtonElement, async (c) => {
  // onKeydown checks overview first — an identical summon binding would never fire.
  if (c === (await getSettings()).overviewHotkey) {
    status('Already bound to Overview');
    void load();
    return;
  }
  void patch({ summonHotkey: c });
});
captureHotkey(el('overview') as HTMLButtonElement, async (c) => {
  if (c === (await getSettings()).summonHotkey) {
    status('Already bound to Summon');
    void load();
    return;
  }
  void patch({ overviewHotkey: c });
});
(el('pill') as HTMLInputElement).addEventListener('change', (e) => {
  void patch({ showPill: (e.target as HTMLInputElement).checked });
});
el('clear').addEventListener('click', async () => {
  if (!confirm('Delete ALL pins? This cannot be undone.')) return;
  const n = await clearAllPins();
  status(`Cleared ${n} pin(s)`);
});

void load();
