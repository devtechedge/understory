import { describe, expect, it } from 'vitest';
import {
  DAY_MS,
  MINUTE_MS,
  SEASON_MS,
  clamp,
  fit,
  formatClock,
  formatDate,
  formatDuration,
  hourOfDay,
  nextSeason,
  seasonsSince,
  sunFor,
} from '../src/sim/time';

describe('duration formatting', () => {
  it('uses minutes below an hour', () => {
    expect(formatDuration(0)).toBe('1 minute');
    expect(formatDuration(90_000)).toBe('2 minutes');
    expect(formatDuration(59 * MINUTE_MS)).toBe('59 minutes');
  });

  it('uses hours and minutes below a day', () => {
    expect(formatDuration(60 * MINUTE_MS)).toBe('1 hour');
    expect(formatDuration(90 * MINUTE_MS)).toBe('1 h 30 min');
    expect(formatDuration(23 * 60 * MINUTE_MS)).toBe('23 hours');
  });

  it('uses days above a day', () => {
    expect(formatDuration(24 * 60 * MINUTE_MS)).toBe('1 day');
    expect(formatDuration(25 * 60 * MINUTE_MS)).toBe('1 day 1 h');
    expect(formatDuration(2 * DAY_MS)).toBe('2 days');
  });
});

describe('time and season helpers', () => {
  it('reads the local hour of day', () => {
    const date = new Date(2026, 0, 1, 13, 30);
    expect(hourOfDay(date.getTime())).toBeCloseTo(13.5, 5);
  });

  it('moves through the seasons in order', () => {
    expect(nextSeason('spring')).toBe('summer');
    expect(nextSeason('summer')).toBe('autumn');
    expect(nextSeason('autumn')).toBe('winter');
    expect(nextSeason('winter')).toBe('spring');
  });

  it('counts completed seasons and clamps negatives', () => {
    expect(seasonsSince(0, 0)).toBe(0);
    expect(seasonsSince(0, SEASON_MS - 1)).toBe(0);
    expect(seasonsSince(0, SEASON_MS)).toBe(1);
    expect(seasonsSince(1000, 0)).toBe(0);
  });

  it('gives daylight at noon and night at midnight', () => {
    const noon = sunFor('summer', 12);
    expect(noon.elevation).toBeCloseTo(1, 5);
    expect(noon.phase).toBe('day');
    expect(noon.dayLength).toBeGreaterThan(14);

    const midnight = sunFor('winter', 0);
    expect(midnight.elevation).toBe(0);
    expect(midnight.phase).toBe('night');
  });

  it('marks dawn around sunrise', () => {
    const spring = sunFor('spring', 5.4);
    expect(spring.phase).toBe('dawn');
    expect(spring.elevation).toBe(0);
  });
});

describe('numeric helpers', () => {
  it('clamps and fits values at both edges', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(clamp(22, 0, 10)).toBe(10);
    expect(fit(5, 0, 10, 4)).toBe(1);
    expect(fit(-2, 0, 10, 4)).toBe(0.5);
    expect(fit(14, 0, 10, 4)).toBe(0);
  });
});

describe('clock labels', () => {
  it('renders stable date and clock shapes', () => {
    const epoch = new Date(2026, 9, 24, 12, 5).getTime();
    expect(formatClock(epoch)).toMatch(/^\d{2}:\d{2}$/);
    expect(formatDate(epoch)).toMatch(/^\d{1,2} [A-Z][a-z]{2}$/);
  });
});
