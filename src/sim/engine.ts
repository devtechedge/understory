import { JOURNAL, NOTES, SEASON_COPY } from '../content/copy';
import { nextRandom, pickFrom } from './prng';
import {
  SPECIES,
  SPROUT_GROWTH,
  heightMm,
  noteFor,
  spreadCm,
  stageAt,
  stageFromIndex,
} from './species';
import {
  CATCHUP_CAP_MS,
  MINUTE_MS,
  SEASON_MS,
  TICK_MS,
  clamp,
  fit,
  formatDuration,
  hourOfDay,
  nextSeason,
  sunFor,
} from './time';
import type {
  JournalEntry,
  JournalKind,
  PressedRecord,
  Season,
  SpeciesId,
  Specimen,
  World,
} from './types';

export const MAX_SPECIMENS = 8;
export const MAX_CUTTINGS = 3;
export const MAX_JOURNAL = 220;
export const MAX_PRESSED = 60;

function emptyStats() {
  return { planted: 0, misted: 0, pruned: 0, seasons: 0, spores: 0 };
}

export function createWorld(seed: number, now: number): World {
  return {
    version: 1,
    seed,
    createdAt: now,
    elapsedMs: 0,
    season: 'spring',
    seasonStartedAt: 0,
    moisture: 58,
    nutrients: 0.82,
    entities: [],
    cuttings: [],
    pressed: [],
    journal: [],
    seq: 1,
    eventSeq: 1,
    rng: seed >>> 0,
    lastMistAt: -1,
    lastMistLogAt: -1,
    stats: emptyStats(),
  };
}

export function cloneWorld(world: World): World {
  return structuredClone(world);
}

function logEntry(
  world: World,
  kind: JournalKind,
  message: string,
  extra: { speciesId?: SpeciesId; growth?: number; seed?: number } = {},
): JournalEntry {
  world.eventSeq += 1;
  const entry: JournalEntry = {
    id: `j${world.eventSeq}`,
    at: world.createdAt + world.elapsedMs,
    kind,
    message,
    growth: clamp(extra.growth ?? 0, 0, 1),
    seed: extra.seed ?? 0,
  };
  if (extra.speciesId) entry.speciesId = extra.speciesId;
  world.journal.unshift(entry);
  if (world.journal.length > MAX_JOURNAL) world.journal.length = MAX_JOURNAL;
  return entry;
}

export function canPlantAt(world: World, x: number): { ok: boolean; reason?: 'full' | 'crowded' } {
  if (world.entities.length >= MAX_SPECIMENS) return { ok: false, reason: 'full' };
  if (world.entities.some((entity) => Math.abs(entity.x - x) < 0.085)) {
    return { ok: false, reason: 'crowded' };
  }
  return { ok: true };
}

function depthFor(world: World): number {
  return 0.32 + nextRandom(world) * 0.6;
}

export function plantSpecimen(
  world: World,
  speciesId: SpeciesId,
  x: number,
): { world: World; ok: boolean; reason?: 'full' | 'crowded'; id?: string } {
  const position = clamp(x, 0.12, 0.88);
  const room = canPlantAt(world, position);
  if (!room.ok) return { world, ok: false, ...(room.reason ? { reason: room.reason } : {}) };

  const next = cloneWorld(world);
  const seed = Math.floor(nextRandom(next) * 1_000_000_000);
  const noteSeed = Math.floor(nextRandom(next) * 1_000_000_000);
  const specimen: Specimen = {
    id: `s${next.seq++}`,
    speciesId,
    plantedAt: next.elapsedMs,
    x: position,
    depth: depthFor(next),
    seed,
    generation: 1,
    parentId: null,
    growth: 0,
    health: 0.88,
    dormant: false,
    stressMs: 0,
    pruned: 0,
    branches: 0,
    propagated: false,
    lastStage: 0,
    pressed: false,
    noteSeed,
  };
  next.entities.push(specimen);
  next.stats.planted += 1;
  logEntry(next, 'planted', JOURNAL.planted(SPECIES[speciesId].common, next.moisture), {
    speciesId,
    seed: noteSeed,
  });
  return { world: next, ok: true, id: specimen.id };
}

