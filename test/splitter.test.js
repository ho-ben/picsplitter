import test from "node:test";
import assert from "node:assert/strict";
import { calculateGrid, isNearWhite, trimWhiteEdges } from "../splitter.js";

function imageData(width, height, pixel) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = pixel(x, y);
      data.set([r, g, b, a], (y * width + x) * 4);
    }
  }
  return { data, width, height };
}

test("near-white detection respects sensitivity and transparency", () => {
  assert.equal(isNearWhite(250, 250, 250, 255, 5), true);
  assert.equal(isNearWhite(230, 230, 230, 255, 5), false);
  assert.equal(isNearWhite(0, 0, 0, 0, 5), true);
});

test("trims solid white outer borders without changing content pixels", () => {
  const input = imageData(10, 10, (x, y) => x < 2 || x > 7 || y < 1 || y > 8 ? [255, 255, 255] : [20, 80, 120]);
  assert.deepEqual(
    trimWhiteEdges(input, { x: 0, y: 0, width: 10, height: 10 }, 10),
    { x: 2, y: 1, width: 6, height: 8 }
  );
});

test("finds off-center white dividers and trims each tile", () => {
  const input = imageData(21, 20, (x, y) => {
    if (x === 8 || x === 9 || y === 10) return [255, 255, 255];
    return x < 8 ? [180, 20, 20] : [20, 50, 180];
  });
  const result = calculateGrid(input, 2, 2, { trim: true, tolerance: 10, separatorPadding: 0 });
  assert.deepEqual(result.xCuts, [0, 9, 21]);
  assert.deepEqual(result.yCuts, [0, 10, 20]);
  assert.deepEqual(result.xBands[0], { center: 9, start: 8, end: 9, found: true });
  assert.equal(result.tiles.length, 4);
  assert.deepEqual(result.tiles[0], { x: 0, y: 0, width: 8, height: 10 });
  assert.deepEqual(result.tiles[1], { x: 10, y: 0, width: 11, height: 10 });
});

test("removes inner wall separators when there is no white outer border", () => {
  const input = imageData(24, 24, (x, y) => {
    const innerWall = (x >= 10 && x <= 12) || (y >= 11 && y <= 13);
    // Simulate a logo or blemish crossing a separator so it is not 100% white.
    const dirtyWallPixel = innerWall && ((x === 11 && y < 4) || (y === 12 && x > 19));
    if (innerWall && !dirtyWallPixel) return [246, 244, 241];
    return x < 10 ? [40, 90, 130] : [170, 70, 45];
  });
  const result = calculateGrid(input, 2, 2, { trim: true, tolerance: 12, separatorPadding: 0 });

  assert.deepEqual(result.xBands[0], { center: 11, start: 10, end: 12, found: true });
  assert.deepEqual(result.yBands[0], { center: 12, start: 11, end: 13, found: true });
  assert.deepEqual(result.tiles, [
    { x: 0, y: 0, width: 10, height: 11 },
    { x: 13, y: 0, width: 11, height: 11 },
    { x: 0, y: 14, width: 10, height: 10 },
    { x: 13, y: 14, width: 11, height: 10 }
  ]);
});

test("adds a safety crop beside detected separators to remove white fringe", () => {
  const input = imageData(22, 10, (x) => x >= 9 && x <= 11 ? [255, 255, 255] : [80, 100, 120]);
  const result = calculateGrid(input, 1, 2, { trim: true, tolerance: 12, separatorPadding: 2 });
  assert.deepEqual(result.tiles, [
    { x: 0, y: 0, width: 7, height: 10 },
    { x: 14, y: 0, width: 8, height: 10 }
  ]);
});

test("keeps exact equal divisions when border trimming is off", () => {
  const input = imageData(101, 99, () => [10, 20, 30]);
  const result = calculateGrid(input, 3, 2, { trim: false });
  assert.deepEqual(result.xCuts, [0, 51, 101]);
  assert.deepEqual(result.yCuts, [0, 33, 66, 99]);
});
