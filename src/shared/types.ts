export interface PinItem {
  id: string;
  text: string;
  createdAt: number;
  done?: boolean; // may be absent in stored pins — treat as open
}

export interface PagePin {
  matchKey: string;
  url: string;
  title: string;
  items: PinItem[];
  updatedAt: number;
}

export interface Settings {
  summonHotkey: string;
  overviewHotkey: string;
  showPill: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  summonHotkey: 'Alt+P',
  overviewHotkey: 'Ctrl+Alt+P',
  showPill: true,
};
