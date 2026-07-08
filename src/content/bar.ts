import { PagePin } from '../shared/types';
import { PP_CSS } from './styles';

export function ensureStyle(root: ShadowRoot): void {
  if (root.querySelector('style[data-pp]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-pp', '');
  s.textContent = PP_CSS;
  root.appendChild(s);
}

export function clearSurfaces(root: ShadowRoot): void {
  root.querySelectorAll('.pp-pill, .pp-bar').forEach((n) => n.remove());
}

export function clearToasts(root: ShadowRoot): void {
  root.querySelectorAll('.pp-toast').forEach((n) => n.remove());
}

export function renderPill(
  root: ShadowRoot,
  openCount: number,
  h: { onExpand: () => void },
  allDone = false,
): void {
  ensureStyle(root);
  clearSurfaces(root);
  const pill = document.createElement('div');
  pill.className = 'pp-pill';
  pill.textContent = allDone ? '📌 ✓' : openCount > 0 ? `📌 ${openCount}` : '📌 Pin';
  pill.addEventListener('click', h.onExpand);
  root.appendChild(pill);
}

let dragId: string | null = null;

export function renderBar(
  root: ShadowRoot,
  pin: PagePin | null,
  label: string,
  h: {
    onAdd: (t: string) => void;
    onToggleDone: (id: string) => void;
    onRemove: (id: string) => void;
    onReorder: (fromId: string, toId: string) => void;
    onClearAll: () => void;
    onCollapse: () => void;
  },
  opts: { focus?: boolean; draft?: string } = {},
): void {
  ensureStyle(root);
  // A re-render (e.g. a sync update arriving mid-typing) must not eat the user's draft
  // or their focus — but a render that wasn't user-summoned must never STEAL focus.
  const prevInput = root.querySelector('.pp-bar .pp-add') as HTMLInputElement | null;
  const draft = opts.draft ?? prevInput?.value ?? '';
  const hadFocus = prevInput !== null && root.activeElement === prevInput;
  clearSurfaces(root);
  const bar = document.createElement('div');
  bar.className = 'pp-bar';

  const lbl = document.createElement('span');
  lbl.className = 'pp-lbl';
  lbl.textContent = label;
  bar.appendChild(lbl);

  const items = pin?.items ?? [];
  for (const it of items) {
    const wrap = document.createElement('span');
    wrap.className = it.done ? 'pp-item pp-done' : 'pp-item';
    // Drag state lives in module scope, not dataTransfer — same-page reorders only,
    // and it keeps the handlers testable where jsdom lacks DragEvent.
    wrap.draggable = true;
    wrap.addEventListener('dragstart', () => { dragId = it.id; });
    wrap.addEventListener('dragover', (e) => {
      e.preventDefault(); // required, or the browser refuses the drop
      if (dragId && dragId !== it.id) wrap.classList.add('pp-dragover');
    });
    wrap.addEventListener('dragleave', () => wrap.classList.remove('pp-dragover'));
    wrap.addEventListener('drop', (e) => {
      e.preventDefault();
      wrap.classList.remove('pp-dragover');
      if (dragId && dragId !== it.id) h.onReorder(dragId, it.id);
      dragId = null;
    });
    wrap.addEventListener('dragend', () => {
      dragId = null;
      root.querySelectorAll('.pp-dragover').forEach((n) => n.classList.remove('pp-dragover'));
    });

    const check = document.createElement('span');
    check.className = 'pp-check';
    check.title = it.done ? 'Done — click to reopen' : 'Mark done';
    check.textContent = it.done ? '✓' : '';
    check.addEventListener('click', () => h.onToggleDone(it.id));

    const text = document.createElement('span');
    text.className = 'pp-text';
    text.textContent = it.text;

    const x = document.createElement('span');
    x.className = 'pp-x';
    x.title = 'Discard';
    x.textContent = '✕';
    x.addEventListener('click', () => h.onRemove(it.id));

    wrap.append(check, text, x);
    bar.appendChild(wrap);
  }

  const input = document.createElement('input');
  input.className = 'pp-add';
  input.value = draft;
  input.placeholder = items.length ? 'Add another item…' : 'Add a pin item… (Enter)';
  // Keyboard events are composed — they escape the shadow tree. Stop them from bubbling
  // to page listeners (page-world CAPTURE listeners on window still see them; README).
  for (const type of ['keydown', 'keyup', 'keypress'] as const) {
    input.addEventListener(type, (e) => e.stopPropagation());
  }
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      h.onAdd(input.value.trim());
      input.value = '';
    } else if (e.key === 'Escape') {
      h.onCollapse();
    }
  });
  bar.appendChild(input);

  if (items.length > 0) {
    const clear = document.createElement('button');
    clear.className = 'pp-clearall';
    clear.textContent = 'Clear all pins';
    clear.addEventListener('click', h.onClearAll);
    bar.appendChild(clear);
  }

  const collapse = document.createElement('span');
  collapse.className = 'pp-collapse';
  const collapsePin = document.createElement('span');
  collapsePin.className = 'pp-collapse-pin';
  collapsePin.textContent = '📌';
  collapse.append(collapsePin, ' collapse');
  collapse.title = 'Collapse to pill';
  collapse.addEventListener('click', h.onCollapse);
  bar.appendChild(collapse);

  root.appendChild(bar);
  if (opts.focus || hadFocus) input.focus();
}

export function showToast(
  root: ShadowRoot,
  message: string,
  action?: { label: string; onClick: () => void },
  timeoutMs = 5000,
): void {
  ensureStyle(root);
  clearToasts(root);
  const toast = document.createElement('div');
  toast.className = 'pp-toast';
  toast.append(document.createTextNode(message));
  let timer = 0;
  if (action) {
    const btn = document.createElement('button');
    btn.textContent = action.label;
    btn.addEventListener('click', () => { window.clearTimeout(timer); toast.remove(); action.onClick(); });
    toast.appendChild(btn);
  }
  root.appendChild(toast);
  timer = window.setTimeout(() => toast.remove(), timeoutMs);
}
