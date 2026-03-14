/**
 * constants.js — Shared magic numbers and design tokens for Six Handshakes
 */

/** Animation / timing constants (ms) */
export const TIMING = {
  TOAST_DISMISS: 4000,
  REVEAL_HOLD: 1500,
  REVEAL_SHRINK: 2200,
  STEP_DELAY: 700,
  DEBOUNCE_SEARCH: 300,
};

/** Layout constants */
export const LAYOUT = {
  NODE_RADIUS: 40,
  USER_NODE_RADIUS: 32,
  GAME_NODE_RADIUS: 24,
  GAME_START_RADIUS: 32,
  MAX_TOASTS: 3,
};

/** Gemini API constants */
export const API = {
  MODEL: 'gemini-2.5-flash',
  RPM_LIMIT: 5,
  RPD_LIMIT: 20,
  RPD_WARNING: 15,
  MAX_RETRIES: 3,
  RPD_STORAGE_KEY: 'gemini-rpd',
};

/** Design-token colors (mirrored from CSS for JS/SVG use) */
export const COLORS = {
  bg:        '#0A0A0C',
  surface:   '#14141A',
  surfaceUp: '#1E1E28',
  red:       '#E63228',
  redGlow:   '#FF6B5A',
  gold:      '#C4A35A',
  text:      '#E8E4DF',
  textDim:   '#9A9490',
  paper:     '#F5F0E8',
  edgeStroke:'#E6322825',
};
