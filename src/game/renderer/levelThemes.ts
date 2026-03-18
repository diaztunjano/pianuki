/**
 * Per-level color theme data.
 * Each level gets a distinct background, grid dot color, path fill/stroke,
 * and goal marker color to give visual variety.
 */
export interface LevelTheme {
  bg: string
  gridDot: string
  pathFill: string
  pathStroke: string
  goalColor: string
}

export const LEVEL_THEMES: LevelTheme[] = [
  // Level 0 — Meadow: soft green
  {
    bg: '#1a2e1a',
    gridDot: '#2a4a2a',
    pathFill: '#2d4828',
    pathStroke: '#4a6848',
    goalColor: '#f59e0b',
  },
  // Level 1 — Forest: deep teal
  {
    bg: '#1a2e2e',
    gridDot: '#2a4a4a',
    pathFill: '#28403d',
    pathStroke: '#486860',
    goalColor: '#22c55e',
  },
  // Level 2 — Mountain: slate blue
  {
    bg: '#1a1a2e',
    gridDot: '#2a2a4a',
    pathFill: '#2d3748',
    pathStroke: '#4a5568',
    goalColor: '#3b82f6',
  },
  // Level 3 — Storm: dark purple
  {
    bg: '#2e1a2e',
    gridDot: '#4a2a4a',
    pathFill: '#3d2848',
    pathStroke: '#684868',
    goalColor: '#a855f7',
  },
  // Level 4 — Summit: dark crimson
  {
    bg: '#2e1a1a',
    gridDot: '#4a2a2a',
    pathFill: '#482828',
    pathStroke: '#684848',
    goalColor: '#ef4444',
  },
]

/** Fallback theme if levelIndex is out of range. */
const DEFAULT_THEME: LevelTheme = LEVEL_THEMES[2]

export function getTheme(levelIndex: number): LevelTheme {
  return LEVEL_THEMES[levelIndex] ?? DEFAULT_THEME
}
