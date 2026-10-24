import { APP, HELP, UI } from '../content/copy';
import { Dialog } from './Dialog';

export function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={HELP.title} eyebrow={APP.name} className="help-dialog">
      <p className="dialog-intro">{HELP.intro}</p>
      <div className="help-grid">
        {HELP.sections.map((section) => (
          <section key={section.heading} className="help-section">
            <h3>{section.heading}</h3>
            <ul>
              {section.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section className="help-keys" aria-labelledby="help-keys-heading">
        <h3 id="help-keys-heading">{HELP.keysHeading}</h3>
        <dl>
          {HELP.keys.map(([key, action]) => (
            <div key={key}>
              <dt>
                <kbd>{key}</kbd>
              </dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </section>
      <p className="help-provenance">{HELP.provenance}</p>
      <p className="help-silent">
        {UI.noNetworkNote} {APP.silentNote}
      </p>
    </Dialog>
  );
}
