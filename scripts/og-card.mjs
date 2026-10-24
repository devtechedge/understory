import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.OG_BASE ?? 'http://127.0.0.1:5220';
mkdirSync('docs/screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean(window.__understory?.getWorld()), null, {
  timeout: 15000,
});
await page.evaluate(async () => {
  const api = window.__understory;
  api.plant('maidenhair-fern', 0.63);
  api.plant('cushion-moss', 0.31);
  api.plant('ghost-fungus', 0.84);
  for (let i = 0; i < 4; i += 1) {
    api.advance(14 * 60000);
    api.mist();
  }
  api.setSeason('autumn');
  await document.fonts.ready;
});
await page.waitForTimeout(700);
await page.evaluate(() => {
  const app = document.querySelector('.app');
  if (app) app.classList.add('is-immersed');
  const overlay = document.createElement('div');
  overlay.id = 'og-overlay';
  overlay.innerHTML = `
    <div class="og-inner">
      <p class="og-kicker">Understory</p>
      <h1>A living<br />vitrine.</h1>
      <p class="og-lede">Cushion moss, maidenhair fern and ghost fungus<br />kept under glass, on a slow clock.</p>
      <p class="og-foot">Plant &middot; mist &middot; snip &middot; a field journal written from what happens</p>
    </div>
    <aside class="og-specimen">
      <div class="og-specimen-head"><span>Understory herbarium</span><span>No. 02</span></div>
      <svg viewBox="0 0 160 200" aria-hidden="true">
        <g fill="none" stroke="#4d5a42" stroke-width="1.15" stroke-linecap="round">
          <path d="M80 180 Q77 120 52 64" />
          <path d="M80 180 Q84 124 104 74" />
          <path d="M80 180 Q82 140 122 108" />
        </g>
        <g fill="#5d6b50">
          <path d="M66 130 q-20 -8 -26 -22 q20 2 30 14 Z" opacity=".55" />
          <path d="M61 113 q-17 -10 -20 -25 q18 5 26 17 Z" opacity=".5" />
          <path d="M57 95 q-14 -11 -15 -26 q16 7 21 19 Z" opacity=".45" />
          <path d="M79 134 q18 -12 21 -27 q-19 7 -25 20 Z" opacity=".55" />
          <path d="M84 116 q16 -12 18 -28 q-17 8 -23 21 Z" opacity=".5" />
          <path d="M89 98 q14 -12 15 -27 q-15 8 -19 21 Z" opacity=".45" />
          <path d="M102 142 q18 -9 24 -23 q-20 4 -29 16 Z" opacity=".5" />
          <path d="M111 125 q17 -8 24 -22 q-20 3 -30 14 Z" opacity=".45" />
        </g>
        <g fill="none" stroke="#6b755c" stroke-width=".7" opacity=".4">
          <path d="M40 158 H120" />
          <path d="M52 166 H108" />
        </g>
      </svg>
      <h2>Maidenhair Fern</h2>
      <p class="og-latin">Adiantum raddianum</p>
      <div class="og-facts"><span>Planted 24 Oct</span><span>214 mm</span></div>
      <p class="og-note">Two fronds are open; the third is still a coil.</p>
    </aside>
    <style>
      #og-overlay {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: flex;
        align-items: flex-end;
        padding: 54px 64px;
        color: #f1e8d5;
        font-family: 'Bricolage Grotesque Variable', system-ui, sans-serif;
        background: linear-gradient(180deg, rgba(10, 9, 7, 0.02) 0%, rgba(10, 9, 7, 0.12) 38%, rgba(10, 9, 7, 0.92) 94%);
        pointer-events: none;
      }
      #og-overlay .og-kicker {
        margin: 0 0 4px;
        font-size: 11px;
        letter-spacing: 0.32em;
        text-transform: uppercase;
        color: #cdb37b;
      }
      #og-overlay h1 {
        margin: 0;
        font-family: 'Literata Variable', Georgia, serif;
        font-size: 88px;
        font-weight: 400;
        line-height: 0.92;
        letter-spacing: -0.025em;
      }
      #og-overlay .og-lede {
        margin: 18px 0 0;
        font-family: 'Literata Variable', Georgia, serif;
        font-size: 20px;
        line-height: 1.45;
        color: rgba(241, 232, 213, 0.82);
      }
      #og-overlay .og-foot {
        margin: 22px 0 0;
        font-family: 'Martian Mono Variable', monospace;
        font-size: 9px;
        letter-spacing: 0.06em;
        color: rgba(241, 232, 213, 0.5);
      }
      #og-overlay .og-specimen {
        position: absolute;
        right: 54px;
        bottom: 44px;
        width: 268px;
        padding: 16px 16px 14px;
        color: #2f2a21;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent 24%),
          linear-gradient(150deg, #ece4d1, #ddd2bd);
        border: 1px solid rgba(64, 53, 37, 0.28);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
        transform: rotate(1.4deg);
      }
      #og-overlay .og-specimen-head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-family: 'Martian Mono Variable', monospace;
        font-size: 6.5px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #7b705e;
      }
      #og-overlay .og-specimen svg {
        display: block;
        width: 150px;
        height: 188px;
        margin: 4px auto 2px;
      }
      #og-overlay .og-specimen h2 {
        margin: 0;
        font-family: 'Literata Variable', Georgia, serif;
        font-size: 21px;
        font-weight: 500;
        line-height: 1.1;
      }
      #og-overlay .og-latin {
        margin: 2px 0 8px;
        font-family: 'Literata Variable', Georgia, serif;
        font-style: italic;
        font-size: 11px;
        color: #6f6453;
      }
      #og-overlay .og-facts {
        display: flex;
        justify-content: space-between;
        border-top: 1px solid rgba(64, 53, 37, 0.18);
        padding-top: 6px;
        font-family: 'Martian Mono Variable', monospace;
        font-size: 7px;
        color: #5d5343;
      }
      #og-overlay .og-note {
        margin: 8px 0 0;
        font-family: 'Literata Variable', Georgia, serif;
        font-size: 10px;
        line-height: 1.5;
        color: #544b3d;
      }
    </style>
  `;
  document.body.appendChild(overlay);
});
await page.waitForTimeout(500);
await page.screenshot({ path: 'public/og-card.png' });
await page.screenshot({ path: 'docs/screenshots/social-preview.png' });
console.log('social card written to public/og-card.png');
await browser.close();
