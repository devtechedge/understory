import { describe, expect, it } from 'vitest';
import {
  advanceWorld,
  canPlantAt,
  createWorld,
  mistWorld,
  noteReturn,
  plantCutting,
  plantSpecimen,
  pruneSpecimen,
  setSeason,
} from '../src/sim/engine';
import { seedPacketJSON, parseSeedPacket, SeedPacketError } from '../src/sim/serialization';
import { heightMm } from '../src/sim/species';
import { CATCHUP_CAP_MS, SEASON_MS, HOUR_MS, MINUTE_MS } from '../src/sim/time';
import type { SpeciesId, World } from '../src/sim/types';

const NOW = Date.UTC(2026, 4, 18, 9, 0, 0);

function worldWith(species: SpeciesId, options: { moisture?: number; season?: World['season'] } = {}) {
  const world = createWorld(20260518, NOW);
  world.moisture = options.moisture ?? 62;
  if (options.season) {
    world.season = options.season;
    world.seasonStartedAt = 0;
  }
  const result = plantSpecimen(world, species, 0.5);
  expect(result.ok).toBe(true);
  return result.world;
}

function messages(world: World): string[] {
  return world.journal.map((entry) => entry.message);
}

describe('determinism', () => {
  it('same seed and care gives the same world', () => {
    const a = worldWith('maidenhair-fern');
    const b = worldWith('maidenhair-fern');
    const advancedA = advanceWorld(a, 8 * MINUTE_MS, { hour: 10 });
    const advancedB = advanceWorld(b, 8 * MINUTE_MS, { hour: 10 });
    expect(advancedA.elapsedMs).toBe(advancedB.elapsedMs);
    expect(advancedA.moisture).toBe(advancedB.moisture);
    expect(advancedA.entities[0]?.growth).toBe(advancedB.entities[0]?.growth);
    expect(advancedA.journal.map((entry) => entry.id)).toEqual(
      advancedB.journal.map((entry) => entry.id),
    );
  });

  it('chunked care and one long step agree', () => {
    const base = worldWith('cushion-moss', { moisture: 80 });
    let piecemeal = base;
    for (let i = 0; i < 30; i += 1) {
      piecemeal = advanceWorld(piecemeal, 20_000, { hour: 11 });
    }
    const single = advanceWorld(base, 10 * MINUTE_MS, { hour: 11 });
    expect(piecemeal.entities[0]?.growth).toBe(single.entities[0]?.growth);
    expect(piecemeal.moisture).toBeCloseTo(single.moisture, 6);
    expect(piecemeal.journal.length).toBe(single.journal.length);
  });
});

