/**
 * graph-loading.js — Orbiting particles, glow ring, expand badge
 */

import { COLORS } from '../utils/constants.js';
import { nodeRadius } from './graph-render.js';

/**
 * Update expand badge state for a node.
 * @param {object} ctx  Shared graph context
 * @param {object} d    The node datum
 */
export function updateBadge(ctx, d) {
  const { nodesGroup } = ctx;

  const nodeGroup = nodesGroup.selectAll('.node')
    .filter(n => n.id === d.id);

  nodeGroup.select('.expand-badge')
    .attr('display', (!d.expanded && !d.expanding) ? null : 'none');

  if (d.expanding) {
    // Dashed stroke animation on the node ring
    nodeGroup.select('.node-ring')
      .transition().duration(300)
      .attr('stroke-dasharray', '4 4')
      .transition().duration(600).ease(d3.easeLinear)
      .attrTween('stroke-dashoffset', function() {
        return d3.interpolate(0, -16);
      })
      .on('end', function repeat() {
        if (!d.expanding) {
          d3.select(this)
            .attr('stroke-dasharray', null)
            .attr('stroke-dashoffset', null);
          return;
        }
        d3.select(this)
          .transition().duration(600).ease(d3.easeLinear)
          .attrTween('stroke-dashoffset', function() {
            return d3.interpolate(0, -16);
          })
          .on('end', repeat);
      });

    // Remove any existing loading elements first
    nodeGroup.selectAll('.loading-particles, .loading-glow').remove();

    const r = nodeRadius(d);

    // Orbiting particles — 3 circles at 120° offsets
    const particlesGroup = nodeGroup.append('g')
      .attr('class', 'loading-particles')
      .attr('pointer-events', 'none');

    [0, 120, 240].forEach((offset, i) => {
      const g = particlesGroup.append('g');
      g.append('circle')
        .attr('cx', r + 8)
        .attr('cy', 0)
        .attr('r', 3)
        .attr('fill', COLORS.red)
        .attr('opacity', [0.9, 0.6, 0.3][i]);
      g.append('animateTransform')
        .attr('attributeName', 'transform')
        .attr('type', 'rotate')
        .attr('from', `${offset} 0 0`)
        .attr('to', `${offset + 360} 0 0`)
        .attr('dur', '1.2s')
        .attr('repeatCount', 'indefinite');
    });

    // Pulsing glow ring
    const glowCircle = nodeGroup.append('circle')
      .attr('class', 'loading-glow')
      .attr('fill', 'none')
      .attr('stroke', COLORS.redGlow)
      .attr('stroke-width', 1.5)
      .attr('pointer-events', 'none')
      .attr('r', r + 2)
      .attr('opacity', 0.4);

    glowCircle.append('animate')
      .attr('attributeName', 'r')
      .attr('values', `${r + 2};${r + 12};${r + 2}`)
      .attr('dur', '1.5s')
      .attr('repeatCount', 'indefinite');

    glowCircle.append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '0.4;0;0.4')
      .attr('dur', '1.5s')
      .attr('repeatCount', 'indefinite');
  } else {
    // Clean up loading elements when not expanding
    nodeGroup.selectAll('.loading-particles, .loading-glow').remove();
  }
}

export function showLoadingState(ctx, nodeId) {
  const node = ctx.nodes.find(n => n.id === nodeId);
  if (!node) return;
  node.expanding = true;
  updateBadge(ctx, node);
}

export function hideLoadingState(ctx, nodeId) {
  const { nodes, nodesGroup } = ctx;
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return;
  node.expanding = false;
  node.expanded = true;
  updateBadge(ctx, node);

  // Fade out loading particles and glow over 300ms
  const nodeGroup = nodesGroup.selectAll('.node')
    .filter(n => n.id === nodeId);

  nodeGroup.selectAll('.loading-particles, .loading-glow')
    .transition().duration(300)
    .attr('opacity', 0)
    .remove();
}
