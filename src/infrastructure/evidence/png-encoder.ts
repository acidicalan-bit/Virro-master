import { deflateSync } from "node:zlib";

import type { PixelGrid } from "@/src/infrastructure/evidence/image-diff-calculator";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function encodePixelsToPng(grid: PixelGrid): Buffer {
  const expectedLength = grid.width * grid.height * 4;
  if (!Number.isInteger(grid.width) || !Number.isInteger(grid.height) || grid.width <= 0 || grid.height <= 0) {
    throw new Error("PNG dimensions must be positive integers.");
  }
  if (grid.data.length !== expectedLength) {
    throw new Error("RGBA pixel data length does not match PNG dimensions.");
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(grid.width, 0);
  ihdr.writeUInt32BE(grid.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = grid.width * 4;
  const scanlines = Buffer.alloc((stride + 1) * grid.height);
  for (let y = 0; y < grid.height; y++) {
    const rowOffset = y * (stride + 1);
    scanlines[rowOffset] = 0;
    const sourceOffset = y * stride;
    Buffer.from(grid.data.buffer, grid.data.byteOffset + sourceOffset, stride).copy(
      scanlines,
      rowOffset + 1,
    );
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(scanlines, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function crc32(input: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
