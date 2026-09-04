import { GAME } from '../utils/constants.js';

// Each shape is a list of [row, col] offsets from its top-left bounding corner.
export const SHAPES = [
  // singles and straight lines
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],

  // diagonals (2 and 3 long, both directions)
  [[0, 0], [1, 1]],
  [[0, 1], [1, 0]],
  [[0, 0], [1, 1], [2, 2]],
  [[0, 2], [1, 1], [2, 0]],

  // small corners (L-trominoes)
  [[0, 0], [0, 1], [1, 0]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 1], [1, 0], [1, 1]],

  // square
  [[0, 0], [0, 1], [1, 0], [1, 1]],

  // L-tetrominoes, horizontal
  [[0, 0], [0, 1], [0, 2], [1, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [1, 2]],
  [[0, 2], [1, 0], [1, 1], [1, 2]],

  // L-tetrominoes, vertical
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [1, 0], [2, 0]],
  [[0, 1], [1, 1], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],

  // S / Z
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 1], [0, 2], [1, 0], [1, 1]],

  // T
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 1], [1, 0], [1, 1], [1, 2]],

  // 2x3 block and its cut-outs
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2]],
  [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 1], [1, 2]],
  [[0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
];

export function getRandomShapes(count = GAME.SHAPES_PER_BATCH) {
  const shapes = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * SHAPES.length);
    shapes.push({
      id: Date.now() + Math.random(),
      cells: SHAPES[randomIndex],
    });
  }
  return shapes;
}

export function getShapeBounds(cells) {
  if (cells.length === 0) return { width: 0, height: 0 };
  
  const rows = cells.map(c => c[0]);
  const cols = cells.map(c => c[1]);
  
  return {
    width: Math.max(...cols) + 1,
    height: Math.max(...rows) + 1,
  };
}