describe('planting and growth', () => {
  it('germinates within thirty seconds and writes the first entry', () => {
    const world = advanceWorld(worldWith('maidenhair-fern'), 30_000, { hour: 9 });
    expect(world.entities[0]?.growth).toBeGreaterThan(0);
    expect(messages(world).some((line) => line.includes('crozier'))).toBe(true);
    expect(world.journal.some((entry) => entry.kind === 'germinated')).toBe(true);
  });

  it('reaches visible height within two minutes', () => {
    const world = advanceWorld(worldWith('ghost-fungus', { moisture: 80 }), 2 * MINUTE_MS, {
      hour: 21,
    });
    const entity = world.entities[0];
    expect(entity).toBeDefined();
    expect(heightMm('ghost-fungus', entity?.growth ?? 0)).toBeGreaterThan(4);
  });

  it('refuses crowded soil and a full vitrine', () => {
    expect(canPlantAt(worldWith('cushion-moss'), 0.55).ok).toBe(false);
    let world = createWorld(7, NOW);
    for (let i = 0; i < 8; i += 1) {
      const result = plantSpecimen(world, 'cushion-moss', 0.12 + i * 0.1);
      expect(result.ok).toBe(true);
      world = result.world;
    }
    expect(canPlantAt(world, 0.95).reason).toBe('full');
    expect(plantSpecimen(world, 'cushion-moss', 0.95).ok).toBe(false);
  });

  it('grows more slowly in dry winter soil', () => {
    const good = worldWith('maidenhair-fern', { moisture: 72, season: 'spring' });
    const poor = worldWith('maidenhair-fern', { moisture: 18, season: 'winter' });
    const goodGrowth = advanceWorld(good, 10 * MINUTE_MS, { hour: 12 }).entities[0]?.growth ?? 0;
    const poorGrowth = advanceWorld(poor, 10 * MINUTE_MS, { hour: 12 }).entities[0]?.growth ?? 0;
    expect(goodGrowth).toBeGreaterThan(poorGrowth);
  });

  it('goes dormant without dying and recovers with care', () => {
    const poor = { ...worldWith('maidenhair-fern', { moisture: 16, season: 'winter' }) };
    const dormant = advanceWorld(poor, 6 * MINUTE_MS, { hour: 12 });
    const entity = dormant.entities[0];
    expect(entity?.dormant).toBe(true);
    expect(entity?.health ?? 0).toBeGreaterThan(0.1);
    expect(entity?.growth ?? 0).toBeGreaterThan(0);

    const warm = setSeason(dormant, 'spring');
    warm.moisture = 78;
    const recovered = advanceWorld(warm, 10 * MINUTE_MS, { hour: 9 });
    expect(recovered.entities[0]?.dormant).toBe(false);
    expect(recovered.journal.some((entry) => entry.kind === 'recovered')).toBe(true);
  });

  it('moss spreads a second patch once mature and damp', () => {
    let world = worldWith('cushion-moss', { moisture: 92 });
    world = advanceWorld(world, 50 * MINUTE_MS, { hour: 10 });
    expect(world.entities.length).toBeGreaterThan(1);
    expect(world.journal.some((entry) => entry.kind === 'spread')).toBe(true);
  });

  it('ghost fungus sporulates only in damp darkness', () => {
    const damp = advanceWorld(
      worldWith('ghost-fungus', { moisture: 96, season: 'summer' }),
      42 * MINUTE_MS,
      { hour: 22 },
    );
    expect(damp.journal.some((entry) => entry.kind === 'sporulated')).toBe(true);
    expect(damp.entities.length).toBeGreaterThan(1);

    const bright = advanceWorld(
      worldWith('ghost-fungus', { moisture: 96, season: 'summer' }),
      42 * MINUTE_MS,
      { hour: 12 },
    );
    expect(bright.journal.some((entry) => entry.kind === 'sporulated')).toBe(false);
  });
});

describe('care actions', () => {
  it('prunes a grown fern and leaves a cutting', () => {
    const world = advanceWorld(worldWith('maidenhair-fern', { moisture: 80 }), 30 * MINUTE_MS, {
      hour: 9,
    });
    const entity = world.entities[0];
    expect(entity).toBeDefined();
    expect(entity?.growth ?? 0).toBeGreaterThan(0.32);
    const result = pruneSpecimen(world, entity?.id ?? '');
    expect(result.ok).toBe(true);
    expect(result.cutting).toBe(true);
    expect(result.world.entities[0]?.branches).toBe(1);
    expect(result.world.cuttings).toHaveLength(1);
    expect(result.world.journal.some((entry) => entry.kind === 'pruned')).toBe(true);
  });

  it('refuses to prune a seedling', () => {
    const world = worldWith('maidenhair-fern');
    const result = pruneSpecimen(world, world.entities[0]?.id ?? '');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('young');
  });

  it('plants a cutting into a free space', () => {
    const world = advanceWorld(worldWith('maidenhair-fern', { moisture: 80 }), 30 * MINUTE_MS, {
      hour: 9,
    });
    const pruned = pruneSpecimen(world, world.entities[0]?.id ?? '');
    const cutting = pruned.world.cuttings[0];
    expect(cutting).toBeDefined();
    const planted = plantCutting(pruned.world, cutting?.id ?? '', 0.2);
    expect(planted.ok).toBe(true);
    expect(planted.world.entities).toHaveLength(2);
    expect(planted.world.entities[1]?.generation).toBe(2);
    expect(planted.world.cuttings).toHaveLength(0);
  });

  it('mists the soil and logs at most one entry every three minutes', () => {
    const world = createWorld(3, NOW);
    const once = mistWorld(world);
    expect(once.world.moisture).toBeGreaterThan(world.moisture);
    expect(once.logged).toBe(true);
    const twice = mistWorld(once.world);
    expect(twice.logged).toBe(false);
  });

  it('changes season and records it', () => {
    const world = createWorld(1, NOW);
    const autumn = setSeason(world, 'autumn');
    expect(autumn.season).toBe('autumn');
    expect(autumn.journal[0]?.kind).toBe('season');
  });
});

