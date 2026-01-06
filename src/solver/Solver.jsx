import React, { useState, useEffect, useRef } from 'react';
import Board from '../components/Board';
import ScorePopup from '../components/ScorePopup';
import { createEmptyBoard, placeShape, findCompletedAreas, clearCompletedAreas, hasAnyValidPlacement, isBoardEmpty } from '../logic/board';
import { getRandomShapes } from '../logic/shapes';
import { STRATEGIES } from './strategies';
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

  const intervalRef = useRef(null);
  const boardRef = useRef(null);
  const shapeRefs = useRef({});
  const strategySelectRef = useRef(null);

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

  const baseDelay = 200;
  const speedDelay = baseDelay / speedMultiplier;
  const animationDuration = Math.max(280, speedDelay * 0.7);

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
    if (!isPlaying || gameOver) return;

    const timeout = setTimeout(() => {
      executeNextMove();
    }, speedDelay);

    return () => clearTimeout(timeout);
  }, [isPlaying, speedDelay, board, shapes, strategy, gameOver]);

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

        if (hasCompletions) {
          const { board: clearedBoard, clearedCount } = clearCompletedAreas(newBoard, completed);
          const points = clearedCount * 10;
          resultingBoard = clearedBoard;
          setBoard(clearedBoard);
          setScore(prev => prev + points);
          addScorePopup(points, popupX, popupY);
        } else {
          setBoard(newBoard);
        }

        if (isBoardEmpty(resultingBoard)) {
          setSolverWon(true);
          setGameOver(true);
          setIsPlaying(false);
          setHighlightCells([]);
          return;
        }

        const remainingShapes = shapes.filter(s => s.id !== shape.id);

        if (remainingShapes.length === 0) {
          setShapes(getRandomShapes(3));
        } else {
          setShapes(remainingShapes);
        }

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
          <label>Strategy</label>
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
            max="4"
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

      {gameOver && (
        <div className="solver-game-over">
          <p>{solverWon ? 'Board cleared – solver wins!' : 'No valid moves remaining'}</p>
          <p className="solver-final-score">Final Score: {score}</p>
        </div>
      )}

      {showNoMovesModal && !solverWon && (
        <div className="solver-modal-backdrop">
          <div className="solver-modal" role="dialog" aria-modal="true" aria-labelledby="solver-modal-title">
            <div className="solver-modal-header">
              <h3 id="solver-modal-title">No valid moves</h3>
              <button className="solver-modal-close" onClick={() => setShowNoMovesModal(false)} aria-label="Close">
                ×
              </button>
            </div>
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
