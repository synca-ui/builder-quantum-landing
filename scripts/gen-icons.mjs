import fs from 'fs';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
}
function crc32(buf) {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function mkChunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeB, data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
}

function createPNG(width, height, pixelFn) {
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; ihdr[9] = 2;
    const rows = [];
    for (let y = 0; y < height; y++) {
        const row = Buffer.alloc(1 + width * 3);
        for (let x = 0; x < width; x++) {
            const [r, g, b] = pixelFn(x, y, width, height);
            row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b;
        }
        rows.push(row);
    }
    const raw = Buffer.concat(rows);
    const compressed = zlib.deflateSync(raw, { level: 6 });
    return Buffer.concat([sig, mkChunk('IHDR', ihdr), mkChunk('IDAT', compressed), mkChunk('IEND', Buffer.alloc(0))]);
}

function makeIconPixel(x, y, w, h, safePad) {
    // Rounded rect clip
    const R = w * 0.22;
    function inRoundRect(px, py) {
        const ox = Math.max(R - px, px - (w - R), 0);
        const oy = Math.max(R - py, py - (h - R), 0);
        return ox * ox + oy * oy <= R * R;
    }

    if (!inRoundRect(x, y)) {
        // Transparent → white background
        return [255, 255, 255];
    }

    // Teal-to-purple gradient
    const t = x / w;
    const bgR = Math.round(13 + t * (124 - 13));
    const bgG = Math.round(148 + t * (58 - 148));
    const bgB = Math.round(136 + t * (237 - 136));

    // Draw 'M' letter centered, scaled to safe area
    const area = w - safePad * 2;
    const cx = w / 2;
    const cy = h / 2;
    const charH = area * 0.60;
    const charW = charH * 0.75;
    const sw = Math.max(3, w * 0.08); // stroke width

    const lx = cx - charW / 2;
    const rx = cx + charW / 2;
    const top = cy - charH / 2 + h * 0.02;
    const bot = top + charH;
    const dipY = top + charH * 0.52;

    function inM() {
        // Left vertical
        if (x >= lx && x <= lx + sw && y >= top && y <= bot) return true;
        // Right vertical
        if (x >= rx - sw && x <= rx && y >= top && y <= bot) return true;
        // Left diagonal top→dip
        const sl = (dipY - top) / (cx - (lx + sw * 0.5));
        if (x >= lx + sw && x <= cx && y >= top && y <= dipY) {
            const yOnLine = top + sl * (x - (lx + sw * 0.5));
            if (Math.abs(y - yOnLine) <= sw * 0.85) return true;
        }
        // Right diagonal dip→top
        const sr = (top - dipY) / (rx - cx);
        if (x >= cx && x <= rx - sw && y >= top && y <= dipY) {
            const yOnLine = dipY + sr * (x - cx);
            if (Math.abs(y - yOnLine) <= sw * 0.85) return true;
        }
        return false;
    }

    if (inM()) return [255, 255, 255];
    return [bgR, bgG, bgB];
}

function genIcon(size, safePad, filename) {
    const buf = createPNG(size, size, (x, y, w, h) => makeIconPixel(x, y, w, h, safePad));
    const outPath = path.join(publicDir, filename);
    fs.writeFileSync(outPath, buf);
    console.log(`✓ ${filename} (${buf.length} bytes)`);
}

genIcon(192, 0, 'icon-192.png');
genIcon(512, 0, 'icon-512.png');
genIcon(512, Math.round(512 * 0.1), 'icon-512-maskable.png');
console.log('All icons generated.');
