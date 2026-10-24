import { UI } from '../content/copy';
import type { Tool } from '../sim/types';
import { Icon } from './Icons';

export function MobileBar({
  tool,
  onTool,
  onPlant,
  onPlantIntent,
}: {
  tool: Tool;
  onTool: (tool: Tool) => void;
  onPlant: () => void;
  onPlantIntent?: () => void;
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
      <button
        type="button"
        className="bar-btn bar-plant"
        onClick={onPlant}
        onPointerEnter={onPlantIntent}
        onFocus={onPlantIntent}
      >
        <Icon name="leaf" />
        <span>{UI.mobilePlant}</span>
      </button>
    </nav>
  );
}
