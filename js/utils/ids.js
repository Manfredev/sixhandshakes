/**
 * ids.js — Deterministic ID generators for Six Handshakes
 */

/** Deterministic node ID for explore mode (same name → same ID). */
export function makeExploreNodeId(name) {
  return 'node_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

/** Deterministic node ID for game mode. */
export function makeGameNodeId(name) {
  return 'game_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

/** Edge ID from source and target IDs. */
export function makeEdgeId(sourceId, targetId) {
  return `edge_${sourceId}_${targetId}`;
}
