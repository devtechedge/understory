import type { Season, SunState } from './types';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
export const SEASON_MS = 7 * DAY_MS;
export const CATCHUP_CAP_MS = 2 * HOUR_MS;
export const TICK_MS = 10_000;

const DAYLIGHT_HOURS: Record<Season, number> = {
  spring: 12.6,
  summer: 15.2,
  autumn: 11.2,
  winter: 9.1,
};

const SEASON_TEMP: Record<Season, number> = {
  spring: 16.5,
  summer: 24,
  autumn: 13,
  winter: 6.5,
};

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export function nextSeason(season: Season): Season {
  const index = SEASONS.indexOf(season);
  return SEASONS[(index + 1) % SEASONS.length] as Season;
}

export function hourOfDay(epochMs: number): number {
  const date = new Date(epochMs);
  return date.getHours() + date.getMinutes() / 60;
}

export function sunFor(season: Season, hour: number): SunState {
  const dayLength = DAYLIGHT_HOURS[season];
  const sunrise = 12 - dayLength / 2;
  const sunset = 12 + dayLength / 2;
  const clampedHour = ((hour % 24) + 24) % 24;

  let elevation = 0;
  if (clampedHour > sunrise && clampedHour < sunset) {
    const progress = (clampedHour - sunrise) / dayLength;
    elevation = Math.sin(Math.PI * progress);
  }

  let phase: SunState['phase'] = 'night';
  if (clampedHour >= sunrise - 1 && clampedHour < sunrise + 0.9) phase = 'dawn';
  else if (clampedHour > sunset - 0.9 && clampedHour <= sunset + 1) phase = 'dusk';
  else if (elevation > 0) phase = 'day';

  const warmth = elevation * (season === 'summer' ? 7.5 : season === 'winter' ? 3.5 : 5.5);
  const tempC = SEASON_TEMP[season] - (elevation > 0 ? 0 : 1.8) + warmth;

  return { elevation, phase, tempC, dayLength };
}

export function seasonsSince(start: number, elapsedMs: number): number {
  return Math.floor(Math.max(0, elapsedMs - start) / SEASON_MS);
}

export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) {
    return rest === 0
      ? `${hours} ${hours === 1 ? 'hour' : 'hours'}`
      : `${hours} h ${rest} min`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours === 0
    ? `${days} ${days === 1 ? 'day' : 'days'}`
    : `${days} ${days === 1 ? 'day' : 'days'} ${restHours} h`;
}

export function formatClock(epochMs: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(epochMs));
}

export function formatDate(epochMs: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(epochMs));
}

export function formatJournalStamp(epochMs: number): string {
  return `${formatDate(epochMs)}, ${formatClock(epochMs)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function fit(value: number, min: number, max: number, margin: number): number {
  if (value >= min && value <= max) return 1;
  const distance = value < min ? min - value : value - max;
  return clamp(1 - distance / margin, 0, 1);
}
