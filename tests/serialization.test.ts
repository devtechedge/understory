import { describe, expect, it } from 'vitest';
import { MAX_JOURNAL, MAX_SPECIMENS, createWorld } from '../src/sim/engine';
import {
  parseSeedPacket,
  seedPacketJSON,
  SeedPacketError,
} from '../src/sim/serialization';

const NOW = Date.UTC(2026, 4, 18, 9, 0, 0);

function packet(world: Record<string, unknown>) {
  return JSON.stringify({ app: 'understory', version: 1, world });
}

function rawWorld(overrides: Record<string, unknown> = {}) {
  return { ...createWorld(7, NOW), ...overrides };
}

function rejection(input: string): string {
  try {
    parseSeedPacket(input, NOW);
  } catch (error) {
    expect(error).toBeInstanceOf(SeedPacketError);
    return error instanceof Error ? error.message : '';
  }
  return '';
}

describe('seed packet rejection', () => {
  it('rejects malformed JSON', () => {
    expect(rejection('{not json')).toBe('The file is not valid JSON.');
  });

  it('rejects a packet that is not an object', () => {
    expect(rejection('[]')).toBe('The packet is empty.');
  });

  it('rejects another application', () => {
    expect(rejection(JSON.stringify({ app: 'elsewhere', version: 1, world: rawWorld() }))).toBe(
      'This is not an Understory seed packet.',
    );
  });

  it('rejects an unknown schema version', () => {
    expect(rejection(packet(rawWorld({ version: 2 })))).toBe(
      'The packet uses an unknown version.',
    );
  });
});

describe('seed packet sanitising', () => {
  it('skips unknown species and caps the collection', () => {
    const capped = Array.from({ length: MAX_SPECIMENS + 12 }, (_, index) => ({
      id: `s${index + 1}`,
      speciesId: 'cushion-moss',
    }));
    const full = parseSeedPacket(packet(rawWorld({ entities: capped })), NOW);
    expect(full.entities).toHaveLength(MAX_SPECIMENS);

    const mixed = parseSeedPacket(
      packet(
        rawWorld({
          entities: [
            { id: 'bad', speciesId: 'moon-orchid' },
            { id: 's1', speciesId: 'cushion-moss' },
          ],
        }),
      ),
      NOW,
    );
    expect(mixed.entities).toHaveLength(1);
    expect(mixed.entities[0]?.speciesId).toBe('cushion-moss');
  });

  it('renames duplicate identifiers without losing specimens', () => {
    const world = parseSeedPacket(
      packet(
        rawWorld({
          entities: [
            { id: 's1', speciesId: 'cushion-moss' },
            { id: 's1', speciesId: 'maidenhair-fern' },
          ],
        }),
      ),
      NOW,
    );
    expect(world.entities.map((entity) => entity.id)).toEqual(['s1', 's1_2']);
    expect(world.entities).toHaveLength(2);
  });

  it('clamps hostile and non-finite numbers', () => {
    const world = parseSeedPacket(
      packet(
        rawWorld({
          moisture: 1e9,
          nutrients: -4,
          entities: [
            {
              id: 's1',
              speciesId: 'maidenhair-fern',
              growth: 900,
              health: -10,
              x: 999,
              seed: Number.POSITIVE_INFINITY,
            },
          ],
        }),
      ),
      NOW,
    );
    expect(world.moisture).toBe(100);
    expect(world.nutrients).toBe(0.02);
    const entity = world.entities[0];
    expect(entity?.growth).toBe(1);
    expect(entity?.health).toBe(0.05);
    expect(entity?.x).toBe(0.92);
    expect(entity?.seed).toBe(1);
  });

  it('strips control characters from imported text and identifiers', () => {
    const world = parseSeedPacket(
      packet(
        rawWorld({
          journal: [
            {
              id: 'bad id!',
              kind: 'planted',
              message: 'a\u0000b\u001fc',
              at: NOW,
            },
          ],
        }),
      ),
      NOW,
    );
    expect(world.journal[0]?.message).toBe('a b c');
    expect(world.journal[0]?.id).toBe('j1');
  });

  it('caps a hostile journal', () => {
    const journal = Array.from({ length: MAX_JOURNAL + 80 }, (_, index) => ({
      id: `j${index + 1}`,
      kind: 'misted',
      message: 'A quiet mist.',
      at: NOW,
    }));
    const world = parseSeedPacket(packet(rawWorld({ journal })), NOW);
    expect(world.journal).toHaveLength(MAX_JOURNAL);
  });
});

describe('seed packet round trip', () => {
  it('preserves an exported world', () => {
    const world = createWorld(20260518, NOW);
    world.entities.push({
      id: 's1',
      speciesId: 'cushion-moss',
      plantedAt: 0,
      x: 0.5,
      depth: 0.6,
      seed: 31,
      generation: 1,
      parentId: null,
      growth: 0.4,
      health: 0.9,
      dormant: false,
      stressMs: 0,
      pruned: 0,
      branches: 0,
      propagated: false,
      lastStage: 3,
      pressed: false,
      noteSeed: 4,
    });
    const imported = parseSeedPacket(seedPacketJSON(world, NOW), NOW);
    expect(imported.seed).toBe(world.seed);
    expect(imported.entities[0]?.growth).toBe(0.4);
    expect(imported.entities[0]?.speciesId).toBe('cushion-moss');
  });
});
