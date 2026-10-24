import type { Season, SpeciesId, World } from './sim/types';
import type { ImportResult, PlantResult, PruneActionResult } from './state/useVitrine';

declare global {
  interface Window {
    __understory?: {
      getWorld: () => World | null;
      advance: (ms: number) => World | null;
      plant: (speciesId: SpeciesId, x: number) => PlantResult;
      prune: (id: string) => PruneActionResult;
      mist: () => { moisture: number; logged: boolean } | null;
      setSeason: (season: Season) => void;
      importJSON: (text: string) => ImportResult;
      exportJSON: () => string | null;
      findSpot: () => number | null;
    };
  }
}

export {};
