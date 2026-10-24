import { APP, UI } from '../content/copy';
import { formatJournalStamp } from '../sim/time';
import type { World } from '../sim/types';
import { PressedThumb } from './Art';
import { Icon } from './Icons';

export function Journal({
  world,
  onOpenHerbarium,
}: {
  world: World;
  onOpenHerbarium: () => void;
}) {
  const entries = world.journal.slice(0, 60);
  return (
    <section className="journal-panel" aria-labelledby="journal-title" id="journal" tabIndex={-1}>
      <div className="journal-head">
        <div>
          <p className="eyebrow">{APP.name}</p>
          <h2 id="journal-title">{UI.journal}</h2>
        </div>
        <span className="count mono">{UI.journalCount(world.journal.length)}</span>
      </div>
      <p className="quiet">{UI.journalNote}</p>

      {entries.length === 0 ? (
        <p className="journal-empty">{UI.journalEmpty}</p>
      ) : (
        <ol className="journal-list" id="journal-list">
          {entries.map((entry) => (
            <li key={entry.id} className={`journal-entry kind-${entry.kind}`}>
              <div className="entry-head">
                <time className="entry-time mono" dateTime={new Date(entry.at).toISOString()}>
                  {formatJournalStamp(entry.at)}
                </time>
                {entry.speciesId ? (
                  <PressedThumb
                    speciesId={entry.speciesId}
                    seed={entry.seed}
                    growth={entry.growth}
                    className="entry-thumb"
                  />
                ) : (
                  <span className="entry-mark" aria-hidden="true" />
                )}
              </div>
              <p className="entry-body">{entry.message}</p>
            </li>
          ))}
        </ol>
      )}

      <button type="button" className="journal-link" onClick={onOpenHerbarium}>
        <span className="journal-link-icon">
          <Icon name="shelf" size={17} />
        </span>
        <span>
          {UI.herbariumOpen}
          <span className="journal-link-meta mono">
            {UI.pressedCount(world.pressed.length)}
          </span>
        </span>
        <Icon name="arrow" size={15} />
      </button>
    </section>
  );
}
