import React from 'react';
import './ComboCinematic.css';

const LABELS = {
  double: 'Combo',
  mega: 'Mega Combo',
  ultra: 'Ultra Combo',
};

export default function ComboCinematic({ combo }) {
  if (!combo) {
    return null;
  }

  const { tier = 'double', multiplier = 1, bursts = [] } = combo;
  const label = LABELS[tier] ?? LABELS.double;
  const fallbackBurst = {
    position: { xPercent: 50, yPercent: 50 },
    sizePx: 260,
  };
  const ringBursts = bursts.length ? bursts : [fallbackBurst];

  return (
    <div className={`combo-cinematic combo-${tier}`}>
      <div className="combo-cinematic__label">
        <span>{label}</span>
        <strong>{multiplier.toFixed(1)}x</strong>
      </div>
      {ringBursts.map((burst, index) => {
        const style = {
          '--combo-x': `${burst.position?.xPercent ?? 50}%`,
          '--combo-y': `${burst.position?.yPercent ?? 50}%`,
          '--combo-size': `${burst.sizePx ?? 260}px`,
        };
        return (
          <div key={index} className="combo-cinematic__burst" style={style}>
            <div className="combo-cinematic__rings" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="combo-cinematic__flare" aria-hidden="true" />
          </div>
        );
      })}
    </div>
  );
}
