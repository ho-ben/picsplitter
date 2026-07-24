export function isNearWhite(r, g, b, a = 255, tolerance = 12) {
  if (a < 16) return true;
  const floor = 255 - Math.round((tolerance / 100) * 255);
  return r >= floor && g >= floor && b >= floor;
}

function rowWhiteRatio(data, width, y, xStart, xEnd, tolerance) {
  let white = 0;
  const span = Math.max(1, xEnd - xStart);
  for (let x = xStart; x < xEnd; x += 1) {
    const i = (y * width + x) * 4;
    if (isNearWhite(data[i], data[i + 1], data[i + 2], data[i + 3], tolerance)) white += 1;
  }
  return white / span;
}

function columnWhiteRatio(data, width, x, yStart, yEnd, tolerance) {
  let white = 0;
  const span = Math.max(1, yEnd - yStart);
  for (let y = yStart; y < yEnd; y += 1) {
    const i = (y * width + x) * 4;
    if (isNearWhite(data[i], data[i + 1], data[i + 2], data[i + 3], tolerance)) white += 1;
  }
  return white / span;
}

export function trimWhiteEdges(imageData, rect, tolerance = 12, threshold = 0.985) {
  const { data, width } = imageData;
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;

  while (top < bottom - 1 && rowWhiteRatio(data, width, top, left, right, tolerance) >= threshold) top += 1;
  while (bottom > top + 1 && rowWhiteRatio(data, width, bottom - 1, left, right, tolerance) >= threshold) bottom -= 1;
  while (left < right - 1 && columnWhiteRatio(data, width, left, top, bottom, tolerance) >= threshold) left += 1;
  while (right > left + 1 && columnWhiteRatio(data, width, right - 1, top, bottom, tolerance) >= threshold) right -= 1;

  return { x: left, y: top, width: right - left, height: bottom - top };
}

function whiteScoreForColumn(imageData, x, tolerance) {
  return columnWhiteRatio(imageData.data, imageData.width, x, 0, imageData.height, tolerance);
}

function whiteScoreForRow(imageData, y, tolerance) {
  return rowWhiteRatio(imageData.data, imageData.width, y, 0, imageData.width, tolerance);
}

function findDivider(imageData, expected, axis, tolerance, searchRadius) {
  const limit = axis === "x" ? imageData.width : imageData.height;
  const start = Math.max(1, Math.round(expected - searchRadius));
  const end = Math.min(limit - 2, Math.round(expected + searchRadius));
  let best = Math.round(expected);
  let bestScore = 0;

  for (let p = start; p <= end; p += 1) {
    const score = axis === "x"
      ? whiteScoreForColumn(imageData, p, tolerance)
      : whiteScoreForRow(imageData, p, tolerance);
    const centerBias = 1 - (Math.abs(p - expected) / Math.max(1, searchRadius)) * 0.08;
    if (score * centerBias > bestScore) {
      bestScore = score * centerBias;
      best = p;
    }
  }

  if (bestScore < 0.72) return Math.round(expected);

  let low = best;
  let high = best;
  const scoreAt = (p) => axis === "x"
    ? whiteScoreForColumn(imageData, p, tolerance)
    : whiteScoreForRow(imageData, p, tolerance);
  while (low > start && scoreAt(low - 1) > 0.72) low -= 1;
  while (high < end && scoreAt(high + 1) > 0.72) high += 1;
  return Math.round((low + high) / 2);
}

export function calculateGrid(imageData, rows = 2, columns = 2, options = {}) {
  const { trim = true, tolerance = 12 } = options;
  const width = imageData.width;
  const height = imageData.height;
  const searchX = Math.min(width / columns * 0.16, 80);
  const searchY = Math.min(height / rows * 0.16, 80);
  const xCuts = [0];
  const yCuts = [0];

  for (let c = 1; c < columns; c += 1) {
    const expected = width * c / columns;
    xCuts.push(trim ? findDivider(imageData, expected, "x", tolerance, searchX) : Math.round(expected));
  }
  for (let r = 1; r < rows; r += 1) {
    const expected = height * r / rows;
    yCuts.push(trim ? findDivider(imageData, expected, "y", tolerance, searchY) : Math.round(expected));
  }
  xCuts.push(width);
  yCuts.push(height);

  const tiles = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      const rect = {
        x: xCuts[c],
        y: yCuts[r],
        width: xCuts[c + 1] - xCuts[c],
        height: yCuts[r + 1] - yCuts[r]
      };
      tiles.push(trim ? trimWhiteEdges(imageData, rect, tolerance) : rect);
    }
  }
  return { tiles, xCuts, yCuts };
}
