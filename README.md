# Royal Grid ♛

A Queens-style logic puzzle game built with HTML, CSS and JavaScript.

**▶ Play it here: https://asmara751.github.io/royal-grid/**

## How to play
Place exactly one queen in every row, column and color region.
Queens cannot touch each other, not even diagonally.
Tap a cell once for ×, twice for a queen, three times to clear it.

## Features
- 15 levels (5×5, 6×6 and 7×7) that unlock as you progress
- Randomly generated puzzles, each checked by a solver to have exactly one solution
- Live conflict highlighting for queens that break a rule
- Timer, star ratings, hints, undo and reset
- Home, Levels, How to Play, Stats and Settings screens
- Dark and light mode, sound effects and responsive layout
- Progress saved in the browser with localStorage

## Built with
HTML, CSS, JavaScript (no frameworks)

## How it works
1. Place queens randomly (one per row and column, none touching).
2. Grow colored regions outward from each queen.
3. Use a backtracking solver to confirm there is only one solution.
4. Check the win condition after every move.

## Author
Asmara Maqbool
