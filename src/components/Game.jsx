import React, { useState, useEffect, useRef } from 'react';
import Board from './Board';
import ShapeSelector from './ShapeSelector';
import ScorePopup from './ScorePopup';
import { createEmptyBoard, canPlaceShape, placeShape, findCompletedAreas, clearCompletedAreas, hasAnyValidPlacement, getAllValidPlacements, isBoardEmpty } from '../logic/board';
import { getRandomShapes } from '../logic/shapes';
import { calculateScore, getHighScore, setHighScore } from '../logic/scoring';
import './Game.css';

export default function Game() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [spawnBatch, setSpawnBatch] = useState(() => Date.now());
  const [shapes, setShapes] = useState(() => getRandomShapes(3).map(s => ({ ...s, spawnBatch })));
  const [score, setScore] = useState(0);
  const [highScore, setHighScoreState] = useState(getHighScore());
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [noMoves, setNoMoves] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [dragState, setDragState] = useState(null);
  const [highlightCells, setHighlightCells] = useState([]);
  const [highlightAreas, setHighlightAreas] = useState({ rows: [], cols: [], boxes: [] });
  const [scorePopups, setScorePopups] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const boardWrapperRef = useRef(null);
  const boardElRef = useRef(null);
  const dragOffsetRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    const updatedShapes = shapes.map(shape => ({
      ...shape,
      disabled: getAllValidPlacements(board, shape).length === 0,
    }));

    const disabledChanged =
      updatedShapes.length !== shapes.length ||
      updatedShapes.some((shape, idx) => shape.disabled !== shapes[idx]?.disabled);

    if (disabledChanged) {
      setShapes(updatedShapes);
    }

    const movesAvailable = updatedShapes.length > 0 && hasAnyValidPlacement(board, updatedShapes);

    if (!gameWon && !gameOver) {
      if (!movesAvailable) {
        setNoMoves(true);
        setGameOver(true);
        if (score > highScore) {
          setHighScore(score);
          setHighScoreState(score);
        }
      } else {
        setNoMoves(false);
      }
    }
  }, [board, shapes, gameWon, gameOver, score, highScore]);

  const handleDragStart = (shape, offset) => {
    dragOffsetRef.current = offset;
    setDragState({
      shape,
      offset,
      position: {
        x: null,
        y: null,
      },
    });

    const handlePointerMove = (e) => {
      setDragState(prev => ({
        ...prev,
        position: {
          x: e.clientX,
          y: e.clientY,
        },
      }));

      const currentOffset = dragOffsetRef.current || dragState?.offset || { x: 0, y: 0 };
      if (boardElRef.current) {
        const boardRect = boardElRef.current.getBoundingClientRect();
        const cellSize = boardRect.width / 9;
        
        const rawCol = (e.clientX - currentOffset.x - boardRect.left) / cellSize;
        const rawRow = (e.clientY - currentOffset.y - boardRect.top) / cellSize;
        const col = Math.max(0, Math.min(8, Math.round(rawCol)));
        const row = Math.max(0, Math.min(8, Math.round(rawRow)));

        if (row >= 0 && row < 9 && col >= 0 && col < 9) {
          if (canPlaceShape(board, shape, row, col)) {
            const cells = shape.cells.map(([dr, dc]) => [row + dr, col + dc]);
            const prospective = placeShape(board, shape, row, col);
            const areas = findCompletedAreas(prospective);
            setHighlightCells(cells);
            setHighlightAreas(areas);
          } else {
            setHighlightCells([]);
            setHighlightAreas({ rows: [], cols: [], boxes: [] });
          }
        } else {
          setHighlightCells([]);
          setHighlightAreas({ rows: [], cols: [], boxes: [] });
        }
      }
    };

    const handlePointerUp = (e) => {
      const currentOffset = dragOffsetRef.current || dragState?.offset || { x: 0, y: 0 };
      if (boardElRef.current) {
        const boardRect = boardElRef.current.getBoundingClientRect();
        const cellSize = boardRect.width / 9;
        
        const rawCol = (e.clientX - currentOffset.x - boardRect.left) / cellSize;
        const rawRow = (e.clientY - currentOffset.y - boardRect.top) / cellSize;
        const col = Math.max(0, Math.min(8, Math.round(rawCol)));
        const row = Math.max(0, Math.min(8, Math.round(rawRow)));

        if (row >= 0 && row < 9 && col >= 0 && col < 9) {
          if (canPlaceShape(board, shape, row, col)) {
            handlePlacement(shape, row, col, boardRect);
          }
        }
      }

      setDragState(null);
      setHighlightCells([]);
      setHighlightAreas({ rows: [], cols: [], boxes: [] });
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      dragOffsetRef.current = null;
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handlePlacement = (shape, row, col, boardRect) => {
    const newBoard = placeShape(board, shape, row, col);
    const completed = findCompletedAreas(newBoard);
    
    const hasCompletions = completed.rows.length > 0 || completed.cols.length > 0 || completed.boxes.length > 0;
    let updatedBoard = newBoard;
    let updatedScore = score;
    let scoreMultiplier = 1;
    
    if (hasCompletions) {
      const areaCount = completed.rows.length + completed.cols.length + completed.boxes.length;
      scoreMultiplier = areaCount >= 2 ? 1 + (areaCount - 1) * 0.5 : 1;
      const { board: clearedBoard, clearedCount } = clearCompletedAreas(newBoard, completed);
      const points = calculateScore(clearedCount, completed);
      
      const cellSize = boardRect.width / 9;
      const popupX = boardRect.left + col * cellSize + cellSize / 2;
      const popupY = boardRect.top + row * cellSize + cellSize / 2;
      
      addScorePopup(points, popupX, popupY);
      updatedBoard = clearedBoard;
      updatedScore = score + points;
      setBoard(clearedBoard);
      setScore(updatedScore);
    } else {
      updatedBoard = newBoard;
      setBoard(newBoard);
    }

    if (isBoardEmpty(updatedBoard)) {
      setGameWon(true);
      setGameOver(true);
      setShapes([]);
      setHighlightAreas({ rows: [], cols: [], boxes: [] });
      if (updatedScore > highScore) {
        setHighScore(updatedScore);
        setHighScoreState(updatedScore);
      }
      return;
    }

    const remainingShapes = shapes.filter(s => s.id !== shape.id);
    
    if (remainingShapes.length === 0) {
      const newBatch = Date.now();
      setSpawnBatch(newBatch);
      setShapes(getRandomShapes(3).map(s => ({ ...s, spawnBatch: newBatch })));
    } else {
      setShapes(remainingShapes);
    }

    if (soundEnabled) {
      playSound(hasCompletions ? 'score' : 'place', { multiplier: scoreMultiplier });
    }

    setHighlightAreas({ rows: [], cols: [], boxes: [] });
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
      const base = 523.25; // C5 - consistent base key
      const excitement = Math.min(4, Math.max(1, multiplier));
      const volume = Math.min(0.14, 0.07 + 0.015 * excitement);

      // All chimes in C major - add more notes as score increases
      // Base (90 pts): C5 + E5
      playTone(base, 0.22, 0, volume);
      playTone(base * 1.25, 0.18, 0.08, volume * 0.95);
      
      // 135+ pts: Add G5
      if (excitement >= 1.5) {
        playTone(base * 1.5, 0.16, 0.16, volume * 0.9);
      }
      
      // 225+ pts: Add C6
      if (excitement >= 2.5) {
        playTone(base * 2, 0.14, 0.25, volume * 0.85);
      }
      
      // 315+ pts: Add G6
      if (excitement >= 3.5) {
        playTone(base * 3, 0.12, 0.35, volume * 0.8);
      }
      return;
    }

    // Placement sound: Low G3 (196 Hz) - over 2 octaves below score chimes for clear separation
    playTone(196, 0.14, 0, 0.07);
  };

  const handleRestart = () => {
    setResetting(true);
    setBoard(createEmptyBoard());
    const newBatch = Date.now();
    setSpawnBatch(newBatch);
    setShapes(getRandomShapes(3).map(s => ({ ...s, spawnBatch: newBatch })));
    setScore(0);
    setGameOver(false);
    setGameWon(false);
    setNoMoves(false);
    setHighlightCells([]);
    setScorePopups([]);
    setHighlightAreas({ rows: [], cols: [], boxes: [] });
    setTimeout(() => setResetting(false), 450);
  };

  return (
    <div className={`game ${resetting ? 'resetting' : ''}`}>
      <div className="game-header">
        <div className="game-title">
          <img src="./nexel-icon.svg" alt="" className="logo-icon" aria-hidden="true" />
          <h1>Nexel</h1>
        </div>
        <div className="game-actions">
          <button 
            className="sound-toggle"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label="Toggle sound"
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
          <button
            className="sound-toggle"
            onClick={handleRestart}
            aria-label="Reset board"
          >
            ↺
          </button>
        </div>
        <div className="game-stats">
          <div className="stat stat-score">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat stat-best">
            <span className="stat-label">Best</span>
            <span className="stat-value">{highScore}</span>
          </div>
        </div>
      </div>

      <div className="game-board" ref={boardWrapperRef}>
        <Board 
          board={board} 
          highlightCells={highlightCells}
          highlightAreas={highlightAreas}
          boardRef={boardElRef}
        />
        {scorePopups.map(popup => (
          <ScorePopup
            key={popup.id}
            id={popup.id}
            score={popup.score}
            position={popup.position}
          />
        ))}
      </div>

      <ShapeSelector
        shapes={shapes}
        onDragStart={handleDragStart}
        dragState={dragState}
        spawnBatch={spawnBatch}
      />

      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2>{gameWon ? 'You Win!' : noMoves ? 'No Moves Left' : 'Game Over'}</h2>
            {noMoves && !gameWon && (
              <p className="game-over-message">Reset the board to keep playing.</p>
            )}
            <div className="final-score">
              <span className="final-score-label">Final Score</span>
              <span className="final-score-value">{score}</span>
            </div>
            {score === highScore && score > 0 && (
              <div className="new-high-score">New High Score!</div>
            )}
            <button className="restart-button" onClick={handleRestart}>
              {gameWon ? 'Play Again' : 'Reset Board'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
