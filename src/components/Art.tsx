import { randomFromSeed } from '../sim/prng';
import type { SpeciesId } from '../sim/types';

const PACKET_TONES: Record<SpeciesId, { paper: string; band: string; ink: string; accent: string }> = {
  'cushion-moss': { paper: '#d8dcc4', band: '#5c7350', ink: '#3c4c33', accent: '#9aac7d' },
  'maidenhair-fern': { paper: '#e3dcc6', band: '#6b7450', ink: '#40492f', accent: '#a9ae7f' },
  'ghost-fungus': { paper: '#e6e2d1', band: '#59645c', ink: '#3f4a45', accent: '#9fc9b1' },
};

export function SeedPacketArt({ speciesId, className }: { speciesId: SpeciesId; className?: string }) {
  const tone = PACKET_TONES[speciesId];
  return (
    <svg className={className} viewBox="0 0 116 148" aria-hidden="true" focusable="false">
      <path
        d="M6 10 L110 10 L110 138 Q110 143 105 143 L11 143 Q6 143 6 138 Z"
        fill={tone.paper}
      />
      <path d="M6 10 L110 10 L110 24 L6 24 Z" fill={tone.band} opacity="0.92" />
      <path d="M6 26 L110 26" stroke={tone.ink} strokeWidth="0.6" opacity="0.28" />
      <path
        d="M15 34 L101 34 L101 132 L15 132 Z"
        fill="none"
        stroke={tone.ink}
        strokeWidth="0.7"
        opacity="0.35"
      />
      <g transform="translate(30 56) scale(0.45)" color={tone.ink}>
        <PressedSilhouette speciesId={speciesId} seed={speciesId.length * 97} growth={0.85} />
      </g>
      <g stroke={tone.ink} opacity="0.24">
        <path d="M24 118 L92 118" strokeWidth="0.7" />
        <path d="M34 123 L82 123" strokeWidth="0.5" />
        <path d="M41 128 L75 128" strokeWidth="0.5" />
      </g>
      <circle cx="99" cy="15" r="2.2" fill={tone.accent} opacity="0.9" />
    </svg>
  );
}

