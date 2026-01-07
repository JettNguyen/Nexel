import React, { useState, useEffect, useRef } from 'react';
import Board from '../components/Board';
import ScorePopup from '../components/ScorePopup';
import ComboCinematic from '../components/ComboCinematic';
import { createEmptyBoard, placeShape, findCompletedAreas, clearCompletedAreas, hasAnyValidPlacement, isBoardEmpty } from '../logic/board';
import { getRandomShapes } from '../logic/shapes';
import { STRATEGIES } from './strategies';
import { computeComboVisuals } from '../utils/combo';
import './Solver.css';

export default function Solver() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [shapes, setShapes] = useState(() => getRandomShapes(3));
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
  const audioContextRef = useRef(null);
  const comboTimeoutRef = useRef(null);

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

  const baseDelay = 800; // make 1x significantly slower so playback feels deliberate
  const speedDelay = baseDelay / speedMultiplier;
  const animationDuration = Math.max(100, speedDelay * 0.7);

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
    comboTimeoutRef.current = setTimeout(() => setComboEffect(null), 1600);
  };

  const executeNextMove = () => {
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

    if (boardRef.current && shapeRefs.current[shape.id]) {
      const shapeElement = shapeRefs.current[shape.id];
      const boardElement = boardRef.current;
      
      const shapeRect = shapeElement.getBoundingClientRect();
      const boardRect = boardElement.getBoundingClientRect();
      
      const cellSize = boardRect.width / 9;
      const targetX = boardRect.left + col * cellSize;
      const targetY = boardRect.top + row * cellSize;
      
      setDragAnimation({
        shape,
        startX: shapeRect.left,
        startY: shapeRect.top,
        endX: targetX,
        endY: targetY,
      });
      
      const previewCells = shape.cells.map(([dr, dc]) => [row + dr, col + dc]);
      setHighlightCells(previewCells);

      const popupX = targetX + cellSize / 2;
      const popupY = targetY + cellSize / 2;

      setTimeout(() => {
        setDragAnimation(null);
        
        const newBoard = placeShape(board, shape, row, col);
        const completed = findCompletedAreas(newBoard);

        const hasCompletions = completed.rows.length > 0 || completed.cols.length > 0 || completed.boxes.length > 0;

        let resultingBoard = newBoard;
        let scoreMultiplier = 1;

        if (hasCompletions) {
          const { board: clearedBoard, clearedCount } = clearCompletedAreas(newBoard, completed);
          const points = clearedCount * 10;
          const areaCount = completed.rows.length + completed.cols.length + completed.boxes.length;
          scoreMultiplier = areaCount >= 2 ? 1 + (areaCount - 1) * 0.5 : 1;
          resultingBoard = clearedBoard;
          setBoard(clearedBoard);
          setScore(prev => prev + points);
          addScorePopup(points, popupX, popupY);

          if (areaCount >= 2) {
            const comboVisual = computeComboVisuals(boardRect, completed, {
              fallbackPoint: { x: popupX, y: popupY },
            });
            triggerComboEffect(areaCount, scoreMultiplier, comboVisual);
          }
        } else {
          setBoard(newBoard);
        }

        if (soundEnabled) {
          playSound(hasCompletions ? 'score' : 'place', { multiplier: scoreMultiplier });
        }

        if (isBoardEmpty(resultingBoard)) {
          setSolverWon(true);
          setGameOver(true);
          setIsPlaying(false);
          setHighlightCells([]);
          return;
        }

        setShapes(prev => {
          const filtered = prev.filter(s => s.id !== shape.id);
          return filtered.length === 0 ? getRandomShapes(3) : filtered;
        });

        setMoveCount(prev => prev + 1);
        setHighlightCells([]);
      }, animationDuration);
    }
  };

  const handleReset = () => {
    setBoard(createEmptyBoard());
    setShapes(getRandomShapes(3));
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
    if (!gameOver) {
      executeNextMove();
    }
  };

  const addScorePopup = (points, x, y) => {
    const id = Date.now() + Math.random();
    setScorePopups(prev => [...prev, { id, score: points, position: { x, y } }]);

    setTimeout(() => {
      setScorePopups(prev => prev.filter(p => p.id !== id));
    }, 1500);
  };

  const ensureAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const playSound = (type, options = {}) => {
    const { multiplier = 1 } = options;
    const context = ensureAudioContext();
    const now = context.currentTime;

    const playTone = (frequency, duration, delay = 0, volume = 0.08) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now + delay);

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(volume, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(now + delay);
      oscillator.stop(now + delay + duration + 0.05);
    };

    if (type === 'score') {
      const base = 523.25; // C5
      const excitement = Math.min(4, Math.max(1, multiplier));
      const volume = Math.min(0.14, 0.07 + 0.015 * excitement);

      // in C major
      // base (90 pts): C5 + E5
      playTone(base, 0.22, 0, volume);
      playTone(base * 1.25, 0.18, 0.08, volume * 0.95);
      
      // 135+ pts: add G5
      if (excitement >= 1.5) {
        playTone(base * 1.5, 0.16, 0.16, volume * 0.9);
      }
      
      // 225+ pts: add C6
      if (excitement >= 2.5) {
        playTone(base * 2, 0.14, 0.25, volume * 0.85);
      }
      
      // 315+ pts: add G6
      if (excitement >= 3.5) {
        playTone(base * 3, 0.12, 0.35, volume * 0.8);
      }
      return;
    }

    // placement sound: G3 (196 Hz)
    playTone(196, 0.14, 0, 0.07);
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
              ref={el => shapeRefs.current[shape.id] = el}
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
                {Object.entries(STRATEGIES).map(([key, { name }]) => (
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
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
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
