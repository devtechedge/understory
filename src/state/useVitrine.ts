import { useCallback, useEffect, useRef, useState } from 'react';
import {
  advanceWorld,
  canPlantAt,
  createWorld,
  mistWorld,
  noteImported,
  noteReturn,
  plantCutting,
  plantSpecimen,
  pruneSpecimen,
  setSeason,
} from '../sim/engine';
import { parseSeedPacket, seedPacketJSON } from '../sim/serialization';
import { CATCHUP_CAP_MS, MINUTE_MS } from '../sim/time';
import type { Season, SpeciesId, World } from '../sim/types';
import { loadSavedWorld, saveWorld, type SaveResult } from '../persist/storage';

const FREE_SPOTS = [0.5, 0.34, 0.66, 0.21, 0.79, 0.13, 0.87, 0.42, 0.58];

export function findFreeSpot(world: World | null): number | null {
  if (!world) return null;
  for (const spot of FREE_SPOTS) {
    if (canPlantAt(world, spot).ok) return spot;
  }
  return null;
}

function makeSeed(): number {
  try {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] ?? 1;
  } catch {
    return (Date.now() ^ Math.floor(Math.random() * 1_000_000)) >>> 0;
  }
}

export type LoadStatus = 'loading' | 'ready' | 'error';
export type SaveState = 'saved' | 'saving' | 'unavailable';

export interface PlantResult {
  ok: boolean;
  reason?: string;
  id?: string;
  name?: string;
}

export interface PruneActionResult {
  ok: boolean;
  reason?: string;
  cutting?: boolean;
  part?: string;
}

export interface UseVitrine {
  world: World | null;
  status: LoadStatus;
  saveState: SaveState;
  paused: boolean;
  setPaused: (paused: boolean) => void;
  plantAt: (speciesId: SpeciesId, x: number) => PlantResult;
  plantInFreeSpot: (speciesId: SpeciesId) => PlantResult;
  prune: (id: string) => PruneActionResult;
  mist: () => { moisture: number; logged: boolean } | null;
  changeSeason: (season: Season) => void;
  plantCuttingAt: (cuttingId: string) => PlantResult;
  importText: (text: string) => { ok: boolean };
  exportPacket: () => string | null;
  findFreeSpot: () => number | null;
}

