import React from 'react';
import ShapePiece from './ShapePiece';
import './ShapeSelector.css';

export default function ShapeSelector({ shapes, onDragStart, dragState, spawnBatch }) {
  return (
    <div className="shape-selector">
      {shapes.map((shape) => {
        const isDragging = dragState?.shape?.id === shape.id;
        const position = isDragging ? dragState.position : null;
        const isNew = shape.spawnBatch === spawnBatch;
        
        return (
          <div key={shape.id} className={`shape-container ${isNew ? 'new-piece' : ''}`}>
            <ShapePiece
              shape={shape}
              disabled={shape.disabled}
              onDragStart={onDragStart}
              isDragging={isDragging}
              position={position}
              offset={dragState?.offset}
            />
          </div>
        );
      })}
    </div>
  );
}
