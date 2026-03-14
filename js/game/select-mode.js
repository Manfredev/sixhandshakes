/**
 * select-mode.js — Game UI orchestrator
 *
 * State + startGame + renderStep orchestration.
 * Delegates rendering, picks, and end screen to sub-modules.
 */

import { makeGameNodeId } from '../utils/ids.js';
import { drawNode, drawCurvedEdge } from './game-rendering.js';
import { handlePick } from './game-pick.js';
import { animateConnection, showEndScreen, showStatsModal } from './game-end.js';

export function createSelectMode(graph, wikipedia) {

  // ── State ───────────────────────────────────────────────────────

  let _active = false;
  let _engine = null;
  let _puzzle = null;
  let _dailyManager = null;
  let _previousPick = null;
  let _pathNodes = [];
  let _detourNodes = [];
  let _fadedNodes = [];
  let _optionEls = [];
  let _totalSlots = 0;
  let _handshakeCount = 0;
  let _chainEdges = [];
  let _dashedSegs = [];
  let _svg = null;
  let _width = 0;
  let _height = 0;

  // ── Cached DOM ────────────────────────────────────────────────

  const gameScreen   = document.getElementById('game-screen');
  const endScreen    = document.getElementById('end-screen');
  const endGrade     = document.getElementById('end-grade');
  const endTitle     = document.getElementById('end-title');
  const endDots      = document.getElementById('end-dots');
  const endSteps     = document.getElementById('end-steps');
  const endOptimal   = document.getElementById('end-optimal');
  const endOver      = document.getElementById('end-over');
  const btnEndShare  = document.getElementById('btn-end-share');
  const btnEndStats  = document.getElementById('btn-end-stats');
  const btnEndExplore = document.getElementById('btn-end-explore');
  const gameClose    = document.getElementById('game-close');
  const statsModal   = document.getElementById('stats-modal');
  const statsPlayed  = document.getElementById('stats-played');
  const statsWinPct  = document.getElementById('stats-win-pct');
  const statsCurStreak = document.getElementById('stats-cur-streak');
  const statsMaxStreak = document.getElementById('stats-max-streak');
  const statsDistribution = document.getElementById('stats-distribution');
  const btnStatsClose = document.getElementById('btn-stats-close');
  const statsCloseX  = statsModal ? statsModal.querySelector('.stats-close') : null;
  const emptyState = document.getElementById('empty-state');
  const header     = document.getElementById('header');
  const statsBar   = document.getElementById('stats-bar');
  const budgetPill = document.getElementById('budget-pill');

  // ── Helpers ───────────────────────────────────────────────────

  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  function pathX(mainStep, totalMainSteps) {
    const pad = Math.min(_width * 0.12, 120);
    const span = _width - pad * 2;
    return pad + (mainStep / (totalMainSteps + 1)) * span;
  }

  function centerY() { return _height / 2; }

  // ── Shared context for sub-modules ──────────────────────────

  function drawDashedSegments() {
    const layer = _svg.select('.layer-goalline');
    layer.selectAll('*').remove();
    _dashedSegs = [];
    const cy = centerY();
    for (let i = 0; i <= _totalSlots; i++) {
      const x1 = pathX(i, _totalSlots);
      const x2 = pathX(i + 1, _totalSlots);
      const seg = layer.append('line')
        .attr('x1', x1).attr('y1', cy).attr('x2', x2).attr('y2', cy)
        .attr('class', 'gedge-segment');
      _dashedSegs.push({ el: seg });
    }
  }

  function relayoutChain() {
    const cy = centerY();
    // Shift all intermediate path nodes
    for (const pn of _pathNodes) {
      if (pn.slot === undefined) continue;
      const newX = pathX(pn.slot, _totalSlots);
      pn.x = newX;
      if (pn.nodeG) {
        const s = pn.color === 'yellow' ? 0.83 : 1;
        pn.nodeG.transition().duration(400).ease(d3.easeCubicInOut)
          .attr('transform', `translate(${newX},${cy}) scale(${s})`);
      }
    }
    // Shift all persistent edges
    for (const ce of _chainEdges) {
      const x1 = pathX(ce.fromSlot, _totalSlots);
      const x2 = pathX(ce.toSlot, _totalSlots);
      ce.el.transition().duration(400)
        .attr('x1', x1).attr('y1', cy).attr('x2', x2).attr('y2', cy);
    }
    // Shift target node
    const targetX = pathX(_totalSlots + 1, _totalSlots);
    const targetNode = _svg.select('.gnode-target');
    if (!targetNode.empty()) {
      targetNode.transition().duration(400).ease(d3.easeCubicInOut)
        .attr('transform', `translate(${targetX},${cy})`);
    }
    // Redraw dashed segments
    drawDashedSegments();
    // Update HUD total
    const stepTotal = document.getElementById('game-step-total');
    if (stepTotal) stepTotal.textContent = _totalSlots;
  }

  function getCtx() {
    return {
      _engine, _puzzle, _dailyManager,
      _pathNodes, _detourNodes, _fadedNodes, _optionEls,
      _chainEdges, _dashedSegs,
      _svg, _width, _height, graph,
      pathX, centerY, showToast,
      relayoutChain, drawDashedSegments,
      gameScreen, endScreen, endGrade, endTitle, endDots,
      endSteps, endOptimal, endOver,
      btnEndShare, btnEndStats, btnEndExplore, gameClose,
      statsModal, statsPlayed, statsWinPct, statsCurStreak, statsMaxStreak,
      statsDistribution, btnStatsClose, statsCloseX,
      // Methods for sub-modules to call back
      renderStep,
      animateConnection: (cb) => animateConnection(getCtx(), cb),
      showEndScreen: () => showEndScreen(getCtx()),
      endGame,
      // Getter/setter proxies for mutable primitives
      get _totalSlots() { return _totalSlots; },
      set _totalSlots(v) { _totalSlots = v; },
      get _handshakeCount() { return _handshakeCount; },
      set _handshakeCount(v) { _handshakeCount = v; },
      get _previousPick() { return _previousPick; },
      set _previousPick(v) { _previousPick = v; },
    };
  }

  // ── SVG init ───────────────────────────────────────────────

  function initSVG() {
    const svgEl = document.getElementById('game-graph');
    _width = svgEl.clientWidth || window.innerWidth;
    _height = svgEl.clientHeight || window.innerHeight - 80;
    svgEl.setAttribute('viewBox', `0 0 ${_width} ${_height}`);
    svgEl.innerHTML = '';

    _svg = d3.select(svgEl);

    const defs = _svg.append('defs');

    const glow = defs.append('filter').attr('id', 'game-glow')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '6').attr('result', 'blur');
    glow.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    const pulse = defs.append('filter').attr('id', 'game-pulse')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    pulse.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '3').attr('result', 'blur');
    pulse.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    _svg.append('g').attr('class', 'layer-goalline');
    _svg.append('g').attr('class', 'layer-edges');
    _svg.append('g').attr('class', 'layer-detours');
    _svg.append('g').attr('class', 'layer-option-edges');
    _svg.append('g').attr('class', 'layer-labels');
    _svg.append('g').attr('class', 'layer-nodes');
    _svg.append('g').attr('class', 'layer-options');
  }

  // ── startGame ─────────────────────────────────────────────────

  function startGame(puzzle, engine, dailyManager) {
    _puzzle = puzzle;
    _engine = engine;
    _dailyManager = dailyManager;
    _active = true;
    _pathNodes = [];
    _detourNodes = [];
    _fadedNodes = [];
    _optionEls = [];
    _previousPick = null;
    _totalSlots = puzzle.optimalLength;
    _handshakeCount = 0;
    _chainEdges = [];
    _dashedSegs = [];

    gameScreen.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    if (header) header.classList.add('hidden');
    if (statsBar) statsBar.classList.add('hidden');
    if (budgetPill) budgetPill.classList.add('hidden');

    const stepNum = document.getElementById('game-step-num');
    const stepTotal = document.getElementById('game-step-total');
    const targetName = document.getElementById('game-target-name');
    if (stepNum) stepNum.textContent = '1';
    if (stepTotal) stepTotal.textContent = _totalSlots;
    if (targetName) targetName.textContent = puzzle.target.name;

    requestAnimationFrame(() => {
      initSVG();

      const cy = centerY();
      const startX = pathX(0, _totalSlots);
      const targetX = pathX(_totalSlots + 1, _totalSlots);

      drawDashedSegments();

      drawNode(_svg.select('.layer-nodes'), {
        name: puzzle.start.name, x: startX, y: cy, r: 32,
        cls: 'gnode gnode-start', showLabel: true, labelBelow: true,
      });
      _pathNodes.push({ name: puzzle.start.name, x: startX, y: cy });
      _previousPick = puzzle.start;

      drawNode(_svg.select('.layer-nodes'), {
        name: puzzle.target.name, x: targetX, y: cy, r: 32,
        cls: 'gnode gnode-target', showLabel: true, labelBelow: true,
      });

      renderStep(0);
    });

    const startId = makeGameNodeId(puzzle.start.name);
    graph.addNode({ id: startId, name: puzzle.start.name, photoUrl: puzzle.start.photoUrl, depth: 0 });
  }

  // ── renderStep ────────────────────────────────────────────────

  function renderStep(stepIndex) {
    const step = _puzzle.steps[stepIndex];
    if (!step) return;

    const stepNum = document.getElementById('game-step-num');
    if (stepNum) stepNum.textContent = _handshakeCount + 1;

    const cy = centerY();
    const current = _pathNodes[_pathNodes.length - 1];

    const optionX = pathX(_handshakeCount + 1, _totalSlots);

    const optionLayer = _svg.select('.layer-options');
    const optionEdgeLayer = _svg.select('.layer-option-edges');

    optionLayer.selectAll('*').remove();
    optionEdgeLayer.selectAll('*').remove();
    _optionEls = [];

    const spread = Math.min(_height * 0.32, 160);
    const offsets = [-1.5, -0.5, 0.5, 1.5].map(m => m * spread / 1.5);

    // Shuffle offsets
    for (let i = offsets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
    }

    step.options.forEach((option, i) => {
      const ox = optionX;
      const oy = cy + offsets[i];

      const edge = drawCurvedEdge(optionEdgeLayer, current.x, current.y, ox, oy, 'gedge-option');
      const length = edge.node().getTotalLength();
      edge
        .attr('stroke-dasharray', length)
        .attr('stroke-dashoffset', length)
        .transition().delay(i * 80).duration(400).ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

      const nodeG = drawNode(optionLayer, {
        name: option.name, x: ox, y: oy, r: 24,
        cls: 'gnode gnode-option', showLabel: true, labelBelow: true,
      });

      nodeG.append('text')
        .attr('class', 'gnode-desc')
        .attr('y', 24 + 32)
        .attr('text-anchor', 'middle')
        .text(option.descriptor ? (option.descriptor.length > 24 ? option.descriptor.slice(0, 22) + '...' : option.descriptor) : '');

      nodeG
        .attr('opacity', 0)
        .attr('transform', `translate(${ox},${oy}) scale(0.3)`)
        .transition().delay(i * 80 + 100).duration(350).ease(d3.easeBackOut.overshoot(1.2))
        .attr('opacity', 1)
        .attr('transform', `translate(${ox},${oy}) scale(1)`);

      nodeG.select('.gnode-ring')
        .attr('class', 'gnode-ring gnode-ring-option');

      nodeG.style('cursor', 'pointer');
      nodeG.on('click', () => handlePick(getCtx(), option, nodeG, edge, stepIndex, i, ox, oy));

      const tooltip = document.getElementById('game-tooltip');
      nodeG.on('mouseenter', () => {
        if (tooltip && option.relationship) {
          tooltip.textContent = option.relationship;
          tooltip.classList.remove('hidden');
          tooltip.style.left = ox + 'px';
          tooltip.style.top = (oy - 50) + 'px';
        }
      });
      nodeG.on('mouseleave', () => {
        if (tooltip) tooltip.classList.add('hidden');
      });

      _optionEls.push({ el: nodeG, edge, option, x: ox, y: oy });
    });

    // Auto-complete: if the only green option has next === null, auto-pick after delay
    const greenOption = step.options.find(o => o.color === 'green');
    const isFinalStep = greenOption && (greenOption.next === null || greenOption.next === undefined);
    if (isFinalStep) {
      _optionEls.forEach(o => o.el.style('cursor', 'default').on('click', null));
      setTimeout(() => {
        const entry = _optionEls.find(o => o.option === greenOption);
        if (entry) {
          const idx = _optionEls.indexOf(entry);
          handlePick(getCtx(), entry.option, entry.el, entry.edge, stepIndex, idx, entry.x, entry.y);
        }
      }, 600);
    }
  }

  // ── endGame ───────────────────────────────────────────────────

  function endGame() {
    gameScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    statsModal.classList.add('hidden');

    if (header) header.classList.remove('hidden');
    if (statsBar) statsBar.classList.remove('hidden');
    if (budgetPill) budgetPill.classList.remove('hidden');

    document.body.style.removeProperty('--grain-opacity');

    _active = false;
    _previousPick = null;
    _pathNodes = [];
    _detourNodes = [];
    _fadedNodes = [];
    _optionEls = [];
    _totalSlots = 0;
    _handshakeCount = 0;
    _chainEdges = [];
    _dashedSegs = [];
  }

  // ── Public API ────────────────────────────────────────────────

  return {
    startGame,
    renderStep,
    showEndScreen: () => showEndScreen(getCtx()),
    showStatsModal: () => showStatsModal(getCtx()),
    endGame,
    isActive() { return _active; },
  };
}
