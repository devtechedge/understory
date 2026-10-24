import { SPECIES, heightMm, spreadCm } from '../sim/species';
import { clamp, hourOfDay, sunFor } from '../sim/time';
import type { Season, Specimen, Tool, World } from '../sim/types';
import { hashString, randomFromSeed } from '../sim/prng';

const VW = 1000;
const VH = 700;
const SOIL_TOP = 512;
const SOIL_H = VH - SOIL_TOP;

interface ScenePalette {
  sky: string;
  mid: string;
  haze: string;
  foliage: string;
  foliageFar: string;
  soil: string;
  soilDeep: string;
  light: string;
}

const PALETTES: Record<Season, ScenePalette> = {
  spring: {
    sky: '#243a2f',
    mid: '#14231c',
    haze: '#9fb99a',
    foliage: '#37543d',
    foliageFar: '#22362b',
    soil: '#2a1d14',
    soilDeep: '#171009',
    light: '#ffe6bd',
  },
  summer: {
    sky: '#2c3d27',
    mid: '#172518',
    haze: '#c8c79b',
    foliage: '#3f5b35',
    foliageFar: '#26381f',
    soil: '#2e2014',
    soilDeep: '#19110a',
    light: '#fff0c9',
  },
  autumn: {
    sky: '#3c3024',
    mid: '#211810',
    haze: '#c9a879',
    foliage: '#6a4a2b',
    foliageFar: '#392a1c',
    soil: '#302014',
    soilDeep: '#1a110a',
    light: '#ffd9a1',
  },
  winter: {
    sky: '#2b3438',
    mid: '#151d20',
    haze: '#b8c7c9',
    foliage: '#475b58',
    foliageFar: '#2c3a39',
    soil: '#2a2018',
    soilDeep: '#15110d',
    light: '#eef2ed',
  },
};

const LEAF = {
  healthy: '#8fb883',
  healthyEdge: '#c9dfb2',
  pale: '#b2a97a',
  paleEdge: '#d0c69a',
  stem: '#2b2217',
  moss: ['#4d6b43', '#5f7f4f', '#73925d', '#405c39'],
  mossDry: ['#6b6a48', '#7f7c55', '#8e8a60'],
  fungus: '#e6e4cf',
  fungusEdge: '#f4f0dc',
  mint: '#9be8c4',
  root: '#d9c9a5',
};

interface Layout {
  entity: Specimen;
  x: number;
  baseY: number;
  scale: number;
  heightPx: number;
  widthPx: number;
  phase: number;
}

interface SnipParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

export interface SceneUi {
  tool: Tool;
  still: boolean;
  paused: boolean;
  selectedId: string | null;
  previewHour: number | null;
}

export interface Hit {
  kind: 'specimen' | 'soil';
  id?: string;
}

function layoutEntities(world: World): Layout[] {
  return world.entities
    .map((entity) => {
      const species = SPECIES[entity.speciesId];
      const scale = 0.78 + entity.depth * 0.32;
      const x = 92 + entity.x * 816;
      const baseY = 490 + entity.depth * 22;
      let heightPx = 0;
      let widthPx = 0;
      if (entity.speciesId === 'maidenhair-fern') {
        heightPx = 46 + (heightMm(entity.speciesId, entity.growth) / species.maxHeightMm) * 322 * scale;
        widthPx = 118 * scale;
      } else if (entity.speciesId === 'cushion-moss') {
        widthPx = 26 + (spreadCm(entity.speciesId, entity.growth) / species.maxSpreadCm) * 218 * scale;
        heightPx = 10 + (heightMm(entity.speciesId, entity.growth) / species.maxHeightMm) * 58 * scale;
      } else {
        heightPx = 20 + (heightMm(entity.speciesId, entity.growth) / species.maxHeightMm) * 152 * scale;
        widthPx = 72 * scale;
      }
      return {
        entity,
        x,
        baseY,
        scale,
        heightPx,
        widthPx,
        phase: randomFromSeed(entity.seed, 3) * Math.PI * 2,
      };
    })
    .sort((a, b) => a.entity.depth - b.entity.depth);
}


