import React, { useState, useEffect, useMemo, useRef } from 'react';
import Board from './Board';
import ComboCinematic from './ComboCinematic';
import { createEmptyBoard } from '../logic/board';
import './ReplayViewer.css';

const baseBoard = createEmptyBoard();

export default function ReplayViewer({ moves, onClose }) {
  const hasMoves = moves.length > 0;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [comboEffect, setComboEffect] = useState(null);
  const [boardWidth, setBoardWidth] = useState(0);
  const comboTimeoutRef = useRef(null);
  const boardRef = useRef(null);

  const currentMove = useMemo(() => moves[index] ?? null, [moves, index]);
  const boardState = currentMove?.board ?? baseBoard;
  const highlightCells = currentMove?.placedCells ?? [];

  useEffect(() => {
    setIndex(0);
    setPlaying(true);
  }, [hasMoves]);

  useEffect(() => () => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!playing || !hasMoves) {
      return undefined;
    }
    if (index >= moves.length - 1) {
      setPlaying(false);
      return undefined;
    }

    const timeout = setTimeout(() => {
      setIndex((prev) => {
        if (prev >= moves.length - 1) {
          return prev;
        }
        return prev + 1;
      });
    }, 1100 / speed);

    return () => clearTimeout(timeout);
  }, [playing, speed, moves.length, index, hasMoves]);

  useEffect(() => {
    if (!boardRef.current) {
      return undefined;
    }

    const updateWidth = () => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (rect) {
        setBoardWidth(rect.width);
      }
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
      }
      return undefined;
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(boardRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!currentMove?.comboTier || !boardRef.current) {
      setComboEffect(null);
      return undefined;
    }

    const width = boardWidth || boardRef.current.getBoundingClientRect().width || 0;
    const fallbackSize = width ? width * 0.6 : 260;
    const legacyBursts = currentMove.comboPosition
      ? [{ position: currentMove.comboPosition, sizeRatio: currentMove.comboSizeRatio ?? 0.6 }]
      : [];
    const sourceBursts = currentMove.comboBursts ?? legacyBursts;
    const bursts = sourceBursts.map((burst) => ({
      position: burst.position,
      sizePx: width && burst.sizeRatio ? width * burst.sizeRatio : fallbackSize,
    }));

    setComboEffect({
      tier: currentMove.comboTier,
      multiplier: currentMove.multiplier,
      bursts,
    });
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
    comboTimeoutRef.current = setTimeout(() => setComboEffect(null), 1600);

    return undefined;
  }, [currentMove, boardWidth]);

  const handlePrev = () => {
    setIndex((prev) => Math.max(0, prev - 1));
    setPlaying(false);
  };

  const handleNext = () => {
    setIndex((prev) => Math.min(moves.length - 1, prev + 1));
    if (index >= moves.length - 1) {
      setPlaying(false);
    }
  };

  const handleClose = () => {
    setPlaying(false);
    onClose();
  };

  return (
    <div className="replay-overlay" role="dialog" aria-modal="true" aria-label="Replay viewer">
      <div className="replay-panel">
        <div className="replay-header">
          <div>
            <p className="replay-subtitle">Spectator Mode</p>
            <h3>Game Replay</h3>
          </div>
          <button className="replay-close" onClick={handleClose} aria-label="Close replay">
            X
          </button>
        </div>

        {!hasMoves ? (
          <div className="replay-empty">
            <p>No moves were recorded this run.</p>
            <button onClick={handleClose}>Close</button>
          </div>
        ) : (
          <>
            <div className="replay-board">
              <Board board={boardState} highlightCells={highlightCells} showBoxLines boardRef={boardRef} />
              <ComboCinematic combo={comboEffect} />
            </div>

            <div className="replay-meta">
              <div>
                <span className="replay-meta-label">Move</span>
                <span className="replay-meta-value">{index + 1} / {moves.length}</span>
              </div>
              <div>
                <span className="replay-meta-label">Points</span>
                <span className="replay-meta-value">{currentMove?.points ?? 0}</span>
              </div>
            </div>

            <div className="replay-speed">
              <label htmlFor="replay-speed">Speed {speed.toFixed(1)}x</label>
              <input
                id="replay-speed"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              />
            </div>

            {currentMove?.note && (
              <p className="replay-note">{currentMove.note}</p>
            )}

            <div className="replay-controls">
              <button onClick={handlePrev} disabled={index === 0}>&lt;</button>
              <button onClick={() => setPlaying((prev) => !prev)}>
                {playing ? 'Pause' : 'Play'}
              </button>
              <button onClick={handleNext} disabled={index >= moves.length - 1}>&gt;</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