export function plantCutting(
  world: World,
  cuttingId: string,
  x: number,
): { world: World; ok: boolean; reason?: 'missing' | 'full' | 'crowded'; id?: string } {
  const cutting = world.cuttings.find((item) => item.id === cuttingId);
  if (!cutting) return { world, ok: false, reason: 'missing' };
  const position = clamp(x, 0.12, 0.88);
  const room = canPlantAt(world, position);
  if (!room.ok) return { world, ok: false, ...(room.reason ? { reason: room.reason } : {}) };

  const next = cloneWorld(world);
  const growth = 0.055;
  const specimen: Specimen = {
    id: `s${next.seq++}`,
    speciesId: cutting.speciesId,
    plantedAt: next.elapsedMs,
    x: position,
    depth: depthFor(next),
    seed: cutting.seed,
    generation: cutting.generation + 1,
    parentId: cutting.parentId,
    growth,
    health: 0.8,
    dormant: false,
    stressMs: 0,
    pruned: 0,
    branches: 0,
    propagated: false,
    lastStage: stageAt(growth),
    pressed: false,
    noteSeed: cutting.seed,
  };
  next.entities.push(specimen);
  next.cuttings = next.cuttings.filter((item) => item.id !== cuttingId);
  next.stats.planted += 1;
  logEntry(
    next,
    'cutting-planted',
    JOURNAL.cuttingPlanted(SPECIES[cutting.speciesId].common, specimen.generation),
    { speciesId: cutting.speciesId, growth, seed: cutting.seed },
  );
  return { world: next, ok: true, id: specimen.id };
}

export interface PruneResult {
  world: World;
  ok: boolean;
  reason?: 'missing' | 'young';
  part?: string;
  cutting?: boolean;
}

export function pruneSpecimen(world: World, specimenId: string): PruneResult {
  const entity = world.entities.find((item) => item.id === specimenId);
  if (!entity) return { world, ok: false, reason: 'missing' };
  if (entity.growth < 0.24) return { world, ok: false, reason: 'young' };

  const next = cloneWorld(world);
  const target = next.entities.find((item) => item.id === specimenId);
  if (!target) return { world, ok: false, reason: 'missing' };

  const species = SPECIES[target.speciesId];
  const beforeHeight = heightMm(target.speciesId, target.growth);
  const wasHealthy = target.health > 0.55;
  const wasGrown = target.growth > 0.32;

  const cutFactor =
    target.speciesId === 'maidenhair-fern' ? 0.78 : target.speciesId === 'ghost-fungus' ? 0.55 : 0.84;
  target.growth = Math.max(0.03, target.growth * cutFactor);
  target.health = clamp(target.health - 0.04, 0.12, 1);
  target.pruned += 1;
  if (target.speciesId === 'maidenhair-fern') target.branches = Math.min(6, target.branches + 1);
  target.lastStage = Math.min(target.lastStage, stageAt(target.growth));
  next.nutrients = clamp(next.nutrients + 0.014, 0.05, 1);
  next.stats.pruned += 1;

  logEntry(next, 'pruned', JOURNAL.pruned(species.part, beforeHeight), {
    speciesId: target.speciesId,
    growth: target.growth,
    seed: target.noteSeed,
  });

  let madeCutting = false;
  if (wasHealthy && wasGrown && next.cuttings.length < MAX_CUTTINGS) {
    madeCutting = true;
    next.cuttings.push({
      id: `c${next.seq++}`,
      speciesId: target.speciesId,
      parentId: target.id,
      generation: target.generation,
      createdAt: next.elapsedMs,
      seed: target.seed,
    });
    logEntry(next, 'cutting', JOURNAL.cutting(species.common), {
      speciesId: target.speciesId,
      growth: target.growth,
      seed: target.noteSeed,
    });
  }

  return {
    world: next,
    ok: true,
    part: species.part,
    cutting: madeCutting,
  };
}

export function mistWorld(world: World): { world: World; logged: boolean } {
  const next = cloneWorld(world);
  next.moisture = clamp(next.moisture + 17, 15, 100);
  next.stats.misted += 1;
  next.lastMistAt = next.elapsedMs;
  const shouldLog = next.lastMistLogAt < 0 || next.elapsedMs - next.lastMistLogAt >= 3 * MINUTE_MS;
  if (shouldLog) {
    next.lastMistLogAt = next.elapsedMs;
    logEntry(next, 'misted', JOURNAL.misted(next.moisture), { seed: next.seq });
  }
  return { world: next, logged: shouldLog };
}

export function setSeason(world: World, season: Season): World {
  if (world.season === season) return world;
  const next = cloneWorld(world);
  next.season = season;
  next.seasonStartedAt = next.elapsedMs;
  next.stats.seasons += 1;
  logEntry(next, 'season', JOURNAL.season(season), { seed: next.seq });
  return next;
}

