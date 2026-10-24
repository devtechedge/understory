import { SEASON_COPY, UI } from '../content/copy';
import type { SaveState } from '../state/useVitrine';
import { clamp, formatClock, hourOfDay, sunFor } from '../sim/time';
import type { Season, World } from '../sim/types';
import { Icon } from './Icons';

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

interface ClimateProps {
  world: World;
  paused: boolean;
  onPause: () => void;
  onMist: () => void;
  onSeason: (season: Season) => void;
  previewMinutes: number;
  onPreview: (minutes: number) => void;
  saveState: SaveState;
}

export function ClimateStrip({
  world,
  paused,
  onPause,
  onMist,
  onSeason,
  previewMinutes,
  onPreview,
  saveState,
}: ClimateProps) {
  const nowHour = hourOfDay(world.createdAt + world.elapsedMs);
  const previewHour = previewMinutes > 0 ? (nowHour + previewMinutes / 60) % 24 : nowHour;
  const sun = sunFor(world.season, previewHour);
  const lightPct = Math.round(sun.elevation * 100);
  const moisture = Math.round(world.moisture);
  const dayProgress = clamp((previewHour - 5.5) / 13, 0, 1);
  const markerX = 8 + dayProgress * 112;
  const markerY = 30 - Math.sin(Math.PI * dayProgress) * 26;

  return (
    <section className="climate" aria-label="Vitrine climate">
      <div className="climate-grid">
        <div className="climate-cell light-cell">
          <div className="climate-label">
            <span>{UI.light}</span>
            <span className="mono">{lightPct}%</span>
          </div>
          <div className="sun-row">
            <svg className="sun-arc" viewBox="0 0 128 36" aria-hidden="true">
              <path d="M8 30 C 30 -4, 98 -4, 120 30" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.48" />
              <path d="M8 30 H120" stroke="currentColor" strokeWidth="0.5" opacity="0.18" />
              <circle cx={markerX} cy={markerY} r="3.6" fill="currentColor" className="sun-marker" />
              <circle cx={markerX} cy={markerY} r="7" fill="none" stroke="currentColor" opacity="0.25" />
            </svg>
            <span className="climate-note">
              {UI.phaseNames[sun.phase]}
              {previewMinutes > 0 ? ` · ${UI.previewing(`${(previewMinutes / 60).toFixed(1)} h`)}` : ''}
            </span>
          </div>
        </div>

        <div className="climate-cell moisture-cell">
          <div className="climate-label">
            <span>{UI.moisture}</span>
            <span className="mono">{moisture}%</span>
          </div>
          <div
            className="meter"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={moisture}
            aria-label={`${UI.moisture} ${moisture} percent`}
          >
            <span className="meter-fill" style={{ width: `${moisture}%` }} />
            <span className="meter-mark" style={{ left: '58%' }} aria-hidden="true" />
          </div>
          <button type="button" className="btn small mist-btn" onClick={onMist}>
            <Icon name="mist" size={15} /> {UI.mist}
          </button>
        </div>

        <div className="climate-cell season-cell">
          <div className="climate-label">
            <span>{UI.season}</span>
            <span className="mono">
              {UI.soilLabel} {Math.round(sun.tempC)} °C
            </span>
          </div>
          <div className="season-dial" role="group" aria-label={UI.season}>
            {SEASONS.map((season) => (
              <button
                key={season}
                type="button"
                className={`season-btn ${world.season === season ? 'is-active' : ''}`}
                aria-pressed={world.season === season}
                onClick={() => onSeason(season)}
                title={SEASON_COPY[season].line}
              >
                {SEASON_COPY[season].short}
              </button>
            ))}
          </div>
        </div>

        <div className="climate-cell time-cell">
          <div className="climate-label">
            <span>{UI.vitrineTime}</span>
            <span className="mono">{formatClock(world.createdAt + world.elapsedMs)}</span>
          </div>
          <div className="time-row">
            <button
              type="button"
              className="btn small pause-btn"
              onClick={onPause}
              aria-pressed={paused}
            >
              <Icon name={paused ? 'play' : 'pause'} size={15} />
              {paused ? UI.resume : UI.pause}
            </button>
          </div>
        </div>
      </div>

      <div className="climate-foot">
        <label className="preview-control" htmlFor="light-preview">
          <span className="preview-label">{UI.previewLight}</span>
          <input
            id="light-preview"
            type="range"
            min="0"
            max="6"
            step="0.25"
            value={previewMinutes / 60}
            onChange={(event) => onPreview(Math.round(Number(event.target.value) * 60))}
            aria-describedby="preview-note"
          />
          <span className="preview-value mono">
            {previewMinutes === 0 ? UI.now : `+${(previewMinutes / 60).toFixed(1)} h`}
          </span>
        </label>
        <p id="preview-note" className="preview-note">
          {previewMinutes > 0 ? UI.previewing(`${(previewMinutes / 60).toFixed(1)} h`) : UI.previewNote}
        </p>
        <span className={`save-state ${saveState}`} aria-live="polite">
          <span className="save-dot" aria-hidden="true" />
          {saveState === 'saved' ? UI.saved : saveState === 'saving' ? UI.saving : UI.saveFailed}
        </span>
      </div>
    </section>
  );
}