describe('time', () => {
  it('caps offline catch-up', () => {
    const world = createWorld(1, NOW);
    const later = advanceWorld(world, 10 * HOUR_MS);
    expect(later.elapsedMs).toBe(CATCHUP_CAP_MS);
  });

  it('turns the season after seven days', () => {
    const world = createWorld(1, NOW);
    const later = advanceWorld(world, SEASON_MS + 5 * MINUTE_MS, {
      capMs: SEASON_MS + 5 * MINUTE_MS,
      hour: 12,
    });
    expect(later.season).toBe('summer');
    expect(later.journal.some((entry) => entry.kind === 'season')).toBe(true);
  });

  it('notes a return only when something is planted', () => {
    const empty = noteReturn(createWorld(1, NOW), 30 * MINUTE_MS);
    expect(empty.journal).toHaveLength(0);
    const planted = noteReturn(worldWith('cushion-moss'), 30 * MINUTE_MS);
    expect(planted.journal[0]?.kind).toBe('returned');
    expect(planted.journal[0]?.message).toMatch(/left for 30 minutes/);
  });
});

describe('seed packets', () => {
  it('round-trips a world', () => {
    const world = advanceWorld(worldWith('maidenhair-fern', { moisture: 80 }), 12 * MINUTE_MS, {
      hour: 9,
    });
    const packet = seedPacketJSON(world, NOW);
    const restored = parseSeedPacket(packet, NOW);
    expect(restored.seed).toBe(world.seed);
    expect(restored.elapsedMs).toBe(world.elapsedMs);
    expect(restored.entities).toHaveLength(world.entities.length);
    expect(restored.journal[0]?.message).toBe(world.journal[0]?.message);
    expect(restored.season).toBe(world.season);
  });

  it('clamps wild values and rejects the wrong shape', () => {
    const world = worldWith('cushion-moss');
    const raw = JSON.parse(seedPacketJSON(world, NOW)) as Record<string, unknown>;
    const packet = raw.world as Record<string, unknown>;
    const entities = packet.entities as Record<string, unknown>[];
    if (entities[0]) {
      entities[0].x = 9;
      entities[0].growth = 14;
    }
    const restored = parseSeedPacket(JSON.stringify(raw), NOW);
    expect(restored.entities[0]?.x).toBeLessThanOrEqual(0.92);
    expect(restored.entities[0]?.growth).toBeLessThanOrEqual(1);
    expect(restored.entities[0]?.speciesId).toBe('cushion-moss');

    if (entities[0]) entities[0].speciesId = 'unknown-plant';
    const dropped = parseSeedPacket(JSON.stringify(raw), NOW);
    expect(dropped.entities).toHaveLength(0);

    expect(() => parseSeedPacket('{nope')).toThrow(SeedPacketError);
    expect(() => parseSeedPacket(JSON.stringify({ version: 9 }))).toThrow(SeedPacketError);
  });

  it('keeps imported prose printable and free of exclamation marks', () => {
    const world = advanceWorld(worldWith('ghost-fungus', { moisture: 85 }), 40 * MINUTE_MS, {
      hour: 22,
    });
    for (const entry of world.journal) {
      expect(entry.message).not.toContain('!');
      expect(entry.message).not.toContain('\u2014');
      expect(entry.message.length).toBeLessThanOrEqual(400);
    }
  });
});
