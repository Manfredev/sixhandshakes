/**
 * graph-render.js — D3 data join for nodes and edges
 */

import { COLORS } from '../utils/constants.js';
import { initials, truncate } from '../utils/helpers.js';

/** Radius for a node circle based on type */
export function nodeRadius(d) {
  return d.isUser ? 32 : 40;
}

/** Count how many edges connect to a given node */
function connectionCount(nodeId, edges) {
  return edges.filter(
    e => (e.source.id || e.source) === nodeId || (e.target.id || e.target) === nodeId
  ).length;
}

/**
 * Full D3 data join — edges and nodes.
 * @param {object} ctx  Shared graph context
 */
export function render(ctx) {
  const { nodes, edges, defs, edgesGroup, nodesGroup, simulation, drag,
          onNodeClick, onNodeExpand, highlightActive, highlightedNodeIds, highlightedEdgeIds,
          updateBadge } = ctx;

  // ── Edges ───────────────────────────────────────────────────

  const edgeSel = edgesGroup.selectAll('.edge')
    .data(edges, d => d.id);

  edgeSel.exit()
    .transition().duration(200)
    .attr('stroke-opacity', 0)
    .remove();

  const edgeEnter = edgeSel.enter()
    .append('line')
    .attr('class', 'edge')
    .attr('stroke', COLORS.edgeStroke)
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0);

  edgeEnter.transition().duration(400)
    .attr('stroke-opacity', 1);

  edgeEnter.append('title')
    .text(d => d.relationship || '');

  // ── Nodes ───────────────────────────────────────────────────

  const nodeSel = nodesGroup.selectAll('.node')
    .data(nodes, d => d.id);

  // Exit
  nodeSel.exit()
    .transition().duration(300)
    .attr('opacity', 0)
    .remove();

  // Enter
  const nodeEnter = nodeSel.enter()
    .append('g')
    .attr('class', 'node')
    .attr('cursor', 'pointer')
    .attr('opacity', 0)
    .attr('transform', d => `translate(${d.x || 0},${d.y || 0}) scale(0.5)`)
    .call(drag);

  // Spring entrance: scale from 0.5 → 1 with back-out easing
  nodeEnter.transition().duration(500).ease(d3.easeBackOut.overshoot(1.4))
    .attr('opacity', 1)
    .attr('transform', d => `translate(${d.x || 0},${d.y || 0}) scale(1)`);

  // ClipPath per node (in defs)
  nodeEnter.each(function(d) {
    defs.append('clipPath')
      .attr('id', `clip-${d.id}`)
      .append('circle')
      .attr('r', nodeRadius(d));
  });

  // Photo image (clipped to circle)
  nodeEnter.append('image')
    .attr('class', 'node-photo')
    .attr('clip-path', d => `url(#clip-${d.id})`)
    .attr('x', d => -nodeRadius(d))
    .attr('y', d => -nodeRadius(d))
    .attr('width', d => nodeRadius(d) * 2)
    .attr('height', d => nodeRadius(d) * 2)
    .attr('preserveAspectRatio', 'xMidYMid slice')
    .attr('href', d => d.photoUrl || null)
    .attr('display', d => d.photoUrl ? null : 'none');

  // Initials text (shown when no photo)
  nodeEnter.append('text')
    .attr('class', 'node-initials')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-family', "'IBM Plex Mono', monospace")
    .attr('font-size', '18px')
    .attr('fill', COLORS.textDim)
    .attr('pointer-events', 'none')
    .text(d => initials(d.name))
    .attr('display', d => d.photoUrl ? 'none' : null);

  // Border ring
  nodeEnter.append('circle')
    .attr('class', 'node-ring')
    .attr('r', d => nodeRadius(d))
    .attr('fill', 'none')
    .attr('stroke', d => d.isUser ? COLORS.paper : COLORS.gold)
    .attr('stroke-width', 2.5);

  // Name label below the circle
  nodeEnter.append('text')
    .attr('class', 'node-label')
    .attr('y', d => nodeRadius(d) + 16)
    .attr('text-anchor', 'middle')
    .attr('font-family', "'IBM Plex Mono', monospace")
    .attr('font-size', '11px')
    .attr('fill', COLORS.text)
    .attr('pointer-events', 'none')
    .style('text-shadow', '0 1px 3px rgba(0,0,0,0.8)')
    .text(d => truncate(d.name));

  // Expand badge group
  const badge = nodeEnter.append('g')
    .attr('class', 'expand-badge')
    .attr('transform', d => {
      const r = nodeRadius(d);
      const angle = Math.PI / 4; // 45° bottom-right
      return `translate(${Math.cos(angle) * r},${Math.sin(angle) * r})`;
    })
    .attr('cursor', 'pointer')
    .attr('display', d => (!d.expanded && !d.expanding) ? null : 'none');

  badge.append('circle')
    .attr('r', 7)
    .attr('fill', COLORS.red);

  badge.append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-family', "'IBM Plex Mono', monospace")
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .attr('fill', '#FFFFFF')
    .attr('pointer-events', 'none')
    .text('+');

  // Badge click → expand
  badge.on('click', (event, d) => {
    event.stopPropagation();
    if (onNodeExpand()) {
      d.expanding = true;
      updateBadge(d);
      onNodeExpand()(d);
    }
  });

  // Node click (not on badge)
  nodeEnter.on('click', (event, d) => {
    if (event.defaultPrevented) return;
    if (onNodeClick()) onNodeClick()(d);
  });

  // ── Hover interactions ──────────────────────────────────────

  nodeEnter
    .on('mouseenter', function(event, d) {
      if (highlightActive()) return;
      d3.select(this)
        .transition().duration(150)
        .attr('transform', `translate(${d.x},${d.y}) scale(1.1)`);

      const nodeId = d.id;
      edgesGroup.selectAll('.edge')
        .filter(e => (e.source.id || e.source) === nodeId || (e.target.id || e.target) === nodeId)
        .transition().duration(150)
        .attr('stroke', COLORS.red + '80')
        .attr('stroke-width', 2);
    })
    .on('mouseleave', function(event, d) {
      if (highlightActive()) return;
      d3.select(this)
        .transition().duration(150)
        .attr('transform', `translate(${d.x},${d.y}) scale(1)`);

      const nodeId = d.id;
      edgesGroup.selectAll('.edge')
        .filter(e => (e.source.id || e.source) === nodeId || (e.target.id || e.target) === nodeId)
        .transition().duration(150)
        .attr('stroke', COLORS.edgeStroke)
        .attr('stroke-width', 1.5);
    });

  // ── Update (merge) ──────────────────────────────────────────
  const allNodes = nodeEnter.merge(nodeSel);

  allNodes.select('.node-photo')
    .attr('href', d => d.photoUrl || null)
    .attr('display', d => d.photoUrl ? null : 'none');

  allNodes.select('.node-initials')
    .attr('display', d => d.photoUrl ? 'none' : null);

  // ── Restart simulation with fresh data ──────────────────────

  simulation.nodes(nodes);
  simulation.force('link').links(edges);

  // Recompute link strength (depends on current edge count)
  simulation.force('link').strength(d => {
    const srcId = d.source.id || d.source;
    const tgtId = d.target.id || d.target;
    return 1 / Math.min(
      connectionCount(srcId, edges) || 1,
      connectionCount(tgtId, edges) || 1
    );
  });
}