function pressedFor(world: World, entity: Specimen): PressedRecord {
  const notes = NOTES.species[entity.speciesId];
  return {
    id: `h${world.seq++}`,
    speciesId: entity.speciesId,
    plantedAt: world.createdAt + entity.plantedAt,
    maturedAt: world.createdAt + world.elapsedMs,
    generation: entity.generation,
    heightMm: heightMm(entity.speciesId, entity.growth),
    note: noteFor(entity.noteSeed, notes),
    seed: entity.seed,
  };
}

function sideFor(x: number): string {
  if (x < 0.36) return 'west';
  if (x > 0.64) return 'east';
  return 'north';
}

function spawnChild(
  world: World,
  parent: Specimen,
  growth: number,
  options: { dark?: boolean; sunElevation?: number } = {},
): Specimen | null {
  if (world.entities.length >= MAX_SPECIMENS) return null;
  const offsets = [0.09, -0.09, 0.15, -0.15, 0.21, -0.21];
  for (const offset of offsets) {
    const x = parent.x + offset;
    if (x < 0.12 || x > 0.88) continue;
    if (!canPlantAt(world, x).ok) continue;
    if (options.dark && (options.sunElevation ?? 0) > 0.3) continue;
    const seed = Math.floor(nextRandom(world) * 1_000_000_000);
    const child: Specimen = {
      id: `s${world.seq++}`,
      speciesId: parent.speciesId,
      plantedAt: world.elapsedMs,
      x,
      depth: parent.depth,
      seed,
      generation: parent.generation + 1,
      parentId: parent.id,
      growth,
      health: 0.72,
      dormant: false,
      stressMs: 0,
      pruned: 0,
      branches: 0,
      propagated: false,
      lastStage: stageAt(growth),
      pressed: false,
      noteSeed: seed >>> 3,
    };
    world.entities.push(child);
    return child;
  }
  return null;
}

function stepSpecimen(world: World, entity: Specimen, dt: number, sun: ReturnType<typeof sunFor>) {
  const species = SPECIES[entity.speciesId];

  if (entity.growth <= 0) {
    if (world.elapsedMs - entity.plantedAt >= species.germinationMs) {
      entity.growth = SPROUT_GROWTH;
      entity.lastStage = 2;
      logEntry(
        world,
        'germinated',
        JOURNAL.germinated[entity.speciesId](
          heightMm(entity.speciesId, entity.growth),
          world.moisture,
        ),
        { speciesId: entity.speciesId, growth: entity.growth, seed: entity.noteSeed },
      );
    }
    return;
  }

  const lightFit = fit(sun.elevation, species.light[0], species.light[1], 0.24);
  const moistureFit = fit(world.moisture, species.moisture[0], species.moisture[1], 18);
  const tempFit = fit(sun.tempC, species.temp[0], species.temp[1], 7);
  const suitability = moistureFit * tempFit;
  const growthLight = 0.5 + 0.5 * lightFit;

  const healthTarget = 0.18 + 0.78 * suitability;
  entity.health = clamp(
    entity.health + (healthTarget - entity.health) * (dt / MINUTE_MS) * 0.5,
    0.12,
    1,
  );

  if (suitability < 0.34) entity.stressMs += dt;
  else entity.stressMs = Math.max(0, entity.stressMs - dt * 1.6);

  if (!entity.dormant && entity.stressMs >= 3 * MINUTE_MS) {
    entity.dormant = true;
    logEntry(
      world,
      'dormant',
      JOURNAL.dormant(species.common, JOURNAL.dormantHints[entity.speciesId]),
      { speciesId: entity.speciesId, growth: entity.growth, seed: entity.noteSeed },
    );
  } else if (entity.dormant && suitability > 0.6) {
    entity.dormant = false;
    entity.stressMs = 0;
    logEntry(world, 'recovered', JOURNAL.recovered(species.common), {
      speciesId: entity.speciesId,
      growth: entity.growth,
      seed: entity.noteSeed,
    });
  }

  const nutrientFactor = 0.6 + 0.4 * world.nutrients;
  const healthFactor = 0.65 + 0.35 * entity.health;
  const dormancyFactor = entity.dormant ? 0.1 : 1;
  const growthFactor =
    moistureFit * tempFit * growthLight * nutrientFactor * healthFactor * dormancyFactor;
  entity.growth = clamp(entity.growth + (dt / species.matureMs) * growthFactor, 0, 1);

  if (entity.growth < 1) {
    world.nutrients = clamp(world.nutrients - (dt / MINUTE_MS) * 0.0007, 0.05, 1);
  }

  const nextStage = stageAt(entity.growth);
  while (nextStage > entity.lastStage) {
    entity.lastStage += 1;
    if (entity.lastStage >= 3) {
      const stage = stageFromIndex(entity.lastStage);
      const stageNote =
        JOURNAL.stageNotes[entity.speciesId][stage] ?? species.growthDetail;
      logEntry(
        world,
        'reached',
        JOURNAL.reached(species.common, stage, heightMm(entity.speciesId, entity.growth), stageNote),
        { speciesId: entity.speciesId, growth: entity.growth, seed: entity.noteSeed },
      );
    }
  }

  if (entity.lastStage >= 5 && !entity.pressed) {
    entity.pressed = true;
    if (world.pressed.length < MAX_PRESSED) {
      world.pressed.unshift(pressedFor(world, entity));
    }
  }

  if (!entity.propagated && entity.lastStage >= 5) {
    if (entity.speciesId === 'cushion-moss' && world.moisture > 52) {
      const child = spawnChild(world, entity, 0.08);
      if (child) {
        entity.propagated = true;
        logEntry(world, 'spread', JOURNAL.spread(spreadCm(entity.speciesId, entity.growth), sideFor(child.x)), {
          speciesId: entity.speciesId,
          growth: entity.growth,
          seed: entity.noteSeed,
        });
      }
    } else if (
      entity.speciesId === 'ghost-fungus' &&
      world.moisture > 68 &&
      sun.elevation < 0.32
    ) {
      const child = spawnChild(world, entity, 0.06, {
        dark: true,
        sunElevation: sun.elevation,
      });
      if (child) {
        entity.propagated = true;
        world.stats.spores += 1;
        logEntry(world, 'sporulated', JOURNAL.sporulated(species.common), {
          speciesId: entity.speciesId,
          growth: entity.growth,
          seed: entity.noteSeed,
        });
      }
    }
  }
}

