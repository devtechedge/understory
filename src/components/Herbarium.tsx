import { useRef, useState } from 'react';
import { SPECIES_COPY, UI } from '../content/copy';
import { SPECIES, SPECIES_IDS } from '../sim/species';
import { formatDate } from '../sim/time';
import type { World } from '../sim/types';
import { SeedPacketArt, PressedThumb } from './Art';
import { Dialog } from './Dialog';
import { Icon } from './Icons';

export function Herbarium({
  open,
  world,
  onClose,
  onExport,
  onImport,
}: {
  open: boolean;
  world: World;
  onClose: () => void;
  onExport: () => void;
  onImport: (text: string) => boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatus(UI.importFailed);
      return;
    }
    try {
      const text = await file.text();
      const ok = onImport(text);
      if (ok) onClose();
      else setStatus(UI.importFailed);
    } catch {
      setStatus(UI.importFailed);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={UI.herbarium}
      eyebrow="Understory"
      className="herbarium-dialog"
    >
      <p className="dialog-intro">{UI.herbariumNote}</p>

      <div className="herbarium-actions">
        <button
          type="button"
          className="btn"
          onClick={() => {
            onExport();
            setStatus(UI.exportDone);
          }}
        >
          <Icon name="download" size={16} /> {UI.exportPacket}
        </button>
        <button type="button" className="btn" onClick={() => inputRef.current?.click()}>
          <Icon name="upload" size={16} /> {UI.importPacket}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label={UI.importPacket}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
      <p className="herbarium-import-hint">{UI.importHint}</p>
      {status ? (
        <p className="form-status" role="status">
          {status}
        </p>
      ) : null}

      <section className="shelf-section" aria-labelledby="seed-packet-heading">
        <div className="shelf-heading">
          <h3 id="seed-packet-heading">{UI.shelfSeedPackets}</h3>
          <span className="count mono">{SPECIES_IDS.length}</span>
        </div>
        <div className="seed-card-grid">
          {SPECIES_IDS.map((speciesId) => {
            const copy = SPECIES_COPY[speciesId];
            return (
              <article className="seed-card" key={speciesId}>
                <SeedPacketArt speciesId={speciesId} className="seed-card-art" />
                <div>
                  <p className="eyebrow">{copy.packet}</p>
                  <h4>{copy.common}</h4>
                  <p className="latin">{copy.latin}</p>
                  <p className="seed-card-line">{copy.packetLine}</p>
                  <p className="seed-card-cycle">
                    <span>{UI.cycleLabel}</span> {SPECIES[speciesId].cycle}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="shelf-section" aria-labelledby="pressed-heading">
        <div className="shelf-heading">
          <h3 id="pressed-heading">{UI.shelfPressed}</h3>
          <span className="count mono">{world.pressed.length}</span>
        </div>
        {world.pressed.length === 0 ? (
          <p className="quiet">{UI.herbariumEmpty}</p>
        ) : (
          <div className="press-card-grid">
            {world.pressed.map((record, index) => {
              const copy = SPECIES_COPY[record.speciesId];
              return (
                <article className="press-card" key={record.id}>
                  <header className="press-head">
                    <p className="eyebrow">{UI.herbariumSheetLabel}</p>
                    <span className="mono press-number">{UI.cardNumber(index + 1)}</span>
                  </header>
                  <div className="press-art-wrap">
                    <PressedThumb
                      speciesId={record.speciesId}
                      seed={record.seed}
                      growth={1}
                      className="press-art"
                    />
                  </div>
                  <h4>{copy.common}</h4>
                  <p className="latin">{copy.latin}</p>
                  <dl className="press-facts">
                    <div>
                      <dt>{UI.plantedOn}</dt>
                      <dd className="mono">{formatDate(record.plantedAt)}</dd>
                    </div>
                    <div>
                      <dt>{UI.pressedOn}</dt>
                      <dd className="mono">{formatDate(record.maturedAt)}</dd>
                    </div>
                    <div>
                      <dt>{UI.lineage}</dt>
                      <dd>{UI.generation(record.generation)}</dd>
                    </div>
                    <div>
                      <dt>{UI.heightLabel}</dt>
                      <dd className="mono">{UI.height(record.heightMm)}</dd>
                    </div>
                  </dl>
                  <p className="press-note">{record.note}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </Dialog>
  );
}
