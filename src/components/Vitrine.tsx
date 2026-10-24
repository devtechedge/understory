import { useEffect, useRef } from 'react';
import { SCENE_TEXT, SPECIES_COPY, UI } from '../content/copy';
import { SPECIES_IDS } from '../sim/species';
import { clamp, hourOfDay, sunFor } from '../sim/time';
import type { SpeciesId, Tool, World } from '../sim/types';
import { createSceneRenderer, type SceneUi } from '../render/scene';
import { InspectPanel, type InspectPanelState } from './InspectPanel';

interface VitrineProps {
  world: World;
  tool: Tool;
  still: boolean;
  paused: boolean;
  selectedId: string | null;
  previewHour: number | null;
  mistSignal: number;
  panel: InspectPanelState;
  onInspect: (id: string) => void;
  onInspectSoil: () => void;
  onPrune: (id: string) => void;
  onMist: () => void;
  onPlantAt: (species: SpeciesId, x: number) => void;
  onSnipMiss: () => void;
  onChoosePacket: () => void;
  onClosePanel: () => void;
  toolHint: string;
}

export function Vitrine({
  world,
  tool,
  still,
  paused,
  selectedId,
  previewHour,
  mistSignal,
  panel,
  onInspect,
  onInspectSoil,
  onPrune,
  onMist,
  onPlantAt,
  onSnipMiss,
  onChoosePacket,
  onClosePanel,
  toolHint,
}: VitrineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createSceneRenderer> | null>(null);
  const worldRef = useRef(world);
  const uiRef = useRef<SceneUi>({ tool, still, paused, selectedId, previewHour });
  const focusIndex = useRef(-1);

  useEffect(() => {
    worldRef.current = world;
  }, [world]);

  useEffect(() => {
    uiRef.current = { tool, still, paused, selectedId, previewHour };
  }, [tool, still, paused, selectedId, previewHour]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createSceneRenderer(canvas);
    rendererRef.current = renderer;
    renderer.resize();

    const observer = new ResizeObserver(() => renderer.resize());
    observer.observe(canvas);
    const onResize = () => renderer.resize();
    window.addEventListener('resize', onResize);

    const compactQuery = window.matchMedia('(max-width: 720px)');
    let frameInterval = compactQuery.matches ? 1000 / 30 : 0;
    const onCompactChange = () => {
      frameInterval = compactQuery.matches ? 1000 / 30 : 0;
    };
    compactQuery.addEventListener('change', onCompactChange);

    let frame = 0;
    let running = true;
    let lastPaint = 0;
    const loop = (time: number) => {
      if (!running) return;
      if (document.visibilityState !== 'hidden' && time - lastPaint >= frameInterval - 1) {
        renderer.draw(worldRef.current, uiRef.current, time);
        lastPaint = time;
      }
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      compactQuery.removeEventListener('change', onCompactChange);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mistSignal > 0) rendererRef.current?.triggerMist();
  }, [mistSignal]);

  const hour = hourOfDay(world.createdAt + world.elapsedMs);
  const sun = sunFor(world.season, hour);
  const names = world.entities.map((entity) => SPECIES_COPY[entity.speciesId].common);
  const alt = SCENE_TEXT({
    count: world.entities.length,
    names,
    season: world.season,
    phase: UI.phaseNames[sun.phase],
    moisture: world.moisture,
    light: sun.elevation,
    entries: world.journal.length,
  });

  const pointerPosition = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  return (
    <div className="vitrine-shell">
      <div className="vitrine" data-tool={tool}>
        <div className="vitrine-frame">
          <div className="glass">
            <canvas
              ref={canvasRef}
              className="vitrine-canvas"
              role="img"
              tabIndex={0}
              aria-label={alt}
              aria-describedby="vitrine-instructions"
              data-testid="vitrine-canvas"
              id="vitrine-canvas"
              onPointerMove={(event) => {
                const point = pointerPosition(event.currentTarget, event.clientX, event.clientY);
                rendererRef.current?.setPointer(point.x, point.y, true);
              }}
              onPointerLeave={() => rendererRef.current?.setPointer(0, 0, false)}
              onClick={(event) => {
                const point = pointerPosition(event.currentTarget, event.clientX, event.clientY);
                const renderer = rendererRef.current;
                if (!renderer) return;
                const hit = renderer.hitTest(point.x, point.y, worldRef.current);
                if (tool === 'snip') {
                  if (hit?.kind === 'specimen' && hit.id) {
                    renderer.triggerSnip(point.x, point.y);
                    onPrune(hit.id);
                  } else {
                    onSnipMiss();
                  }
                  return;
                }
                if (tool === 'mist') {
                  onMist();
                  return;
                }
                if (hit?.kind === 'specimen' && hit.id) onInspect(hit.id);
                else if (hit?.kind === 'soil') onInspectSoil();
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={(event) => {
                event.preventDefault();
                const species = event.dataTransfer.getData('text/species');
                if (!(SPECIES_IDS as string[]).includes(species)) return;
                const point = pointerPosition(event.currentTarget, event.clientX, event.clientY);
                const renderer = rendererRef.current;
                if (!renderer) return;
                const virtual = renderer.toVirtual(point.x, point.y);
                onPlantAt(species as SpeciesId, clamp(virtual.x / 1000, 0.12, 0.88));
              }}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Enter') {
                  return;
                }
                const entities = worldRef.current.entities;
                if (entities.length === 0) return;
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const target = focusIndex.current >= 0 ? entities[focusIndex.current] : entities[0];
                  if (target) onInspect(target.id);
                  return;
                }
                event.preventDefault();
                const step = event.key === 'ArrowRight' ? 1 : -1;
                focusIndex.current =
                  (Math.max(0, focusIndex.current) + step + entities.length) % entities.length;
                const target = entities[focusIndex.current];
                if (target) onInspect(target.id);
              }}
            />

            <div className="glass-reflection" aria-hidden="true" />
            <div className="glass-edge" aria-hidden="true" />
            <div className="condensation-sheen" aria-hidden="true" data-moisture={world.moisture > 70 ? 'high' : 'low'} />

            {world.entities.length === 0 ? (
              <div className="empty-soil">
                <p className="empty-kicker">{UI.emptySoilTitle}</p>
                <p className="empty-line">{UI.emptySoilLine}</p>
                <button type="button" className="btn" onClick={onChoosePacket}>
                  {UI.emptySoilAction}
                </button>
              </div>
            ) : null}

            <InspectPanel
              world={world}
              panel={panel}
              onClose={onClosePanel}
              onPrune={onPrune}
              onMist={onMist}
            />
          </div>
        </div>
        <div className="vitrine-plate" aria-hidden="true">
          <span className="plate-mark">U</span>
          <span className="plate-text">Vitrine no. 1</span>
          <span className="plate-rule" />
          <span className="plate-text mono">Understory</span>
        </div>
      </div>
      <p className="tool-hint">
        <span className="tool-hint-label">{UI.tools}</span>
        <span>{toolHint}</span>
      </p>
      <p id="vitrine-instructions" className="sr-only">
        {UI.sceneInstructions}
      </p>
    </div>
  );
}
