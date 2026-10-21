/**
 * Generates the DuoDay PWA icon set (PNG) from the brand mark defined in
 * `client/src/index.css` (`.app-mark`), plus the matching SVG favicon.
 *
 * The brand mark is two rounded capsules (coral + amber) crossing at +/-39deg.
 * Everything here is dependency free: shapes are rasterised by hand and the
 * PNG is encoded with Node's built-in zlib.
 *
 * Usage: node scripts/generate-pwa-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", "client", "public", "icons");

/* ------------------------------------------------------------------ colors */

const COLORS = {
  coral: [0xe4, 0x7d, 0x69],
  amber: [0xf0, 0xbe, 0x76],
  cream: [0xf7, 0xf8, 0xf2],
  border: [0xe2, 0xe6, 0xdd],
};

/* ------------------------------------------------------------------- shape */

/**
 * Geometry of the mark, expressed in the CSS `.app-mark` coordinate space.
 * The values mirror `client/src/index.css`:
 *
 *   .app-mark { width: 31px; height: 31px; gap: 3px; }
 *   .app-mark span { width: 11px; height: 21px; border-radius: 10px 10px 8px 8px; }
 *
 * The pill centres land on x = 10.5 / 20.5 (i.e. +/- 5px around the box
 * centre) and both sit at y = 15.5.
 */
const MARK = {
  box: 31, // .app-mark width/height
  pillWidth: 11, // .app-mark span width
  pillHeight: 21, // .app-mark span height
  // `border-radius: 10px 10px 8px 8px` overflows the 11px wide pill, so CSS
  // scales every radius by 11 / (10 + 10) = 0.55.
  radii: [5.5, 5.5, 4.4, 4.4], // top-left, top-right, bottom-right, bottom-left
  angle: 39, // degrees, +/- for the two pills
  offsetX: 5, // horizontal offset of each pill from the box centre
};

/**
 * Signed distance to a rounded rect with per-corner circular radii.
 * Negative values are inside. `radii` is ordered
 * [top-left, top-right, bottom-right, bottom-left].
 */
function insideRoundedRect(x, y, w, h, radii) {
  const hw = w / 2;
  const hh = h / 2;
  const r = radii[x < 0 ? (y < 0 ? 0 : 3) : y < 0 ? 1 : 2];
  const qx = Math.abs(x) - hw + r;
  const qy = Math.abs(y) - hh + r;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - r <= 0;
}

/** Tests a point against the full DuoDay mark (both pills). */
function insideMark(px, py, size, markScale) {
  const scale = (size * markScale) / MARK.box;
  const cx = size / 2;
  const cy = size / 2;

  const pillW = MARK.pillWidth * scale;
  const pillH = MARK.pillHeight * scale;
  const radii = MARK.radii.map(r => r * scale);
  const offset = MARK.offsetX * scale;

  const pills = [
    { color: "coral", angle: MARK.angle, cx: cx - offset, cy },
    { color: "amber", angle: -MARK.angle, cx: cx + offset, cy },
  ];

  // Later pills are painted on top (matches DOM order in the React component).
  for (let i = pills.length - 1; i >= 0; i -= 1) {
    const pill = pills[i];
    const rad = (pill.angle * Math.PI) / 180;
    const dx = px - pill.cx;
    const dy = py - pill.cy;
    const lx = dx * Math.cos(rad) + dy * Math.sin(rad);
    const ly = -dx * Math.sin(rad) + dy * Math.cos(rad);
    if (insideRoundedRect(lx, ly, pillW, pillH, radii)) return pill.color;
  }
  return null;
}

/* -------------------------------------------------------------- rasteriser */

const SAMPLES = 4; // 4x4 supersampling per pixel

