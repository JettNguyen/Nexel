import { getAllValidPlacements, placeShape, findCompletedAreas, clearCompletedAreas, canPlaceShape, BOARD_SIZE, isBoardEmpty } from '../logic/board.js';
import { calculateScore } from '../logic/scoring.js';
import { SHAPES } from '../logic/shapes.js';

// ---------------------------------------------------------------------------
// shared helpers
// ---------------------------------------------------------------------------

// place a shape, resolve clears, and report what happened
function simulateMove(board, shape, row, col) {
  const placed = placeShape(board, shape, row, col);
  const completed = findCompletedAreas(placed);
  const { board: cleared, clearedCount } = clearCompletedAreas(placed, completed);
  const score = calculateScore(clearedCount, completed);
  return { board: cleared, completed, clearedCount, score };
}

// every legal (shape, row, col) for the given batch, with its simulated result
function enumerateMoves(board, shapes) {
  const moves = [];
  for (const shape of shapes) {
    for (const { row, col } of getAllValidPlacements(board, shape)) {
      moves.push({ shape, row, col, ...simulateMove(board, shape, row, col) });
    }
  }
  return moves;
}

export function countFilled(board) {
  let filled = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c]) filled++;
    }
  }
  return filled;
}

// sum over empty cells of their empty 4-neighbours
export function calculateBoardOpenness(board) {
  let openness = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col]) continue;
      if (row > 0 && !board[row - 1][col]) openness++;
      if (row < BOARD_SIZE - 1 && !board[row + 1][col]) openness++;
      if (col > 0 && !board[row][col - 1]) openness++;
      if (col < BOARD_SIZE - 1 && !board[row][col + 1]) openness++;
    }
  }
  return openness;
}

// empty cells that no neighbour can reach (only a 1x1 can ever fill them)
export function countHoles(board) {
  let holes = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col]) continue;
      const up = row === 0 || board[row - 1][col];
      const down = row === BOARD_SIZE - 1 || board[row + 1][col];
      const left = col === 0 || board[row][col - 1];
      const right = col === BOARD_SIZE - 1 || board[row][col + 1];
      if (up && down && left && right) holes++;
    }
  }
  return holes;
}

// size of the biggest 4-connected empty region
export function largestEmptyRegion(board) {
  const seen = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
  let largest = 0;
  const stack = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] || seen[row][col]) continue;
      let size = 0;
      seen[row][col] = true;
      stack.push(row, col);
      while (stack.length) {
        const c = stack.pop();
        const r = stack.pop();
        size++;
        if (r > 0 && !board[r - 1][c] && !seen[r - 1][c]) { seen[r - 1][c] = true; stack.push(r - 1, c); }
        if (r < BOARD_SIZE - 1 && !board[r + 1][c] && !seen[r + 1][c]) { seen[r + 1][c] = true; stack.push(r + 1, c); }
        if (c > 0 && !board[r][c - 1] && !seen[r][c - 1]) { seen[r][c - 1] = true; stack.push(r, c - 1); }
        if (c < BOARD_SIZE - 1 && !board[r][c + 1] && !seen[r][c + 1]) { seen[r][c + 1] = true; stack.push(r, c + 1); }
      }
      if (size > largest) largest = size;
    }
  }
  return largest;
}

// how many distinct placements exist for every shape in the library
function countMobility(board) {
  let total = 0;
  for (const cells of SHAPES) {
    const shape = { cells };
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (canPlaceShape(board, shape, row, col)) total++;
      }
    }
  }
  return total;
}

// static evaluation of a board: higher is healthier. openness carries most of
// the weight; a small bonus for one big empty region keeps space contiguous
export function evaluateBoard(board) {
  return calculateBoardOpenness(board) + largestEmptyRegion(board) * 0.3;
}

// one-ply value used to rank candidates before deeper search
function immediateValue(move) {
  return move.score / 10 + evaluateBoard(move.board);
}

function pickBest(moves, valueFn) {
  let best = null;
  let bestValue = -Infinity;
  for (const move of moves) {
    const value = valueFn(move);
    if (value > bestValue) {
      bestValue = value;
      best = move;
    }
  }
  return best;
}

function toResult(move) {
  if (!move) return null;
  return { shape: move.shape, row: move.row, col: move.col, score: move.score };
}

// ---------------------------------------------------------------------------
// strategies
// ---------------------------------------------------------------------------

// greedy: always go for the highest immediate score
export function greedyStrategy(board, shapes) {
  return toResult(pickBest(enumerateMoves(board, shapes), move => move.score));
}

// survival: keep as much breathing room as possible
export function survivalStrategy(board, shapes) {
  return toResult(pickBest(enumerateMoves(board, shapes), move => calculateBoardOpenness(move.board)));
}

// hybrid: weighted blend of score and openness
export function hybridStrategy(board, shapes) {
  return toResult(pickBest(enumerateMoves(board, shapes), move => (
    move.score * 0.6 + calculateBoardOpenness(move.board) * 0.4
  )));
}

// win: chase an empty board, otherwise clear as much as possible
export function winStrategy(board, shapes) {
  return toResult(pickBest(enumerateMoves(board, shapes), move => (
    (isBoardEmpty(move.board) ? 1_000_000 : 0)
    + move.score * 5
    + move.clearedCount * 50
    - countFilled(move.board)
  )));
}

// mobility: maximise how many pieces from the whole library could still be placed
export function mobilityStrategy(board, shapes) {
  return toResult(pickBest(enumerateMoves(board, shapes), move => (
    countMobility(move.board) + move.score / 10 - countHoles(move.board) * 20
  )));
}

