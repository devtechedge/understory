import type { Season, SpeciesId, Stage } from '../sim/types';

export const APP = {
  name: 'Understory',
  tagline: 'A vitrine for slow things',
  description:
    'A living glass vitrine: three slow species, changing light, and a field journal written from what happens.',
  silentNote: 'Silent by design. No scores, no streaks, no notifications.',
};

export const SPECIES_COPY: Record<
  SpeciesId,
  {
    common: string;
    latin: string;
    packet: string;
    packetLine: string;
    habit: string;
    part: string;
    cutHint: string;
  }
> = {
  'cushion-moss': {
    common: 'Cushion Moss',
    latin: 'Leucobryum glaucum',
    packet: 'Packet I',
    packetLine: 'A slow green mound. Tolerates dry spells and low light.',
    habit: 'Spreads sideways in a tight cushion.',
    part: 'tuft',
    cutHint: 'Cut a tuft to thin the cushion.',
  },
  'maidenhair-fern': {
    common: 'Maidenhair Fern',
    latin: 'Adiantum raddianum',
    packet: 'Packet II',
    packetLine: 'Wiry black stems and pale fan leaves. Wants steady moisture.',
    habit: 'Unfurls one crozier at a time, then branches after a cut.',
    part: 'frond',
    cutHint: 'Cut a frond above the crown.',
  },
  'ghost-fungus': {
    common: 'Ghost Fungus',
    latin: 'Omphalotus nidiformis',
    packet: 'Packet III',
    packetLine: 'Pale caps with a mint glow. Fruits in damp, shaded soil.',
    habit: 'Raises pinheads in the dark, then opens a soft cap.',
    part: 'cap',
    cutHint: 'Cut a cap to make room at the base.',
  },
};

export const SEASON_COPY: Record<Season, { label: string; line: string; short: string }> = {
  spring: { label: 'Spring', line: 'Soft light, cool soil, steady growth.', short: 'Spring' },
  summer: { label: 'Summer', line: 'High light, warm soil, quick drying.', short: 'Summer' },
  autumn: { label: 'Autumn', line: 'Low gold light and slower growth.', short: 'Autumn' },
  winter: { label: 'Winter', line: 'Thin light, cold soil, long dormancy.', short: 'Winter' },
};

export const STAGE_COPY: Record<Stage, string> = {
  'dormant-seed': 'sown',
  germinating: 'germinating',
  sprout: 'sprout',
  juvenile: 'juvenile',
  established: 'established',
  mature: 'mature',
};

export const HEALTH_COPY = {
  thriving: 'Thriving',
  steady: 'Steady',
  pale: 'Pale',
  dormant: 'Dormant',
};

