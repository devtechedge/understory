export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type SpeciesId = 'cushion-moss' | 'maidenhair-fern' | 'ghost-fungus';

export type Stage =
  | 'dormant-seed'
  | 'germinating'
  | 'sprout'
  | 'juvenile'
  | 'established'
  | 'mature';

export type Tool = 'loupe' | 'snip' | 'mist';

export type JournalKind =
  | 'planted'
  | 'germinated'
  | 'reached'
  | 'misted'
  | 'season'
  | 'dormant'
  | 'recovered'
  | 'pruned'
  | 'cutting'
  | 'cutting-planted'
  | 'spread'
  | 'sporulated'
  | 'returned'
  | 'imported';

export interface JournalEntry {
  id: string;
  at: number;
  kind: JournalKind;
  speciesId?: SpeciesId;
  message: string;
  growth: number;
  seed: number;
}

export interface Specimen {
  id: string;
  speciesId: SpeciesId;
  plantedAt: number;
  x: number;
  depth: number;
  seed: number;
  generation: number;
  parentId: string | null;
  growth: number;
  health: number;
  dormant: boolean;
  stressMs: number;
  pruned: number;
  branches: number;
  propagated: boolean;
  lastStage: number;
  pressed: boolean;
  noteSeed: number;
}

export interface Cutting {
  id: string;
  speciesId: SpeciesId;
  parentId: string;
  generation: number;
  createdAt: number;
  seed: number;
}

export interface PressedRecord {
  id: string;
  speciesId: SpeciesId;
  plantedAt: number;
  maturedAt: number;
  generation: number;
  heightMm: number;
  note: string;
  seed: number;
}

export interface WorldStats {
  planted: number;
  misted: number;
  pruned: number;
  seasons: number;
  spores: number;
}

export interface World {
  version: 1;
  seed: number;
  createdAt: number;
  elapsedMs: number;
  season: Season;
  seasonStartedAt: number;
  moisture: number;
  nutrients: number;
  entities: Specimen[];
  cuttings: Cutting[];
  pressed: PressedRecord[];
  journal: JournalEntry[];
  seq: number;
  eventSeq: number;
  rng: number;
  lastMistAt: number;
  lastMistLogAt: number;
  stats: WorldStats;
}

export interface SpecimenNoteInput {
  speciesId: SpeciesId;
  health: number;
  dormant: boolean;
  stage: number;
  seed: number;
}

export interface SunState {
  elevation: number;
  phase: 'night' | 'dawn' | 'day' | 'dusk';
  tempC: number;
  dayLength: number;
}
