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
  let bitDepth = 0;
  let colorType = 0;
  let interlaceMethod = 0;
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
      bitDepth = data[8];
      colorType = data[9];
      interlaceMethod = data[12];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (width === 0 || height === 0) {
    throw new Error("Invalid PNG dimensions");
  }
  if (bitDepth !== 8) {
    throw new Error(`Unsupported PNG bit depth: ${bitDepth}`);
  }
  if (interlaceMethod !== 0) {
    throw new Error("Interlaced PNGs are not supported.");
  }

  const compressed = Buffer.concat(idatChunks);
  const decompressed = inflateSync(compressed);

  const bytesPerPixel = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0;
  if (bytesPerPixel === 0) {
    throw new Error(`Unsupported PNG color type: ${colorType}`);
  }
  const stride = 1 + width * bytesPerPixel;
  if (decompressed.length !== stride * height) {
    throw new Error("PNG scanline data has an unexpected length.");
  }

  const pixels = new Uint8ClampedArray(width * height * 4);

  const prevRow = new Uint8ClampedArray(width * bytesPerPixel);

  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    const filterType = decompressed[rowStart];
    const rawRow = decompressed.subarray(rowStart + 1, rowStart + stride);
    const currentRow = new Uint8ClampedArray(width * bytesPerPixel);

    for (let byteIndex = 0; byteIndex < rawRow.length; byteIndex++) {
      const raw = rawRow[byteIndex];
      const left = byteIndex >= bytesPerPixel ? currentRow[byteIndex - bytesPerPixel] : 0;
      const above = y > 0 ? prevRow[byteIndex] : 0;
      const upperLeft = y > 0 && byteIndex >= bytesPerPixel
        ? prevRow[byteIndex - bytesPerPixel]
        : 0;

      let reconstructed: number;
      switch (filterType) {
        case 0: reconstructed = raw; break;
        case 1: reconstructed = (raw + left) & 0xff; break;
        case 2: reconstructed = (raw + above) & 0xff; break;
        case 3: reconstructed = (raw + Math.floor((left + above) / 2)) & 0xff; break;
        case 4: {
          const p = left + above - upperLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - above);
          const pc = Math.abs(p - upperLeft);
          const pr = pa <= pb && pa <= pc ? left : pb <= pc ? above : upperLeft;
          reconstructed = (raw + pr) & 0xff;
          break;
        }
        default: throw new Error(`Unsupported PNG filter type: ${filterType}`);
      }
      currentRow[byteIndex] = reconstructed;
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
      } else if (colorType === 4) {
        const v = currentRow[xOff];
        pixels[pIdx] = v;
        pixels[pIdx + 1] = v;
        pixels[pIdx + 2] = v;
        pixels[pIdx + 3] = currentRow[xOff + 1];
      } else {
        throw new Error(`Unsupported PNG color type: ${colorType}`);
      }
    }

    prevRow.set(currentRow);
  }

  return { width, height, data: pixels };
}
