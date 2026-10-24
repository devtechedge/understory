import { describe, expect, it } from 'vitest';
import {
  SPECIES,
  SPECIES_IDS,
  stageAt,
  stageFromIndex,
  stageIndex,
  heightMm,
  spreadCm,
  healthLabel,
} from '../src/sim/species';
import { HEALTH_COPY } from '../src/content/copy';

describe('growth stages', () => {
  it('walks the thresholds in order', () => {
    expect(stageAt(0)).toBe(1);
    expect(stageAt(0.02)).toBe(1);
    expect(stageAt(0.03)).toBe(2);
    expect(stageAt(0.23)).toBe(2);
    expect(stageAt(0.24)).toBe(3);
    expect(stageAt(0.54)).toBe(4);
    expect(stageAt(0.86)).toBe(5);
    expect(stageAt(1)).toBe(5);
  });

  it('round trips stage names', () => {
    for (let index = 0; index < 6; index += 1) {
      expect(stageIndex(stageFromIndex(index))).toBe(index);
    }
    expect(stageFromIndex(-4)).toBe('dormant-seed');
    expect(stageFromIndex(99)).toBe('mature');
  });
});

describe('species dimensions', () => {
  it('grows each species within its stated maximum', () => {
    for (const speciesId of SPECIES_IDS) {
      const max = SPECIES[speciesId].maxHeightMm;
      expect(heightMm(speciesId, 0)).toBeGreaterThan(0);
      expect(heightMm(speciesId, 1)).toBeLessThanOrEqual(max);
      expect(heightMm(speciesId, 1)).toBeGreaterThan(heightMm(speciesId, 0.5));
      expect(heightMm(speciesId, -10)).toBe(heightMm(speciesId, 0));
    }
  });

  it('spreads only the cushion moss', () => {
    expect(spreadCm('cushion-moss', 1)).toBe(17);
    expect(spreadCm('cushion-moss', 1)).toBeGreaterThan(spreadCm('cushion-moss', 0.4));
    expect(spreadCm('maidenhair-fern', 1)).toBe(0);
    expect(spreadCm('ghost-fungus', 1)).toBe(0);
  });
});

describe('health labels', () => {
  it('maps health to the journal words', () => {
    expect(healthLabel(0.9, true)).toBe(HEALTH_COPY.dormant);
    expect(healthLabel(0.9, false)).toBe(HEALTH_COPY.thriving);
    expect(healthLabel(0.72, false)).toBe(HEALTH_COPY.thriving);
    expect(healthLabel(0.5, false)).toBe(HEALTH_COPY.steady);
    expect(healthLabel(0.2, false)).toBe(HEALTH_COPY.pale);
  });
});
