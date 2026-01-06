# Nexel

A polished strategic block placement puzzle game built with React and Vite.

## Features

- **9x9 Board** with strategic placement mechanics
- **Dynamic Shape System** with 30+ unique shape patterns
- **Smart Clearing** - Complete rows, columns, or 3x3 boxes to clear
- **Combo Scoring** with multipliers for multiple clears
- **Drag and Drop** with real-time validation and highlights
- **Game Over Detection** when no valid placements remain
- **High Score Tracking** with localStorage persistence
- **Solver Mode** with three AI strategies:
  - Greedy (maximize immediate score)
  - Survival (maximize board openness)
  - Hybrid (balanced approach)
- **Auto-play** with adjustable speed
- **Dark Theme** with refined pink accents
- **Sound Toggle** for placement feedback

## How to Play

1. Drag shapes from the bottom selector to the board
2. Shapes can only be placed in valid positions (highlighted in pink)
3. Complete rows, columns, or 3x3 boxes to clear them and score points
4. You must place all 3 shapes before receiving new ones
5. Game ends when none of the current shapes fit anywhere on the board
6. Clearing multiple areas in one placement gives bonus multipliers

## Tech Stack

- React 18
- Vite
- Plain CSS (no frameworks)
- No game engines or canvas
- Minimal dependencies

## License

MIT
