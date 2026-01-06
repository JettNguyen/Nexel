import React from 'react';
import './ScorePopup.css';

export default function ScorePopup({ score, position, id }) {
  return (
    <div
      className="score-popup"
      style={{
        left: position.x,
        top: position.y,
      }}
      key={id}
    >
      +{score}
    </div>
  );
}
