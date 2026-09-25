// Generates the PWA app icons and favicon — a bold blocky "NOBS" wordmark
// (2x2 grid: N O / B S), accent green on near-black — as raw PNGs. No
// image-library dependency, just zlib + hand-rolled PNG chunk encoding.
// Re-run with `node scripts/gen-icons.mjs` after changing the palette/mark.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../app/public/icons");
mkdirSync(outDir, { recursive: true });

const BG = [0x0f, 0x0f, 0x0f]; // --color-bg (dark)
const ACCENT = [0x5d, 0xd6, 0x2c]; // --color-accent (dark theme)

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0 (none) per scanline
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// 4x supersampled: every mark is drawn at 4x resolution and box-downsampled,
// which is what gives the blocky letterforms clean anti-aliased edges
// instead of jagged raw-pixel steps.
const SS = 4;

function makeCanvas(size) {
  const px = size * SS;
  const rgba = Buffer.alloc(px * px * 4);
  return {
    px,
    size,
    rgba,
    setPixel(x, y, [r, g, b], a = 255) {
      if (x < 0 || y < 0 || x >= this.px || y >= this.px) return;
      const i = (y * this.px + x) * 4;
      this.rgba[i] = r;
      this.rgba[i + 1] = g;
      this.rgba[i + 2] = b;
      this.rgba[i + 3] = a;
    },
    fill(color) {
      for (let y = 0; y < this.px; y++) for (let x = 0; x < this.px; x++) this.setPixel(x, y, color);
    },
    fillRoundedRect(x0, y0, w, h, radius, color) {
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
          const dx = x < x0 + radius ? x0 + radius - x : x >= x0 + w - radius ? x - (x0 + w - radius - 1) : 0;
          const dy = y < y0 + radius ? y0 + radius - y : y >= y0 + h - radius ? y - (y0 + h - radius - 1) : 0;
          if (dx > 0 && dy > 0 && dx * dx + dy * dy > radius * radius) continue;
          this.setPixel(x, y, color);
        }
      }
    },
    // Fills a capsule (thick line with flat-ish rounded ends) from (x0,y0) to (x1,y1).
    fillThickLine(x0, y0, x1, y1, width, color) {
      const minX = Math.floor(Math.min(x0, x1) - width);
      const maxX = Math.ceil(Math.max(x0, x1) + width);
      const minY = Math.floor(Math.min(y0, y1) - width);
      const maxY = Math.ceil(Math.max(y0, y1) + width);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const lenSq = dx * dx + dy * dy;
      const halfW = width / 2;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          let t = lenSq === 0 ? 0 : ((x - x0) * dx + (y - y0) * dy) / lenSq;
          t = Math.max(0, Math.min(1, t));
          const px_ = x0 + t * dx;
          const py_ = y0 + t * dy;
          const distSq = (x - px_) ** 2 + (y - py_) ** 2;
          if (distSq <= halfW * halfW) this.setPixel(x, y, color);
        }
      }
    },
    // Box-downsamples the supersampled buffer to `size`x`size` and returns
    // a fresh RGBA buffer at that resolution.
    downsample() {
      const out = Buffer.alloc(this.size * this.size * 4);
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          let r = 0, g = 0, b = 0, a = 0;
          for (let sy = 0; sy < SS; sy++) {
            for (let sx = 0; sx < SS; sx++) {
              const i = ((y * SS + sy) * this.px + (x * SS + sx)) * 4;
              r += this.rgba[i];
              g += this.rgba[i + 1];
              b += this.rgba[i + 2];
              a += this.rgba[i + 3];
            }
          }
          const n = SS * SS;
          const o = (y * this.size + x) * 4;
          out[o] = Math.round(r / n);
          out[o + 1] = Math.round(g / n);
          out[o + 2] = Math.round(b / n);
          out[o + 3] = Math.round(a / n);
        }
      }
      return out;
    },
  };
}

// Bold, blocky letterforms in a 0..1 unit box — a digital-display style
// alphabet built from bars, matching the "No BS" directness. T = stroke
// thickness as a fraction of the letter's box.
const T = 0.2;