function renderIcon(size, { background, cornerRadius, markScale, border }) {
  const data = Buffer.alloc(size * size * 4);
  const step = 1 / SAMPLES;
  const offset = step / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let bgHits = 0;
      const markHits = { coral: 0, amber: 0 };

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const px = x + sx * step + offset;
          const py = y + sy * step + offset;

          if (cornerRadius > 0) {
            if (insideRoundedRect(px - size / 2, py - size / 2, size, size, cornerRadius)) {
              bgHits += 1;
            }
          } else {
            bgHits += 1;
          }

          const mark = insideMark(px, py, size, markScale);
          if (mark) markHits[mark] += 1;
        }
      }

      const total = SAMPLES * SAMPLES;
      const alpha = bgHits / total;
      const coralA = markHits.coral / total;
      const amberA = markHits.amber / total;

      // Composite the mark over the background.
      let r = background[0];
      let g = background[1];
      let b = background[2];

      const blend = (color, coverage) => {
        if (coverage <= 0) return;
        r = r * (1 - coverage) + color[0] * coverage;
        g = g * (1 - coverage) + color[1] * coverage;
        b = b * (1 - coverage) + color[2] * coverage;
      };

      blend(COLORS.coral, coralA);
      blend(COLORS.amber, amberA);

      const i = (y * size + x) * 4;
      data[i] = Math.round(r);
      data[i + 1] = Math.round(g);
      data[i + 2] = Math.round(b);
      data[i + 3] = Math.round(alpha * 255);
    }
  }

  if (border) {
    // 1px inner hairline so the icon stays visible on light backgrounds.
    const inset = Math.max(1, Math.round(size * 0.012));
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const nearEdge =
          x < inset || y < inset || x >= size - inset || y >= size - inset;
        if (!nearEdge) continue;
        const i = (y * size + x) * 4;
        data[i] = Math.round(data[i] * 0.35 + COLORS.border[0] * 0.65);
        data[i + 1] = Math.round(data[i + 1] * 0.35 + COLORS.border[1] * 0.65);
        data[i + 2] = Math.round(data[i + 2] * 0.35 + COLORS.border[2] * 0.65);
      }
    }
  }

  return data;
}

/* ------------------------------------------------------------- PNG encoder */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filter type: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* --------------------------------------------------------------- favicon */

function buildFaviconSvg() {
  const { box, pillWidth, pillHeight, angle, offsetX } = MARK;
  // SVG only supports uniform corner radii, so the capsule uses rx = width / 2.
  const radius = pillWidth / 2;
  const y = (box - pillHeight) / 2;
  const firstX = box / 2 - offsetX - pillWidth / 2;
  const secondX = box / 2 + offsetX - pillWidth / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}" width="${box}" height="${box}">
  <rect width="${box}" height="${box}" rx="7" fill="#f7f8f2"/>
  <rect x="${firstX}" y="${y}" width="${pillWidth}" height="${pillHeight}" rx="${radius}" fill="#e47d69" transform="rotate(${angle} ${firstX + pillWidth / 2} ${box / 2})"/>
  <rect x="${secondX}" y="${y}" width="${pillWidth}" height="${pillHeight}" rx="${radius}" fill="#f0be76" transform="rotate(${-angle} ${secondX + pillWidth / 2} ${box / 2})"/>
</svg>
`;
}

/* ------------------------------------------------------------------- main */

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const targets = [
    { file: "icon-192.png", size: 192, cornerRadius: 0.22, markScale: 0.6, border: true },
    { file: "icon-512.png", size: 512, cornerRadius: 0.22, markScale: 0.6, border: true },
    // Maskable icons are cropped by the OS, so the background is full bleed and
    // the mark stays inside the 80% safe zone.
    { file: "icon-maskable-192.png", size: 192, cornerRadius: 0, markScale: 0.48, border: false },
    { file: "icon-maskable-512.png", size: 512, cornerRadius: 0, markScale: 0.48, border: false },
    // iOS applies its own mask, so this one is a plain square.
    { file: "apple-touch-icon.png", size: 180, cornerRadius: 0, markScale: 0.56, border: false },
    { file: "icon-96.png", size: 96, cornerRadius: 0.22, markScale: 0.6, border: true },
  ];

  for (const target of targets) {
    const rgba = renderIcon(target.size, {
      background: COLORS.cream,
      cornerRadius: target.cornerRadius * target.size,
      markScale: target.markScale,
      border: target.border,
    });
    const png = encodePng(target.size, rgba);
    fs.writeFileSync(path.join(OUT_DIR, target.file), png);
    console.log(`wrote ${path.relative(process.cwd(), path.join(OUT_DIR, target.file))} (${png.length} bytes)`);
  }

  const favicon = buildFaviconSvg();
  const faviconPath = path.resolve(__dirname, "..", "client", "public", "favicon.svg");
  fs.writeFileSync(faviconPath, favicon);
  console.log(`wrote ${path.relative(process.cwd(), faviconPath)}`);
}

main();
