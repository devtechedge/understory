import { UI, SPECIES_COPY } from '../content/copy';
import { SPECIES_IDS, healthLabel, heightMm, spreadCm, stageFromIndex } from '../sim/species';
import type { SpeciesId, Tool, World } from '../sim/types';
import { Icon } from './Icons';
import { SeedPacketArt, SpeciesGlyph } from './Art';

function ageLabel(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 1) return UI.ageMinutes(0);
  if (minutes < 60) return UI.ageMinutes(minutes);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

interface ShelfProps {
  world: World;
  selectedSpecies: SpeciesId | null;
  onSelectSpecies: (species: SpeciesId) => void;
  onPlantSelected: () => void;
  onPlantCutting: (id: string) => void;
  onOpenSpecimen: (id: string) => void;
  tool: Tool;
  onTool: (tool: Tool) => void;
  variant?: 'rail' | 'library';
}

const TOOL_ITEMS: { tool: Tool; label: string; key: string; hint: string }[] = [
  { tool: 'loupe', label: UI.toolLoupe, key: '1', hint: UI.toolLoupeHint },
  { tool: 'snip', label: UI.toolSnip, key: '2', hint: UI.toolSnipHint },
  { tool: 'mist', label: UI.toolMist, key: '3', hint: UI.toolMistHint },
];

export function SpecimenShelf({
  world,
  selectedSpecies,
  onSelectSpecies,
  onPlantSelected,
  onPlantCutting,
  onOpenSpecimen,
  tool,
  onTool,
  variant = 'rail',
}: ShelfProps) {
  const inSoil = world.entities;
  return (
    <div className={`shelf shelf-${variant}`}>
      <section className="panel" id={variant === 'rail' ? 'specimen-shelf' : 'library'}>
        <div className="panel-head">
          <h2>{UI.specimens}</h2>
          <span className="count">{UI.packets(SPECIES_IDS.length)}</span>
        </div>
        {variant === 'rail' ? <p className="quiet">{UI.specimensNote}</p> : null}
        <ul className="packet-list" role="list">
          {SPECIES_IDS.map((speciesId) => {
            const copy = SPECIES_COPY[speciesId];
            const selected = selectedSpecies === speciesId;
            return (
              <li key={speciesId}>
                <button
                  type="button"
                  className={`packet ${selected ? 'is-selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => onSelectSpecies(speciesId)}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/species', speciesId);
                    event.dataTransfer.effectAllowed = 'copy';
                    onSelectSpecies(speciesId);
                  }}
                >
                  <SeedPacketArt speciesId={speciesId} className="packet-art" />
                  <span className="packet-copy">
                    <span className="packet-label mono">{copy.packet}</span>
                    <span className="packet-name">{copy.common}</span>
                    <span className="packet-latin">{copy.latin}</span>
                    <span className="packet-line">{copy.packetLine}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="btn primary wide"
          onClick={onPlantSelected}
          disabled={!selectedSpecies}
        >
          {selectedSpecies ? UI.plantSelected : UI.selectPacket}
        </button>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>{UI.inSoil}</h2>
          <span className="count">{inSoil.length}</span>
        </div>
        {inSoil.length === 0 ? (
          <p className="quiet">{UI.soilEmpty}</p>
        ) : (
          <ul className="specimen-list" role="list">
            {inSoil.map((entity) => {
              const species = SPECIES_COPY[entity.speciesId];
              const age = world.elapsedMs - entity.plantedAt;
              const height = heightMm(entity.speciesId, entity.growth);
              const spread = spreadCm(entity.speciesId, entity.growth);
              const measure = spread > 0 ? UI.spread(spread) : UI.height(height);
              return (
                <li key={entity.id}>
                  <button
                    type="button"
                    className="specimen-row"
                    onClick={() => onOpenSpecimen(entity.id)}
                  >
                    <span className="specimen-glyph">
                      <SpeciesGlyph speciesId={entity.speciesId} />
                    </span>
                    <span className="specimen-text">
                      <span className="specimen-name">{species.common}</span>
                      <span className="specimen-meta mono">
                        {stageFromIndex(entity.lastStage)} · {ageLabel(age)} · {measure}
                      </span>
                    </span>
                    <span className={`health health-${healthLabel(entity.health, entity.dormant).toLowerCase()}`}>
                      {healthLabel(entity.health, entity.dormant)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {world.cuttings.length > 0 ? (
        <section className="panel vial">
          <div className="panel-head">
            <h2>{UI.cuttings}</h2>
            <span className="count">{world.cuttings.length}</span>
          </div>
          <ul className="cutting-list" role="list">
            {world.cuttings.map((cutting) => (
              <li key={cutting.id} className="cutting-row">
                <span className="cutting-art" aria-hidden="true">
                  <SpeciesGlyph speciesId={cutting.speciesId} />
                </span>
                <span className="specimen-text">
                  <span className="specimen-name">{UI.cuttingPart(SPECIES_COPY[cutting.speciesId].part)}</span>
                  <span className="specimen-meta mono">{UI.generation(cutting.generation + 1)}</span>
                </span>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => onPlantCutting(cutting.id)}
                >
                  {UI.plantCutting}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {variant === 'rail' ? (
        <section className="panel tool-panel">
          <div className="panel-head">
            <h2>{UI.tools}</h2>
          </div>
          <div className="tool-list" role="group" aria-label={UI.tools}>
            {TOOL_ITEMS.map((item) => (
              <button
                key={item.tool}
                type="button"
                className={`tool ${tool === item.tool ? 'is-selected' : ''}`}
                aria-pressed={tool === item.tool}
                onClick={() => onTool(item.tool)}
                title={item.hint}
              >
                <Icon name={item.tool === 'loupe' ? 'loupe' : item.tool === 'snip' ? 'snip' : 'mist'} />
                <span>{item.label}</span>
                <kbd>{item.key}</kbd>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