function drawRectUnits(canvas, boxX, boxY, boxSize, ux, uy, uw, uh, color, radiusFrac = 0.12) {
  const x = boxX + ux * boxSize;
  const y = boxY + uy * boxSize;
  const w = uw * boxSize;
  const h = uh * boxSize;
  const radius = Math.min(w, h) * radiusFrac;
  canvas.fillRoundedRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), radius, color);
}

function drawLetter(canvas, letter, boxX, boxY, boxSize, color) {
  const bar = (ux, uy, uw, uh) => drawRectUnits(canvas, boxX, boxY, boxSize, ux, uy, uw, uh, color);

  if (letter === "N") {
    bar(0, 0, T, 1);
    bar(1 - T, 0, T, 1);
    canvas.fillThickLine(
      boxX + (T / 2) * boxSize,
      boxY + T * 0.6 * boxSize,
      boxX + (1 - T / 2) * boxSize,
      boxY + (1 - T * 0.6) * boxSize,
      T * 0.92 * boxSize,
      color
    );
  } else if (letter === "O") {
    bar(0, 0, 1, T);
    bar(0, 1 - T, 1, T);
    bar(0, 0, T, 1);
    bar(1 - T, 0, T, 1);
  } else if (letter === "B") {
    bar(0, 0, T, 1);
    bar(0, 0, 1, T);
    bar(0, 0.5 - T / 2, 1, T);
    bar(0, 1 - T, 1, T);
    bar(1 - T, 0, T, 0.5 + T / 2);
    bar(1 - T, 0.5 - T / 2, T, 0.5 + T / 2);
  } else if (letter === "S") {
    bar(0, 0, 1, T);
    bar(0, 0, T, 0.5 + T / 2);
    bar(0, 0.5 - T / 2, 1, T);
    bar(1 - T, 0.5 - T / 2, T, 0.5 + T / 2);
    bar(0, 1 - T, 1, T);
  }
}

// 2x2 grid: N O / B S. `scale` shrinks the whole mark for maskable icons
// (OS crops a circle out of the full canvas, so content must stay within ~80%).
function drawWordmark(canvas, scale = 1) {
  const s = canvas.px;
  const pad = s * (1 - 0.72 * scale) * 0.5;
  const gap = s * 0.06 * scale;
  const cell = (s - pad * 2 - gap) / 2;

  drawLetter(canvas, "N", pad, pad, cell, ACCENT);
  drawLetter(canvas, "O", pad + cell + gap, pad, cell, ACCENT);
  drawLetter(canvas, "B", pad, pad + cell + gap, cell, ACCENT);
  drawLetter(canvas, "S", pad + cell + gap, pad + cell + gap, cell, ACCENT);
}

function buildIcon(size, { maskable = false } = {}) {
  const canvas = makeCanvas(size);
  canvas.fill(BG);
  if (maskable) {
    // Maskable icons need the background to fill the entire canvas (no
    // rounding) since the OS applies its own mask shape on top.
    drawWordmark(canvas, 0.72);
  } else {
    canvas.fillRoundedRect(0, 0, canvas.px, canvas.px, Math.round(canvas.px * 0.22), BG);
    drawWordmark(canvas, 1);
  }
  return encodePNG(size, size, canvas.downsample());
}

writeFileSync(join(outDir, "icon-192.png"), buildIcon(192));
writeFileSync(join(outDir, "icon-512.png"), buildIcon(512));
writeFileSync(join(outDir, "icon-maskable-512.png"), buildIcon(512, { maskable: true }));

// Small favicon: a compact "N" monogram reads better than the full 2x2 "NOBS"
// grid at 32px, where four tiny letters would blur into mush.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#0f0f0f"/>
  <path d="M10 23V9h3l6 9.5V9h3v14h-3l-6-9.5V23z" fill="#5dd62c"/>
</svg>`;
writeFileSync(join(outDir, "favicon.svg"), favicon);

console.log("Generated icon-192.png, icon-512.png, icon-maskable-512.png, favicon.svg in", outDir);