function stepWorld(world: World, dt: number, fixedHour?: number) {
  const hour = fixedHour ?? hourOfDay(world.createdAt + world.elapsedMs);
  const sun = sunFor(world.season, hour);

  world.elapsedMs += dt;

  const dryness = 0.16 + Math.max(0, sun.tempC) * 0.0075;
  world.moisture = clamp(world.moisture - (dt / MINUTE_MS) * dryness, 15, 100);

  for (const entity of world.entities) {
    stepSpecimen(world, entity, dt, sun);
  }

  while (world.elapsedMs - world.seasonStartedAt >= SEASON_MS) {
    world.season = nextSeason(world.season);
    world.seasonStartedAt = world.elapsedMs;
    world.stats.seasons += 1;
    logEntry(world, 'season', `The vitrine turned to ${SEASON_COPY[world.season].label.toLowerCase()}. ${SEASON_COPY[world.season].line}`, {
      seed: world.seq,
    });
  }
}

export function advanceWorld(
  world: World,
  dtMs: number,
  options: { hour?: number; capMs?: number } = {},
): World {
  if (!Number.isFinite(dtMs) || dtMs <= 0) return world;
  const cap = options.capMs ?? CATCHUP_CAP_MS;
  let remaining = Math.min(dtMs, cap);
  if (remaining <= 0) return world;

  const next = cloneWorld(world);
  while (remaining > 0) {
    const step = Math.min(TICK_MS, remaining);
    stepWorld(next, step, options.hour);
    remaining -= step;
  }
  return next;
}

export function noteReturn(world: World, absenceMs: number): World {
  if (world.entities.length === 0) return world;
  const next = cloneWorld(world);
  logEntry(next, 'returned', JOURNAL.returned(formatDuration(absenceMs), next.moisture), {
    seed: next.seq,
  });
  return next;
}

export function noteImported(world: World): World {
  const next = cloneWorld(world);
  logEntry(next, 'imported', JOURNAL.imported(), { seed: next.seq });
  return next;
}

export function growingNote(entity: Specimen): string {
  const pool = NOTES.growing[entity.speciesId];
  return pickFrom(pool, entity.noteSeed, Math.round(entity.growth * 10));
}

export function specimenSpreadCm(entity: Specimen): number {
  return spreadCm(entity.speciesId, entity.growth);
}

export type { PressedRecord };
