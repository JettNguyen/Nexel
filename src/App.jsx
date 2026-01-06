import React, { useState } from 'react';
import Game from './components/Game';
import Solver from './solver/Solver';
import './styles/global.css';
import './App.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('game');

  return (
    <div className="app">
      <nav className="nav">
        <button
          className={`nav-link ${currentPage === 'game' ? 'active' : ''}`}
          onClick={() => setCurrentPage('game')}
        >
          Game
        </button>
        <button
          className={`nav-link ${currentPage === 'solver' ? 'active' : ''}`}
          onClick={() => setCurrentPage('solver')}
        >
          Solver
        </button>
      </nav>

      <main className="main">
        {currentPage === 'game' ? <Game /> : <Solver />}
      </main>
    </div>
  );
}
