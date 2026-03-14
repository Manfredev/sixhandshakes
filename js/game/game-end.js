/**
 * game-end.js — End screen, stats modal, animateConnection
 */

import { drawEdge, drawEdgeLabel } from './game-rendering.js';

/**
 * Animate final connection to target, then call callback.
 */
export function animateConnection(ctx, callback) {
  const { _pathNodes, _svg, _engine, _totalSlots, _chainEdges } = ctx;
  const cy = ctx.centerY();
  const targetX = ctx.pathX(_totalSlots + 1, _totalSlots);
  const lastPath = _pathNodes[_pathNodes.length - 1];

  const finalEdge = drawEdge(
    _svg.select('.layer-edges'),
    lastPath.x, lastPath.y, targetX, cy, 'gedge-path gedge-final'
  );
  const len = Math.hypot(targetX - lastPath.x, cy - lastPath.y);
  finalEdge
    .attr('stroke-dasharray', len)
    .attr('stroke-dashoffset', len)
    .transition().duration(500).ease(d3.easeCubicOut)
    .attr('stroke-dashoffset', 0);

  // Track final edge in chain
  const lastSlot = lastPath.slot !== undefined ? lastPath.slot : _totalSlots;
  _chainEdges.push({ fromSlot: lastSlot, toSlot: _totalSlots + 1, color: 'green', el: finalEdge });

  const lastPick = _engine.getState().picks[_engine.getState().picks.length - 1];
  if (lastPick) {
    drawEdgeLabel(_svg, lastPath.x, lastPath.y, targetX, cy, lastPick.relationship || '');
  }

  _svg.select('.gnode-target .gnode-ring')
    .transition().delay(400).duration(500)
    .attr('class', 'gnode-ring gnode-ring-connected');

  _svg.select('.gnode-target .gnode-fill')
    .transition().delay(400).duration(500)
    .style('fill', 'var(--correct)')
    .style('opacity', 0.25);

  setTimeout(() => {
    const pulse = _svg.select('.layer-nodes').append('circle')
      .attr('cx', _pathNodes[0].x)
      .attr('cy', _pathNodes[0].y)
      .attr('r', 6)
      .attr('class', 'gnode-pulse-travel');

    let chain = pulse;
    for (let i = 1; i < _pathNodes.length; i++) {
      chain = chain.transition()
        .duration(200).ease(d3.easeLinear)
        .attr('cx', _pathNodes[i].x)
        .attr('cy', _pathNodes[i].y);
    }
    chain.transition()
      .duration(200).ease(d3.easeLinear)
      .attr('cx', targetX).attr('cy', cy)
      .on('end', () => {
        for (let j = 0; j < 12; j++) {
          const angle = (j / 12) * Math.PI * 2;
          const dist = 40 + Math.random() * 30;
          _svg.select('.layer-nodes').append('circle')
            .attr('cx', targetX).attr('cy', cy)
            .attr('r', 3)
            .attr('class', 'gnode-burst')
            .transition().duration(600).ease(d3.easeCubicOut)
            .attr('cx', targetX + Math.cos(angle) * dist)
            .attr('cy', cy + Math.sin(angle) * dist)
            .attr('r', 0).attr('opacity', 0).remove();
        }
        pulse.transition().duration(300).attr('r', 20).attr('opacity', 0).remove();
        setTimeout(callback, 500);
      });
  }, 600);
}

/**
 * Show end screen with grade and stats.
 */
export function showEndScreen(ctx) {
  const { _engine, _dailyManager, _puzzle, gameScreen, endScreen,
          endGrade, endTitle, endDots, endSteps, endOptimal, endOver,
          btnEndShare, btnEndStats, btnEndExplore, gameClose } = ctx;

  gameScreen.classList.add('hidden');

  const grade = _engine.getGrade();
  const scoreOverOptimal = _engine.getScoreOverOptimal();

  endGrade.className = 'end-grade';
  endGrade.textContent = grade;
  endGrade.classList.add('grade-' + grade.toLowerCase());

  const titles = { 'S': 'Perfect Path', 'A': 'Excellent', 'B': 'Good', 'C': 'Completed', 'D': 'Long Way Around' };
  endTitle.textContent = titles[grade] || 'Complete';

  const state = _engine.getState();
  endDots.innerHTML = '';
  if (state.picks) {
    state.picks.forEach(pick => {
      const dot = document.createElement('div');
      dot.className = `end-dot ${pick.color}`;
      endDots.appendChild(dot);
    });
  }

  endSteps.textContent = state.pathLength || 0;
  endOptimal.textContent = state.optimalLength || 0;
  endOver.textContent = `+${scoreOverOptimal}`;

  endScreen.classList.remove('hidden');

  btnEndShare.onclick = () => {
    const puzzleNumber = _puzzle.puzzleNumber || '';
    const streak = _dailyManager ? _dailyManager.getStreak().current : 0;
    const text = _engine.getShareText(puzzleNumber, streak);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => ctx.showToast('Copied to clipboard!'))
        .catch(() => ctx.showToast('Could not copy'));
    } else {
      ctx.showToast('Could not copy');
    }
  };

  btnEndStats.onclick = () => showStatsModal(ctx);
  btnEndExplore.onclick = () => ctx.endGame();
  gameClose.onclick = () => ctx.endGame();

  if (_dailyManager) {
    _dailyManager.recordResult({
      grade,
      scoreOverOptimal: _engine.getScoreOverOptimal(),
      picks: state.picks,
      pathLength: state.pathLength,
      optimalLength: state.optimalLength,
    });
  }
}

/**
 * Show statistics modal.
 */
export function showStatsModal(ctx) {
  const { _dailyManager, statsModal, statsPlayed, statsWinPct,
          statsCurStreak, statsMaxStreak, statsDistribution,
          btnStatsClose, statsCloseX } = ctx;

  const stats = _dailyManager ? _dailyManager.getStats() : null;

  if (stats) {
    statsPlayed.textContent = stats.played || 0;
    statsWinPct.textContent = (stats.winPct || 0) + '%';
    statsCurStreak.textContent = stats.currentStreak || 0;
    statsMaxStreak.textContent = stats.maxStreak || 0;
  }

  statsDistribution.innerHTML = '';
  const buckets = stats ? (stats.distribution || {}) : {};
  const labels = ['0', '1', '2', '3', '4+'];
  const maxCount = Math.max(1, ...labels.map(l => buckets[l] || 0));

  labels.forEach(label => {
    const count = buckets[label] || 0;
    const row = document.createElement('div');
    row.className = 'dist-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'dist-label';
    labelEl.textContent = '+' + label;

    const bar = document.createElement('div');
    bar.className = 'dist-bar';
    bar.style.width = `${(count / maxCount) * 100}%`;

    const countEl = document.createElement('span');
    countEl.className = 'dist-count';
    countEl.textContent = count;

    row.appendChild(labelEl);
    row.appendChild(bar);
    row.appendChild(countEl);
    statsDistribution.appendChild(row);
  });

  statsModal.classList.remove('hidden');
  if (btnStatsClose) btnStatsClose.onclick = () => statsModal.classList.add('hidden');
  if (statsCloseX) statsCloseX.onclick = () => statsModal.classList.add('hidden');
}