// lookahead: search every ordering of the current batch, pruned to the
// most promising placements at each level, and score the resulting board
const LOOKAHEAD_BEAM = 8;
const LOOKAHEAD_DEAD_PENALTY = 500;

function searchBatch(board, remaining) {
  if (remaining.length === 0) {
    return { value: evaluateBoard(board), move: null };
  }

  const candidates = enumerateMoves(board, remaining);
  if (candidates.length === 0) {
    // stuck with pieces still in hand: this line loses the game
    return { value: evaluateBoard(board) - LOOKAHEAD_DEAD_PENALTY * remaining.length, move: null };
  }

  candidates.sort((a, b) => immediateValue(b) - immediateValue(a));
  const beam = candidates.slice(0, LOOKAHEAD_BEAM);

  let best = null;
  let bestValue = -Infinity;
  for (const candidate of beam) {
    const rest = remaining.filter(s => s.id !== candidate.shape.id);
    const child = searchBatch(candidate.board, rest);
    const value = candidate.score / 10 + child.value;
    if (value > bestValue) {
      bestValue = value;
      best = candidate;
    }
  }

  return { value: bestValue, move: best };
}

export function lookaheadStrategy(board, shapes) {
  return toResult(searchBatch(board, shapes).move);
}

// monte carlo: try the most promising moves, then play random futures
// after each one and keep the move whose futures last longest
const MC_CANDIDATES = 6;
const MC_ROLLOUTS = 6;
const MC_DEPTH = 12;

function randomShapeBatch(count = 3) {
  const batch = [];
  for (let i = 0; i < count; i++) {
    batch.push({ id: `mc-${i}-${Math.random()}`, cells: SHAPES[Math.floor(Math.random() * SHAPES.length)] });
  }
  return batch;
}

// quick playout policy: random piece, sample a few placements, keep the one
// that clears the most and leaves the board most open
const MC_SAMPLES = 24;

function rolloutMove(board, queue) {
  const order = [...queue].sort(() => Math.random() - 0.5);
  for (const shape of order) {
    const placements = getAllValidPlacements(board, shape);
    if (placements.length === 0) continue;
    let best = null;
    let bestValue = -Infinity;
    const samples = Math.min(MC_SAMPLES, placements.length);
    for (let i = 0; i < samples; i++) {
      const { row, col } = placements[Math.floor(Math.random() * placements.length)];
      const sim = simulateMove(board, shape, row, col);
      const value = sim.clearedCount * 10 + calculateBoardOpenness(sim.board) - countHoles(sim.board) * 8;
      if (value > bestValue) {
        bestValue = value;
        best = { shape, ...sim };
      }
    }
    return best;
  }
  return null;
}

function rollout(startBoard, startQueue, future) {
  let board = startBoard;
  let queue = startQueue;
  let score = 0;
  let refills = 0;
  for (let step = 0; step < MC_DEPTH; step++) {
    if (queue.length === 0) queue = future[refills++] ?? randomShapeBatch();
    const move = rolloutMove(board, queue);
    if (!move) return { steps: step, score, health: -LOOKAHEAD_DEAD_PENALTY };
    board = move.board;
    score += move.score;
    queue = queue.filter(s => s.id !== move.shape.id);
  }
  return { steps: MC_DEPTH, score, health: evaluateBoard(board) };
}

export function monteCarloStrategy(board, shapes) {
  const candidates = enumerateMoves(board, shapes);
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => immediateValue(b) - immediateValue(a));
  const shortlist = candidates.slice(0, MC_CANDIDATES);

  // every candidate faces the same random futures so they are compared fairly
  const batchesNeeded = Math.ceil(MC_DEPTH / 3) + 1;
  const futures = Array.from({ length: MC_ROLLOUTS }, () => (
    Array.from({ length: batchesNeeded }, () => randomShapeBatch())
  ));

  return toResult(pickBest(shortlist, candidate => {
    const rest = shapes.filter(s => s.id !== candidate.shape.id);
    let total = 0;
    for (let i = 0; i < MC_ROLLOUTS; i++) {
      const result = rollout(candidate.board, rest, futures[i]);
      total += result.steps * 100 + result.score / 10 + result.health;
    }
    return total / MC_ROLLOUTS + candidate.score;
  }));
}

// random: baseline that picks any legal placement
export function randomStrategy(board, shapes) {
  const candidates = enumerateMoves(board, shapes);
  if (candidates.length === 0) return null;
  return toResult(candidates[Math.floor(Math.random() * candidates.length)]);
}

export const STRATEGIES = {
  greedy: { name: 'Score+', fn: greedyStrategy, description: 'Takes whichever move scores the most points right now, ignoring what it leaves behind.' },
  survival: { name: 'Life+', fn: survivalStrategy, description: 'Ignores points and picks the move that leaves the most open, connected empty space.' },
  hybrid: { name: 'Hybrid', fn: hybridStrategy, description: 'Weighs immediate points against board openness, leaning slightly toward points.' },
  win: { name: 'Win', fn: winStrategy, description: 'Hunts for a completely empty board: clears as many cells as it can every move.' },
  lookahead: { name: 'Lookahead', fn: lookaheadStrategy, description: 'Tries every order the three pieces in hand could be placed and picks the sequence that ends best.' },
  montecarlo: { name: 'Monte Carlo', fn: monteCarloStrategy, description: 'Plays out random future pieces after each candidate move and keeps the one that survives longest.' },
  mobility: { name: 'Mobility', fn: mobilityStrategy, description: 'Counts how many pieces from the whole library could still fit afterwards and keeps that number high.' },
  random: { name: 'Random', fn: randomStrategy, description: 'Picks any legal placement. A baseline to compare the others against.' },
};
