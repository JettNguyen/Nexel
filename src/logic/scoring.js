export function calculateScore(clearedCount, areasCleared) {
  const baseScore = clearedCount * 10;
  
  const areaCount = areasCleared.rows.length + areasCleared.cols.length + areasCleared.boxes.length;
  
  let multiplier = 1;
  if (areaCount >= 2) {
    multiplier = 1 + (areaCount - 1) * 0.5;
  }
  
  return Math.floor(baseScore * multiplier);
}

export function getHighScore() {
  const stored = localStorage.getItem('nexel_high_score');
  return stored ? parseInt(stored, 10) : 0;
}

export function setHighScore(score) {
  const current = getHighScore();
  if (score > current) {
    localStorage.setItem('nexel_high_score', score.toString());
    return true;
  }
  return false;
}
