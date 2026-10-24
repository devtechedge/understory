import { SPECIES_COPY, UI } from '../content/copy';
import { SPECIES_IDS } from '../sim/species';
import type { SpeciesId } from '../sim/types';
import { SeedPacketArt } from './Art';
import { Dialog } from './Dialog';

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
