import { inflateSync } from "node:zlib";

export type RawPixels = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export function decodePngToPixels(pngBuffer: Buffer): RawPixels {
  const sig = pngBuffer.subarray(0, 8);
  if (sig[0] !== 0x89 || sig[1] !== 0x50 || sig[2] !== 0x4e || sig[3] !== 0x47) {
    throw new Error("Not a valid PNG file");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  while (offset < pngBuffer.length) {
    const length = pngBuffer.readUInt32BE(offset);
    offset += 4;
    const type = pngBuffer.subarray(offset, offset + 4).toString("ascii");
    offset += 4;
    const data = pngBuffer.subarray(offset, offset + length);
    offset += length;
    offset += 4; // skip CRC

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (width === 0 || height === 0) {
    throw new Error("Invalid PNG dimensions");
  }

  const compressed = Buffer.concat(idatChunks);
  const decompressed = inflateSync(compressed);

  const bytesPerPixel = colorType === 2 ? 3 : colorType === 6 ? 4 : colorType === 0 ? 1 : 3;
  const stride = 1 + width * bytesPerPixel;

  const pixels = new Uint8ClampedArray(width * height * 4);

  const prevRow = new Uint8ClampedArray(width * bytesPerPixel);

  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    const filterType = decompressed[rowStart];
    const rawRow = decompressed.subarray(rowStart + 1, rowStart + stride);
    const currentRow = new Uint8ClampedArray(width * bytesPerPixel);

    for (let x = 0; x < width; x++) {
      const xOff = x * bytesPerPixel;
      const raw = rawRow[xOff];

      let a = 0, b = 0, c = 0;
      if (x > 0) b = currentRow[xOff - bytesPerPixel];
      if (y > 0) c = prevRow[xOff];
      if (x > 0 && y > 0) a = prevRow[xOff - bytesPerPixel];

      let reconstructed: number;
      switch (filterType) {
        case 0: reconstructed = raw; break;
        case 1: reconstructed = (raw + b) & 0xff; break;
        case 2: reconstructed = (raw + c) & 0xff; break;
        case 3: reconstructed = (raw + Math.floor((b + c) / 2)) & 0xff; break;
        case 4: {
          const p = b + c - a;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          reconstructed = (raw + pr) & 0xff;
          break;
        }
        default: reconstructed = raw;
      }
      currentRow[xOff] = reconstructed;
    }

    for (let x = 0; x < width; x++) {
      const xOff = x * bytesPerPixel;
      const pIdx = (y * width + x) * 4;

      if (colorType === 2) {
        pixels[pIdx] = currentRow[xOff];
        pixels[pIdx + 1] = currentRow[xOff + 1];
        pixels[pIdx + 2] = currentRow[xOff + 2];
        pixels[pIdx + 3] = 255;
      } else if (colorType === 6) {
        pixels[pIdx] = currentRow[xOff];
        pixels[pIdx + 1] = currentRow[xOff + 1];
        pixels[pIdx + 2] = currentRow[xOff + 2];
        pixels[pIdx + 3] = currentRow[xOff + 3];
      } else if (colorType === 0) {
        const v = currentRow[xOff];
        pixels[pIdx] = v;
        pixels[pIdx + 1] = v;
        pixels[pIdx + 2] = v;
        pixels[pIdx + 3] = 255;
      } else {
        pixels[pIdx] = currentRow[xOff] ?? 0;
        pixels[pIdx + 1] = currentRow[xOff + 1] ?? 0;
        pixels[pIdx + 2] = currentRow[xOff + 2] ?? 0;
        pixels[pIdx + 3] = 255;
      }
    }

    prevRow.set(currentRow);
  }

  return { width, height, data: pixels };
}
