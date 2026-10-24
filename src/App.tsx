import { useCallback, useEffect, useRef, useState } from 'react';
import { APP, SEASON_COPY, SPECIES_COPY, UI } from './content/copy';
import { formatClock, formatDate, hourOfDay } from './sim/time';
import type { Season, SpeciesId, Tool } from './sim/types';
import { useVitrine } from './state/useVitrine';
import { loadPrefs, preferredStill, savePrefs, type RoomTheme } from './state/prefs';
import { Vitrine } from './components/Vitrine';
import { ClimateStrip } from './components/ClimateStrip';
import { Journal } from './components/Journal';
import { SpecimenShelf } from './components/SpecimenShelf';
import { HelpPanel } from './components/HelpPanel';
import { Herbarium } from './components/Herbarium';
import { MobileBar, PlantSheet } from './components/MobileBar';
import type { InspectPanelState } from './components/InspectPanel';
import { Icon } from './components/Icons';

const bootPrefs = loadPrefs();
const bootStill = bootPrefs?.still ?? preferredStill();

function BrandMark() {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" focusable="false">
      <path
        d="M6 26 Q6 10 18 4 Q30 10 30 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.7"
      />
      <path d="M5 26 H31" stroke="currentColor" strokeWidth="0.8" opacity="0.35" />
      <path
        d="M12 25 Q12 17 18 13 Q24 17 24 25 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path d="M18 13 V25" stroke="currentColor" strokeWidth="0.7" opacity="0.65" />
      <circle cx="18" cy="9" r="1.1" fill="currentColor" />
    </svg>
  );
}