export const UI = {
  skipToVitrine: 'Skip to the vitrine',
  benchLabel: 'Workbench',
  specimens: 'Specimens',
  packets: (n: number) => `${n} packets`,
  pressedCount: (n: number) => `${n} pressed`,
  cuttingPart: (part: string) => `${part} cutting`,
  specimensNote: 'Choose a packet, then plant it in the soil.',
  inSoil: 'In the soil',
  soilEmpty: 'Nothing planted yet.',
  tools: 'Tools',
  toolLoupe: 'Observe',
  toolSnip: 'Snip',
  toolMist: 'Mist',
  toolLoupeHint: 'Hover the vitrine to read its life. Click a specimen or the soil.',
  toolSnipHint: 'Click a grown plant to cut a piece.',
  toolMistHint: 'Click the vitrine, or use Mist in the climate strip.',
  plantSelected: 'Plant in the soil',
  selectPacket: 'Select a packet',
  cuttings: 'Propagation vial',
  plantCutting: 'Plant cutting',
  journal: 'Field journal',
  journalNote: 'Written from what the vitrine does.',
  journalEmpty: 'Nothing written yet. The first entry comes with the first sowing.',
  journalCount: (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`,
  herbarium: 'Herbarium',
  herbariumOpen: 'Open the herbarium',
  herbariumNote: 'Pressed specimens and seed packets. Cards print well on paper.',
  herbariumEmpty:
    'No pressed specimens yet. A plant is added to the shelf when it reaches maturity.',
  shelfSeedPackets: 'Seed packets',
  shelfPressed: 'Pressed specimens',
  exportPacket: 'Export seed packet',
  importPacket: 'Open a seed packet',
  importHint: 'A seed packet is a JSON file exported from another Understory vitrine.',
  importDone: 'Seed packet opened. This vitrine has been restored.',
  importFailed: 'That file could not be read as a seed packet.',
  exportDone: 'Seed packet saved to your downloads.',
  soilCard: 'Soil',
  specimenCard: 'Herbarium card',
  close: 'Close',
  light: 'Light',
  moisture: 'Moisture',
  season: 'Season',
  temperature: 'Soil temperature',
  soilLabel: 'Soil',
  now: 'now',
  vitrineTime: 'Time',
  herbariumSheetLabel: 'Understory herbarium',
  cycleLabel: 'Cycle',
  lightNow: (pct: number, phase: string) => `${pct} percent, ${phase}`,
  phaseNames: { night: 'night', dawn: 'dawn', day: 'day', dusk: 'dusk' },
  mist: 'Mist the soil',
  misted: (pct: number) => `Misted. Soil moisture is ${pct} percent.`,
  mistCooldown: 'The surface is still wet. Let it settle before misting again.',
  previewLight: 'Preview light',
  previewNote: 'Previews the next six hours, then returns to real time.',
  previewing: (label: string) => `Preview: ${label}`,
  pause: 'Pause',
  resume: 'Resume',
  paused: 'Time is paused',
  still: 'Still',
  stillOn: 'Still mode is on',
  stillOff: 'Still mode is off',
  theme: 'Change the room light',
  themeLamp: 'Lamp',
  themeDaylight: 'Daylight',
  immerse: 'Immerse',
  exitImmersion: 'Return to the room',
  help: 'Help',
  saved: 'Saved in this browser',
  saving: 'Saving',
  saveFailed: 'This browser will not save the vitrine. It will reset on reload.',
  loaded: 'Restored from this browser',
  catchUp: (label: string) => `Time passed while you were away: ${label}.`,
  toastPlanted: (name: string) => `${name} is in the soil.`,
  toastNoRoom: 'The soil is holding all it can just now. Snip or make room first.',
  toastTooSmall: 'The snip needs a little more growth.',
  toastCut: (part: string) => `A ${part} was cut. The compost returns it to the soil.`,
  toastCutWithCutting: (part: string) =>
    `A ${part} was cut, and a healthy division is resting in the propagation vial.`,
  toastCutting: 'A healthy cutting is resting in the propagation vial.',
  toastMissed: 'Nothing within reach of the snip.',
  toastCuttingPlanted: 'The cutting is in the soil, settling in.',
  emptySoilTitle: 'Bare soil, ready.',
  emptySoilLine: 'Choose a packet from the shelf and plant.',
  emptySoilAction: 'Choose a packet',
  mobilePlant: 'Plant',
  mobileTools: 'Tools',
  mobileLibrary: 'Library',
  journalFocus: 'Field journal.',
  sceneLabel: 'The living vitrine',
  sceneInstructions:
    'Use the specimen list or press Enter to inspect. Press 2 to snip, 3 to mist, 1 to observe.',
  closeCard: 'Close card',
  storageMemoryOnly: 'Storage is unavailable. This vitrine lives only until you close the tab.',
  ageMinutes: (n: number) => (n < 1 ? 'just planted' : n < 60 ? `${n} min` : `${Math.floor(n / 60)} h ${n % 60} min`),
  ageDays: (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`,
  height: (mm: number) => `${mm} mm`,
  heightLabel: 'Height',
  spreadLabel: 'Spread',
  ageLabel: 'Age',
  cardNumber: (n: number) => `No. ${String(n).padStart(2, '0')}`,
  snipPart: (part: string) => `Snip a ${part}`,
  growthHint: 'A little more growth first.',
  noRoots: 'No roots yet.',
  rootsReaching: (cm: number) => `Reaching ${cm} cm.`,
  soilCutawayNote: 'The cutaway is the top of the case. Roots and soil stay inside the glass.',
  myceliumNote: 'The white threads under the surface belong to the ghost fungus. They move slower than the eye can follow.',
  pressedLabel: 'Pressed',
  plantedOn: 'Planted',
  pressedOn: 'Pressed',
  spread: (cm: number) => `${cm} cm across`,
  generation: (n: number) => (n <= 1 ? 'From packet' : `Generation ${n}`),
  lineage: 'Lineage',
  health: 'Health',
  stage: 'Stage',
  planted: 'Planted',
  nutrients: 'Nutrients',
  roots: 'Roots',
  mycelium: 'Mycelium',
  myceliumPresent: 'Threads visible in the lower soil.',
  myceliumAbsent: 'None visible yet.',
  rootsNote: (depth: number) => `Reaching ${depth} cm into the cutaway.`,
  nutrientWords: { rich: 'Rich', worked: 'Worked', thin: 'Thin' },
  journalLive: 'Field journal updated.',
  newEntry: 'New journal entry.',
  storageNote: 'This vitrine is kept by this browser alone.',
  noNetworkNote: 'No account, no network after load, no sound.',
  builtNote: 'Soil, light and time.',
  footerLine: 'A small world in glass. Everything here is drawn from code.',
  loading: 'Opening the vitrine',
  photoAlt: (name: string) => `Pressed ${name}`,
  roomTheme: 'Room light',
};

export const JOURNAL = {
  planted: (name: string, moisture: number) =>
    `A packet of ${name} was opened. The seed rests in soil at ${Math.round(moisture)} percent moisture.`,
  germinated: {
    'cushion-moss': (mm: number, moisture: number) =>
      `The first moss shoots have broken the surface, ${mm} mm high. Soil moisture: ${Math.round(moisture)} percent.`,
    'maidenhair-fern': (mm: number, moisture: number) =>
      `The first fern crozier has unfurled ${mm} mm. Soil moisture: ${Math.round(moisture)} percent.`,
    'ghost-fungus': (mm: number, moisture: number) =>
      `A pinhead mushroom has surfaced, ${mm} mm across. Soil moisture: ${Math.round(moisture)} percent.`,
  },
  reached: (name: string, stage: Stage, mm: number, extra: string) =>
    `${name} has reached the ${STAGE_COPY[stage]} stage at ${mm} mm. ${extra}`,
  stageNotes: {
    'cushion-moss': {
      sprout: 'The shoots are still closed.',
      juvenile: 'The cushion is finding its dome.',
      established: 'The surface is fully covered at the centre.',
      mature: 'The mound is deep enough to hold its own moisture.',
    },
    'maidenhair-fern': {
      sprout: 'The first crozier is still tight at the tip.',
      juvenile: 'A second stem is rising behind the first.',
      established: 'The crown has begun to fill out.',
      mature: 'The fronds arch clear of the pot rim.',
    },
    'ghost-fungus': {
      sprout: 'The pinhead is no wider than a seed.',
      juvenile: 'The stalk is lengthening toward the glass.',
      established: 'The cap has begun to open.',
      mature: 'The gills are showing beneath the cap.',
    },
  } as Record<SpeciesId, Partial<Record<Stage, string>>>,
  misted: (moisture: number) =>
    `Misting brought the soil to ${Math.round(moisture)} percent. ${
      moisture > 76
        ? 'Condensation has begun to gather on the glass.'
        : 'The surface darkens, then settles.'
    }`,
  season: (season: Season) =>
    `The vitrine was set to ${SEASON_COPY[season].label.toLowerCase()}. ${SEASON_COPY[season].line}`,
  dormant: (name: string, hint: string) =>
    `${name} has gone dormant. Growth has paused rather than failed. ${hint}`,
  dormantHints: {
    'cushion-moss': 'A little moisture and softer light will wake it.',
    'maidenhair-fern': 'Steady moisture and gentle light will wake it.',
    'ghost-fungus': 'Damp, shaded soil will wake it.',
  } as Record<SpeciesId, string>,
  recovered: (name: string) =>
    `${name} is growing again. The crown held through the quiet spell.`,
  pruned: (part: string, mm: number) =>
    `A ${part} was cut at ${mm} mm. The piece has gone to the compost and its nutrients are returning to the soil.`,
  cutting: (name: string) =>
    `A healthy division of ${name} was set in the propagation vial. It can be planted when the soil has room.`,
  cuttingPlanted: (name: string, generation: number) =>
    `A ${name} division was planted. This is generation ${generation} in this vitrine.`,
  spread: (cm: number, side: string) =>
    `The moss has spread to ${cm} cm across the ${side} side. The cushion is holding its shape.`,
  sporulated: (name: string) =>
    `The ${name.toLowerCase()} has released spores into the damp dark. A new pinhead has appeared beside the old cap.`,
  returned: (duration: string, moisture: number) =>
    `The vitrine was left for ${duration}. Soil moisture fell to ${Math.round(moisture)} percent. Nothing was lost.`,
  imported: () =>
    'A seed packet from another vitrine was opened. The world has been restored.',
};

export const NOTES = {
  species: {
    'cushion-moss': [
      'The cushion held its dome in the press.',
      'A dense pad, still green at the growing points.',
      'Fine stems are visible at the cut edge.',
    ],
    'maidenhair-fern': [
      'The pinnae dried flat and kept their fan shape.',
      'Three fronds pressed well; the fourth curled at the tip.',
      'The black stems stayed dark against the paper.',
    ],
    'ghost-fungus': [
      'The cap dried thin and translucent, with the gills showing through.',
      'The stem left a faint mint stain on the paper.',
      'A pale print, almost the colour of the paper itself.',
    ],
  } as Record<SpeciesId, string[]>,
  growing: {
    'cushion-moss': [
      'The surface is dense and even.',
      'A low green dome, dry at the crown.',
      'Shoots are pressed close together.',
    ],
    'maidenhair-fern': [
      'Two fronds are open; the third is still a coil.',
      'The fans are pale at the edges.',
      'The crown is sending up a new stem.',
    ],
    'ghost-fungus': [
      'One cap is open and another is still a pinhead.',
      'The stalk leans toward the misted glass.',
      'The gills are pale and closely set.',
    ],
  } as Record<SpeciesId, string[]>,
};

export const HEALTH_STATES = [
  { min: 0.72, word: HEALTH_COPY.thriving },
  { min: 0.45, word: HEALTH_COPY.steady },
  { min: 0, word: HEALTH_COPY.pale },
];

export const SCENE_TEXT = (parts: {
  count: number;
  names: string[];
  season: string;
  phase: string;
  moisture: number;
  light: number;
  entries: number;
}) => {
  const specimens =
    parts.count === 0
      ? 'The soil is bare and ready.'
      : `The soil holds ${parts.names.join(', ')}.`;
  return `${parts.season} ${parts.phase}. ${specimens} Soil moisture ${Math.round(parts.moisture)} percent. Light ${Math.round(parts.light * 100)} percent. ${parts.entries} journal ${parts.entries === 1 ? 'entry' : 'entries'}.`;
};

export const HELP = {
  title: 'Tending the vitrine',
  intro:
    'Understory is a small, silent living world. Plants grow on a slow clock, respond to light, moisture and season, and write their own field journal.',
  sections: [
    {
      heading: 'Care',
      lines: [
        'Choose a seed packet from the specimen shelf and plant it in the soil.',
        'Mist when the surface dries. Ferns and fungus want more moisture than moss.',
        'Turn the season dial to change temperature and light. Winter slows growth without killing it.',
        'Snip a grown plant to take a cutting. A strong cutting can be planted if there is room.',
      ],
    },
    {
      heading: 'Reading the case',
      lines: [
        'Hover with the loupe to magnify the living surface.',
        'Click a specimen for its herbarium card; click the soil cutaway for moisture and roots.',
        'The journal records germination, growth, cuts, dormancy and recovery. It never invents an event.',
        'Time moves while the case is closed, up to a cap. Nothing dies from neglect.',
        'A season turns over every seven days, or sooner if you turn the dial.',
      ],
    },
    {
      heading: 'The room',
      lines: [
        'Still mode removes sway and parallax, and honours reduced motion.',
        'The light scrubber previews the next six hours, then returns to real time.',
        'Immersion fades the room until only the vitrine remains. Press Escape to return.',
        'This vitrine is stored by this browser. Export a seed packet to move it elsewhere.',
      ],
    },
  ],
  keysHeading: 'Keys',
  keys: [
    ['1', 'Observe'],
    ['2', 'Snip'],
    ['3', 'Mist'],
    ['Space', 'Pause time'],
    ['I', 'Immersion'],
    ['J', 'Field journal'],
    ['?', 'This help'],
    ['Esc', 'Close or return'],
  ],
  provenance:
    'All artwork is drawn from code. Typefaces are Bricolage Grotesque, Literata and Martian Mono, self-hosted under the SIL Open Font License. No images, accounts, analytics or runtime network calls.',
};