function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  world: World,
  pal: ScenePalette,
  sun: ReturnType<typeof sunFor>,
  t: number,
  still: boolean,
  parallaxX: number,
  parallaxY: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, SOIL_TOP + 30);
  sky.addColorStop(0, pal.sky);
  sky.addColorStop(0.55, pal.mid);
  sky.addColorStop(1, '#101812');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VW, VH);

  ctx.save();
  ctx.translate(parallaxX, parallaxY);

  const glow = ctx.createRadialGradient(
    260 + sun.elevation * 460,
    -80,
    40,
    400,
    260,
    560,
  );
  glow.addColorStop(0, `rgba(255, 231, 188, ${0.1 + sun.elevation * 0.1})`);
  glow.addColorStop(0.45, 'rgba(255, 226, 180, 0.03)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VW, SOIL_TOP);

  ctx.globalAlpha = 0.5;
  drawHangingCanopy(ctx, pal.foliage, t, still);
  ctx.globalAlpha = 1;
  drawFarFronds(ctx, pal.foliageFar, sun.elevation);
  ctx.filter = 'none';

  const band = ctx.createLinearGradient(0, 250, 0, 480);
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(0.5, hexToRgba(pal.haze, 0.08 + world.moisture / 1600 + sun.elevation * 0.02));
  band.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = band;
  const drift = still ? 0 : Math.sin(t / 6400) * 18;
  ctx.fillRect(-40 + drift, 240, VW + 80, 240);

  if (sun.elevation > 0.02) {
    ctx.save();
    const originX = 120 + sun.elevation * 560;
    const beam = ctx.createLinearGradient(originX, 0, originX + 240, SOIL_TOP);
    beam.addColorStop(0, hexToRgba(pal.light, 0.13 * sun.elevation + 0.03));
    beam.addColorStop(1, 'rgba(255,236,200,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(originX - 150, -20);
    ctx.lineTo(originX + 90, -20);
    ctx.lineTo(originX + 430, SOIL_TOP + 10);
    ctx.lineTo(originX + 40, SOIL_TOP + 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const midFrondAlpha = 0.24;
  drawSideFronds(ctx, pal.foliage, midFrondAlpha, t, still);
  ctx.restore();
}

function drawHangingCanopy(
  ctx: CanvasRenderingContext2D,
  color: string,
  t: number,
  still: boolean,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  const sway = still ? 0 : Math.sin(t / 7000) * 4;
  for (let cluster = 0; cluster < 3; cluster += 1) {
    const originX = 70 + cluster * 380;
    for (let i = 0; i < 4; i += 1) {
      const r = randomFromSeed(210 + cluster, i);
      const length = 130 + r * 190;
      const lean = (r - 0.5) * 60;
      ctx.lineWidth = 2 + r * 3;
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.bezierCurveTo(
        originX + lean * 0.2,
        length * 0.3,
        originX + lean + sway,
        length * 0.7,
        originX + lean * 1.4 + sway,
        length,
      );
      ctx.stroke();
      for (let leaf = 0; leaf < 4; leaf += 1) {
        const ly = length * (0.35 + leaf * 0.16);
        const side = leaf % 2 === 0 ? -1 : 1;
        ctx.fillStyle = hexToRgba(color, 0.32);
        ctx.beginPath();
        ctx.ellipse(
          originX + lean * 0.6 + side * (14 + r * 18),
          ly,
          16 + r * 16,
          4 + r * 3,
          side * 0.6,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawFarFronds(ctx: CanvasRenderingContext2D, color: string, elevation: number) {
  ctx.save();
  ctx.globalAlpha = 0.48 + elevation * 0.14;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  const clusters = [
    { x: 118, y: SOIL_TOP - 4, dir: 1, size: 1 },
    { x: 892, y: SOIL_TOP - 6, dir: -1, size: 1.12 },
    { x: 214, y: SOIL_TOP, dir: -1, size: 0.72 },
    { x: 812, y: SOIL_TOP, dir: 1, size: 0.78 },
  ];
  for (const [clusterIndex, cluster] of clusters.entries()) {
    for (let i = 0; i < 6; i += 1) {
      const r = randomFromSeed(clusterIndex + 7, i);
      const length = (200 + r * 190) * cluster.size;
      const lean = (i - 2.5) * 14 * cluster.dir;
      ctx.lineWidth = (3 + r * 4) * cluster.size;
      ctx.beginPath();
      ctx.moveTo(cluster.x, cluster.y);
      ctx.bezierCurveTo(
        cluster.x + lean * 0.4,
        cluster.y - length * 0.45,
        cluster.x + lean + cluster.dir * 42,
        cluster.y - length * 0.8,
        cluster.x + lean + cluster.dir * (20 + r * 50),
        cluster.y - length,
      );
      ctx.stroke();
      for (let leaf = 0; leaf < 5; leaf += 1) {
        const ly = cluster.y - length * (0.35 + leaf * 0.13);
        const side = leaf % 2 === 0 ? -1 : 1;
        ctx.beginPath();
        ctx.ellipse(
          cluster.x + lean * 0.5 + side * (18 + r * 22),
          ly,
          (18 + r * 16) * cluster.size,
          (5 + r * 4) * cluster.size,
          side * 0.5,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawSideFronds(
  ctx: CanvasRenderingContext2D,
  color: string,
  alpha: number,
  t: number,
  still: boolean,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  const clusters = [
    { x: 40, y: SOIL_TOP + 40, dir: 1, size: 1.2 },
    { x: 960, y: SOIL_TOP + 30, dir: -1, size: 1.1 },
  ];
  clusters.forEach((cluster, ci) => {
    for (let i = 0; i < 4; i += 1) {
      const r = randomFromSeed(ci + 31, i);
      const sway = still ? 0 : Math.sin(t / 3200 + i) * 6;
      ctx.lineWidth = 5 + r * 4;
      ctx.beginPath();
      ctx.moveTo(cluster.x, cluster.y);
      ctx.bezierCurveTo(
        cluster.x + cluster.dir * 30,
        cluster.y - 90,
        cluster.x + cluster.dir * (60 + sway),
        cluster.y - 170,
        cluster.x + cluster.dir * (50 + r * 90),
        cluster.y - 230 - r * 70,
      );
      ctx.stroke();
    }
  });
  ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildSoilTexture(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VW;
  canvas.height = SOIL_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const base = ctx.createLinearGradient(0, 0, 0, SOIL_H);
  base.addColorStop(0, '#3a2a1c');
  base.addColorStop(0.38, '#2e2117');
  base.addColorStop(1, '#19120c');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, VW, SOIL_H);

  const strata: { y: number; h: number; color: string; wave: number }[] = [
    { y: 26, h: 34, color: 'rgba(72, 52, 34, 0.55)', wave: 11 },
    { y: 78, h: 44, color: 'rgba(88, 68, 45, 0.28)', wave: 16 },
    { y: 138, h: 32, color: 'rgba(28, 22, 17, 0.55)', wave: 9 },
  ];
  strata.forEach((stratum, index) => {
    ctx.beginPath();
    ctx.moveTo(0, stratum.y);
    for (let x = 0; x <= VW; x += 50) {
      const y =
        stratum.y +
        Math.sin((x / VW) * Math.PI * (2 + index) + index) * stratum.wave +
        randomFromSeed(91 + index, x / 50) * 5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(VW, stratum.y + stratum.h);
    ctx.lineTo(0, stratum.y + stratum.h);
    ctx.closePath();
    ctx.fillStyle = stratum.color;
    ctx.fill();
  });

  for (let i = 0; i < 420; i += 1) {
    const x = randomFromSeed(5, i) * VW;
    const y = 12 + randomFromSeed(6, i) * (SOIL_H - 10);
    const size = 0.6 + randomFromSeed(7, i) * 2.4;
    const light = randomFromSeed(8, i) > 0.5;
    ctx.fillStyle = light ? 'rgba(225, 205, 166, 0.22)' : 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 26; i += 1) {
    const x = randomFromSeed(11, i) * VW;
    const y = 20 + randomFromSeed(12, i) * (SOIL_H - 26);
    const rx = 3 + randomFromSeed(13, i) * 9;
    const ry = 2 + randomFromSeed(14, i) * 4;
    ctx.fillStyle = 'rgba(120, 104, 82, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, randomFromSeed(15, i), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(225, 205, 166, 0.09)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  const edge = ctx.createLinearGradient(0, 0, VW, 0);
  edge.addColorStop(0, 'rgba(0,0,0,0.28)');
  edge.addColorStop(0.12, 'rgba(0,0,0,0)');
  edge.addColorStop(0.88, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, VW, SOIL_H);

  return canvas;
}

function drawSoil(
  ctx: CanvasRenderingContext2D,
  soil: HTMLCanvasElement,
  layouts: Layout[],
) {
  ctx.save();
  ctx.drawImage(soil, 0, SOIL_TOP);
  ctx.beginPath();
  ctx.rect(0, SOIL_TOP, VW, SOIL_H);
  ctx.clip();

  for (const layout of layouts) {
    drawRoots(ctx, layout);
  }

  const surface = ctx.createLinearGradient(0, SOIL_TOP - 6, 0, SOIL_TOP + 26);
  surface.addColorStop(0, 'rgba(58, 42, 28, 0.9)');
  surface.addColorStop(1, 'rgba(36, 25, 17, 0)');
  ctx.fillStyle = surface;
  ctx.fillRect(0, SOIL_TOP - 6, VW, 32);

  ctx.beginPath();
  ctx.moveTo(0, SOIL_TOP + 2);
  for (let x = 0; x <= VW; x += 40) {
    ctx.lineTo(x, SOIL_TOP + Math.sin(x / 70) * 2 + randomFromSeed(44, x / 40) * 4);
  }
  ctx.strokeStyle = 'rgba(20, 14, 9, 0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();

  for (let i = 0; i < 30; i += 1) {
    const x = randomFromSeed(51, i) * VW;
    const y = SOIL_TOP + 4 + randomFromSeed(52, i) * 15;
    ctx.fillStyle = 'rgba(230, 214, 180, 0.16)';
    ctx.beginPath();
    ctx.ellipse(x, y, 1 + randomFromSeed(53, i) * 2.4, 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRoots(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
) {
  const { entity, x } = layout;
  const isFungus = entity.speciesId === 'ghost-fungus';
  const isMoss = entity.speciesId === 'cushion-moss';
  const strength = 0.25 + entity.health * 0.4;
  const depth = isMoss ? 34 + entity.growth * 26 : isFungus ? 52 : 58 + entity.growth * 90;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = isFungus
    ? `rgba(166, 226, 200, ${0.24 * strength})`
    : `rgba(224, 207, 168, ${0.42 * strength})`;
  const strands = isFungus ? 7 : isMoss ? 4 : 5;
  for (let i = 0; i < strands; i += 1) {
    const seed = hashString(entity.id) + i * 13;
    const lean = (randomFromSeed(seed, 1) - 0.5) * (isFungus ? 140 : 70);
    const reach = depth * (0.55 + randomFromSeed(seed, 2) * 0.65);
    ctx.lineWidth = isFungus ? 0.8 : 1.4;
    ctx.beginPath();
    ctx.moveTo(x + (randomFromSeed(seed, 3) - 0.5) * 18, SOIL_TOP + 2);
    const midX = x + lean * 0.5;
    const midY = SOIL_TOP + reach * 0.55;
    ctx.quadraticCurveTo(midX, midY, x + lean, SOIL_TOP + reach);
    ctx.stroke();
    if (isFungus) {
      for (let b = 0; b < 3; b += 1) {
        const bx = x + lean * (0.25 + b * 0.15);
        const by = SOIL_TOP + reach * (0.25 + b * 0.15);
        const direction = b % 2 === 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(
          bx + direction * 22,
          by + 8,
          bx + direction * (26 + b * 8),
          by + 20 + b * 5,
        );
        ctx.stroke();
      }
    }
  }

  if (isMoss) {
    const carpet = 30 + entity.growth * 62;
    const grad = ctx.createLinearGradient(x - carpet, 0, x + carpet, 0);
    grad.addColorStop(0, 'rgba(67, 88, 54, 0)');
    grad.addColorStop(0.5, `rgba(84, 108, 66, ${0.26 * strength})`);
    grad.addColorStop(1, 'rgba(67, 88, 54, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, SOIL_TOP + 8, carpet, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawHabitatBack(ctx: CanvasRenderingContext2D, pal: ScenePalette) {
  ctx.save();
  ctx.globalAlpha = 0.9;

  const stone = ctx.createLinearGradient(60, 430, 300, 530);
  stone.addColorStop(0, '#5a6358');
  stone.addColorStop(0.45, '#39453c');
  stone.addColorStop(1, '#1d2620');
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.moveTo(40, 516);
  ctx.bezierCurveTo(54, 470, 78, 430, 130, 414);
  ctx.bezierCurveTo(196, 392, 246, 432, 276, 462);
  ctx.bezierCurveTo(306, 492, 326, 508, 344, 516);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(218, 229, 207, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(90, 468);
  ctx.quadraticCurveTo(150, 430, 214, 452);
  ctx.moveTo(138, 488);
  ctx.quadraticCurveTo(186, 462, 238, 480);
  ctx.stroke();
  ctx.fillStyle = 'rgba(120, 136, 108, 0.14)';
  ctx.beginPath();
  ctx.ellipse(180, 454, 48, 13, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(190, 196, 152, 0.16)';
  for (let i = 0; i < 7; i += 1) {
    const lx = 96 + randomFromSeed(181, i) * 150;
    const ly = 430 + randomFromSeed(182, i) * 60;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 2 + randomFromSeed(183, i) * 5, 1.2, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(20, 27, 22, 0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(150, 430);
  ctx.lineTo(172, 458);
  ctx.lineTo(162, 486);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(53, 37, 23, 0.95)';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(964, 522);
  ctx.bezierCurveTo(930, 472, 902, 420, 876, 372);
  ctx.bezierCurveTo(864, 352, 842, 340, 826, 334);
  ctx.stroke();
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(898, 414);
  ctx.quadraticCurveTo(930, 390, 944, 362);
  ctx.moveTo(876, 372);
  ctx.quadraticCurveTo(850, 356, 838, 330);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(196, 157, 100, 0.12)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(960, 518);
  ctx.bezierCurveTo(928, 470, 900, 420, 874, 374);
  ctx.stroke();

  ctx.fillStyle = pal.foliageFar;
  ctx.globalAlpha = 0.24;
  for (let i = 0; i < 5; i += 1) {
    const x = 790 + randomFromSeed(151, i) * 190;
    const y = 500 - randomFromSeed(152, i) * 90;
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      18 + randomFromSeed(153, i) * 24,
      5 + randomFromSeed(154, i) * 5,
      randomFromSeed(155, i),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawMossCarpet(ctx: CanvasRenderingContext2D, t: number, still: boolean) {
  ctx.save();
  const carpet = ctx.createLinearGradient(0, SOIL_TOP - 20, 0, SOIL_TOP + 22);
  carpet.addColorStop(0, 'rgba(48, 67, 41, 0)');
  carpet.addColorStop(0.35, 'rgba(57, 79, 48, 0.7)');
  carpet.addColorStop(1, 'rgba(33, 45, 29, 0.1)');
  ctx.fillStyle = carpet;
  const sway = still ? 0 : Math.sin(t / 6000) * 3;
  ctx.beginPath();
  ctx.moveTo(30, SOIL_TOP + 18);
  for (let x = 30; x <= 970; x += 60) {
    const y = SOIL_TOP - 1 - Math.sin(x / 90) * 3 - randomFromSeed(161, x / 60) * 4;
    ctx.lineTo(x + sway, y);
  }
  ctx.lineTo(970, SOIL_TOP + 20);
  ctx.lineTo(30, SOIL_TOP + 20);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 34; i += 1) {
    const x = 34 + randomFromSeed(171, i) * 932;
    const y = SOIL_TOP + 1 + randomFromSeed(172, i) * 9;
    const h = 3 + randomFromSeed(173, i) * 9;
    ctx.strokeStyle = `rgba(126, 152, 101, ${0.18 + randomFromSeed(174, i) * 0.24})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 1, y - h * 0.5, x + (randomFromSeed(175, i) - 0.5) * 4, y - h);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStillLife(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(858, 512);
  ctx.rotate(-0.22);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(4, 5, 47, 8, 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d8cfb7';
  ctx.strokeStyle = 'rgba(74, 59, 39, 0.4)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.rect(-30, -48, 56, 48);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#586a4c';
  ctx.fillRect(-30, -48, 56, 9);
  ctx.strokeStyle = 'rgba(74, 59, 39, 0.25)';
  ctx.strokeRect(-23, -33, 42, 28);
  ctx.strokeStyle = 'rgba(74, 59, 39, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-18, -24);
  ctx.quadraticCurveTo(-9, -35, 2, -24);
  ctx.moveTo(-3, -19);
  ctx.quadraticCurveTo(7, -31, 14, -20);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(36, 24, 14, 0.75)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-52, -10);
  ctx.lineTo(-84, 18);
  ctx.stroke();
  ctx.strokeStyle = '#ad8a4d';
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.arc(-24, -12, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(232, 202, 144, 0.75)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(-24, -12, 27, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(188, 216, 195, 0.13)';
  ctx.beginPath();
  ctx.arc(-24, -12, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.beginPath();
  ctx.arc(-36, -22, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawForeground(ctx: CanvasRenderingContext2D, t: number, still: boolean) {
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#0d1710';
  const sway = still ? 0 : Math.sin(t / 5200) * 4;
  ctx.beginPath();
  ctx.moveTo(-20, 700);
  ctx.bezierCurveTo(10, 610, 40, 560, 104, 520);
  ctx.bezierCurveTo(60, 590, 40, 650, 54, 710);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1020, 700);
  ctx.bezierCurveTo(980, 600, 940, 560, 880 + sway, 514);
  ctx.bezierCurveTo(930, 590, 960, 640, 950, 710);
  ctx.closePath();
  ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
}

function drawLightPool(ctx: CanvasRenderingContext2D, sun: ReturnType<typeof sunFor>) {
  ctx.save();
  const strength = 0.05 + sun.elevation * 0.08;
  const glow = ctx.createRadialGradient(500, SOIL_TOP - 130, 10, 520, SOIL_TOP - 60, 360);
  glow.addColorStop(0, `rgba(255, 233, 190, ${strength})`);
  glow.addColorStop(0.55, `rgba(255, 228, 180, ${strength * 0.45})`);
  glow.addColorStop(1, 'rgba(255, 228, 180, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(520, SOIL_TOP - 40, 380, 210, 0, 0, Math.PI * 2);
  ctx.fill();
  const pool = ctx.createRadialGradient(500, SOIL_TOP + 10, 8, 520, SOIL_TOP + 20, 280);
  pool.addColorStop(0, `rgba(210, 184, 128, ${0.05 + sun.elevation * 0.06})`);
  pool.addColorStop(1, 'rgba(210, 184, 128, 0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.ellipse(520, SOIL_TOP + 24, 280, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawInstrument(ctx: CanvasRenderingContext2D, moisture: number) {
  ctx.save();
  ctx.translate(884, 128);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(5, 9, 38, 12, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(201, 161, 94, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.lineTo(0, -34);
  ctx.stroke();
  const rim = ctx.createRadialGradient(-10, -14, 4, 0, 0, 36);
  rim.addColorStop(0, '#ecd7a5');
  rim.addColorStop(0.55, '#b68e4d');
  rim.addColorStop(1, '#6b4f24');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e9dfc8';
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(66, 88, 72, 0.7)';
  ctx.beginPath();
  ctx.moveTo(0, -21);
  ctx.bezierCurveTo(4, -15, 5, -12, 5, -9.5);
  ctx.arc(0, -9.5, 5, 0, Math.PI);
  ctx.bezierCurveTo(-5, -12, -4, -15, 0, -21);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 48, 35, 0.55)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 11; i += 1) {
    const angle = -Math.PI * 0.78 + (i / 10) * Math.PI * 1.56;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 19, Math.sin(angle) * 19);
    ctx.lineTo(Math.cos(angle) * 23, Math.sin(angle) * 23);
    ctx.stroke();
  }
  const needleAngle = -Math.PI * 0.78 + (clamp(moisture, 0, 100) / 100) * Math.PI * 1.56;
  ctx.strokeStyle = '#4b3a22';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(needleAngle) * 20, Math.sin(needleAngle) * 20);
  ctx.stroke();
  ctx.fillStyle = '#6f5222';
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(-5, -6, 25, Math.PI * 1.08, Math.PI * 1.55);
  ctx.stroke();
  ctx.restore();
}

function drawForegroundFerns(ctx: CanvasRenderingContext2D, t: number, still: boolean) {
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = '#0a130d';
  ctx.fillStyle = '#0a130d';
  ctx.lineCap = 'round';
  const sway = still ? 0 : Math.sin(t / 4200) * 5;
  const fronds = [
    { x: -30, y: 710, tipX: 168, tipY: 402, sides: -1 },
    { x: 1030, y: 710, tipX: 842 + sway, tipY: 430, sides: 1 },
  ];
  for (const frond of fronds) {
    const cx = frond.x + (frond.tipX - frond.x) * 0.38;
    const cy = frond.y + (frond.tipY - frond.y) * 0.6;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(frond.x, frond.y);
    ctx.quadraticCurveTo(cx, cy, frond.tipX, frond.tipY);
    ctx.stroke();
    for (let i = 0; i < 9; i += 1) {
      const p = 0.24 + i * 0.08;
      const px = frond.x + (frond.tipX - frond.x) * p;
      const py = frond.y + (frond.tipY - frond.y) * p;
      const side = i % 2 === 0 ? -1 : 1;
      ctx.beginPath();
      ctx.ellipse(px + side * 15, py, 22, 6, side * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawMoss(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  t: number,
  still: boolean,
) {
  const { entity, x, baseY, widthPx, heightPx, scale, phase } = layout;
  const pale = entity.health < 0.5;
  const colors = pale ? LEAF.mossDry : LEAF.moss;
  const breathe = still || entity.dormant ? 0 : Math.sin(t / 5200 + phase) * 0.012;
  const width = widthPx * (1 + breathe);
  const height = heightPx * (1 + breathe * 0.6);
  const tufts = clamp(Math.round(width / 14), 9, 23);

  ctx.save();
  ctx.globalAlpha = entity.dormant ? 0.72 : 1;

  ctx.fillStyle = 'rgba(16, 24, 16, 0.42)';
  ctx.beginPath();
  ctx.ellipse(x, baseY + 4, width * 0.55, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = pale ? '#565a3f' : '#405839';
  ctx.beginPath();
  ctx.moveTo(x - width * 0.52, baseY + 2);
  ctx.bezierCurveTo(x - width * 0.42, baseY - height * 0.72, x - width * 0.12, baseY - height * 0.95, x, baseY - height * 0.95);
  ctx.bezierCurveTo(x + width * 0.12, baseY - height * 0.95, x + width * 0.42, baseY - height * 0.72, x + width * 0.52, baseY + 2);
  ctx.closePath();
  ctx.fill();

  for (let layer = 0; layer < 2; layer += 1) {
    for (let i = 0; i < tufts; i += 1) {
      const seed = hashString(entity.id) + layer * 47 + i;
      const px = x - width / 2 + (width / Math.max(1, tufts - 1)) * i + (randomFromSeed(seed, 1) - 0.5) * 8;
      const humpW = (width / tufts) * (2 + randomFromSeed(seed, 2) * 1.3);
      const dome = 0.55 + 0.5 * Math.sin((Math.PI * (i + 1)) / (tufts + 1));
      const humpH =
        height * (0.32 + randomFromSeed(seed, 3) * 0.38) * dome * (layer === 0 ? 1.2 : 1);
      const color = colors[Math.floor(randomFromSeed(seed, 4) * colors.length)] ?? '#4d6b43';
      ctx.fillStyle = layer === 0 ? 'rgba(27, 40, 26, 0.75)' : color;
      ctx.beginPath();
      ctx.moveTo(px - humpW / 2, baseY + (layer === 0 ? 3 : 0));
      ctx.bezierCurveTo(
        px - humpW * 0.5,
        baseY - humpH * 1.4,
        px + humpW * 0.5,
        baseY - humpH * 1.4,
        px + humpW / 2,
        baseY + (layer === 0 ? 3 : 0),
      );
      ctx.closePath();
      ctx.fill();

      if (layer === 1) {
        ctx.strokeStyle = hexToRgba(pale ? '#d6cb9a' : LEAF.healthyEdge, 0.2);
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(px - humpW * 0.34, baseY - humpH * 0.14);
        ctx.quadraticCurveTo(px - humpW * 0.12, baseY - humpH * 1.05, px + humpW * 0.2, baseY - humpH * 0.32);
        ctx.stroke();
      }
    }
  }

  const blades = clamp(Math.round(6 + entity.growth * 16), 6, 24);
  for (let i = 0; i < blades; i += 1) {
    const seed = hashString(entity.id) + 300 + i;
    const sx = x - width / 2 + randomFromSeed(seed, 1) * width;
    const sy = baseY - height * (0.35 + randomFromSeed(seed, 2) * 0.5);
    const sh = (2 + randomFromSeed(seed, 3) * 8) * scale;
    const lean = (randomFromSeed(seed, 4) - 0.5) * 5;
    ctx.strokeStyle = pale
      ? `rgba(199, 188, 138, ${0.35 + randomFromSeed(seed, 5) * 0.3})`
      : `rgba(154, 183, 119, ${0.35 + randomFromSeed(seed, 5) * 0.35})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + lean * 0.4, sy - sh * 0.6, sx + lean, sy - sh);
    ctx.stroke();
    if (entity.growth > 0.55 && i % 5 === 0) {
      ctx.fillStyle = pale ? 'rgba(214, 198, 142, 0.65)' : 'rgba(196, 209, 146, 0.7)';
      ctx.beginPath();
      ctx.ellipse(sx + lean, sy - sh, 1.2, 2.4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFern(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  t: number,
  still: boolean,
) {
  const { entity, x, baseY, heightPx, phase, scale } = layout;
  const pale = entity.health < 0.55;
  const leaf = pale ? LEAF.pale : LEAF.healthy;
  const leafEdge = pale ? LEAF.paleEdge : LEAF.healthyEdge;
  const alpha = entity.dormant ? 0.62 : 1;
  const growth = entity.growth;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';

  if (growth < 0.22) {
    const croziers = growth < 0.1 ? 1 : 2;
    for (let i = 0; i < croziers; i += 1) {
      const seed = hashString(entity.id) + 71 + i;
      const sway = still ? 0 : Math.sin(t / 2600 + phase + i) * 1.6;
      const stemH = heightPx * (0.75 + i * 0.18);
      const tipX = x + (i === 0 ? 1 : -1) * (8 + randomFromSeed(seed, 1) * 8) + sway;
      const tipY = baseY - stemH;
      ctx.strokeStyle = LEAF.stem;
      ctx.lineWidth = 1.7 * scale;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.bezierCurveTo(x - 5, baseY - stemH * 0.4, tipX + 5, baseY - stemH * 0.75, tipX, tipY);
      ctx.stroke();

      ctx.strokeStyle = leafEdge;
      ctx.lineWidth = 1.05 * scale;
      ctx.beginPath();
      const coilR = clamp(stemH * 0.18, 3, 9);
      ctx.arc(tipX, tipY + coilR * 0.3, coilR, -Math.PI * 0.9, Math.PI * 0.9);
      ctx.stroke();
      ctx.fillStyle = hexToRgba(leaf, 0.35);
      ctx.beginPath();
      ctx.arc(tipX, tipY + coilR * 0.3, coilR * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  const fronds = clamp(Math.round(3 + growth * 6) + entity.branches, 3, 12);
  const sideCount = Math.ceil(fronds / 2);
  for (let i = 0; i < fronds; i += 1) {
    const seed = hashString(entity.id) + i * 17;
    const direction = i < sideCount ? -1 : 1;
    const rank = i < sideCount ? i : i - sideCount;
    const length = heightPx * (0.58 + rank * 0.05 + randomFromSeed(seed, 1) * 0.34);
    const sway = still ? 0 : Math.sin(t / 3000 + phase + i * 0.7) * (2 + growth * 4);
    const arch = 0.44 + rank * 0.13 + randomFromSeed(seed, 5) * 0.06;
    const tipX = x + direction * length * arch + sway;
    const tipY = baseY - length * (0.78 + randomFromSeed(seed, 2) * 0.16);
    const midX = x + direction * length * 0.04;
    const midY = baseY - length * 0.64;
    const c2x = tipX - direction * length * 0.16;
    const c2y = tipY + length * 0.2;

    ctx.strokeStyle = LEAF.stem;
    ctx.lineWidth = (1.5 + growth * 0.8) * scale;
    ctx.beginPath();
    ctx.moveTo(x + (randomFromSeed(seed, 3) - 0.5) * 10, baseY);
    ctx.bezierCurveTo(midX, midY, c2x, c2y, tipX, tipY);
    ctx.stroke();

    const leafCount = 11 + Math.round(growth * 7);
    for (let leafIndex = 0; leafIndex < leafCount; leafIndex += 1) {
      const tPos = 0.26 + (leafIndex / Math.max(1, leafCount - 1)) * 0.7;
      const point = cubicPoint(
        x,
        baseY,
        midX,
        midY,
        c2x,
        c2y,
        tipX,
        tipY,
        tPos,
      );
      const ahead = cubicPoint(
        x,
        baseY,
        midX,
        midY,
        c2x,
        c2y,
        tipX,
        tipY,
        Math.min(0.98, tPos + 0.025),
      );
      const tangent = Math.atan2(ahead.y - point.y, ahead.x - point.x);
      const pinnaSize = (8 + (1 - tPos) * 12 + growth * 8) * scale;
      const side = leafIndex % 2 === 0 ? -1 : 1;
      drawPinna(
        ctx,
        point.x + side * pinnaSize * 0.28,
        point.y,
        tangent + side * 1.28,
        pinnaSize,
        leaf,
        leafEdge,
      );
      drawPinna(
        ctx,
        point.x - side * pinnaSize * 0.2,
        point.y - 1.5,
        tangent - side * 1.2,
        pinnaSize * 0.58,
        leaf,
        leafEdge,
      );
    }
  }

  if (growth > 0.5 && growth < 0.94) {
    const sway = still ? 0 : Math.sin(t / 2800 + phase) * 2;
    const stemH = heightPx * 0.5;
    ctx.strokeStyle = LEAF.stem;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(x + 3, baseY);
    ctx.quadraticCurveTo(x + 8, baseY - stemH * 0.6, x + 12 + sway, baseY - stemH);
    ctx.stroke();
    ctx.strokeStyle = leafEdge;
    ctx.beginPath();
    const coilR = 5;
    ctx.arc(x + 12 + sway, baseY - stemH + 2, coilR, -Math.PI * 0.6, Math.PI * 1.1);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPinna(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  fill: string,
  edge: string,
) {
  const wedges = 5;
  const a0 = -0.62;
  const a1 = 0.62;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(a0) * size * 0.44, Math.sin(a0) * size * 0.44);
  for (let i = 0; i < wedges; i += 1) {
    const left = a0 + (i / wedges) * (a1 - a0);
    const right = a0 + ((i + 1) / wedges) * (a1 - a0);
    const middle = (left + right) / 2;
    ctx.quadraticCurveTo(
      Math.cos(middle) * size * 1.28,
      Math.sin(middle) * size * 1.28,
      Math.cos(right) * size,
      Math.sin(right) * size,
    );
  }
  ctx.closePath();
  ctx.fillStyle = hexToRgba(fill, 0.68);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(edge, 0.32);
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(43, 34, 23, 0.28)';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(0.6, size * 0.06), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function cubicPoint(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  t: number,
): { x: number; y: number } {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * x0 + b * x1 + c * x2 + d * x3,
    y: a * y0 + b * y1 + c * y2 + d * y3,
  };
}

function drawFungus(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  sunElevation: number,
  t: number,
  still: boolean,
) {
  const { entity, x, baseY, heightPx, scale, phase } = layout;
  const growth = entity.growth;
  const pale = entity.health < 0.5;
  const capColor = pale ? '#cecbb2' : LEAF.fungus;
  const edgeColor = pale ? '#e4dfc9' : LEAF.fungusEdge;
  const glow = clamp(1 - sunElevation * 1.8, 0, 1) * 0.75;

  ctx.save();
  ctx.globalAlpha = entity.dormant ? 0.55 : 1;
  const count = clamp(1 + Math.floor(growth * 3.2), 1, 4);
  for (let i = 0; i < count; i += 1) {
    const seed = hashString(entity.id) + i * 41;
    const offset = (i - (count - 1) / 2) * 26 * scale + (randomFromSeed(seed, 1) - 0.5) * 10;
    const mushroomX = x + offset;
    const stemH = heightPx * (0.45 + randomFromSeed(seed, 2) * 0.55);
    const sway = still ? 0 : Math.sin(t / 3800 + phase + i) * 1.4;
    const tipX = mushroomX + sway + (randomFromSeed(seed, 3) - 0.5) * 8;
    const tipY = baseY - stemH;

    if (glow > 0.15) {
      const halo = ctx.createRadialGradient(tipX, tipY, 1, tipX, tipY, 28 + stemH * 0.25);
      halo.addColorStop(0, `rgba(155, 232, 196, ${0.09 * glow})`);
      halo.addColorStop(0.55, `rgba(155, 232, 196, ${0.035 * glow})`);
      halo.addColorStop(1, 'rgba(155, 232, 196, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 28 + stemH * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = pale ? 'rgba(201, 197, 173, 0.7)' : 'rgba(230, 228, 210, 0.8)';
    ctx.lineWidth = Math.max(1.4, 2.6 * scale);
    ctx.beginPath();
    ctx.moveTo(mushroomX, baseY);
    ctx.quadraticCurveTo(mushroomX - 3, baseY - stemH * 0.5, tipX, tipY);
    ctx.stroke();

    if (growth < 0.16) {
      ctx.fillStyle = capColor;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 3.4 * scale, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    const capW = (14 + growth * 30 + randomFromSeed(seed, 4) * 6) * scale;
    const capH = capW * 0.32;
    ctx.fillStyle = hexToRgba(capColor, 0.82);
    ctx.beginPath();
    ctx.ellipse(tipX, tipY, capW, capH, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexToRgba(edgeColor, 0.55);
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(80, 78, 62, 0.35)';
    ctx.lineWidth = 0.55;
    for (let gill = -2; gill <= 2; gill += 1) {
      ctx.beginPath();
      ctx.moveTo(tipX + gill * capW * 0.14, tipY + capH * 0.15);
      ctx.lineTo(tipX + gill * capW * 0.26, tipY + capH * 0.72);
      ctx.stroke();
    }

    ctx.fillStyle = `rgba(155, 232, 196, ${0.16 + glow * 0.28})`;
    ctx.beginPath();
    ctx.ellipse(tipX, tipY, capW * 0.92, capH * 0.32, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  if (growth > 0.8 && sunElevation < 0.35) {
    const motes = still ? 4 : 9;
    for (let i = 0; i < motes; i += 1) {
      const drift = still ? 0 : Math.sin(t / 2100 + i * 1.7 + phase) * 12;
      const mx = x + drift + (randomFromSeed(hashString(entity.id) + i, 1) - 0.5) * 110;
      const my =
        baseY -
        heightPx * (0.3 + randomFromSeed(hashString(entity.id) + i, 2) * 0.7) +
        (still ? 0 : Math.sin(t / 2900 + i) * 7);
      ctx.fillStyle = 'rgba(170, 240, 207, 0.32)';
      ctx.beginPath();
      ctx.arc(mx, my, 0.9 + randomFromSeed(hashString(entity.id) + i, 3) * 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawAmbientMotes(
  ctx: CanvasRenderingContext2D,
  t: number,
  still: boolean,
  sunElevation: number,
) {
  const count = sunElevation > 0.1 ? 26 : 12;
  for (let i = 0; i < count; i += 1) {
    const baseX = randomFromSeed(70, i) * VW;
    const baseY = 90 + randomFromSeed(71, i) * 400;
    const drift = still ? 0 : Math.sin(t / 7000 + i * 1.3) * 22;
    const rise = still ? 0 : ((t / 60 + i * 37) % 140) - 70;
    const x = baseX + drift;
    const y = baseY + rise * 0.5;
    const alpha = (sunElevation > 0.1 ? 0.16 : 0.1) + randomFromSeed(72, i) * 0.16;
    ctx.fillStyle = `rgba(245, 236, 210, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.55 + randomFromSeed(73, i) * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCondensation(
  ctx: CanvasRenderingContext2D,
  moisture: number,
  t: number,
  still: boolean,
) {
  const strength = clamp((moisture - 58) / 34, 0, 1);
  if (strength <= 0.02) return;
  ctx.save();
  for (let i = 0; i < 26; i += 1) {
    const x = 40 + randomFromSeed(110, i) * (VW - 80);
    const y = 18 + randomFromSeed(111, i) * 110;
    const radius = 0.8 + randomFromSeed(112, i) * 2.6 * strength;
    const drip = still ? 0 : Math.max(0, Math.sin(t / 8000 + i) * 8) * strength;
    ctx.fillStyle = `rgba(224, 240, 234, ${0.08 + strength * 0.16})`;
    ctx.beginPath();
    ctx.arc(x, y + drip, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${0.12 + strength * 0.2})`;
    ctx.beginPath();
    ctx.arc(x - radius * 0.25, y + drip - radius * 0.25, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  const veil = ctx.createLinearGradient(0, 0, 0, 260);
  veil.addColorStop(0, `rgba(213, 231, 223, ${0.05 + strength * 0.05})`);
  veil.addColorStop(1, 'rgba(213, 231, 223, 0)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, VW, 260);
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D) {
  const vignette = ctx.createRadialGradient(VW / 2, VH * 0.45, VH * 0.2, VW / 2, VH * 0.5, VW * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.72, 'rgba(0,0,0,0.18)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VW, VH);
}

export function createSceneRenderer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  const soil = buildSoilTexture();
  const backdrop = document.createElement('canvas');
  backdrop.width = VW + 40;
  backdrop.height = VH + 40;
  const backdropCtx = backdrop.getContext('2d');
  let backdropKey = '';
  let dpr = 1;
  let cssW = 0;
  let cssH = 0;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let pointer: { x: number; y: number; inside: boolean } = { x: 0, y: 0, inside: false };
  let mistStart = -Infinity;
  let snipParticles: SnipParticle[] = [];
  let lastFrame = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    dpr = Math.min(cssW < 720 ? 1.5 : 2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    scale = Math.min(cssW / VW, cssH / VH);
    offsetX = (cssW - VW * scale) / 2;
    offsetY = (cssH - VH * scale) / 2;
  };

  const setPointer = (x: number, y: number, inside: boolean) => {
    pointer = { x, y, inside };
  };

  const toVirtual = (x: number, y: number) => ({
    x: (x - offsetX) / scale,
    y: (y - offsetY) / scale,
  });

  const hitTest = (x: number, y: number, world: World): Hit | null => {
    const point = toVirtual(x, y);
    if (point.x < 0 || point.x > VW || point.y < 0 || point.y > VH) return null;
    const layouts = layoutEntities(world);
    let best: { id: string; distance: number } | null = null;
    for (const layout of layouts) {
      const centerY = layout.baseY - layout.heightPx * 0.48;
      const radiusX = Math.max(24, layout.widthPx * 0.55);
      const radiusY = Math.max(24, layout.heightPx * 0.6);
      const dx = (point.x - layout.x) / radiusX;
      const dy = (point.y - centerY) / radiusY;
      if (dx * dx + dy * dy <= 1) {
        const distance = dx * dx + dy * dy;
        if (!best || distance < best.distance) best = { id: layout.entity.id, distance };
      }
    }
    if (best) return { kind: 'specimen', id: best.id };
    if (point.y >= SOIL_TOP - 26) return { kind: 'soil' };
    return null;
  };

  const triggerMist = () => {
    mistStart = performance.now();
  };

  const triggerSnip = (x: number, y: number) => {
    const point = toVirtual(x, y);
    for (let i = 0; i < 9; i += 1) {
      snipParticles.push({
        x: point.x,
        y: point.y,
        vx: (Math.random() - 0.5) * 40,
        vy: -20 - Math.random() * 30,
        life: 1,
        size: 1.4 + Math.random() * 2.4,
      });
    }
  };

  const draw = (world: World, ui: SceneUi, now: number) => {
    if (!ctx) return;
    if (cssW === 0) resize();

    const dt = lastFrame === 0 ? 16 : Math.min(48, now - lastFrame);
    lastFrame = now;

    const hour = ui.previewHour ?? hourOfDay(world.createdAt + world.elapsedMs);
    const sun = sunFor(world.season, hour);
    const pal = PALETTES[world.season];
    const stillness = ui.still;
    const motion = !ui.still && !ui.paused;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0c0907';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, offsetX * dpr, offsetY * dpr);

    let parallaxX = 0;
    let parallaxY = 0;
    if (motion && pointer.inside) {
      parallaxX = ((pointer.x - cssW / 2) / cssW) * 8;
      parallaxY = ((pointer.y - cssH / 2) / cssH) * 4;
    }

    const backdropKeyNow = `${world.season}|${Math.floor(hour * 12)}|${Math.round(world.moisture / 4)}`;
    if (backdropKeyNow !== backdropKey && backdropCtx) {
      backdropCtx.setTransform(1, 0, 0, 1, 0, 0);
      backdropCtx.fillStyle = '#101812';
      backdropCtx.fillRect(0, 0, backdrop.width, backdrop.height);
      backdropCtx.setTransform(1, 0, 0, 1, 20, 20);
      drawBackdrop(backdropCtx, world, pal, sun, 0, true, 0, 0);
      drawHabitatBack(backdropCtx, pal);
      drawInstrument(backdropCtx, world.moisture);
      backdropCtx.setTransform(1, 0, 0, 1, 0, 0);
      backdropKey = backdropKeyNow;
    }
    ctx.drawImage(backdrop, -20 + parallaxX, -20 + parallaxY);

    const layouts = layoutEntities(world);
    drawSoil(ctx, soil, layouts);
    drawMossCarpet(ctx, now, stillness);
    drawLightPool(ctx, sun);

    for (const layout of layouts) {
      if (layout.entity.speciesId === 'cushion-moss') drawMoss(ctx, layout, now, stillness);
    }
    for (const layout of layouts) {
      if (layout.entity.speciesId === 'maidenhair-fern') drawFern(ctx, layout, now, stillness);
    }
    for (const layout of layouts) {
      if (layout.entity.speciesId === 'ghost-fungus') {
        drawFungus(ctx, layout, sun.elevation, now, stillness);
      }
    }

    if (world.entities.length === 0) drawStillLife(ctx);
    drawForeground(ctx, now, stillness);
    drawForegroundFerns(ctx, now, stillness);
    drawAmbientMotes(ctx, now, stillness, sun.elevation);
    drawCondensation(ctx, world.moisture, now, stillness);

    if (ui.selectedId) {
      const layout = layouts.find((item) => item.entity.id === ui.selectedId);
      if (layout) {
        ctx.save();
        ctx.strokeStyle = 'rgba(198, 160, 92, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.ellipse(layout.x, layout.baseY + 2, Math.max(28, layout.widthPx * 0.42), 7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (pointer.inside) {
      const hit = hitTest(pointer.x, pointer.y, world);
      if (hit?.kind === 'specimen' && hit.id) {
        const layout = layouts.find((item) => item.entity.id === hit.id);
        if (layout) {
          ctx.save();
          ctx.strokeStyle =
            ui.tool === 'snip' ? 'rgba(214, 161, 96, 0.85)' : 'rgba(226, 215, 184, 0.4)';
          ctx.lineWidth = 1.1;
          if (ui.tool === 'snip') ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.ellipse(
            layout.x,
            layout.baseY - layout.heightPx * 0.48,
            Math.max(26, layout.widthPx * 0.58),
            Math.max(30, layout.heightPx * 0.56),
            0,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    if (mistStart >= 0 && now - mistStart < 2600) {
      const progress = clamp((now - mistStart) / 2600, 0, 1);
      const veil = ctx.createLinearGradient(0, 260, 0, SOIL_TOP);
      veil.addColorStop(0, `rgba(206, 225, 216, 0)`);
      veil.addColorStop(0.5, `rgba(206, 225, 216, ${0.14 * (1 - progress)})`);
      veil.addColorStop(1, 'rgba(206, 225, 216, 0)');
      ctx.fillStyle = veil;
      ctx.fillRect(0, 200, VW, SOIL_TOP - 200);
      for (let i = 0; i < 26; i += 1) {
        const x = 80 + randomFromSeed(130, i) * 840;
        const delay = randomFromSeed(131, i) * 0.5;
        const local = clamp(progress * 1.8 - delay, 0, 1);
        const y = 190 + local * 330;
        ctx.fillStyle = `rgba(223, 238, 231, ${0.22 * (1 - progress)})`;
        ctx.beginPath();
        ctx.ellipse(x, y, 1.2, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      mistStart = progress >= 1 ? -Infinity : mistStart;
    }

    for (const particle of snipParticles) {
      particle.vy += dt * 0.0009;
      particle.x += particle.vx * dt * 0.001;
      particle.y += particle.vy * dt * 0.001;
      particle.life -= dt / 1400;
      if (particle.y > SOIL_TOP + 24) particle.life = 0;
      ctx.fillStyle = `rgba(160, 184, 128, ${Math.max(0, particle.life) * 0.7})`;
      ctx.beginPath();
      ctx.ellipse(particle.x, particle.y, particle.size, particle.size * 0.55, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    snipParticles = snipParticles.filter((particle) => particle.life > 0);

    drawVignette(ctx);

    if (ui.tool === 'loupe' && pointer.inside && pointer.x > 0 && pointer.y > 0) {
      drawLoupe(ctx, canvas, pointer.x, pointer.y, dpr);
    }
  };

  return { resize, draw, setPointer, hitTest, triggerMist, triggerSnip, toVirtual };
}

function drawLoupe(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  dpr: number,
) {
  const radius = 56;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  const source = radius / 0.95;
  ctx.drawImage(
    canvas,
    (x - source / 2) * dpr,
    (y - source / 2) * dpr,
    source * dpr,
    source * dpr,
    x - radius,
    y - radius,
    radius * 2,
    radius * 2,
  );
  const shade = ctx.createRadialGradient(x, y, radius * 0.55, x, y, radius);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = shade;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rim = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  rim.addColorStop(0, '#e5c88e');
  rim.addColorStop(0.35, '#9a7434');
  rim.addColorStop(0.6, '#f0daa8');
  rim.addColorStop(1, '#6f5222');
  ctx.strokeStyle = rim;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(244, 236, 214, 0.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, radius - 2.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
