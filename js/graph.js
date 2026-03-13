/* ============================================
   SIX HANDSHAKES — D3 Force-Directed Graph Engine

   Manages force simulation, SVG rendering, and
   user interactions for the connection graph.

   Dependencies: D3.js v7 (loaded globally via CDN)
   ============================================ */

// ── Design tokens (mirrored from CSS) ──────────────────────────────

const COLORS = {
  bg:       '#0A0A0C',
  surface:  '#14141A',
  surfaceUp:'#1E1E28',
  red:      '#E63228',
  redGlow:  '#FF6B5A',
  gold:     '#C4A35A',
  text:     '#E8E4DF',
  textDim:  '#9A9490',
  paper:    '#F5F0E8',
};

// Edge stroke: red at very low opacity
const EDGE_COLOR = '#E6322825';

// ── Helpers ─────────────────────────────────────────────────────────

/** Radius for a node circle based on type */
function nodeRadius(d) {
  return d.isUser ? 32 : 40;
}

/** Extract two-letter initials from a name */
function initials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Truncate a name to maxLen chars with ellipsis */
function truncate(str, maxLen = 16) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen - 1) + '…' : str;
}

/** Generate a unique node ID from a name */
function makeNodeId(name) {
  return `node_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
}

/** Generate an edge ID from source and target IDs */
function makeEdgeId(sourceId, targetId) {
  return `edge_${sourceId}_${targetId}`;
}

/** Count how many edges connect to a given node */
function connectionCount(nodeId, edges) {
  return edges.filter(
    e => (e.source.id || e.source) === nodeId || (e.target.id || e.target) === nodeId
  ).length;
}


// ── Main factory ────────────────────────────────────────────────────

/**
 * Create and return a graph instance bound to the given SVG element.
 * @param {SVGSVGElement} svgElement — an existing <svg> element in the DOM
 * @returns {object} graph API
 */
export function createGraph(svgElement) {

  // ── State ───────────────────────────────────────────────────────

  let nodes = [];
  let edges = [];
  let width  = svgElement.clientWidth  || 960;
  let height = svgElement.clientHeight || 600;

  // Callbacks
  let _onNodeClick  = null;
  let _onNodeExpand = null;

  // Track whether a path highlight is active
  let _highlightActive = false;
  let _highlightedNodeIds = new Set();
  let _highlightedEdgeIds = new Set();
  let _travelingDot = null;

  // ── SVG scaffolding ─────────────────────────────────────────────

  const svg = d3.select(svgElement)
    .attr('width', width)
    .attr('height', height);

  // Clear any prior content
  svg.selectAll('*').remove();

  // Defs: glow filter + clipPaths added per node
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

  // Root container for zoom/pan
  const root = svg.append('g').attr('id', 'graph-root');
  const edgesGroup = root.append('g').attr('id', 'edges-group');
  const nodesGroup = root.append('g').attr('id', 'nodes-group');

  // ── Zoom behavior ───────────────────────────────────────────────

  const zoom = d3.zoom()
    .scaleExtent([0.2, 4])
    .on('zoom', (event) => {
      root.attr('transform', event.transform);
    });

  svg.call(zoom);

  // Double-click to reset zoom
  svg.on('dblclick.zoom', () => {
    svg.transition().duration(500)
      .call(zoom.transform, d3.zoomIdentity);
  });

  // ── Drag behavior ───────────────────────────────────────────────

  const drag = d3.drag()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.1).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on('drag', (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });

  // ── Force simulation ────────────────────────────────────────────

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(edges)
      .id(d => d.id)
      .distance(d => 120 + (d.depth || 0) * 30)
      .strength(d => {
        const srcId = d.source.id || d.source;
        const tgtId = d.target.id || d.target;
        return 1 / Math.min(
          connectionCount(srcId, edges) || 1,
          connectionCount(tgtId, edges) || 1
        );
      })
    )
    .force('charge', d3.forceManyBody().strength(-300).distanceMax(500))
    .force('collide', d3.forceCollide()
      .radius(d => nodeRadius(d) + 10)
      .strength(0.8)
    )
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('radial', d3.forceRadial(
      d => (d.depth || 0) * 180,
      width / 2,
      height / 2
    ).strength(0.3))
    .velocityDecay(0.4)
    .alphaDecay(0.02)
    .on('tick', tick);

  // ── Tick: update positions ──────────────────────────────────────

  function tick() {
    edgesGroup.selectAll('.edge')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    nodesGroup.selectAll('.node')
      .attr('transform', d => `translate(${d.x},${d.y})`);
  }

  // ── Render: D3 data join ────────────────────────────────────────

  function render() {
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
      .attr('stroke', EDGE_COLOR)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0);

    edgeEnter.transition().duration(400)
      .attr('stroke-opacity', 1);

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
      .call(drag);

    // Fade in
    nodeEnter.transition().duration(400)
      .attr('opacity', 1);

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
      if (_onNodeExpand) {
        d.expanding = true;
        updateBadge(d);
        _onNodeExpand(d);
      }
    });

    // Node click (not on badge)
    nodeEnter.on('click', (event, d) => {
      // Ignore if it was on the expand badge
      if (event.defaultPrevented) return;
      if (_onNodeClick) _onNodeClick(d);
    });

    // ── Hover interactions ──────────────────────────────────────

    nodeEnter
      .on('mouseenter', function(event, d) {
        if (_highlightActive) return;
        d3.select(this)
          .transition().duration(150)
          .attr('transform', `translate(${d.x},${d.y}) scale(1.1)`);

        // Brighten connected edges
        const nodeId = d.id;
        edgesGroup.selectAll('.edge')
          .filter(e => (e.source.id || e.source) === nodeId || (e.target.id || e.target) === nodeId)
          .transition().duration(150)
          .attr('stroke', COLORS.red + '80')
          .attr('stroke-width', 2);
      })
      .on('mouseleave', function(event, d) {
        if (_highlightActive) return;
        d3.select(this)
          .transition().duration(150)
          .attr('transform', `translate(${d.x},${d.y}) scale(1)`);

        // Revert connected edges
        const nodeId = d.id;
        edgesGroup.selectAll('.edge')
          .filter(e => (e.source.id || e.source) === nodeId || (e.target.id || e.target) === nodeId)
          .transition().duration(150)
          .attr('stroke', EDGE_COLOR)
          .attr('stroke-width', 1.5);
      });

    // ── Update (merge) ──────────────────────────────────────────
    // Update existing nodes' labels and photos on re-render
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

  // ── Update expand badge state for a node ────────────────────────

  function updateBadge(d) {
    nodesGroup.selectAll('.node')
      .filter(n => n.id === d.id)
      .select('.expand-badge')
      .attr('display', (!d.expanded && !d.expanding) ? null : 'none');

    // If expanding, we could show a loading indicator. For now,
    // hiding the badge is sufficient visual feedback.
    if (d.expanding) {
      nodesGroup.selectAll('.node')
        .filter(n => n.id === d.id)
        .select('.node-ring')
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
    }
  }

  // ── Path Highlight Animation ────────────────────────────────────

  function highlightPath(nodeIds) {
    if (!nodeIds || nodeIds.length < 2) return;

    _highlightActive = true;
    _highlightedNodeIds = new Set(nodeIds);
    _highlightedEdgeIds = new Set();

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
        _highlightedEdgeIds.add(edge.id);
      }
    }

    // Fade non-path nodes
    nodesGroup.selectAll('.node')
      .transition().duration(400)
      .attr('opacity', d => _highlightedNodeIds.has(d.id) ? 1 : 0.25);

    // Fade non-path edges, highlight path edges
    edgesGroup.selectAll('.edge')
      .transition().duration(400)
      .attr('stroke', d => _highlightedEdgeIds.has(d.id) ? COLORS.red : EDGE_COLOR)
      .attr('stroke-opacity', d => _highlightedEdgeIds.has(d.id) ? 0.7 : 0.08)
      .attr('stroke-width', d => _highlightedEdgeIds.has(d.id) ? 2.5 : 1.5)
      .attr('filter', d => _highlightedEdgeIds.has(d.id) ? 'url(#glow)' : null);

    // Create traveling dot
    _travelingDot = root.append('circle')
      .attr('class', 'traveling-dot')
      .attr('r', 4)
      .attr('fill', COLORS.redGlow)
      .attr('pointer-events', 'none');

    // Position at first node
    const firstNode = nodes.find(n => n.id === nodeIds[0]);
    if (firstNode) {
      _travelingDot
        .attr('cx', firstNode.x)
        .attr('cy', firstNode.y);
    }

    // Animate dot along path edges sequentially
    animateDotAlongPath(pathEdges, nodeIds, 0);
  }

  function animateDotAlongPath(pathEdges, nodeIds, index) {
    if (!_travelingDot || index >= pathEdges.length) {
      // Animation complete — remove dot but keep highlight
      if (_travelingDot) {
        _travelingDot.transition().duration(200)
          .attr('opacity', 0)
          .remove();
        _travelingDot = null;
      }
      return;
    }

    const edge = pathEdges[index];
    const srcId = nodeIds[index];
    const tgtId = nodeIds[index + 1];

    // Determine actual source/target positions from the edge
    const srcNode = nodes.find(n => n.id === srcId);
    const tgtNode = nodes.find(n => n.id === tgtId);

    if (!srcNode || !tgtNode) return;

    // Pulse the source node at the start
    pulseNode(srcId);

    // Move dot from source to target
    _travelingDot
      .transition().duration(600).ease(d3.easeQuadInOut)
      .attr('cx', tgtNode.x)
      .attr('cy', tgtNode.y)
      .on('end', () => {
        // Pulse target node
        pulseNode(tgtId);

        // Pause 200ms at node, then continue
        setTimeout(() => {
          animateDotAlongPath(pathEdges, nodeIds, index + 1);
        }, 200);
      });
  }

  function pulseNode(nodeId) {
    nodesGroup.selectAll('.node')
      .filter(d => d.id === nodeId)
      .transition().duration(150)
      .attr('transform', d => `translate(${d.x},${d.y}) scale(1.15)`)
      .transition().duration(150)
      .attr('transform', d => `translate(${d.x},${d.y}) scale(1)`);
  }

  function clearHighlight() {
    _highlightActive = false;
    _highlightedNodeIds.clear();
    _highlightedEdgeIds.clear();

    // Remove traveling dot
    if (_travelingDot) {
      _travelingDot.remove();
      _travelingDot = null;
    }
    root.selectAll('.traveling-dot').remove();

    // Restore node opacities
    nodesGroup.selectAll('.node')
      .transition().duration(400)
      .attr('opacity', 1);

    // Restore edge styling
    edgesGroup.selectAll('.edge')
      .transition().duration(400)
      .attr('stroke', EDGE_COLOR)
      .attr('stroke-opacity', 1)
      .attr('stroke-width', 1.5)
      .attr('filter', null);
  }

  // ── Center on node with smooth zoom/pan ─────────────────────────

  function centerOnNode(id) {
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

  // ── Node expansion positioning ──────────────────────────────────

  /**
   * Position a new node relative to a parent in a fan pattern.
   * @param {object} newNode — the new node (x, y will be set)
   * @param {object} parentNode — the existing connected node
   * @param {number} siblingIndex — index among new siblings
   * @param {number} siblingCount — total new siblings being added
   */
  function positionNewNode(newNode, parentNode, siblingIndex, siblingCount) {
    // Angle from center of graph to parent
    const cx = width / 2;
    const cy = height / 2;
    const baseAngle = Math.atan2(parentNode.y - cy, parentNode.x - cx);

    // Spread siblings in a fan around the parent's outward direction
    const spreadAngle = Math.PI / 4; // 45° between siblings
    const totalSpread = (siblingCount - 1) * spreadAngle;
    const startAngle = baseAngle - totalSpread / 2;
    const angle = startAngle + siblingIndex * spreadAngle;

    const distance = 150;
    newNode.x = parentNode.x + Math.cos(angle) * distance;
    newNode.y = parentNode.y + Math.sin(angle) * distance;
  }

  // ── Public API ──────────────────────────────────────────────────

  const api = {

    /**
     * Add a node to the graph.
     * @param {object} nodeData — { id?, name, photoUrl, wikiTitle?, isUser, isTarget, depth, expanded?, expanding? }
     * @returns {object} the created/resolved node
     */
    addNode(nodeData) {
      // Generate ID if not provided
      if (!nodeData.id) {
        nodeData.id = makeNodeId(nodeData.name);
      }

      // Default flags
      nodeData.expanded  = nodeData.expanded  ?? false;
      nodeData.expanding = nodeData.expanding ?? false;
      nodeData.depth     = nodeData.depth     ?? 0;

      // Avoid duplicate IDs — if it already exists, return existing
      const existing = nodes.find(n => n.id === nodeData.id);
      if (existing) {
        Object.assign(existing, nodeData);
        render();
        return existing;
      }

      nodes.push(nodeData);
      render();
      simulation.alpha(0.3).restart();
      return nodeData;
    },

    /**
     * Add an edge between two nodes.
     * @param {string} sourceId
     * @param {string} targetId
     * @param {string} relationship — description of how they met
     * @param {number} depth — depth level for layout
     * @returns {object|null} the edge, or null if source/target not found
     */
    addEdge(sourceId, targetId, relationship, depth) {
      // Verify both nodes exist
      if (!nodes.find(n => n.id === sourceId) || !nodes.find(n => n.id === targetId)) {
        console.warn(`[Graph] Cannot add edge: missing node(s) ${sourceId} → ${targetId}`);
        return null;
      }

      const edgeId = makeEdgeId(sourceId, targetId);

      // Avoid duplicate edges
      const existing = edges.find(e => e.id === edgeId);
      if (existing) return existing;

      const edge = {
        id: edgeId,
        source: sourceId,
        target: targetId,
        relationship: relationship || '',
        depth: depth ?? 0,
      };

      // Before adding, position new nodes (find any newly-added node)
      const parentNode = nodes.find(n => n.id === sourceId);
      const childNode  = nodes.find(n => n.id === targetId);

      // If the child node has no x/y yet and parent does, fan-position it
      if (childNode && parentNode && parentNode.x != null && childNode.x == null) {
        // Count existing siblings added from same parent in this batch
        const existingSiblings = edges.filter(
          e => (e.source.id || e.source) === sourceId
        ).length;
        positionNewNode(childNode, parentNode, existingSiblings, existingSiblings + 1);
      }

      edges.push(edge);
      render();
      simulation.alpha(0.3).restart();
      return edge;
    },

    /**
     * Remove a node and all connected edges.
     * @param {string} id
     */
    removeNode(id) {
      // Remove connected edges first
      for (let i = edges.length - 1; i >= 0; i--) {
        const e = edges[i];
        const srcId = e.source.id || e.source;
        const tgtId = e.target.id || e.target;
        if (srcId === id || tgtId === id) {
          edges.splice(i, 1);
        }
      }

      // Remove the node
      const idx = nodes.findIndex(n => n.id === id);
      if (idx !== -1) nodes.splice(idx, 1);

      // Remove clipPath from defs
      defs.select(`#clip-${id}`).remove();

      render();
      simulation.alpha(0.3).restart();
    },

    /** Get a single node by ID */
    getNode(id) {
      return nodes.find(n => n.id === id) || null;
    },

    /** Get all nodes */
    getNodes() {
      return nodes;
    },

    /** Get all edges */
    getEdges() {
      return edges;
    },

    /** Return array of all node names currently in the graph */
    getNodeNames() {
      return nodes.map(n => n.name);
    },

    /** Highlight a path of node IDs */
    highlightPath,

    /** Clear any active path highlight */
    clearHighlight,

    /** Smooth zoom/pan to center on a node */
    centerOnNode,

    /**
     * Update a node's photo URL (e.g., after async Wikipedia fetch).
     * @param {string} id
     * @param {string} photoUrl
     */
    updateNodePhoto(id, photoUrl) {
      const node = nodes.find(n => n.id === id);
      if (!node) return;

      node.photoUrl = photoUrl;

      // Update the specific node's image and initials visibility
      const nodeSel = nodesGroup.selectAll('.node')
        .filter(d => d.id === id);

      nodeSel.select('.node-photo')
        .attr('href', photoUrl)
        .attr('display', photoUrl ? null : 'none');

      nodeSel.select('.node-initials')
        .attr('display', photoUrl ? 'none' : null);
    },

    /**
     * Register a callback for node clicks.
     * @param {function} callback — receives (node)
     */
    onNodeClick(callback) {
      _onNodeClick = callback;
    },

    /**
     * Register a callback for expand badge clicks.
     * @param {function} callback — receives (node)
     */
    onNodeExpand(callback) {
      _onNodeExpand = callback;
    },

    /**
     * Update dimensions on window resize and recenter forces.
     */
    resize() {
      width  = svgElement.clientWidth  || 960;
      height = svgElement.clientHeight || 600;

      svg.attr('width', width).attr('height', height);

      simulation.force('center', d3.forceCenter(width / 2, height / 2));
      simulation.force('radial', d3.forceRadial(
        d => (d.depth || 0) * 180,
        width / 2,
        height / 2
      ).strength(0.3));

      simulation.alpha(0.3).restart();
    },
  };

  return api;
}
