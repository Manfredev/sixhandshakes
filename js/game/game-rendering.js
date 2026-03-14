/**
 * game-rendering.js — SVG drawing primitives for game graph
 */

/** Initial letter for placeholder */
export function initial(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

/** Draw a node at (x,y). Returns the d3 group. */
export function drawNode(layer, { name, x, y, r, cls, photoUrl, showLabel, labelBelow }) {
  r = r || 28;
  const g = layer.append('g')
    .attr('transform', `translate(${x},${y})`)
    .attr('class', cls || '');

  g.append('circle')
    .attr('r', r)
    .attr('class', 'gnode-ring');

  g.append('circle')
    .attr('r', r - 2)
    .attr('class', 'gnode-fill');

  g.append('text')
    .attr('class', 'gnode-initial')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-size', r * 0.7)
    .text(initial(name));

  if (showLabel !== false) {
    const labelY = labelBelow !== false ? r + 18 : -(r + 10);
    g.append('text')
      .attr('class', 'gnode-label')
      .attr('y', labelY)
      .attr('text-anchor', 'middle')
      .text(name.length > 16 ? name.slice(0, 14) + '...' : name);
  }

  return g;
}

/** Draw an edge line between two points. */
export function drawEdge(layer, x1, y1, x2, y2, cls) {
  return layer.append('line')
    .attr('x1', x1).attr('y1', y1)
    .attr('x2', x2).attr('y2', y2)
    .attr('class', cls || 'gedge');
}

/** Draw a curved edge (quadratic bezier). */
export function drawCurvedEdge(layer, x1, y1, x2, y2, cls) {
  const mx = (x1 + x2) / 2;
  return layer.append('path')
    .attr('d', `M${x1},${y1} Q${mx},${y1} ${x2},${y2}`)
    .attr('class', cls || 'gedge')
    .attr('fill', 'none');
}

/** Draw a small relationship label at the midpoint of an edge. */
export function drawEdgeLabel(svg, x1, y1, x2, y2, text) {
  if (!text) return;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  svg.select('.layer-labels').append('text')
    .attr('x', mx)
    .attr('y', my - 6)
    .attr('text-anchor', 'middle')
    .attr('class', 'gedge-label')
    .text(text.length > 30 ? text.slice(0, 28) + '...' : text);
}
