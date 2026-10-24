import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPrefs, preferredStill, savePrefs } from '../src/state/prefs';

const KEY = 'understory.prefs.v1';

function installWindow(options: {
  stored?: string | null;
  matches?: boolean;
  throwOnRead?: boolean;
  throwOnMatch?: boolean;
} = {}) {
  const store = new Map<string, string>();
  if (options.stored !== undefined && options.stored !== null) store.set(KEY, options.stored);
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => {
        if (options.throwOnRead) throw new Error('storage blocked');
        return store.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    },
    matchMedia: () => {
      if (options.throwOnMatch) throw new Error('matchMedia blocked');
      return { matches: options.matches ?? false } as MediaQueryList;
    },
  });
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('preferences', () => {
  it('returns null before anything is saved', () => {
    installWindow();
    expect(loadPrefs()).toBeNull();
  });

  it('round trips a saved preference', () => {
    const store = installWindow();
    savePrefs({ still: true, theme: 'daylight' });
    expect(store.get(KEY)).toBe(JSON.stringify({ still: true, theme: 'daylight' }));
    expect(loadPrefs()).toEqual({ still: true, theme: 'daylight' });
  });

  it('repairs an unknown theme and a missing flag', () => {
    installWindow({ stored: JSON.stringify({ theme: 'neon', still: 'yes' }) });
    expect(loadPrefs()).toEqual({ still: false, theme: 'lamp' });
  });

  it('ignores malformed or non-object JSON', () => {
    installWindow({ stored: '{not json' });
    expect(loadPrefs()).toBeNull();
    installWindow({ stored: '"lamp"' });
    expect(loadPrefs()).toBeNull();
  });

  it('survives blocked storage', () => {
    installWindow({ throwOnRead: true });
    expect(loadPrefs()).toBeNull();
    expect(() => savePrefs({ still: false, theme: 'lamp' })).not.toThrow();
  });

  it('reads the reduced-motion preference', () => {
    installWindow({ matches: true });
    expect(preferredStill()).toBe(true);
    installWindow({ matches: false });
    expect(preferredStill()).toBe(false);
  });

  it('falls back when matchMedia is unavailable', () => {
    installWindow({ throwOnMatch: true });
    expect(preferredStill()).toBe(false);
  });
});
