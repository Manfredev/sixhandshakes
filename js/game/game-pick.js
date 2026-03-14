/**
 * game-pick.js — Unified pick flow with persistent chain nodes
 */

import { makeGameNodeId } from '../utils/ids.js';
import { drawEdge, drawEdgeLabel } from './game-rendering.js';

/**
 * Handle the user picking an option.
 * Both green and yellow picks place the node on the chain line,
 * differing only in size, color, and whether _totalSlots increments.
 */
export function handlePick(ctx, option, nodeG, edge, stepIndex, optionIndex, ox, oy) {
  const { _engine, _puzzle, _optionEls, _pathNodes, _detourNodes, _svg, graph, _previousPick } = ctx;

  // Disable all option clicks
  _optionEls.forEach(o => o.el.style('cursor', 'default').on('click', null));

  // Hide tooltip
  const tooltip = document.getElementById('game-tooltip');
  if (tooltip) tooltip.classList.add('hidden');

  const result = _engine.pickOption(option);
  const cy = ctx.centerY();
  const isGreen = result.result === 'green';

  const current = _pathNodes[_pathNodes.length - 1];

  // Increment handshake count
  ctx._handshakeCount++;

  // If yellow: expand total slots + relayout existing nodes
  if (!isGreen) {
    ctx._totalSlots++;
    ctx.relayoutChain();
  }

  // Calculate new node position (always on center line)
  const nodeSlot = ctx._handshakeCount;
  const nodeX = ctx.pathX(nodeSlot, ctx._totalSlots);
  const nodeR = isGreen ? 28 : 20;
  const scaleRatio = nodeR / 24; // options are drawn at r=24

  // Re-parent node from options layer to nodes layer
  _svg.select('.layer-nodes').node().appendChild(nodeG.node());

  // Animate node to chain position
  nodeG.transition().duration(500).ease(d3.easeCubicInOut)
    .attr('transform', `translate(${nodeX},${cy}) scale(${scaleRatio})`);

  // Color the ring
  nodeG.select('.gnode-ring').transition().duration(300)
    .attr('class', `gnode-ring gnode-ring-${isGreen ? 'green' : 'yellow'}`);

  // Fade out option edge, draw persistent chain edge
  edge.transition().duration(300).attr('opacity', 0).remove();

  const chainEdge = drawEdge(
    _svg.select('.layer-edges'),
    current.x, current.y, nodeX, cy,
    isGreen ? 'gedge-path' : 'gedge-detour-solid'
  );
  // Animate edge drawing
  const len = Math.hypot(nodeX - current.x, cy - current.y);
  chainEdge.attr('stroke-dasharray', len).attr('stroke-dashoffset', len)
    .transition().delay(200).duration(400).ease(d3.easeCubicOut)
    .attr('stroke-dashoffset', 0);

  drawEdgeLabel(_svg, current.x, current.y, nodeX, cy, option.relationship);

  // Store in chain tracking arrays
  _pathNodes.push({ name: option.name, slot: nodeSlot, x: nodeX, y: cy, color: isGreen ? 'green' : 'yellow', nodeG });
  ctx._chainEdges.push({ fromSlot: nodeSlot - 1, toSlot: nodeSlot, color: isGreen ? 'green' : 'yellow', el: chainEdge });

  // Fade + remove unpicked options
  _optionEls.forEach((o, idx) => {
    if (idx === optionIndex) return;
    o.el.transition().duration(400).attr('opacity', 0).on('end', function() { d3.select(this).remove(); });
    o.edge.transition().duration(400).attr('opacity', 0).on('end', function() { d3.select(this).remove(); });
  });

  // Grain effect on yellow
  if (!isGreen) {
    const currentGrain = parseFloat(
      getComputedStyle(document.body).getPropertyValue('--grain-opacity')
    ) || 0.03;
    document.body.style.setProperty('--grain-opacity', Math.min(currentGrain + 0.012, 0.08));

    _detourNodes.push({ name: option.name, x: nodeX, y: cy });
  }

  // Add to explore graph
  const nodeId = makeGameNodeId(option.name);
  graph.addNode({ id: nodeId, name: option.name, photoUrl: option.photoUrl, depth: ctx._handshakeCount });
  const prevId = makeGameNodeId(_previousPick.name);
  graph.addEdge(prevId, nodeId, option.relationship || '', ctx._handshakeCount);
  ctx._previousPick = option;

  // Next step or end
  setTimeout(() => {
    if (result.gameOver) {
      ctx.animateConnection(() => ctx.showEndScreen());
    } else {
      ctx.renderStep(result.nextStepIndex);
    }
  }, 700);
}
