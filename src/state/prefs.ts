export type RoomTheme = 'lamp' | 'daylight';

export interface Prefs {
  still: boolean;
  theme: RoomTheme;
}

const KEY = 'understory.prefs.v1';

export function loadPrefs(): Prefs | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    if (typeof parsed !== 'object' || parsed === null) return null;
    return {
      still: typeof parsed.still === 'boolean' ? parsed.still : false,
      theme: parsed.theme === 'daylight' ? 'daylight' : 'lamp',
    };
  } catch {
    return null;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* preferences are optional */
  }
}

export function preferredStill(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
