import React from 'react';
import './Board.css';

export default function Board({ board, highlightCells = [], highlightAreas = { rows: [], cols: [], boxes: [] }, onCellPointerMove, showBoxLines = true, boardRef }) {
  const handlePointerMove = (e, row, col) => {
    if (onCellPointerMove) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onCellPointerMove(row, col, x, y);
    }
  };

  const isHighlighted = (row, col) => highlightCells.some(([r, c]) => r === row && c === col);

  const isAreaHighlight = (row, col) => {
    const inRow = highlightAreas.rows?.includes(row);
    const inCol = highlightAreas.cols?.includes(col);
    const boxRow = Math.floor(row / 3);
    const boxCol = Math.floor(col / 3);
    const inBox = highlightAreas.boxes?.some(b => b.row === boxRow && b.col === boxCol);
    return inRow || inCol || inBox;
  };

  return (
    <div className="board" ref={boardRef}>
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row">
          {row.map((cell, colIndex) => {
            const boxRow = Math.floor(rowIndex / 3);
            const boxCol = Math.floor(colIndex / 3);
            const boxClass = showBoxLines ? `box-${boxRow}-${boxCol}` : '';
            
            return (
              <div
                key={colIndex}
                className={`board-cell ${cell ? 'filled' : ''} ${isHighlighted(rowIndex, colIndex) ? 'highlighted' : ''} ${isAreaHighlight(rowIndex, colIndex) ? 'will-clear' : ''} ${boxClass}`}
                onPointerMove={(e) => handlePointerMove(e, rowIndex, colIndex)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
