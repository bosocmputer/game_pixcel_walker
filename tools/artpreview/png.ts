/** Dependency-free PNG decode/encode (8-bit, non-interlaced) for the art preview tools. */
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

export interface Rgba {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export function readPng(file: string): Rgba {
  const buf = readFileSync(file);
  let pos = 8;
  let w = 0, h = 0, depth = 0, ctype = 0;
  let pal: Buffer | null = null, trns: Buffer | null = null;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      depth = data[8]!;
      ctype = data[9]!;
    } else if (type === 'PLTE') pal = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const chans = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[ctype]!;
  const bpp = Math.max(1, (chans * depth) / 8);
  const stride = Math.ceil((w * chans * depth) / 8);
  const out = new Uint8ClampedArray(w * h * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]!;
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp]! : 0;
      const b = prev[i]!;
      const c = i >= bpp ? prev[i - bpp]! : 0;
      if (f === 1) line[i] = (line[i]! + a) & 255;
      else if (f === 2) line[i] = (line[i]! + b) & 255;
      else if (f === 3) line[i] = (line[i]! + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        line[i] = (line[i]! + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    prev = line;
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, bl = 0, al = 255;
      if (ctype === 6) [r, g, bl, al] = [line[x * 4]!, line[x * 4 + 1]!, line[x * 4 + 2]!, line[x * 4 + 3]!];
      else if (ctype === 2) [r, g, bl] = [line[x * 3]!, line[x * 3 + 1]!, line[x * 3 + 2]!];
      else if (ctype === 4) [r, g, bl, al] = [line[x * 2]!, line[x * 2]!, line[x * 2]!, line[x * 2 + 1]!];
      else if (ctype === 0) r = g = bl = line[x]!;
      else if (ctype === 3) {
        const idx = depth === 8 ? line[x]! : (line[(x * depth) >> 3]! >> (8 - depth - ((x * depth) & 7))) & ((1 << depth) - 1);
        [r, g, bl] = [pal![idx * 3]!, pal![idx * 3 + 1]!, pal![idx * 3 + 2]!];
        al = trns && idx < trns.length ? trns[idx]! : 255;
      }
      out.set([r, g, bl, al], (y * w + x) * 4);
    }
  }
  return { width: w, height: h, data: out };
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(b: Buffer): number {
  let c = -1;
  for (const x of b) c = CRC[(c ^ x) & 255]! ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

export function writePng(file: string, img: Rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.width, 0);
  ihdr.writeUInt32BE(img.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((img.width * 4 + 1) * img.height);
  for (let y = 0; y < img.height; y++) Buffer.from(img.data.buffer, img.data.byteOffset + y * img.width * 4, img.width * 4).copy(raw, y * (img.width * 4 + 1) + 1);
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

export function blank(w: number, h: number, rgb?: [number, number, number]): Rgba {
  const data = new Uint8ClampedArray(w * h * 4);
  if (rgb) for (let i = 0; i < data.length; i += 4) data.set([...rgb, 255], i);
  return { width: w, height: h, data };
}

/** Nearest-neighbour blit with integer scale and optional horizontal mirror; alpha 0 pixels skipped. */
export function blit(dst: Rgba, src: Rgba, dx: number, dy: number, scale: number, mirror = false) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + (mirror ? src.width - 1 - x : x)) * 4;
      if (src.data[i + 3]! < 128) continue;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const X = dx + x * scale + sx, Y = dy + y * scale + sy;
          if (X < 0 || Y < 0 || X >= dst.width || Y >= dst.height) continue;
          dst.data.set(src.data.subarray(i, i + 4), (Y * dst.width + X) * 4);
        }
      }
    }
  }
}
