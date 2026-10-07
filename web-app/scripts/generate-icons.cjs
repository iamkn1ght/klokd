/**
 * generate-icons.cjs — renders the Klold "K" mark (electric rounded square +
 * bold ink K, matching the brand reference) straight to PNG. Zero deps:
 * software rasteriser (3x3 supersampled) + minimal PNG encoder (zlib is std).
 *
 *   node scripts/generate-icons.cjs
 *
 * Outputs into ../assets/: icon.png (1024), adaptive-icon.png (1024 full-bleed
 * for the Android safe zone), favicon.png (48), splash-icon.png (1024,
 * transparent bg).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── PNG encoder ──────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Klokd mark ───────────────────────────────────────────────────────────
const BG = [0x00, 0xe5, 0xa0]; // electric
const FG = [0x0a, 0x0a, 0x0f]; // ink

function inRoundedRect(px, py, S, radiusRatio) {
  if (radiusRatio <= 0) return true;
  const r = S * radiusRatio;
  const half = S / 2;
  const dx = Math.max(Math.abs(px - half) - (half - r), 0);
  const dy = Math.max(Math.abs(py - half) - (half - r), 0);
  return dx * dx + dy * dy <= r * r;
}

function distToSeg(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 === 0 ? 0 : (apx * abx + apy * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const dx = apx - abx * t, dy = apy - aby * t;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Bold geometric K — stem rectangle + two diagonal arms bounded by slanted
 * centrelines, clipped to the glyph box so the diagonals end flat at the
 * cap height / baseline (like the brand reference). Coordinates in the SAME
 * unit as the sample point (already supersampled).
 */
function makeKTester(S, glyphScale) {
  const g = S * glyphScale;
  const w = g * 0.78; // glyph width
  const x0 = S / 2 - w / 2;
  const y0 = S / 2 - g / 2;
  const y1 = y0 + g;
  const x1 = x0 + w;
  const yMid = S / 2;
  const t = g * 0.20;
  const tv = t * 1.35; // vertical thickness of diagonal arms
  const jx = x0 + t;   // arms emanate from the stem's right edge

  return (px, py) => {
    if (py < y0 || py > y1) return false; // clip everything to the glyph box
    // Stem.
    if (px >= x0 && px <= x0 + t) return true;
    if (px < jx || px > x1) return false;
    const f = (px - jx) / (x1 - jx); // 0 at junction → 1 at right edge
    const cUp = yMid + (y0 - yMid) * f;  // upper-arm centreline
    const cDn = yMid + (y1 - yMid) * f;  // lower-arm centreline
    return Math.abs(py - cUp) <= tv / 2 || Math.abs(py - cDn) <= tv / 2;
  };
}

/**
 * Render the mark at size×size with 3×3 supersampling.
 *
 * Pixel logic: outside the rounded tile → transparent; tile background →
 * electric; K glyph → ink. (radiusRatio 0 = full-bleed square for the
 * Android adaptive layer; glyphScale = K height as a fraction of size.)
 */
function renderRaw(size, { radiusRatio, glyphScale }) {
  const SS = 3;
  const inK = makeKTester(size * SS, glyphScale); // NOTE: unscaled glyph
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let tile = 0, glyph = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x * SS + sx + 0.5) / SS;
          const py = (y * SS + sy + 0.5) / SS;
          if (!inRoundedRect(px, py, size, radiusRatio)) continue;
          tile++;
          if (inK(px * SS, py * SS)) glyph++;
        }
      }
      const i = (y * size + x) * 4;
      if (tile === 0) {
        buf[i + 3] = 0; // fully transparent corner
        continue;
      }
      const gFrac = glyph / tile;
      buf[i] = Math.round(BG[0] + (FG[0] - BG[0]) * gFrac);
      buf[i + 1] = Math.round(BG[1] + (FG[1] - BG[1]) * gFrac);
      buf[i + 2] = Math.round(BG[2] + (FG[2] - BG[2]) * gFrac);
      buf[i + 3] = Math.round(255 * (tile / (SS * SS)));
    }
  }
  return { buf, size };
}

