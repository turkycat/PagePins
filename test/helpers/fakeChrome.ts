type Listener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string) => void;

export function installFakeChrome(): { store: Record<string, unknown> } {
  const store: Record<string, unknown> = {};
  const listeners: Listener[] = [];

  const sync = {
    async get(keys: string | string[] | null) {
      if (keys == null) return structuredClone(store);
      const arr = Array.isArray(keys) ? keys : [keys];
      const out: Record<string, unknown> = {};
      for (const k of arr) if (k in store) out[k] = structuredClone(store[k]);
      return out;
    },
    async set(items: Record<string, unknown>) {
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
      for (const [k, v] of Object.entries(items)) {
        changes[k] = { oldValue: store[k], newValue: v };
        store[k] = structuredClone(v);
      }
      listeners.forEach((l) => l(changes, 'sync'));
    },
    async remove(keys: string | string[]) {
      const arr = Array.isArray(keys) ? keys : [keys];
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
      for (const k of arr) { changes[k] = { oldValue: store[k], newValue: undefined }; delete store[k]; }
      listeners.forEach((l) => l(changes, 'sync'));
    },
  };

  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      sync,
      onChanged: {
        addListener: (l: Listener) => listeners.push(l),
        removeListener: (l: Listener) => {
          const i = listeners.indexOf(l);
          if (i >= 0) listeners.splice(i, 1);
        },
      },
    },
  };

  return { store };
}
