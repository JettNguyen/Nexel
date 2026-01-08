import { BOARD } from '../utils/constants.js';

export const BOARD_SIZE = BOARD.SIZE;

export function createEmptyBoard() {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
}

export function canPlaceShape(board, shape, row, col) {
  for (const [dr, dc] of shape.cells) {
    const r = row + dr;
    const c = col + dc;
    
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
      return false;
    }
    
    if (board[r][c]) {
      return false;
    }
  }
  
  return true;
}

export function placeShape(board, shape, row, col) {
  const newBoard = board.map(r => [...r]);
  
  for (const [dr, dc] of shape.cells) {
    newBoard[row + dr][col + dc] = true;
  }
  
  return newBoard;
}

export function findCompletedAreas(board) {
  const completed = {
    rows: [],
    cols: [],
    boxes: [],
  };
  
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i].every(cell => cell)) {
      completed.rows.push(i);
    }
  }
  
  for (let col = 0; col < BOARD_SIZE; col++) {
    if (board.every(row => row[col])) {
      completed.cols.push(col);
    }
  }
  
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      let isFull = true;
      
      for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
        for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
          if (!board[r][c]) {
            isFull = false;
            break;
          }
        }
        if (!isFull) break;
      }
      
      if (isFull) {
        completed.boxes.push({ row: boxRow, col: boxCol });
      }
    }
  }
  
  return completed;
}

export function clearCompletedAreas(board, completed) {
  const newBoard = board.map(r => [...r]);
  const clearedCells = new Set();
  
  for (const row of completed.rows) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      newBoard[row][col] = false;
      clearedCells.add(`${row},${col}`);
    }
  }
  
  for (const col of completed.cols) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      newBoard[row][col] = false;
      clearedCells.add(`${row},${col}`);
    }
  }
  
  for (const { row: boxRow, col: boxCol } of completed.boxes) {
    for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
      for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
        newBoard[r][c] = false;
        clearedCells.add(`${r},${c}`);
      }
    }
  }
  
  return { board: newBoard, clearedCount: clearedCells.size };
}

export function hasAnyValidPlacement(board, shapes) {
  for (const shape of shapes) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (canPlaceShape(board, shape, row, col)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function getAllValidPlacements(board, shape) {
  const placements = [];
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (canPlaceShape(board, shape, row, col)) {
        placements.push({ row, col });
      }
    }
  }
  
  return placements;
}

export function isBoardEmpty(board) {
  return board.every(row => row.every(cell => !cell));
}
