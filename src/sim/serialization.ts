import { MAX_JOURNAL, MAX_PRESSED, MAX_SPECIMENS, MAX_CUTTINGS } from './engine';
import { SPECIES_IDS } from './species';
import { clamp } from './time';
import type {
  Cutting,
  JournalEntry,
  JournalKind,
  PressedRecord,
  Season,
  SpeciesId,
  Specimen,
  World,
} from './types';

export class SeedPacketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedPacketError';
  }
}

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const KINDS: JournalKind[] = [
  'planted',
  'germinated',
  'reached',
  'misted',
  'season',
  'dormant',
  'recovered',
  'pruned',
  'cutting',
  'cutting-planted',
  'spread',
  'sporulated',
  'returned',
  'imported',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return clamp(n, min, max);
}

function integer(value: unknown, fallback: number, min: number, max: number): number {
  return Math.round(num(value, fallback, min, max));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function text(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = Array.from(value.slice(0, maxLength + 120))
    .map((char) => (char.charCodeAt(0) < 32 ? ' ' : char))
    .join('')
    .trim();
  return cleaned.slice(0, maxLength);
}

function id(value: unknown, fallback: string): string {
  const candidate = text(value, fallback, 40);
  return /^[a-zA-Z0-9_-]+$/.test(candidate) ? candidate : fallback;
}

function isSpecies(value: unknown): value is SpeciesId {
  return typeof value === 'string' && (SPECIES_IDS as string[]).includes(value);
}

function isSeason(value: unknown): value is Season {
  return typeof value === 'string' && (SEASONS as string[]).includes(value);
}

function isKind(value: unknown): value is JournalKind {
  return typeof value === 'string' && (KINDS as string[]).includes(value);
}

function parseSpecimen(raw: unknown, index: number, elapsedMs: number): Specimen | null {
  if (!isRecord(raw) || !isSpecies(raw.speciesId)) return null;
  const growth = num(raw.growth, 0, 0, 1);
  return {
    id: id(raw.id, `s${index + 1}`),
    speciesId: raw.speciesId,
    plantedAt: num(raw.plantedAt, 0, 0, elapsedMs),
    x: num(raw.x, 0.5, 0.08, 0.92),
    depth: num(raw.depth, 0.6, 0, 1),
    seed: integer(raw.seed, 1, 0, 2_147_483_647),
    generation: integer(raw.generation, 1, 1, 99),
    parentId: typeof raw.parentId === 'string' ? id(raw.parentId, '') : null,
    growth,
    health: num(raw.health, 0.8, 0.05, 1),
    dormant: bool(raw.dormant, false),
    stressMs: num(raw.stressMs, 0, 0, 86_400_000),
    pruned: integer(raw.pruned, 0, 0, 999),
    branches: integer(raw.branches, 0, 0, 12),
    propagated: bool(raw.propagated, false),
    lastStage: integer(raw.lastStage, 0, 0, 5),
    pressed: bool(raw.pressed, false),
    noteSeed: integer(raw.noteSeed, 1, 0, 2_147_483_647),
  };
}

function parseJournal(raw: unknown, index: number, world: World): JournalEntry | null {
  if (!isRecord(raw) || !isKind(raw.kind)) return null;
  const entry: JournalEntry = {
    id: id(raw.id, `j${index + 1}`),
    at: num(raw.at, world.createdAt, 946_684_800_000, world.createdAt + world.elapsedMs + 3_600_000),
    kind: raw.kind,
    message: text(raw.message, '', 400),
    growth: num(raw.growth, 0, 0, 1),
    seed: integer(raw.seed, 0, 0, 2_147_483_647),
  };
  if (!entry.message) return null;
  if (isSpecies(raw.speciesId)) entry.speciesId = raw.speciesId;
  return entry;
}

function parseWorld(raw: unknown, now: number): World {
  if (!isRecord(raw)) throw new SeedPacketError('The packet does not contain a world.');
  if (raw.version !== 1) throw new SeedPacketError('The packet uses an unknown version.');

  const createdAt = num(raw.createdAt, now, 946_684_800_000, now + 86_400_000);
  const elapsedMs = num(raw.elapsedMs, 0, 0, 10 * 365 * 86_400_000);
  const seed = integer(raw.seed, 1, 0, 2_147_483_647);

  const skeleton: World = {
    version: 1,
    seed,
    createdAt,
    elapsedMs,
    season: isSeason(raw.season) ? raw.season : 'spring',
    seasonStartedAt: num(raw.seasonStartedAt, 0, 0, elapsedMs),
    moisture: num(raw.moisture, 58, 10, 100),
    nutrients: num(raw.nutrients, 0.82, 0.02, 1),
    entities: [],
    cuttings: [],
    pressed: [],
    journal: [],
    seq: 1,
    eventSeq: 1,
    rng: integer(raw.rng, seed, 0, 4_294_967_295),
    lastMistAt: num(raw.lastMistAt, -1, -1, elapsedMs),
    lastMistLogAt: num(raw.lastMistLogAt, -1, -1, elapsedMs),
    stats: { planted: 0, misted: 0, pruned: 0, seasons: 0, spores: 0 },
  };

  const seenIds = new Set<string>();
  const rawEntities = Array.isArray(raw.entities) ? raw.entities.slice(0, MAX_SPECIMENS) : [];
  rawEntities.forEach((item, index) => {
    const specimen = parseSpecimen(item, index, elapsedMs);
    if (!specimen) return;
    let key = specimen.id;
    let suffix = 1;
    while (seenIds.has(key)) {
      suffix += 1;
      key = `${specimen.id}_${suffix}`;
    }
    specimen.id = key;
    seenIds.add(key);
    skeleton.entities.push(specimen);
  });

  const rawCuttings = Array.isArray(raw.cuttings) ? raw.cuttings.slice(0, MAX_CUTTINGS) : [];
  rawCuttings.forEach((item, index) => {
    if (!isRecord(item) || !isSpecies(item.speciesId)) return;
    const cutting: Cutting = {
      id: id(item.id, `c${index + 1}`),
      speciesId: item.speciesId,
      parentId: id(item.parentId, ''),
      generation: integer(item.generation, 1, 1, 99),
      createdAt: num(item.createdAt, elapsedMs, 0, elapsedMs),
      seed: integer(item.seed, 1, 0, 2_147_483_647),
    };
    skeleton.cuttings.push(cutting);
  });

  const rawPressed = Array.isArray(raw.pressed) ? raw.pressed.slice(0, MAX_PRESSED) : [];
  rawPressed.forEach((item, index) => {
    if (!isRecord(item) || !isSpecies(item.speciesId)) return;
    const record: PressedRecord = {
      id: id(item.id, `h${index + 1}`),
      speciesId: item.speciesId,
      plantedAt: num(item.plantedAt, createdAt, 946_684_800_000, now + 86_400_000),
      maturedAt: num(item.maturedAt, createdAt, 946_684_800_000, now + 86_400_000),
      generation: integer(item.generation, 1, 1, 99),
      heightMm: integer(item.heightMm, 0, 0, 2000),
      note: text(item.note, '', 200),
      seed: integer(item.seed, 1, 0, 2_147_483_647),
    };
    skeleton.pressed.push(record);
  });

  const rawJournal = Array.isArray(raw.journal) ? raw.journal.slice(0, MAX_JOURNAL) : [];
  rawJournal.forEach((item, index) => {
    const entry = parseJournal(item, index, skeleton);
    if (entry) skeleton.journal.push(entry);
  });

  const rawStats = isRecord(raw.stats) ? raw.stats : {};
  skeleton.stats = {
    planted: integer(rawStats.planted, skeleton.entities.length, 0, 9999),
    misted: integer(rawStats.misted, 0, 0, 999_999),
    pruned: integer(rawStats.pruned, 0, 0, 9999),
    seasons: integer(rawStats.seasons, 0, 0, 9999),
    spores: integer(rawStats.spores, 0, 0, 9999),
  };

  skeleton.seq = Math.max(
    integer(raw.seq, 1, 1, 1_000_000),
    skeleton.entities.length + skeleton.pressed.length + skeleton.cuttings.length + 1,
  );
  skeleton.eventSeq = Math.max(integer(raw.eventSeq, 1, 1, 1_000_000), skeleton.journal.length + 1);

  return skeleton;
}

export function parseSeedPacket(input: string, now: number = Date.now()): World {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new SeedPacketError('The file is not valid JSON.');
  }
  if (!isRecord(parsed)) throw new SeedPacketError('The packet is empty.');

  if (parsed.app === 'understory' && 'world' in parsed) {
    return parseWorld(parsed.world, now);
  }
  if (parsed.app !== undefined && parsed.app !== 'understory') {
    throw new SeedPacketError('This is not an Understory seed packet.');
  }
  return parseWorld(parsed, now);
}

export function seedPacketJSON(world: World, now: number = Date.now()): string {
  return JSON.stringify(
    {
      app: 'understory',
      version: 1,
      exportedAt: now,
      world,
    },
    null,
    2,
  );
}
