# Nexel

A strategic block placement puzzle game built with React and Vite.

## Features

- **9x9 Board** with strategic placement mechanics
- **Dynamic Shape System** with 35 unique shape patterns, including diagonals
- **Smart Clearing** - Complete rows, columns, or 3x3 boxes to clear
- **Combo Scoring** with multipliers for multiple clears
- **Drag and Drop** with real-time validation and highlights
- **Game Over Detection** when no valid placements remain
- **High Score Tracking** with localStorage persistence
- **Solver Mode** with eight strategies (see below)
- **Auto-play** with adjustable speed
- **Sound Toggle** for placement feedback

## Solver Strategies

Every strategy looks at the same thing: each piece in hand, every square it could legally go, and the board that results after any rows, columns, or boxes clear. They differ in how they judge that resulting board.

| Strategy | What it does |
|---|---|
| **Score+** | Takes whichever move scores the most points right now. It ignores what the board looks like afterwards, so it tends to box itself in. |
| **Life+** | Ignores points entirely. It measures how many empty cells sit next to other empty cells and picks the move that keeps that number highest. |
| **Hybrid** | Weighs the immediate score against the Life+ openness measure, leaning slightly toward points. A solid all-rounder. |
| **Win** | Hunts for a completely empty board. It rewards clearing as many cells as possible each move and gives a huge bonus to any move that empties the board. |
| **Lookahead** | Plans the whole batch. It tries every order the three pieces in hand could be placed (keeping only the most promising placements at each step) and picks the first move of the sequence that leaves the healthiest board. Strongest, but does the most work per move. |
| **Monte Carlo** | Shortlists the best-looking moves, then plays out a dozen random future pieces after each one, several times over. Every candidate faces the same random futures, and the move whose futures survive longest wins. |
| **Mobility** | After each candidate move, counts how many placements remain for every piece in the shape library. Keeping that count high means fewer surprises from awkward pieces later. |
| **Random** | Picks any legal placement. A baseline to compare the others against. |

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
