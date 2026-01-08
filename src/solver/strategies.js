import { getAllValidPlacements, placeShape, findCompletedAreas, clearCompletedAreas, BOARD_SIZE, isBoardEmpty } from '../logic/board';
import { calculateScore } from '../logic/scoring';

export function greedyStrategy(board, shapes) {
  let bestMove = null;
  let bestScore = -1;

  for (const shape of shapes) {
    const placements = getAllValidPlacements(board, shape);
    
    for (const { row, col } of placements) {
      const testBoard = placeShape(board, shape, row, col);
      const completed = findCompletedAreas(testBoard);
      const { clearedCount } = clearCompletedAreas(testBoard, completed);
      const score = calculateScore(clearedCount, completed);
      
      // greedy: always go for the highest immediate score
      if (score > bestScore) {
        bestScore = score;
        bestMove = { shape, row, col, score };
      }
    }
  }

  // if no scoring moves, pick any valid placement
  if (!bestMove) {
    for (const shape of shapes) {
      const placements = getAllValidPlacements(board, shape);
      if (placements.length > 0) {
        const placement = placements[0];
        return { shape, row: placement.row, col: placement.col, score: 0 };
      }
    }
  }

  return bestMove;
}

export function survivalStrategy(board, shapes) {
  let bestMove = null;
  let bestOpenness = -1;

  for (const shape of shapes) {
    const placements = getAllValidPlacements(board, shape);
    
    for (const { row, col } of placements) {
      const testBoard = placeShape(board, shape, row, col);
      const completed = findCompletedAreas(testBoard);
      const { board: clearedBoard } = clearCompletedAreas(testBoard, completed);
      
      const openness = calculateBoardOpenness(clearedBoard);
      
      if (openness > bestOpenness) {
        bestOpenness = openness;
        bestMove = { shape, row, col };
      }
    }
  }

  return bestMove;
}

export function hybridStrategy(board, shapes) {
  let bestMove = null;
  let bestValue = -Infinity;

  for (const shape of shapes) {
    const placements = getAllValidPlacements(board, shape);
    
    for (const { row, col } of placements) {
      const testBoard = placeShape(board, shape, row, col);
      const completed = findCompletedAreas(testBoard);
      const { board: clearedBoard, clearedCount } = clearCompletedAreas(testBoard, completed);
      
      const score = calculateScore(clearedCount, completed);
      const openness = calculateBoardOpenness(clearedBoard);
      
      const value = score * 0.6 + openness * 0.4;
      
      if (value > bestValue) {
        bestValue = value;
        bestMove = { shape, row, col, score };
      }
    }
  }

  return bestMove;
}

export function winStrategy(board, shapes) {
  let bestMove = null;
  let bestValue = -Infinity;

  for (const shape of shapes) {
    const placements = getAllValidPlacements(board, shape);
    for (const { row, col } of placements) {
      const testBoard = placeShape(board, shape, row, col);
      const completed = findCompletedAreas(testBoard);
      const { board: clearedBoard, clearedCount } = clearCompletedAreas(testBoard, completed);

      const empty = isBoardEmpty(clearedBoard);
      const filledAfter = countFilled(clearedBoard);
      const score = calculateScore(clearedCount, completed);

      const value = (empty ? 1_000_000 : 0) + score * 5 + clearedCount * 50 - filledAfter;

      if (value > bestValue) {
        bestValue = value;
        bestMove = { shape, row, col, score };
      }
    }
  }

  if (bestMove) return bestMove;

  return greedyStrategy(board, shapes);
}

function countFilled(board) {
  let filled = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c]) filled++;
    }
  }
  return filled;
}

function calculateBoardOpenness(board) {
  let openness = 0;
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (!board[row][col]) {
        let adjacentEmpty = 0;
        
        const neighbors = [
          [row - 1, col], [row + 1, col],
          [row, col - 1], [row, col + 1],
        ];
        
        for (const [r, c] of neighbors) {
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && !board[r][c]) {
            adjacentEmpty++;
          }
        }
        
        openness += adjacentEmpty;
      }
    }
  }
  
  return openness;
}

export const STRATEGIES = {
  greedy: { name: 'Score+', fn: greedyStrategy },
  survival: { name: 'Life+', fn: survivalStrategy },
  hybrid: { name: 'Hybrid', fn: hybridStrategy },
  win: { name: 'Win', fn: winStrategy },
};