export function useVitrine(): UseVitrine {
  const [world, setWorld] = useState<World | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [paused, setPausedState] = useState(false);

  const worldRef = useRef<World | null>(null);
  const pausedRef = useRef(false);
  const lastTickRef = useRef(0);
  const saveTimerRef = useRef<number | undefined>(undefined);
  const savingRef = useRef(false);

  const commit = useCallback((next: World) => {
    worldRef.current = next;
    setWorld(next);
  }, []);

  const saveNow = useCallback(async () => {
    const current = worldRef.current;
    if (!current || savingRef.current) return;
    savingRef.current = true;
    setSaveState('saving');
    let result: SaveResult = 'unavailable';
    try {
      result = await saveWorld(current);
    } finally {
      savingRef.current = false;
    }
    setSaveState(result === 'ok' ? 'saved' : 'unavailable');
  }, []);

  const queueSave = useCallback(() => {
    if (saveTimerRef.current !== undefined) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void saveNow();
    }, 900);
  }, [saveNow]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        const stored = await loadSavedWorld();
        if (cancelled) return;

        if (stored) {
          const gap = Math.max(0, Date.now() - stored.savedAt);
          const simulatedGap = Math.min(gap, CATCHUP_CAP_MS);
          let next = advanceWorld(stored.world, simulatedGap);
          if (gap > 10 * MINUTE_MS) next = noteReturn(next, simulatedGap);
          commit(next);
        } else {
          commit(createWorld(makeSeed(), Date.now()));
        }
        lastTickRef.current = Date.now();
        setStatus('ready');
      } catch {
        if (cancelled) return;
        commit(createWorld(makeSeed(), Date.now()));
        setStatus('ready');
        setSaveState('unavailable');
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [commit]);

  useEffect(() => {
    if (status !== 'ready' || paused) return;
    lastTickRef.current = Date.now();
    const interval = window.setInterval(() => {
      const current = worldRef.current;
      if (!current) return;
      const now = Date.now();
      const gap = now - lastTickRef.current;
      lastTickRef.current = now;
      if (gap < 250) return;
      commit(advanceWorld(current, gap));
    }, 2000);
    return () => window.clearInterval(interval);
  }, [status, paused, commit]);

  useEffect(() => {
    if (status !== 'ready') return;
    const interval = window.setInterval(() => {
      void saveNow();
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [status, saveNow]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        lastTickRef.current = Date.now();
        void saveNow();
        return;
      }
      const now = Date.now();
      const gap = now - lastTickRef.current;
      lastTickRef.current = now;
      const current = worldRef.current;
      if (!pausedRef.current && current && gap > 250) {
        commit(advanceWorld(current, gap));
      }
    };
    const onPageHide = () => {
      void saveNow();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [commit, saveNow]);

  useEffect(() => {
    pausedRef.current = paused;
    if (!paused) lastTickRef.current = Date.now();
  }, [paused]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== undefined) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const setPaused = useCallback((value: boolean) => {
    lastTickRef.current = Date.now();
    setPausedState(value);
  }, []);

  const plantAt = useCallback(
    (speciesId: SpeciesId, x: number): PlantResult => {
      const current = worldRef.current;
      if (!current) return { ok: false, reason: 'loading' };
      const result = plantSpecimen(current, speciesId, x);
      if (result.ok) {
        commit(result.world);
        queueSave();
      }
      return {
        ok: result.ok,
        ...(result.reason ? { reason: result.reason } : {}),
        ...(result.id ? { id: result.id } : {}),
      };
    },
    [commit, queueSave],
  );

  const plantInFreeSpot = useCallback(
    (speciesId: SpeciesId): PlantResult => {
      const spot = findFreeSpot(worldRef.current);
      if (spot === null) return { ok: false, reason: 'full' };
      return plantAt(speciesId, spot);
    },
    [plantAt],
  );

  const prune = useCallback(
    (id: string): PruneActionResult => {
      const current = worldRef.current;
      if (!current) return { ok: false };
      const result = pruneSpecimen(current, id);
      if (result.ok) {
        commit(result.world);
        queueSave();
      }
      return {
        ok: result.ok,
        ...(result.reason ? { reason: result.reason } : {}),
        ...(result.cutting !== undefined ? { cutting: result.cutting } : {}),
        ...(result.part ? { part: result.part } : {}),
      };
    },
    [commit, queueSave],
  );

  const mist = useCallback(() => {
    const current = worldRef.current;
    if (!current) return null;
    const result = mistWorld(current);
    commit(result.world);
    queueSave();
    return { moisture: result.world.moisture, logged: result.logged };
  }, [commit, queueSave]);

  const changeSeason = useCallback(
    (season: Season) => {
      const current = worldRef.current;
      if (!current) return;
      const next = setSeason(current, season);
      if (next !== current) {
        commit(next);
        queueSave();
      }
    },
    [commit, queueSave],
  );

  const plantCuttingAt = useCallback(
    (cuttingId: string): PlantResult => {
      const current = worldRef.current;
      if (!current) return { ok: false };
      const spot = findFreeSpot(current);
      if (spot === null) return { ok: false, reason: 'full' };
      const result = plantCutting(current, cuttingId, spot);
      if (result.ok) {
        commit(result.world);
        queueSave();
      }
      return {
        ok: result.ok,
        ...(result.reason ? { reason: result.reason } : {}),
        ...(result.id ? { id: result.id } : {}),
      };
    },
    [commit, queueSave],
  );

  const importText = useCallback(
    (text: string): { ok: boolean } => {
      try {
        const parsed = parseSeedPacket(text);
        const next = noteImported(parsed);
        commit(next);
        queueSave();
        return { ok: true };
      } catch {
        return { ok: false };
      }
    },
    [commit, queueSave],
  );

  const exportPacket = useCallback(() => {
    const current = worldRef.current;
    if (!current) return null;
    return seedPacketJSON(current, Date.now());
  }, []);

  useEffect(() => {
    window.__understory = {
      getWorld: () => worldRef.current,
      advance: (ms: number) => {
        const current = worldRef.current;
        if (!current) return null;
        const next = advanceWorld(current, ms);
        commit(next);
        queueSave();
        return next;
      },
      plant: (speciesId: SpeciesId, x: number) => plantAt(speciesId, x),
      prune: (id: string) => prune(id),
      mist: () => mist(),
      setSeason: (season: Season) => changeSeason(season),
      importJSON: (text: string) => importText(text),
      exportJSON: () => exportPacket(),
      findSpot: () => findFreeSpot(worldRef.current),
    };
    return () => {
      delete window.__understory;
    };
  }, [plantAt, prune, mist, changeSeason, importText, exportPacket, commit, queueSave]);

  return {
    world,
    status,
    saveState,
    paused,
    setPaused,
    plantAt,
    plantInFreeSpot,
    prune,
    mist,
    changeSeason,
    plantCuttingAt,
    importText,
    exportPacket,
    findFreeSpot: () => findFreeSpot(worldRef.current),
  };
}
