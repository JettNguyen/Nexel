import React, { useState, useEffect, useRef } from 'react';

import Board from '../components/Board';
import ComboCinematic from '../components/ComboCinematic';
import ScorePopup from '../components/ScorePopup';

import { clearCompletedAreas, createEmptyBoard, findCompletedAreas, hasAnyValidPlacement, isBoardEmpty, placeShape } from '../logic/board';
import { getRandomShapes } from '../logic/shapes';
import { calculateScore } from '../logic/scoring';

import { STRATEGIES } from './strategies';

import { computeComboVisuals } from '../utils/combo';
import { playSound } from '../utils/sound';
import { GAME, SOLVER } from '../utils/constants.js';

import './Solver.css';

export default function Solver() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [shapes, setShapes] = useState(() => getRandomShapes(SOLVER.SHAPES_PER_BATCH));
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [strategy, setStrategy] = useState('hybrid');
  const [moveCount, setMoveCount] = useState(0);
  const [highlightCells, setHighlightCells] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [solverWon, setSolverWon] = useState(false);
  const [dragAnimation, setDragAnimation] = useState(null);
  const [scorePopups, setScorePopups] = useState([]);
  const [showNoMovesModal, setShowNoMovesModal] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [comboEffect, setComboEffect] = useState(null);

  const intervalRef = useRef(null);
  const boardRef = useRef(null);
  const shapeRefs = useRef({});
  const strategySelectRef = useRef(null);
  const comboTimeoutRef = useRef(null);
  const moveTimeoutRef = useRef(null);

  const renderShapeSvg = (shape, { boardScale = false, cellSize: overrideCellSize } = {}) => {
    const cellSize = boardScale ? (overrideCellSize || 42) : 16;
    const cellGap = boardScale ? Math.max(1, Math.round(cellSize / 40)) : 4;
    const step = cellSize + cellGap;
    const maxRow = Math.max(...shape.cells.map(c => c[0]));
    const maxCol = Math.max(...shape.cells.map(c => c[1]));
    const baseWidth = (maxCol + 1) * step;
    const baseHeight = (maxRow + 1) * step;

    if (boardScale) {
      return (
        <svg width={baseWidth} height={baseHeight} viewBox={`0 0 ${baseWidth} ${baseHeight}`}>
          {shape.cells.map(([row, col], index) => {
            const x = col * step;
            const y = row * step;
            return (
              <rect
                key={index}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill="var(--accent)"
                rx="3"
              />
            );
          })}
        </svg>
      );
    }

    const target = 72;
    const scale = Math.min(1, target / Math.max(baseWidth, baseHeight));
    const offsetX = (80 - baseWidth * scale) / 2;
    const offsetY = (80 - baseHeight * scale) / 2;

    return (
      <svg width="80" height="80" viewBox="0 0 80 80">
        <g transform={`translate(${offsetX} ${offsetY}) scale(${scale})`}>
          {shape.cells.map(([row, col], index) => {
            const x = col * step;
            const y = row * step;
            return (
              <rect
                key={index}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill="var(--accent)"
                rx="2"
              />
            );
          })}
        </g>
      </svg>
    );
  };

  const speedDelay = SOLVER.BASE_DELAY / speedMultiplier;
  const animationDuration = Math.max(SOLVER.MIN_ANIMATION_DURATION, speedDelay * 0.7);

  const boardCellSize = boardRef.current ? boardRef.current.getBoundingClientRect().width / 9 : 42;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (strategySelectRef.current && !strategySelectRef.current.contains(e.target)) {
        setStrategyOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isPlaying || gameOver) {
      return undefined;
    }

    intervalRef.current = setTimeout(() => {
      executeNextMove();
    }, speedDelay);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, speedDelay, board, shapes, strategy, gameOver]);

  useEffect(() => () => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
    }
  }, []);

  const triggerComboEffect = (areaCount, multiplier, visuals = null) => {
    const tier = areaCount >= 4 ? 'ultra' : areaCount === 3 ? 'mega' : 'double';
    setComboEffect({
      tier,
      multiplier,
      bursts: visuals?.bursts ?? [],
    });
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
    comboTimeoutRef.current = setTimeout(() => setComboEffect(null), GAME.COMBO_FADE_DURATION);
  };

  // commit a chosen move to the board, resolving clears and scoring
  const applyMove = (shape, row, col, boardRect) => {
    const newBoard = placeShape(board, shape, row, col);
    const completed = findCompletedAreas(newBoard);
    const areaCount = completed.rows.length + completed.cols.length + completed.boxes.length;
    const hasCompletions = areaCount > 0;

    let resultingBoard = newBoard;
    let scoreMultiplier = 1;

    if (hasCompletions) {
      const { board: clearedBoard, clearedCount } = clearCompletedAreas(newBoard, completed);
      const points = calculateScore(clearedCount, completed);
      scoreMultiplier = areaCount >= 2 ? 1 + (areaCount - 1) * 0.5 : 1;
      resultingBoard = clearedBoard;
      setBoard(clearedBoard);
      setScore(prev => prev + points);

      if (boardRect) {
        const cellSize = boardRect.width / 9;
        const popupX = boardRect.left + col * cellSize + cellSize / 2;
        const popupY = boardRect.top + row * cellSize + cellSize / 2;
        addScorePopup(points, popupX, popupY);

        if (areaCount >= 2) {
          const comboVisual = computeComboVisuals(boardRect, completed, {
            fallbackPoint: { x: popupX, y: popupY },
          });
          triggerComboEffect(areaCount, scoreMultiplier, comboVisual);
        }
      }
    } else {
      setBoard(newBoard);
    }

    if (soundEnabled) {
      playSound(hasCompletions ? 'score' : 'place', { multiplier: scoreMultiplier });
    }

    setHighlightCells([]);

    if (isBoardEmpty(resultingBoard)) {
      setSolverWon(true);
      setGameOver(true);
      setIsPlaying(false);
      return;
    }

    setShapes(prev => {
      const filtered = prev.filter(s => s.id !== shape.id);
      return filtered.length === 0 ? getRandomShapes(SOLVER.SHAPES_PER_BATCH) : filtered;
    });
    setMoveCount(prev => prev + 1);
  };

  const executeNextMove = () => {
    // a piece is still in flight: let it land before choosing again
    if (moveTimeoutRef.current) return;

    if (!hasAnyValidPlacement(board, shapes)) {
      setGameOver(true);
      setIsPlaying(false);
      setShowNoMovesModal(true);
      return;
    }

    const strategyFn = STRATEGIES[strategy].fn;
    const move = strategyFn(board, shapes);

    if (!move) {
      setGameOver(true);
      setIsPlaying(false);
      setShowNoMovesModal(true);
      return;
    }

    const { shape, row, col } = move;
    const shapeElement = shapeRefs.current[shape.id];
    const boardElement = boardRef.current;

    if (!boardElement || !shapeElement) {
      applyMove(shape, row, col, boardElement?.getBoundingClientRect() ?? null);
      return;
    }

    const shapeRect = shapeElement.getBoundingClientRect();
    const boardRect = boardElement.getBoundingClientRect();
    const cellSize = boardRect.width / 9;

    setDragAnimation({
      shape,
      startX: shapeRect.left,
      startY: shapeRect.top,
      endX: boardRect.left + col * cellSize,
      endY: boardRect.top + row * cellSize,
    });
    setHighlightCells(shape.cells.map(([dr, dc]) => [row + dr, col + dc]));

    moveTimeoutRef.current = setTimeout(() => {
      moveTimeoutRef.current = null;
      setDragAnimation(null);
      applyMove(shape, row, col, boardRect);
    }, animationDuration);
  };

  const handleReset = () => {
    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
      moveTimeoutRef.current = null;
    }
    setDragAnimation(null);
    setBoard(createEmptyBoard());
    setShapes(getRandomShapes(SOLVER.SHAPES_PER_BATCH));
    setScore(0);
    setMoveCount(0);
    setGameOver(false);
    setSolverWon(false);
    setIsPlaying(false);
    setHighlightCells([]);
    setScorePopups([]);
    setShowNoMovesModal(false);
    setComboEffect(null);
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleStep = () => {
    if (!gameOver && !moveTimeoutRef.current) {
      executeNextMove();
    }
  };

  const addScorePopup = (points, x, y) => {
    const id = Date.now() + Math.random();
    setScorePopups(prev => [...prev, { id, score: points, position: { x, y } }]);

    setTimeout(() => {
      setScorePopups(prev => prev.filter(p => p.id !== id));
    }, GAME.SCORE_POPUP_DURATION);
  };

  return (
    <div className="solver">
      <div className="solver-header">
        <div className="solver-title">
          <div className="solver-title-row">
            <img src="./nexel-icon.svg" alt="" className="logo-icon" aria-hidden="true" />
            <h1>Nexel</h1>
          </div>
        </div>
        <div className="solver-subtitle">Solver</div>
        <div className="solver-stats">
          <div className="stat stat-score">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat stat-moves">
            <span className="stat-label">Moves</span>
            <span className="stat-value">{moveCount}</span>
          </div>
        </div>
      </div>

      <div className="solver-board" ref={boardRef}>
        <Board board={board} highlightCells={highlightCells} />
        <ComboCinematic combo={comboEffect} />
        {scorePopups.map(popup => (
          <ScorePopup
            key={popup.id}
            id={popup.id}
            score={popup.score}
            position={popup.position}
          />
        ))}
      </div>

      <div className="solver-shapes">
        {shapes.map((shape, idx) => (
          <div 
            key={shape.id} 
            className="solver-shape"
            style={{
              opacity: dragAnimation?.shape.id === shape.id ? 0.3 : 1,
              transition: 'opacity 0.2s ease'
            }}
          >
            <div 
              className="shape-preview"
              ref={el => {
                if (el) {
                  shapeRefs.current[shape.id] = el;
                } else {
                  delete shapeRefs.current[shape.id];
                }
              }}
            >
              {renderShapeSvg(shape)}
            </div>
          </div>
        ))}
      </div>

      {dragAnimation && (
        <div 
          className="solver-drag-ghost"
          style={{
            position: 'fixed',
            left: dragAnimation.startX,
            top: dragAnimation.startY,
            pointerEvents: 'none',
            zIndex: 1000,
            animation: `solverdrag ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
            '--end-x': `${dragAnimation.endX - dragAnimation.startX}px`,
            '--end-y': `${dragAnimation.endY - dragAnimation.startY}px`,
          }}
        >
          {renderShapeSvg(dragAnimation.shape, { boardScale: true, cellSize: boardCellSize })}
        </div>
      )}

      <div className="solver-controls">
        <div className="control-group">
          <div className="control-header">
            <label>Strategy</label>
            <button 
              type="button"
              className="sound-toggle"
              onClick={() => setSoundEnabled(prev => !prev)}
              aria-label="Toggle solver sound"
            >
              {soundEnabled ? (
                <svg className="sound-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 9v6h3.5L13 19V5L7.5 9H4z" />
                  <path d="M15.5 8.5a4.5 4.5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M17.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="sound-icon mute-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 9v6h3.5L13 19V5L7.5 9H4z" />
                  <path className="mute-line" d="M16.5 8.5 9.5 15.5" fill="none" strokeWidth="2" />
                  <path className="mute-line" d="M9.5 8.5 16.5 15.5" fill="none" strokeWidth="2" />
                </svg>
              )}
            </button>
          </div>
          <div
            className={`custom-select ${strategyOpen ? 'open' : ''}`}
            ref={strategySelectRef}
          >
            <button
              type="button"
              className="custom-select-toggle"
              onClick={() => setStrategyOpen(prev => !prev)}
              aria-haspopup="listbox"
              aria-expanded={strategyOpen}
            >
              <span>{STRATEGIES[strategy]?.name ?? 'Strategy'}</span>
              <span className="select-arrow" aria-hidden="true" />
            </button>
            {strategyOpen && (
              <div className="custom-select-menu" role="listbox">
                {Object.entries(STRATEGIES).map(([key, { name, description }]) => (
                  <button
                    key={key}
                    role="option"
                    aria-selected={key === strategy}
                    className={`custom-select-option ${key === strategy ? 'selected' : ''}`}
                    onClick={() => {
                      setStrategy(key);
                      setStrategyOpen(false);
                    }}
                  >
                    <span className="custom-select-option-name">{name}</span>
                    <span className="custom-select-option-description">{description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="strategy-description">{STRATEGIES[strategy]?.description}</p>
        </div>

        <div className="control-group">
          <label>Speed: {speedMultiplier.toFixed(1)}x</label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={speedMultiplier}
            onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
          />
        </div>

        <div className="control-buttons">
          <button onClick={() => setIsPlaying(!isPlaying)} disabled={gameOver}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button onClick={handleStep} disabled={isPlaying || gameOver}>
            Step
          </button>
          <button onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>

      {showNoMovesModal && !solverWon && (
        <div className="solver-modal-overlay">
          <div className="solver-modal" role="dialog" aria-modal="true" aria-labelledby="solver-modal-title">
            <h3 id="solver-modal-title">No valid moves</h3>
            <p className="solver-modal-body">You can reset the board to keep exploring, or close this to inspect the final state.</p>
            <div className="solver-modal-actions">
              <button className="solver-modal-secondary" onClick={() => setShowNoMovesModal(false)}>Close</button>
              <button className="solver-modal-primary" onClick={handleReset}>Reset board</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
