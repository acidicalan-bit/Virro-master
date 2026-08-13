import { encodePixelsToPng } from "@/src/infrastructure/evidence/png-encoder";

/** Deterministic, structured 1024x1024 fixture for the single real Field Beta smoke. */
export function createPrecisionEditFinalFixture(): Buffer {
  const width = 1024;
  const height = 1024;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const grid = (Math.floor(x / 64) + Math.floor(y / 64)) % 2;
      data[offset] = grid ? 225 : 32;
      data[offset + 1] = grid ? 235 : 48;
      data[offset + 2] = grid ? 245 : 72;
      data[offset + 3] = 255;
      if (x >= 448 && x < 576 && y >= 448 && y < 576) {
        data[offset] = 245;
        data[offset + 1] = 170;
        data[offset + 2] = 35;
      }
    }
  }
  return encodePixelsToPng({ width, height, data });
}
