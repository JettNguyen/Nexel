import React, { useRef, useEffect, useState } from 'react';
import './ShapePiece.css';

export default function ShapePiece({ shape, disabled, onDragStart, onDragEnd, isDragging, position, offset }) {
  const computeSizes = () => {
    if (typeof window === 'undefined') {
      return { shelfCellSize: 18, shelfGap: 2, dragCellSize: 34, dragGap: 2 };
    }

    const isMobile = window.innerWidth <= 500;
    const boardCell = Math.min(38, Math.max(28, (window.innerWidth - 56) / 9));

    const shelfScale = isMobile ? 0.6 : 0.7;
    const dragScale = isMobile ? 0.95 : 0.9;

    const shelfCellSize = Math.max(isMobile ? 20 : 15, Math.round(boardCell * shelfScale));
    const dragCellSize = Math.max(isMobile ? 30 : 28, Math.round(boardCell * dragScale));

    return { shelfCellSize, shelfGap: isMobile ? 4 : 3, dragCellSize, dragGap: 2 };
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
      const isNarrow = window.innerWidth <= 640;
      const offsetX = rect.width / 2 + 5;
      const offsetY = isNarrow ? rect.height * 1.5 : rect.height / 2;
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

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const maxShelfDim = viewportWidth <= 500 ? 96 : 104; // fit comfortably inside padded container
  const targetDim = isDragging ? Infinity : maxShelfDim;
  const scale = Math.min(1, targetDim / Math.max(width, height));
  const renderWidth = scale < 1 ? width * scale : width;
  const renderHeight = scale < 1 ? height * scale : height;

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
      <svg
        width={renderWidth}
        height={renderHeight}
        viewBox={`0 0 ${width} ${height}`}
      >
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