export default function App() {
  const vitrine = useVitrine();
  const { world, paused, saveState, setPaused } = vitrine;

  const [still, setStill] = useState(bootStill);
  const [theme, setTheme] = useState<RoomTheme>(bootPrefs?.theme ?? 'lamp');
  const [tool, setTool] = useState<Tool>('loupe');
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesId | null>(null);
  const [panel, setPanel] = useState<InspectPanelState>(null);
  const [overlay, setOverlay] = useState<'help' | 'herbarium' | null>(null);
  const [plantSheet, setPlantSheet] = useState(false);
  const [immersed, setImmersed] = useState(false);
  const [preview, setPreview] = useState<{ baseHour: number; minutes: number } | null>(null);
  const [mistSignal, setMistSignal] = useState(0);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [liveText, setLiveText] = useState('');
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia('(max-width: 1023px)').matches,
  );

  const toastTimer = useRef<number | undefined>(undefined);
  const lastMistRef = useRef(-10_000);
  const lastJournalId = useRef<string | null>(null);
  const immerseRef = useRef<HTMLButtonElement>(null);
  const returnRef = useRef<HTMLButtonElement>(null);

  const notify = useCallback((text: string) => {
    if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now() + Math.random(), text });
    toastTimer.current = window.setTimeout(() => setToast(null), 4600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    savePrefs({ still, theme });
  }, [theme, still]);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setIsMobile(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.still = still ? 'true' : 'false';
  }, [still]);

  useEffect(() => {
    if (!world) return;
    const latest = world.journal[0];
    if (!latest) return;
    if (lastJournalId.current === null) {
      lastJournalId.current = latest.id;
      return;
    }
    if (latest.id !== lastJournalId.current) {
      lastJournalId.current = latest.id;
      setLiveText(`${UI.newEntry} ${latest.message}`);
    }
  }, [world]);

  useEffect(() => {
    if (!preview) return;
    const timer = window.setTimeout(() => setPreview(null), 6000);
    return () => window.clearTimeout(timer);
  }, [preview]);

  const setImmersion = useCallback((value: boolean) => {
    setImmersed(value);
    window.requestAnimationFrame(() => {
      if (value) returnRef.current?.focus();
      else immerseRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!world) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const tag = target?.tagName ?? '';
      const typing =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(target?.isContentEditable);

      if (event.key === 'Escape') {
        if (plantSheet) {
          setPlantSheet(false);
          return;
        }
        if (overlay) {
          setOverlay(null);
          return;
        }
        if (panel) {
          setPanel(null);
          return;
        }
        if (immersed) {
          setImmersion(false);
          return;
        }
        if (tool !== 'loupe') setTool('loupe');
        return;
      }

      if (typing || overlay || plantSheet) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === '1') {
        setTool('loupe');
      } else if (event.key === '2') {
        setTool('snip');
      } else if (event.key === '3') {
        setTool('mist');
      } else if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault();
        setOverlay('help');
      } else if (event.key.toLowerCase() === 'i') {
        setImmersion(!immersed);
      } else if (event.key.toLowerCase() === 'j') {
        setImmersion(false);
        window.setTimeout(() => {
          const journal = document.getElementById('journal');
          journal?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
          journal?.focus({ preventScroll: true });
        }, 40);
      } else if (event.code === 'Space') {
        if (tag === 'BUTTON' || tag === 'A') return;
        event.preventDefault();
        setPaused(!paused);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [world, plantSheet, overlay, panel, immersed, tool, still, paused, setPaused, setImmersion]);

  const handleMist = useCallback(() => {
    const now = performance.now();
    if (now - lastMistRef.current < 2600) {
      notify(UI.mistCooldown);
      return;
    }
    const result = vitrine.mist();
    if (!result) return;
    lastMistRef.current = now;
    setMistSignal((value) => value + 1);
    notify(UI.misted(Math.round(result.moisture)));
  }, [vitrine, notify]);

  const handlePrune = useCallback(
    (id: string) => {
      const result = vitrine.prune(id);
      if (!result.ok) {
        notify(result.reason === 'young' ? UI.toastTooSmall : UI.toastMissed);
        return;
      }
      const part = result.part ?? 'piece';
      notify(result.cutting ? UI.toastCutWithCutting(part) : UI.toastCut(part));
    },
    [vitrine, notify],
  );

  const handlePlant = useCallback(
    (speciesId: SpeciesId, x?: number) => {
      const result = x === undefined ? vitrine.plantInFreeSpot(speciesId) : vitrine.plantAt(speciesId, x);
      if (!result.ok) {
        notify(UI.toastNoRoom);
        return;
      }
      setSelectedSpecies(speciesId);
      notify(UI.toastPlanted(SPECIES_COPY[speciesId].common));
    },
    [vitrine, notify],
  );

  const handlePlantSelected = useCallback(() => {
    if (!selectedSpecies) return;
    handlePlant(selectedSpecies);
  }, [selectedSpecies, handlePlant]);

  const handlePlantCutting = useCallback(
    (id: string) => {
      const result = vitrine.plantCuttingAt(id);
      notify(result.ok ? UI.toastCuttingPlanted : UI.toastNoRoom);
    },
    [vitrine, notify],
  );

  const handleSeason = useCallback(
    (season: Season) => {
      vitrine.changeSeason(season);
    },
    [vitrine],
  );

  const handlePreview = useCallback(
    (minutes: number) => {
      setPreview((current) => {
        if (minutes <= 0) return null;
        const baseHour =
          current?.baseHour ??
          (world ? hourOfDay(world.createdAt + world.elapsedMs) : 12);
        return { baseHour, minutes };
      });
    },
    [world],
  );

  const handleExport = useCallback(() => {
    const text = vitrine.exportPacket();
    if (!text) return;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'understory-seed-packet.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  }, [vitrine]);

  const handleImport = useCallback(
    (text: string) => {
      const result = vitrine.importText(text);
      if (result.ok) {
        setPanel(null);
        notify(UI.importDone);
      }
      return result.ok;
    },
    [vitrine, notify],
  );

  const choosePacket = useCallback(() => {
    setTool('loupe');
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setPlantSheet(true);
      return;
    }
    const shelf = document.getElementById('specimen-shelf');
    shelf?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => {
      shelf?.querySelector<HTMLButtonElement>('.packet')?.focus();
    }, 160);
  }, [still]);

  const openHerbarium = useCallback(() => {
    setOverlay('herbarium');
    setPlantSheet(false);
  }, []);

  if (!world) {
    return (
      <div className="boot">
        <div className="boot-mark">
          <BrandMark />
        </div>
        <p className="boot-title">{APP.name}</p>
        <p className="boot-tagline">{APP.tagline}</p>
        <p className="boot-status" role="status">
          {UI.loading}
        </p>
        <span className="boot-rule" aria-hidden="true" />
      </div>
    );
  }

  const previewHour =
    preview !== null ? (preview.baseHour + preview.minutes / 60) % 24 : null;
  const toolHint =
    tool === 'loupe' ? UI.toolLoupeHint : tool === 'snip' ? UI.toolSnipHint : UI.toolMistHint;
  const nowEpoch = world.createdAt + world.elapsedMs;

  const shelfProps = {
    world,
    selectedSpecies,
    onSelectSpecies: setSelectedSpecies,
    onPlantSelected: handlePlantSelected,
    onPlantCutting: handlePlantCutting,
    onOpenSpecimen: (id: string) => setPanel({ kind: 'specimen', id }),
    tool,
    onTool: setTool,
  };

  return (
    <div className={`app ${immersed ? 'is-immersed' : ''} ${still ? 'is-still' : ''}`}>
      <a className="skip-link" href="#vitrine-canvas">
        {UI.skipToVitrine}
      </a>

      <header className="masthead">
        <div className="brand">
          <span className="brand-mark">
            <BrandMark />
          </span>
          <div className="brand-text">
            <h1>{APP.name}</h1>
            <p>{APP.tagline}</p>
          </div>
        </div>
        <div className="masthead-meta mono">
          <span>{formatDate(nowEpoch)}</span>
          <span className="meta-dot">·</span>
          <span>{SEASON_COPY[world.season].label}</span>
          <span className="meta-dot">·</span>
          <span>{formatClock(nowEpoch)}</span>
        </div>
        <div className="chrome">
          <button
            type="button"
            className={`chrome-btn ${still ? 'is-on' : ''}`}
            onClick={() => setStill((value) => !value)}
            aria-pressed={still}
            title={still ? UI.stillOn : UI.stillOff}
            aria-label={UI.still}
          >
            <Icon name="still" size={17} />
            <span>{UI.still}</span>
          </button>
          <button
            type="button"
            className="chrome-btn"
            onClick={() => setTheme((value) => (value === 'lamp' ? 'daylight' : 'lamp'))}
            aria-pressed={theme === 'daylight'}
            title={UI.theme}
            aria-label={UI.theme}
          >
            <Icon name={theme === 'lamp' ? 'sun' : 'moon'} size={17} />
            <span>{theme === 'lamp' ? UI.themeDaylight : UI.themeLamp}</span>
          </button>
          <button type="button" className="chrome-btn" onClick={openHerbarium} aria-label={UI.herbarium}>
            <Icon name="shelf" size={17} />
            <span>{UI.herbarium}</span>
          </button>
          <button type="button" className="chrome-btn" onClick={() => setOverlay('help')} aria-label={UI.help}>
            <Icon name="help" size={17} />
            <span>{UI.help}</span>
          </button>
          <button
            type="button"
            className="chrome-btn chrome-immerse"
            ref={immerseRef}
            onClick={() => setImmersion(true)}
            aria-label={UI.immerse}
          >
            <Icon name="expand" size={17} />
            <span>{UI.immerse}</span>
          </button>
        </div>
      </header>

      <main className="room">
        {isMobile ? null : (
          <aside className="rail">
            <SpecimenShelf {...shelfProps} />
          </aside>
        )}

        <section className="stage-column" id="vitrine-stage" aria-label="The vitrine">
          <Vitrine
            world={world}
            tool={tool}
            still={still}
            paused={paused}
            selectedId={panel?.kind === 'specimen' ? panel.id : null}
            previewHour={previewHour}
            mistSignal={mistSignal}
            panel={panel}
            onInspect={(id) => setPanel({ kind: 'specimen', id })}
            onInspectSoil={() => setPanel({ kind: 'soil' })}
            onPrune={handlePrune}
            onMist={handleMist}
            onPlantAt={handlePlant}
            onSnipMiss={() => notify(UI.toastMissed)}
            onChoosePacket={choosePacket}
            onClosePanel={() => setPanel(null)}
            toolHint={toolHint}
          />
          <ClimateStrip
            world={world}
            paused={paused}
            onPause={() => setPaused(!paused)}
            onMist={handleMist}
            onSeason={handleSeason}
            previewMinutes={preview?.minutes ?? 0}
            onPreview={handlePreview}
            saveState={saveState}
          />
        </section>

        <aside className="journal-column">
          <Journal world={world} onOpenHerbarium={openHerbarium} />
        </aside>
      </main>

      {isMobile ? (
        <div className="library-mobile">
          <SpecimenShelf {...shelfProps} variant="library" />
        </div>
      ) : null}

      <footer className="foot">
        <p>{UI.footerLine}</p>
        <p className="foot-meta">
          <span>{UI.storageNote}</span>
          <span className="meta-dot">·</span>
          <button type="button" className="text-link" onClick={() => setOverlay('help')}>
            {UI.help}
          </button>
        </p>
      </footer>

      {isMobile ? (
        <MobileBar tool={tool} onTool={setTool} onPlant={() => setPlantSheet(true)} />
      ) : null}

      {immersed ? (
        <button
          type="button"
          className="immersion-return"
          ref={returnRef}
          onClick={() => setImmersion(false)}
        >
          <Icon name="collapse" size={16} />
          {UI.exitImmersion}
        </button>
      ) : null}

      <HelpPanel open={overlay === 'help'} onClose={() => setOverlay(null)} />
      <Herbarium
        open={overlay === 'herbarium'}
        world={world}
        onClose={() => setOverlay(null)}
        onExport={handleExport}
        onImport={handleImport}
      />
      <PlantSheet
        open={plantSheet}
        onClose={() => setPlantSheet(false)}
        onPlant={(species) => {
          handlePlant(species);
          setPlantSheet(false);
        }}
      />

      {toast ? (
        <div className="toast" role="status" aria-live="polite" key={toast.id}>
          {toast.text}
        </div>
      ) : null}
      <div className="sr-only" role="status" aria-live="polite">
        {liveText}
      </div>
    </div>
  );
}
