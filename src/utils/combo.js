const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const buildRowCells = (row) => {
  const cells = [];
  for (let col = 0; col < 9; col += 1) {
    cells.push({ row, col });
  }
  return cells;
};

const buildColCells = (col) => {
  const cells = [];
  for (let row = 0; row < 9; row += 1) {
    cells.push({ row, col });
  }
  return cells;
};

const buildBoxCells = (boxRow, boxCol) => {
  const cells = [];
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      cells.push({ row: boxRow * 3 + r, col: boxCol * 3 + c });
    }
  }
  return cells;
};

const createFallbackBurst = (rect, fallbackPoint) => {
  const defaultBurst = {
    position: { xPercent: 50, yPercent: 50 },
    sizePx: 260,
    sizeRatio: 0.6,
  };

  if (!rect || !rect.width || !rect.height) {
    return defaultBurst;
  }

  const sizePx = rect.width * 0.6;
  const sizeRatio = rect.width ? sizePx / rect.width : defaultBurst.sizeRatio;

  if (fallbackPoint) {
    const xPercent = clamp(((fallbackPoint.x - rect.left) / rect.width) * 100, 0, 100);
    const yPercent = clamp(((fallbackPoint.y - rect.top) / rect.height) * 100, 0, 100);
    return {
      position: { xPercent, yPercent },
      sizePx,
      sizeRatio,
    };
  }

  return {
    position: { xPercent: 50, yPercent: 50 },
    sizePx,
    sizeRatio,
  };
};

const computeBurstFromCells = (rect, cells) => {
  if (!rect || !rect.width || !rect.height || !cells?.length) {
    return null;
  }

  const cellSize = rect.width / 9;
  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;

  cells.forEach(({ row, col }) => {
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
  });

  if (!Number.isFinite(minRow)) {
    return null;
  }

  const centerRow = (minRow + maxRow + 1) / 2;
  const centerCol = (minCol + maxCol + 1) / 2;
  const centerX = rect.left + centerCol * cellSize;
  const centerY = rect.top + centerRow * cellSize;
  const xPercent = clamp(((centerX - rect.left) / rect.width) * 100, 0, 100);
  const yPercent = clamp(((centerY - rect.top) / rect.height) * 100, 0, 100);

  const clearedWidth = (maxCol - minCol + 1) || 1;
  const clearedHeight = (maxRow - minRow + 1) || 1;
  const coverage = Math.max(clearedWidth, clearedHeight);
  const sizePx = clamp((coverage + 1.5) * cellSize, rect.width * 0.35, rect.width * 1.15);
  const sizeRatio = rect.width ? sizePx / rect.width : 0.6;

  return {
    position: { xPercent, yPercent },
    sizePx,
    sizeRatio,
  };
};

export const computeComboVisuals = (rect, completed = {}, options = {}) => {
  const fallbackBurst = createFallbackBurst(rect, options.fallbackPoint);
  const hasValidRect = Boolean(rect && rect.width && rect.height);

  if (!hasValidRect) {
    return { bursts: [fallbackBurst] };
  }

  const bursts = [];

  (completed.rows ?? []).forEach((row) => {
    const burst = computeBurstFromCells(rect, buildRowCells(row));
    if (burst) {
      bursts.push(burst);
    }
  });

  (completed.cols ?? []).forEach((col) => {
    const burst = computeBurstFromCells(rect, buildColCells(col));
    if (burst) {
      bursts.push(burst);
    }
  });

  (completed.boxes ?? []).forEach(({ row: boxRow, col: boxCol }) => {
    const burst = computeBurstFromCells(rect, buildBoxCells(boxRow, boxCol));
    if (burst) {
      bursts.push(burst);
    }
  });

  if (!bursts.length) {
    bursts.push(fallbackBurst);
  }

  return { bursts };
};
