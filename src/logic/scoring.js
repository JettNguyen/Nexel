import { GAME, STORAGE_KEYS } from '../utils/constants.js';

export function calculateScore(clearedCount, areasCleared) {
  const baseScore = clearedCount * GAME.POINTS_PER_CELL;

  const areaCount = areasCleared.rows.length + areasCleared.cols.length + areasCleared.boxes.length;

  let multiplier = 1;
  if (areaCount >= 2) {
    multiplier = 1 + (areaCount - 1) * 0.5;
  }

  return Math.floor(baseScore * multiplier);
}

export function getHighScore() {
  const stored = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
  return stored ? parseInt(stored, 10) : 0;
}

export function setHighScore(score) {
  const current = getHighScore();
  if (score > current) {
    localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, score.toString());
    return true;
  }
  return false;
}
