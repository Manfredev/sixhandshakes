/**
 * graph-highlight.js — Path highlight, traveling dot, pulse
 */

import { COLORS } from '../utils/constants.js';

/**
 * Highlight a path of node IDs.
 * @param {object} ctx  Shared graph context
 * @param {string[]} nodeIds  Ordered node IDs in the path
 */
export function highlightPath(ctx, nodeIds) {
  if (!nodeIds || nodeIds.length < 2) return;

  const { nodes, edges, root, nodesGroup, edgesGroup } = ctx;

  ctx._highlightActive = true;
  ctx._highlightedNodeIds = new Set(nodeIds);
  ctx._highlightedEdgeIds = new Set();

  // Build ordered list of edges along the path
  const pathEdges = [];
  for (let i = 0; i < nodeIds.length - 1; i++) {
    const srcId = nodeIds[i];
    const tgtId = nodeIds[i + 1];
    const edge = edges.find(e => {
      const eSrc = e.source.id || e.source;
      const eTgt = e.target.id || e.target;
      return (eSrc === srcId && eTgt === tgtId) ||
             (eSrc === tgtId && eTgt === srcId);
    });
    if (edge) {
      pathEdges.push(edge);
      ctx._highlightedEdgeIds.add(edge.id);
    }
  }

  // Fade non-path nodes
  nodesGroup.selectAll('.node')
    .transition().duration(400)
    .attr('opacity', d => ctx._highlightedNodeIds.has(d.id) ? 1 : 0.25);

  // Fade non-path edges, highlight path edges
  edgesGroup.selectAll('.edge')
    .transition().duration(400)
    .attr('stroke', d => ctx._highlightedEdgeIds.has(d.id) ? COLORS.red : COLORS.edgeStroke)
    .attr('stroke-opacity', d => ctx._highlightedEdgeIds.has(d.id) ? 0.7 : 0.08)
    .attr('stroke-width', d => ctx._highlightedEdgeIds.has(d.id) ? 2.5 : 1.5)
    .attr('filter', d => ctx._highlightedEdgeIds.has(d.id) ? 'url(#glow)' : null);

  // Create traveling dot
  ctx._travelingDot = root.append('circle')
    .attr('class', 'traveling-dot')
    .attr('r', 4)
    .attr('fill', COLORS.redGlow)
    .attr('pointer-events', 'none');

  // Position at first node
  const firstNode = nodes.find(n => n.id === nodeIds[0]);
  if (firstNode) {
    ctx._travelingDot
      .attr('cx', firstNode.x)
      .attr('cy', firstNode.y);
  }

  // Animate dot along path edges sequentially
  animateDotAlongPath(ctx, pathEdges, nodeIds, 0);
}

function animateDotAlongPath(ctx, pathEdges, nodeIds, index) {
  if (!ctx._travelingDot || index >= pathEdges.length) {
    if (ctx._travelingDot) {
      ctx._travelingDot.transition().duration(200)
        .attr('opacity', 0)
        .remove();
      ctx._travelingDot = null;
    }
    return;
  }

  const { nodes } = ctx;
  const srcId = nodeIds[index];
  const tgtId = nodeIds[index + 1];
  const srcNode = nodes.find(n => n.id === srcId);
  const tgtNode = nodes.find(n => n.id === tgtId);

  if (!srcNode || !tgtNode) return;

  pulseNode(ctx, srcId);

  ctx._travelingDot
    .transition().duration(600).ease(d3.easeQuadInOut)
    .attr('cx', tgtNode.x)
    .attr('cy', tgtNode.y)
    .on('end', () => {
      pulseNode(ctx, tgtId);
      setTimeout(() => {
        animateDotAlongPath(ctx, pathEdges, nodeIds, index + 1);
      }, 200);
    });
}

export function pulseNode(ctx, nodeId) {
  ctx.nodesGroup.selectAll('.node')
    .filter(d => d.id === nodeId)
    .transition().duration(150)
    .attr('transform', d => `translate(${d.x},${d.y}) scale(1.15)`)
    .transition().duration(150)
    .attr('transform', d => `translate(${d.x},${d.y}) scale(1)`);
}

export function clearHighlight(ctx) {
  ctx._highlightActive = false;
  ctx._highlightedNodeIds.clear();
  ctx._highlightedEdgeIds.clear();

  if (ctx._travelingDot) {
    ctx._travelingDot.remove();
    ctx._travelingDot = null;
  }
  ctx.root.selectAll('.traveling-dot').remove();

  ctx.nodesGroup.selectAll('.node')
    .transition().duration(400)
    .attr('opacity', 1);

  ctx.edgesGroup.selectAll('.edge')
    .transition().duration(400)
    .attr('stroke', COLORS.edgeStroke)
    .attr('stroke-opacity', 1)
    .attr('stroke-width', 1.5)
    .attr('filter', null);
}

/**
 * Smooth zoom/pan to center on a node.
 */
export function centerOnNode(ctx, id) {
  const { nodes, svg, zoom, width, height } = ctx;
  const node = nodes.find(n => n.id === id);
  if (!node) return;

  const scale = 1.2;
  const transform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(scale)
    .translate(-node.x, -node.y);

  svg.transition().duration(600).ease(d3.easeCubicInOut)
    .call(zoom.transform, transform);
}