export function PressedSilhouette({
  speciesId,
  seed,
  growth,
}: {
  speciesId: SpeciesId;
  seed: number;
  growth: number;
}) {
  const random = (index: number) => randomFromSeed(seed, index);
  if (speciesId === 'maidenhair-fern') {
    const fronds = growth < 0.22 ? 1 : 3 + Math.floor(random(1) * 2);
    return (
      <g fill="currentColor">
        {Array.from({ length: fronds }, (_, index) => {
          const baseX = 60 + (index - (fronds - 1) / 2) * 4;
          const direction = index % 2 === 0 ? -1 : 1;
          const length = growth < 0.22 ? 52 : 62 + random(index + 2) * 40;
          const tipX = baseX + direction * (10 + random(index + 5) * 26);
          const tipY = 154 - length - random(index + 3) * 18;
          const midX = baseX + direction * 6;
          const midY = 154 - length * 0.55;
          const pinnae = growth < 0.22 ? 2 : 5;
          return (
            <g key={index}>
              <path
                d={`M${baseX} 154 Q${midX} ${midY} ${tipX} ${tipY}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                opacity="0.8"
              />
              {Array.from({ length: pinnae }, (_, leafIndex) => {
                const t = 0.42 + (leafIndex / pinnae) * 0.5;
                const x = baseX + (tipX - baseX) * t + direction * 1;
                const y = 154 + (tipY - 154) * t;
                const side = leafIndex % 2 === 0 ? -1 : 1;
                const size = 5 + (1 - t) * 7;
                return (
                  <path
                    key={leafIndex}
                    d={`M${x} ${y} q${side * size * 0.9} ${-size * 0.5} ${side * size} ${
                      size * 0.2
                    } q${-side * size * 0.25} ${size * 0.45} ${-side * size} ${-size * 0.2} Z`}
                    opacity={0.52 + random(leafIndex + 20) * 0.22}
                  />
                );
              })}
            </g>
          );
        })}
      </g>
    );
  }

  if (speciesId === 'cushion-moss') {
    const humps = 4;
    return (
      <g fill="currentColor">
        {Array.from({ length: humps }, (_, index) => {
          const x = 24 + index * 19 + random(index + 2) * 6;
          const w = 18 + random(index + 8) * 12;
          const h = 20 + random(index + 4) * 14;
          return (
            <path
              key={index}
              d={`M${x - w / 2} 154 Q${x} ${154 - h * 1.6} ${x + w / 2} 154 Z`}
              opacity={0.5 + random(index + 3) * 0.28}
            />
          );
        })}
        {Array.from({ length: 5 }, (_, index) => {
          const x = 26 + random(index + 30) * 68;
          const y = 154;
          const h = 16 + random(index + 31) * 16;
          return (
            <g key={`stem-${index}`}>
              <path
                d={`M${x} ${y} Q${x + 2} ${y - h * 0.7} ${x + (random(index + 32) - 0.5) * 8} ${
                  y - h
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="0.7"
                opacity="0.6"
              />
              <circle cx={x + 2} cy={y - h} r="1.4" opacity="0.65" />
            </g>
          );
        })}
      </g>
    );
  }

  const mushrooms = 2 + (growth > 0.5 ? 1 : 0);
  return (
    <g fill="currentColor">
      {Array.from({ length: mushrooms }, (_, index) => {
        const x = 42 + index * 24 + random(index + 2) * 8;
        const baseY = 154;
        const h = 48 + random(index + 3) * 34;
        const capW = 15 + random(index + 4) * 9;
        return (
          <g key={index} opacity={0.55 + random(index + 8) * 0.3}>
            <path
              d={`M${x} ${baseY} Q${x - 3} ${baseY - h * 0.55} ${x + 2} ${baseY - h}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d={`M${x - capW} ${baseY - h} Q${x} ${baseY - h - capW * 0.9} ${x + capW} ${
                baseY - h
              } Q${x} ${baseY - h + capW * 0.24} ${x - capW} ${baseY - h} Z`}
            />
            <path
              d={`M${x - capW * 0.7} ${baseY - h + 2} L${x - capW * 0.4} ${
                baseY - h + 5
              } M${x} ${baseY - h + 2} L${x} ${baseY - h + 6} M${x + capW * 0.5} ${
                baseY - h + 1
              } L${x + capW * 0.35} ${baseY - h + 4}`}
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.5"
            />
          </g>
        );
      })}
      {Array.from({ length: 6 }, (_, index) => (
        <circle
          key={`spore-${index}`}
          cx={26 + random(index + 40) * 70}
          cy={34 + random(index + 45) * 50}
          r={0.9 + random(index + 50) * 1.1}
          opacity={0.28 + random(index + 55) * 0.3}
        />
      ))}
    </g>
  );
}

export function PressedThumb({
  speciesId,
  seed,
  growth,
  className,
}: {
  speciesId: SpeciesId;
  seed: number;
  growth: number;
  className?: string;
}) {
  return (
    <span className={`pressed-thumb ${className ?? ''}`} aria-hidden="true">
      <svg viewBox="0 0 120 160" className="pressed-svg">
        <PressedSilhouette speciesId={speciesId} seed={seed} growth={growth} />
      </svg>
    </span>
  );
}

export function SpeciesGlyph({ speciesId }: { speciesId: SpeciesId }) {
  return (
    <svg className="species-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {speciesId === 'cushion-moss' ? (
        <g fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M3 18 Q5 10 8 18 M8 19 Q12 8 16 19 M15 18 Q18 12 21 18" />
          <path d="M9 9 L9 14 M14 7 L14 12" strokeLinecap="round" />
        </g>
      ) : speciesId === 'maidenhair-fern' ? (
        <g fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M12 21 Q11 12 6 4" strokeLinecap="round" />
          <path d="M11 16 Q7 14 6 11 M11 13 Q15 11 17 8 M10 10 Q8 8 8 6" strokeLinecap="round" />
        </g>
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M12 21 V13" strokeLinecap="round" />
          <path d="M4 12 Q12 3 20 12 Q12 15 4 12 Z" />
          <path d="M8 12.5 L9 15 M12 12.6 V15.5 M16 12 L15 14.5" opacity="0.7" />
        </g>
      )}
    </svg>
  );
}
