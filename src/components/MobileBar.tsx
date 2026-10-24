import { SPECIES_COPY, UI } from '../content/copy';
import { SPECIES_IDS } from '../sim/species';
import type { SpeciesId, Tool } from '../sim/types';
import { SeedPacketArt } from './Art';
import { Dialog } from './Dialog';
import { Icon } from './Icons';

export function MobileBar({
  tool,
  onTool,
  onPlant,
}: {
  tool: Tool;
  onTool: (tool: Tool) => void;
  onPlant: () => void;
}) {
  return (
    <nav className="mobile-bar" aria-label={UI.tools}>
      <button
        type="button"
        className={`bar-btn ${tool === 'loupe' ? 'is-active' : ''}`}
        aria-pressed={tool === 'loupe'}
        onClick={() => onTool('loupe')}
      >
        <Icon name="loupe" />
        <span>{UI.toolLoupe}</span>
      </button>
      <button
        type="button"
        className={`bar-btn ${tool === 'snip' ? 'is-active' : ''}`}
        aria-pressed={tool === 'snip'}
        onClick={() => onTool('snip')}
      >
        <Icon name="snip" />
        <span>{UI.toolSnip}</span>
      </button>
      <button
        type="button"
        className={`bar-btn ${tool === 'mist' ? 'is-active' : ''}`}
        aria-pressed={tool === 'mist'}
        onClick={() => onTool('mist')}
      >
        <Icon name="mist" />
        <span>{UI.toolMist}</span>
      </button>
      <button type="button" className="bar-btn bar-plant" onClick={onPlant}>
        <Icon name="leaf" />
        <span>{UI.mobilePlant}</span>
      </button>
    </nav>
  );
}

export function PlantSheet({
  open,
  onClose,
  onPlant,
}: {
  open: boolean;
  onClose: () => void;
  onPlant: (species: SpeciesId) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={UI.mobilePlant} eyebrow={UI.specimens} className="plant-sheet">
      <p className="dialog-intro">{UI.specimensNote}</p>
      <div className="plant-sheet-grid">
        {SPECIES_IDS.map((speciesId) => {
          const copy = SPECIES_COPY[speciesId];
          return (
            <button
              type="button"
              className="plant-sheet-card"
              key={speciesId}
              onClick={() => onPlant(speciesId)}
            >
              <SeedPacketArt speciesId={speciesId} className="plant-sheet-art" />
              <span className="packet-label mono">{copy.packet}</span>
              <span className="packet-name">{copy.common}</span>
              <span className="packet-line">{copy.packetLine}</span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