const encodeRaw = r => encodePNG(r.size, r.size, r.buf);

/** Splash: the mark at 62% of the canvas, centred, on transparency. */
function renderSplash(size) {
  const SS = 3;
  const mark = Math.round(size * 0.62);
  const off = Math.floor((size - mark) / 2);
  const sub = renderRaw(mark * SS, { radiusRatio: 0.24, glyphScale: 0.58 });
  // Box-downsample the SS× supersampled render back to `mark`, then paste.
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx0 = (x - off) * SS, sy0 = (y - off) * SS;
      if (sx0 < 0 || sy0 < 0 || sx0 + SS > mark * SS || sy0 + SS > mark * SS) continue;
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = sy0; sy < sy0 + SS; sy++) {
        for (let sx = sx0; sx < sx0 + SS; sx++) {
          const si = (sy * mark * SS + sx) * 4;
          r += sub.buf[si] * sub.buf[si + 3];
          g += sub.buf[si + 1] * sub.buf[si + 3];
          b += sub.buf[si + 2] * sub.buf[si + 3];
          a += sub.buf[si + 3];
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      buf[i] = a ? Math.round(r / a) : 0;
      buf[i + 1] = a ? Math.round(g / a) : 0;
      buf[i + 2] = a ? Math.round(b / a) : 0;
      buf[i + 3] = Math.round(a / n);
    }
  }
  return encodePNG(size, size, buf);
}

// ── Emit ─────────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { file: 'icon.png', buf: encodeRaw(renderRaw(1024, { radiusRatio: 0.24, glyphScale: 0.56 })) },
  { file: 'adaptive-icon.png', buf: encodeRaw(renderRaw(1024, { radiusRatio: 0, glyphScale: 0.42 })) },
  { file: 'favicon.png', buf: encodeRaw(renderRaw(48, { radiusRatio: 0.24, glyphScale: 0.62 })) },
  { file: 'splash-icon.png', buf: renderSplash(1024) },
];
for (const t of targets) {
  const p = path.join(outDir, t.file);
  fs.writeFileSync(p, t.buf);
  console.log(`✓ ${t.file} (${(t.buf.length / 1024).toFixed(1)} KB)`);
}

// Contact sheet with the PNGs inlined as data URIs, for visual inspection.
const b64 = f => 'data:image/png;base64,' + fs.readFileSync(path.join(outDir, f)).toString('base64');
const fig = (src, size, cap, extra = '') =>
  `<figure><img src="${src}" width="${size}" height="${size}" style="${extra}"><figcaption>${cap}</figcaption></figure>`;
const ic = b64('icon.png');
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Klokd icons</title>
<style>body{background:#0A0A0F;color:#fff;font-family:system-ui;display:flex;flex-direction:column;gap:24px;align-items:center;padding:40px}
.row{display:flex;gap:24px;align-items:flex-end;flex-wrap:wrap;justify-content:center}
figure{text-align:center;margin:0}figcaption{font-size:12px;color:#9ca3af;margin-top:8px}img{border-radius:12px}</style>
</head><body>
<div class="row">
${fig(ic, 128, 'icon 128')}${fig(ic, 64, 'icon 64')}${fig(ic, 32, 'icon 32')}${fig(b64('favicon.png'), 16, 'favicon 16', 'border-radius:4px')}
</div>
<div class="row">
${fig(b64('adaptive-icon.png'), 128, 'adaptive full-bleed', 'border-radius:0')}${fig(b64('splash-icon.png'), 128, 'splash on ink')}
</div>
</body></html>`;
fs.writeFileSync(path.join(__dirname, '..', 'icon-preview.html'), html);
console.log('✓ icon-preview.html');
console.log('Done.');
