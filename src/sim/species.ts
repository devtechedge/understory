import { HEALTH_COPY, SPECIES_COPY } from '../content/copy';
import type { SpeciesId, Stage } from './types';

export interface SpeciesDefinition {
  id: SpeciesId;
  common: string;
  latin: string;
  germinationMs: number;
  matureMs: number;
  light: readonly [number, number];
  moisture: readonly [number, number];
  temp: readonly [number, number];
  maxHeightMm: number;
  maxSpreadCm: number;
  growthDetail: string;
  part: string;
  cycle: string;
}

export const SPECIES_IDS: SpeciesId[] = ['cushion-moss', 'maidenhair-fern', 'ghost-fungus'];

export const SPECIES: Record<SpeciesId, SpeciesDefinition> = {
  'cushion-moss': {
    id: 'cushion-moss',
    common: SPECIES_COPY['cushion-moss'].common,
    latin: SPECIES_COPY['cushion-moss'].latin,
    germinationMs: 25_000,
    matureMs: 42 * 60_000,
    light: [0.05, 0.85],
    moisture: [38, 92],
    temp: [2, 27],
    maxHeightMm: 34,
    maxSpreadCm: 17,
    growthDetail: 'The cushion widens as much as it rises.',
    part: 'tuft',
    cycle: 'Long-lived. Spreads by division when the surface stays damp.',
  },
  'maidenhair-fern': {
    id: 'maidenhair-fern',
    common: SPECIES_COPY['maidenhair-fern'].common,
    latin: SPECIES_COPY['maidenhair-fern'].latin,
    germinationMs: 20_000,
    matureMs: 74 * 60_000,
    light: [0.18, 0.92],
    moisture: [50, 94],
    temp: [10, 28],
    maxHeightMm: 320,
    maxSpreadCm: 0,
    growthDetail: 'Each new crozier takes a little longer than the last.',
    part: 'frond',
    cycle: 'Long-lived. Older fronds are replaced after a cut.',
  },
  'ghost-fungus': {
    id: 'ghost-fungus',
    common: SPECIES_COPY['ghost-fungus'].common,
    latin: SPECIES_COPY['ghost-fungus'].latin,
    germinationMs: 15_000,
    matureMs: 34 * 60_000,
    light: [0, 0.58],
    moisture: [60, 98],
    temp: [6, 22],
    maxHeightMm: 92,
    maxSpreadCm: 0,
    growthDetail: 'Pinheads rise together and open on damp nights.',
    part: 'cap',
    cycle: 'Fruiting bodies persist while the soil stays damp. The mycelium spreads in the dark.',
  },
};

const STAGE_ORDER: Stage[] = [
  'dormant-seed',
  'germinating',
  'sprout',
  'juvenile',
  'established',
  'mature',
];

export const STAGE_THRESHOLDS = [0, 0, 0.03, 0.24, 0.54, 0.86];

export const SPROUT_GROWTH = 0.03;

export function stageAt(growth: number): number {
  let stage = 0;
  for (let i = 0; i < STAGE_THRESHOLDS.length; i += 1) {
    if (growth >= (STAGE_THRESHOLDS[i] ?? Infinity)) stage = i;
  }
  return stage;
}

export function stageIndex(stage: Stage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function stageFromIndex(index: number): Stage {
  return STAGE_ORDER[Math.max(0, Math.min(STAGE_ORDER.length - 1, index))] ?? 'dormant-seed';
}

export function heightMm(speciesId: SpeciesId, growth: number): number {
  const g = Math.max(0, Math.min(1, growth));
  switch (speciesId) {
    case 'cushion-moss':
      return Math.round(2 + 32 * Math.pow(g, 0.85));
    case 'maidenhair-fern':
      return Math.round(8 + 312 * Math.pow(g, 1.05));
    case 'ghost-fungus':
      return Math.round(3 + 89 * Math.pow(g, 0.9));
  }
}

export function spreadCm(speciesId: SpeciesId, growth: number): number {
  const species = SPECIES[speciesId];
  if (species.maxSpreadCm === 0) return 0;
  return Math.round(2 + (species.maxSpreadCm - 2) * Math.pow(Math.max(0, growth), 0.6));
}

export function healthLabel(health: number, dormant: boolean): string {
  if (dormant) return HEALTH_COPY.dormant;
  if (health >= 0.72) return HEALTH_COPY.thriving;
  if (health >= 0.45) return HEALTH_COPY.steady;
  return HEALTH_COPY.pale;
}

export function noteFor(noteSeed: number, notes: readonly string[]): string {
  if (notes.length === 0) return '';
  return notes[noteSeed % notes.length] ?? '';
}
