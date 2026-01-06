import React, { useRef, useEffect, useState } from 'react';
import './ShapePiece.css';

export default function ShapePiece({ shape, disabled, onDragStart, onDragEnd, isDragging, position, offset }) {
  const computeSizes = () => {
    if (typeof window === 'undefined') {
      return { shelfCellSize: 32, shelfGap: 2, dragCellSize: 38, dragGap: 1 };
    }

    const boardCell = Math.min(42, Math.max(30, (window.innerWidth - 64) / 9));
    const shelfCellSize = Math.max(24, Math.round(boardCell * 0.8));
    const dragCellSize = Math.max(28, Math.round(boardCell * 0.9));

    return { shelfCellSize, shelfGap: 4, dragCellSize, dragGap: 3 };
  };

  const [sizes, setSizes] = useState(computeSizes);

  useEffect(() => {
    const handleResize = () => {
      setSizes(prev => {
        const target = computeSizes();
        return prev.shelfCellSize === target.shelfCellSize &&
          prev.dragCellSize === target.dragCellSize &&
          prev.shelfGap === target.shelfGap &&
          prev.dragGap === target.dragGap
          ? prev
          : target;
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { shelfCellSize, shelfGap, dragCellSize, dragGap } = sizes;
  const cellSize = isDragging ? dragCellSize : shelfCellSize;
  const gap = isDragging ? dragGap : shelfGap;
  const pieceRef = useRef(null);

  useEffect(() => {
    if (!pieceRef.current) return;

    const handlePointerDown = (e) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = pieceRef.current.getBoundingClientRect();
      const offsetX = rect.width / 2;
      const offsetY = rect.height / 2;
      if (onDragStart) {
        onDragStart(shape, { x: offsetX, y: offsetY });
      }
    };

    const element = pieceRef.current;
    element.addEventListener('pointerdown', handlePointerDown);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [shape, disabled, onDragStart]);

  const maxRow = Math.max(...shape.cells.map(c => c[0]));
  const maxCol = Math.max(...shape.cells.map(c => c[1]));
  const width = (maxCol + 1) * (cellSize + gap) - gap;
  const height = (maxRow + 1) * (cellSize + gap) - gap;

  const style = isDragging && position && position.x !== null && position.y !== null
    ? {
        position: 'fixed',
        left: position.x - (offset?.x ?? 0),
        top: position.y - (offset?.y ?? 0),
        transform: 'scale(1.05)',
        pointerEvents: 'none',
        zIndex: 1000,
      }
    : {};

  return (
    <div
      ref={pieceRef}
      className={`shape-piece ${disabled ? 'disabled' : ''} ${isDragging ? 'dragging' : ''}`}
      style={style}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {shape.cells.map(([row, col], index) => {
          const x = col * (cellSize + gap);
          const y = row * (cellSize + gap);
          
          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              className="shape-cell"
              rx="3"
            />
          );
        })}
      </svg>
    </div>
  );
}
