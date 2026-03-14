/**
 * graph.js — D3 Force-Directed Graph Engine (orchestrator)
 *
 * Dependencies: D3.js v7 (loaded globally via CDN)
 */

import { COLORS } from '../utils/constants.js';
import { makeEdgeId } from '../utils/ids.js';
import { render, nodeRadius } from './graph-render.js';
import { highlightPath, clearHighlight, centerOnNode } from './graph-highlight.js';
import { updateBadge, showLoadingState, hideLoadingState } from './graph-loading.js';

/**
 * Create and return a graph instance bound to the given SVG element.
 * @param {SVGSVGElement} svgElement
 * @returns {object} graph API
 */
export function createGraph(svgElement) {

  // ── State ───────────────────────────────────────────────────────

  let nodes = [];
  let edges = [];
  let width  = svgElement.clientWidth  || 960;
  let height = svgElement.clientHeight || 600;

  let _onNodeClick  = null;
  let _onNodeExpand = null;

  // ── SVG scaffolding ─────────────────────────────────────────────

  const svg = d3.select(svgElement)
    .attr('width', width)
    .attr('height', height);

  svg.selectAll('*').remove();

  const defs = svg.append('defs');

  // Glow filter for highlighted path edges
  const glowFilter = defs.append('filter')
    .attr('id', 'glow')
    .attr('x', '-50%').attr('y', '-50%')
    .attr('width', '200%').attr('height', '200%');
  glowFilter.append('feGaussianBlur')
    .attr('stdDeviation', '3')
    .attr('result', 'blur');
  glowFilter.append('feComposite')
    .attr('in', 'SourceGraphic')
    .attr('in2', 'blur')
    .attr('operator', 'over');

  const root = svg.append('g').attr('id', 'graph-root');
  const edgesGroup = root.append('g').attr('id', 'edges-group');
  const nodesGroup = root.append('g').attr('id', 'nodes-group');

  // ── Zoom ───────────────────────────────────────────────────────

  const zoom = d3.zoom()
    .scaleExtent([0.2, 4])
    .on('zoom', (event) => {
      root.attr('transform', event.transform);
    });

  svg.call(zoom);
  svg.on('dblclick.zoom', () => {
    svg.transition().duration(500)
      .call(zoom.transform, d3.zoomIdentity);
  });

  // ── Drag ───────────────────────────────────────────────────────

  const drag = d3.drag()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.1).restart();
      d.fx = d.x; d.fy = d.y;
    })
    .on('drag', (event, d) => {
      d.fx = event.x; d.fy = event.y;
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
    });

  // ── Force simulation ────────────────────────────────────────────

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(edges).id(d => d.id)
      .distance(d => 120 + (d.depth || 0) * 30)
    )
    .force('charge', d3.forceManyBody().strength(-300).distanceMax(500))
    .force('collide', d3.forceCollide()
      .radius(d => nodeRadius(d) + 10).strength(0.8))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('radial', d3.forceRadial(
      d => (d.depth || 0) * 180, width / 2, height / 2
    ).strength(0.3))
    .velocityDecay(0.4)
    .alphaDecay(0.02)
    .on('tick', () => {
      edgesGroup.selectAll('.edge')
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodesGroup.selectAll('.node')
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

  // ── Shared context for sub-modules ──────────────────────────────

  const ctx = {
    nodes, edges, svg, root, defs, edgesGroup, nodesGroup, simulation, drag, zoom,
    get width() { return width; },
    get height() { return height; },
    // Highlight state
    _highlightActive: false,
    _highlightedNodeIds: new Set(),
    _highlightedEdgeIds: new Set(),
    _travelingDot: null,
    // Accessor wrappers so render callbacks can read current values
    onNodeClick: () => _onNodeClick,
    onNodeExpand: () => _onNodeExpand,
    highlightActive: () => ctx._highlightActive,
    updateBadge: (d) => updateBadge(ctx, d),
  };

  function doRender() {
    render(ctx);
  }

  // ── Node expansion positioning ──────────────────────────────────

  function positionNewNode(newNode, parentNode, siblingIndex, siblingCount) {
    const cx = width / 2;
    const cy = height / 2;
    const baseAngle = Math.atan2(parentNode.y - cy, parentNode.x - cx);
    const spreadAngle = Math.PI / 4;
    const totalSpread = (siblingCount - 1) * spreadAngle;
    const startAngle = baseAngle - totalSpread / 2;
    const angle = startAngle + siblingIndex * spreadAngle;
    const distance = 150;
    newNode.x = parentNode.x + Math.cos(angle) * distance;
    newNode.y = parentNode.y + Math.sin(angle) * distance;
  }

  // ── Public API ──────────────────────────────────────────────────

  const api = {

    addNode(nodeData) {
      if (!nodeData.id) {
        nodeData.id = `node_${nodeData.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
      }
      nodeData.expanded  = nodeData.expanded  ?? false;
      nodeData.expanding = nodeData.expanding ?? false;
      nodeData.depth     = nodeData.depth     ?? 0;

      const existing = nodes.find(n => n.id === nodeData.id);
      if (existing) {
        Object.assign(existing, nodeData);
        doRender();
        return existing;
      }

      nodes.push(nodeData);
      doRender();
      simulation.alpha(0.3).restart();
      return nodeData;
    },

    addEdge(sourceId, targetId, relationship, depth) {
      if (!nodes.find(n => n.id === sourceId) || !nodes.find(n => n.id === targetId)) {
        console.warn(`[Graph] Cannot add edge: missing node(s) ${sourceId} → ${targetId}`);
        return null;
      }

      const edgeId = makeEdgeId(sourceId, targetId);
      const existing = edges.find(e => e.id === edgeId);
      if (existing) return existing;

      const edge = {
        id: edgeId,
        source: sourceId,
        target: targetId,
        relationship: relationship || '',
        depth: depth ?? 0,
      };

      const parentNode = nodes.find(n => n.id === sourceId);
      const childNode  = nodes.find(n => n.id === targetId);
      if (childNode && parentNode && parentNode.x != null && childNode.x == null) {
        const existingSiblings = edges.filter(
          e => (e.source.id || e.source) === sourceId
        ).length;
        positionNewNode(childNode, parentNode, existingSiblings, existingSiblings + 1);
      }

      edges.push(edge);
      doRender();
      simulation.alpha(0.3).restart();
      return edge;
    },

    removeNode(id) {
      for (let i = edges.length - 1; i >= 0; i--) {
        const e = edges[i];
        const srcId = e.source.id || e.source;
        const tgtId = e.target.id || e.target;
        if (srcId === id || tgtId === id) edges.splice(i, 1);
      }
      const idx = nodes.findIndex(n => n.id === id);
      if (idx !== -1) nodes.splice(idx, 1);
      defs.select(`#clip-${id}`).remove();
      doRender();
      simulation.alpha(0.3).restart();
    },

    getNode(id)    { return nodes.find(n => n.id === id) || null; },
    getNodes()     { return nodes; },
    getEdges()     { return edges; },
    getNodeNames() { return nodes.map(n => n.name); },

    showLoadingState(nodeId) { showLoadingState(ctx, nodeId); },
    hideLoadingState(nodeId) { hideLoadingState(ctx, nodeId); },
    highlightPath(nodeIds)   { highlightPath(ctx, nodeIds); },
    clearHighlight()         { clearHighlight(ctx); },
    centerOnNode(id)         { centerOnNode(ctx, id); },

    updateNodePhoto(id, photoUrl) {
      const node = nodes.find(n => n.id === id);
      if (!node) return;
      node.photoUrl = photoUrl;
      const nodeSel = nodesGroup.selectAll('.node').filter(d => d.id === id);
      nodeSel.select('.node-photo')
        .attr('href', photoUrl)
        .attr('display', photoUrl ? null : 'none');
      nodeSel.select('.node-initials')
        .attr('display', photoUrl ? 'none' : null);
    },

    onNodeClick(callback)  { _onNodeClick = callback; },
    onNodeExpand(callback) { _onNodeExpand = callback; },

    resize() {
      width  = svgElement.clientWidth  || 960;
      height = svgElement.clientHeight || 600;
      svg.attr('width', width).attr('height', height);
      simulation.force('center', d3.forceCenter(width / 2, height / 2));
      simulation.force('radial', d3.forceRadial(
        d => (d.depth || 0) * 180, width / 2, height / 2
      ).strength(0.3));
      simulation.alpha(0.3).restart();
    },
  };

  return api;
}
