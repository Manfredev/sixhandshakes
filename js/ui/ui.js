/**
 * ui.js — Thin facade re-exporting all UI sub-modules
 *
 * Usage:
 *   import { createUI } from './ui/ui.js';
 *   const ui = createUI();
 */

import { initToasts } from './toasts.js';
import { initModals } from './modals.js';
import { initPanel } from './panel.js';
import { initReveal } from './reveal.js';
import { initStatsDisplay } from './stats-display.js';
import { initEmptyState } from './empty-state.js';

export function createUI() {

  // Cached DOM references
  const els = {
    body:              document.body,
    sidePanel:         document.getElementById('side-panel'),
    panelCloseBtn:     document.getElementById('panel-close'),
    searchInput:       document.getElementById('search-input'),
    targetInput:       document.getElementById('target-input'),
    btnFindPath:       document.getElementById('btn-find-path'),
    chainDisplay:      document.getElementById('chain-display'),
    personDetail:      document.getElementById('person-detail'),
    emptyState:        document.getElementById('empty-state'),
    handshakeCounter:  document.getElementById('handshake-counter'),
    handshakeNumber:   document.getElementById('handshake-number'),
    handshakeLabel:    document.getElementById('handshake-label'),
    statNodes:         document.getElementById('stat-nodes'),
    statEdges:         document.getElementById('stat-edges'),
    apiKeyModal:       document.getElementById('api-key-modal'),
    apiKeyInput:       document.getElementById('api-key-input'),
    btnSaveKey:        document.getElementById('btn-save-key'),
    revealOverlay:     document.getElementById('reveal-overlay'),
    targetSection:     document.getElementById('target-section'),
  };

  const { toast }                          = initToasts(document.getElementById('toasts'));
  const { showApiKeyModal, hideApiKeyModal } = initModals(els);
  const panel                               = initPanel(els);
  const stats                               = initStatsDisplay(els, toast);
  const { triggerReveal }                   = initReveal(els, stats.showHandshakeCount);
  const emptyState                          = initEmptyState(els.emptyState);

  return {
    // Panel
    openPanel:        panel.openPanel,
    closePanel:       panel.closePanel,
    showPersonDetail: panel.showPersonDetail,
    showChain:        panel.showChain,
    clearChain:       panel.clearChain,
    onSearch:         panel.onSearch,
    onTargetSet:      panel.onTargetSet,
    setTargetStatus:  panel.setTargetStatus,

    // Counter & reveal
    showHandshakeCount: stats.showHandshakeCount,
    hideHandshakeCount: stats.hideHandshakeCount,
    triggerReveal,

    // Toast
    toast,

    // Modal
    showApiKeyModal,
    hideApiKeyModal,

    // Empty state
    hideEmptyState:   emptyState.hideEmptyState,
    showEmptyState:   emptyState.showEmptyState,
    startTypewriter:  emptyState.startTypewriter,

    // Stats & share
    updateStats:      stats.updateStats,
    setShareData:     stats.setShareData,
    showShareActions: stats.showShareActions,
    hideShareActions: stats.hideShareActions,
  };
}
