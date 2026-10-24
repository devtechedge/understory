import { useEffect, useRef } from 'react';
import { JOURNAL, SPECIES_COPY, UI } from '../content/copy';
import { growingNote } from '../sim/engine';
import { healthLabel, heightMm, spreadCm, stageFromIndex } from '../sim/species';
import { formatJournalStamp, hourOfDay, sunFor } from '../sim/time';
import type { World } from '../sim/types';
import { PressedThumb } from './Art';
import { Icon } from './Icons';

export type InspectPanelState = { kind: 'specimen'; id: string } | { kind: 'soil' } | null;

function ageText(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 1) return UI.ageMinutes(0);
  if (minutes < 60) return UI.ageMinutes(minutes);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function InspectPanel({
  world,
  panel,
  onClose,
  onPrune,
  onMist,
}: {
  world: World;
  panel: InspectPanelState;
  onClose: () => void;
  onPrune: (id: string) => void;
  onMist: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!panel) return;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [panel]);

  if (!panel) return null;

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  };

  if (panel.kind === 'soil') {
    const hour = hourOfDay(world.createdAt + world.elapsedMs);
    const sun = sunFor(world.season, hour);
    const nutrients =
      world.nutrients > 0.66
        ? UI.nutrientWords.rich
        : world.nutrients > 0.36
          ? UI.nutrientWords.worked
          : UI.nutrientWords.thin;
    const hasMycelium = world.entities.some((entity) => entity.speciesId === 'ghost-fungus');
    const deepest = world.entities.reduce((max, entity) => Math.max(max, entity.growth), 0);
    const rootDepth = world.entities.length === 0 ? 0 : Math.round(5 + deepest * 14);

    return (
      <div
        className="inspect-panel soil-card"
        role="dialog"
        aria-modal="false"
        aria-labelledby="soil-card-title"
        onKeyDown={onKeyDown}
      >
        <header className="inspect-head">
          <div>
            <p className="eyebrow">{UI.soilCard}</p>
            <h3 id="soil-card-title">{UI.soilCard}</h3>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label={UI.closeCard}
            ref={closeRef}
          >
            <Icon name="close" size={17} />
          </button>
        </header>

        <div className="soil-swatch" aria-hidden="true">
          <span className="swatch-humus" />
          <span className="swatch-loam" />
          <span className="swatch-sand" />
          <span className="swatch-root root-a" />
          <span className="swatch-root root-b" />
          <span className="swatch-root root-c" />
        </div>

        <dl className="card-facts">
          <div>
            <dt>{UI.moisture}</dt>
            <dd className="mono">{Math.round(world.moisture)}%</dd>
          </div>
          <div>
            <dt>{UI.temperature}</dt>
            <dd className="mono">{Math.round(sun.tempC)} °C</dd>
          </div>
          <div>
            <dt>{UI.nutrients}</dt>
            <dd>{nutrients}</dd>
          </div>
          <div>
            <dt>{UI.roots}</dt>
            <dd>{rootsDepthText(rootDepth)}</dd>
          </div>
          <div>
            <dt>{UI.mycelium}</dt>
            <dd>{hasMycelium ? UI.myceliumPresent : UI.myceliumAbsent}</dd>
          </div>
        </dl>

        <p className="card-note">
          {hasMycelium ? UI.myceliumNote : UI.soilCutawayNote}
        </p>

        <button type="button" className="btn small card-action" onClick={onMist}>
          <Icon name="mist" size={15} /> {UI.mist}
        </button>
      </div>
    );
  }

  const entity = world.entities.find((item) => item.id === panel.id);
  if (!entity) return null;
  const species = SPECIES_COPY[entity.speciesId];
  const index = world.entities.findIndex((item) => item.id === entity.id);
  const stage = stageFromIndex(entity.lastStage);
  const health = healthLabel(entity.health, entity.dormant);
  const height = heightMm(entity.speciesId, entity.growth);
  const spread = spreadCm(entity.speciesId, entity.growth);
  const age = world.elapsedMs - entity.plantedAt;

  return (
    <div
      className="inspect-panel specimen-card"
      role="dialog"
      aria-modal="false"
      aria-labelledby="specimen-card-title"
      onKeyDown={onKeyDown}
    >
      <header className="inspect-head">
        <div>
          <p className="eyebrow">{UI.specimenCard}</p>
          <h3 id="specimen-card-title">{species.common}</h3>
          <p className="latin">{species.latin}</p>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label={UI.closeCard}
          ref={closeRef}
        >
          <Icon name="close" size={17} />
        </button>
      </header>

      <div className="specimen-card-body">
        <div className="specimen-art-wrap">
          <PressedThumb
            speciesId={entity.speciesId}
            seed={entity.noteSeed}
            growth={entity.growth}
            className="specimen-art"
          />
          <span className="card-number mono">{UI.cardNumber(index + 1)}</span>
        </div>
        <dl className="card-facts compact">
          <div>
            <dt>{UI.lineage}</dt>
            <dd>{UI.generation(entity.generation)}</dd>
          </div>
          <div>
            <dt>{UI.stage}</dt>
            <dd>{stage}</dd>
          </div>
          <div>
            <dt>{UI.health}</dt>
            <dd>{health}</dd>
          </div>
          <div>
            <dt>{UI.planted}</dt>
            <dd className="mono small">{formatJournalStamp(world.createdAt + entity.plantedAt)}</dd>
          </div>
          <div>
            <dt>{UI.ageLabel}</dt>
            <dd>{ageText(age)}</dd>
          </div>
          <div>
            <dt>{spread > 0 ? UI.spreadLabel : UI.heightLabel}</dt>
            <dd className="mono">{spread > 0 ? UI.spread(spread) : UI.height(height)}</dd>
          </div>
        </dl>
      </div>

      <p className="card-note">{entity.dormant ? JOURNAL.dormantHints[entity.speciesId] : growingNote(entity)}</p>

      <div className="card-footer">
        <button
          type="button"
          className="btn small"
          disabled={entity.growth < 0.24}
          onClick={() => onPrune(entity.id)}
          title={species.cutHint}
        >
          <Icon name="snip" size={15} /> {UI.snipPart(species.part)}
        </button>
        <span className="card-footnote">
          {entity.growth < 0.24 ? UI.growthHint : species.cutHint}
        </span>
      </div>
    </div>
  );
}

function rootsDepthText(depth: number): string {
  if (depth <= 0) return UI.noRoots;
  return UI.rootsReaching(depth);
}
