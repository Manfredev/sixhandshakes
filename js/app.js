/**
 * app.js — Entry point for Six Handshakes
 *
 * Wires together the graph engine, Gemini AI client, Wikipedia service,
 * upload handler, and UI components. Manages the full user flow from
 * photo upload through graph building to path finding and visualization.
 *
 * Loaded as type="module" from index.html.
 */

import { createGraph } from './graph/graph.js';
import { createGeminiClient } from './gemini/gemini.js';
import { createWikipediaService } from './wikipedia.js';
import { initUpload } from './upload.js';
import { createUI } from './ui/ui.js';
import { createArcadeEngine } from './game/arcade.js';
import { createDailyManager } from './game/daily.js';
import { createSelectMode } from './game/select-mode.js';
import { makeExploreNodeId } from './utils/ids.js';
import { delay } from './utils/helpers.js';
import { readApiKey, saveApiKey, removeApiKey } from './utils/storage.js';

const LOG_PREFIX = '[App]';

// ── Application state ───────────────────────────────────────────────

let graph    = null;
let gemini   = null;
let wikipedia = null;
let upload   = null;
let ui       = null;
let arcade   = null;
let daily    = null;
let selectMode = null;

/** The name of the person the user wants to reach */
let targetPerson = null;

/** Map of name (lowercase) -> node ID for fast duplicate/lookup */
const nodeNameMap = new Map();

// ── Helpers ─────────────────────────────────────────────────────────

// generateNodeId is now makeExploreNodeId from utils/ids.js
const generateNodeId = makeExploreNodeId;

/**
 * Return the user node's name, or the first node added to the graph.
 * Used as the "from" anchor when finding paths.
 *
 * @returns {string|null}
 */
function getUserOrFirstNode() {
  const nodes = graph.getNodes();
  const userNode = nodes.find(n => n.isUser);
  if (userNode) return userNode.name;
  if (nodes.length > 0) return nodes[0].name;
  return null;
}

/**
 * Refresh the stats bar with current graph counts.
 */
function refreshStats() {
  ui.updateStats(graph.getNodes().length, graph.getEdges().length);
}

/**
 * Update the budget pill with current daily usage.
 */
function refreshBudget() {
  if (!gemini) return;
  const pill = document.getElementById('budget-pill');
  const countEl = document.getElementById('budget-count');
  if (!pill || !countEl) return;

  const usage = gemini.getDailyUsage();
  countEl.textContent = usage.remaining;

  pill.classList.remove('budget-low', 'budget-critical');
  if (usage.remaining <= 5) {
    pill.classList.add('budget-critical');
  } else if (usage.remaining <= 10) {
    pill.classList.add('budget-low');
  }
}

/**
 * Check if any node in the graph matches the target person.
 * Comparison is case-insensitive.
 *
 * @returns {string|null}  The matching node ID, or null
 */
function findTargetNode() {
  if (!targetPerson) return null;
  const target = targetPerson.toLowerCase();
  const nodes = graph.getNodes();
  const match = nodes.find(n => n.name.toLowerCase() === target);
  return match ? match.id : null;
}

// ── Core handlers ───────────────────────────────────────────────────

/**
 * Handle a photo uploaded by the user.
 *
 * 1. Analyze with Gemini to identify famous people
 * 2. Create user node + connection nodes
 * 3. Fetch Wikipedia photos
 * 4. Auto-expand the first famous person
 *
 * @param {string} base64    Raw base64 image data
 * @param {string} mimeType  e.g. "image/jpeg"
 * @param {string} fileName  Original file name
 */
async function handlePhotoUpload(base64, mimeType, fileName) {
  ui.toast('Analyzing photo...', 'info');
  showDevelopingOverlay(`data:${mimeType};base64,${base64}`);

  try {
    const result = await gemini.analyzePhoto(base64, mimeType);
    const people = result.people || [];

    if (people.length === 0) {
      ui.toast("Couldn't identify anyone. Enter a name in the side panel.", 'info');
      ui.openPanel();
      return;
    }

    hideDevelopingOverlay();

    // Create the user node with the uploaded photo as a data URL
    const userPhotoUrl = `data:${mimeType};base64,${base64}`;
    const userNodeId = generateNodeId('You');
    const userNode = graph.addNode({
      id: userNodeId,
      name: 'You',
      photoUrl: userPhotoUrl,
      isUser: true,
      depth: 0,
    });
    nodeNameMap.set('you', userNodeId);

    // Create nodes for each identified famous person
    for (const person of people) {
      const nodeId = generateNodeId(person.name);
      const newNode = graph.addNode({
        id: nodeId,
        name: person.name,
        wikiTitle: person.wikiTitle,
        depth: 1,
      });
      nodeNameMap.set(person.name.toLowerCase(), nodeId);

      graph.addEdge(userNodeId, nodeId, 'Photographed together', 1);

      // Resolve photo asynchronously
      resolveAndSetPhoto(nodeId, person.name, person.wikiTitle);
    }

    ui.hideEmptyState();
    refreshStats();

    // Auto-expand the first famous person
    const firstName = people[0].name;
    const firstNodeId = generateNodeId(firstName);
    const firstNode = graph.getNode(firstNodeId);
    if (firstNode) {
      ui.toast(`Found ${firstName}! Expanding connections...`, 'success');
      await handleNodeExpand(firstNode);
    }

    refreshBudget();

  } catch (err) {
    if (err.name === 'GeminiAuthError') {
      await handleAuthError();
    } else if (err.name === 'GeminiRateLimitError') {
      ui.toast(err.message, 'error');
    } else {
      console.error(LOG_PREFIX, 'Photo analysis failed:', err);
      ui.toast('Photo analysis failed. Try again or enter a name manually.', 'error');
    }
  }
}

/**
 * Expand a node by fetching its connections from Gemini and adding
 * them to the graph.
 *
 * @param {object} node  The graph node to expand
 */
async function handleNodeExpand(node) {
  if (node.expanded) return;

  node.expanding = true;

  try {
    const connections = await gemini.getConnections(node.name, {
      exclude: graph.getNodeNames(),
      targetBias: targetPerson,
    });

    if (!connections || connections.length === 0) {
      ui.toast(`No new connections found for ${node.name}.`, 'info');
      node.expanding = false;
      node.expanded = true;
      refreshStats();
      return;
    }

    for (const conn of connections) {
      const nodeId = generateNodeId(conn.name);

      // Skip if already in graph
      if (graph.getNode(nodeId)) {
        // Still add the edge if it doesn't exist
        graph.addEdge(node.id, nodeId, conn.relationship, node.depth + 1);
        continue;
      }

      graph.addNode({
        id: nodeId,
        name: conn.name,
        wikiTitle: conn.wikiTitle,
        depth: node.depth + 1,
      });
      nodeNameMap.set(conn.name.toLowerCase(), nodeId);

      graph.addEdge(node.id, nodeId, conn.relationship, node.depth + 1);

      // Resolve photo asynchronously
      resolveAndSetPhoto(nodeId, conn.name, conn.wikiTitle);
    }

    node.expanded = true;
    node.expanding = false;
    refreshStats();
    refreshBudget();

    // Check if any new node matches the target
    if (targetPerson) {
      const targetNodeId = findTargetNode();
      if (targetNodeId) {
        ui.toast(`${targetPerson} is in the graph! Finding shortest path...`, 'success');
        await handlePathFound();
      }
    }

  } catch (err) {
    node.expanding = false;
    if (err.name === 'GeminiAuthError') {
      await handleAuthError();
    } else if (err.name === 'GeminiRateLimitError') {
      ui.toast(err.message, 'error');
    } else {
      console.error(LOG_PREFIX, 'Expand failed:', err);
      ui.toast(`${err.message || 'Failed to expand ' + node.name}`, 'error');
    }
  }
}

/**
 * Handle a node click — open the side panel and show person details.
 *
 * @param {object} node  The clicked graph node
 */
function handleNodeClick(node) {
  // Gather connection info from edges
  const allEdges = graph.getEdges();
  const connections = [];

  for (const edge of allEdges) {
    const srcId = edge.source.id || edge.source;
    const tgtId = edge.target.id || edge.target;

    if (srcId === node.id) {
      const tgt = graph.getNode(tgtId);
      if (tgt) connections.push({ name: tgt.name, relationship: edge.relationship });
    } else if (tgtId === node.id) {
      const src = graph.getNode(srcId);
      if (src) connections.push({ name: src.name, relationship: edge.relationship });
    }
  }

  ui.showPersonDetail({
    name: node.name,
    photoUrl: node.photoUrl,
    wikiTitle: node.wikiTitle,
    connections,
  });

  ui.openPanel();
}

/**
 * Handle the user setting a target person for pathfinding.
 *
 * @param {string} targetName
 */
async function handleTargetSet(targetName) {
  targetPerson = targetName;
  ui.setTargetStatus('Searching for path...');
  ui.toast(`Finding path to ${targetName}...`, 'info');

  const fromName = getUserOrFirstNode();
  if (!fromName) {
    ui.setTargetStatus('Add someone to the graph first.');
    ui.toast('Upload a photo or search for someone first.', 'error');
    return;
  }

  try {
    const result = await gemini.findConnectionPath(fromName, targetName);

    if (!result.found || !result.path || result.path.length < 2) {
      ui.setTargetStatus('No direct path found. Try expanding more nodes.');
      ui.toast(
        'No path found within 6 degrees. Expand more nodes and try again.',
        'info'
      );
      return;
    }

    // Add intermediate nodes and edges that aren't already in the graph
    const pathNodeIds = [];

    for (let i = 0; i < result.path.length; i++) {
      const person = result.path[i];
      let nodeId = generateNodeId(person.name);

      // Check if the node already exists (e.g. user node named differently)
      let existingNode = graph.getNode(nodeId);
      if (!existingNode) {
        // Special case: if it's the first person and we have a user node,
        // map to the user node instead
        if (i === 0 && fromName === 'You') {
          const userNodeId = generateNodeId('You');
          if (graph.getNode(userNodeId)) {
            nodeId = userNodeId;
            existingNode = graph.getNode(nodeId);
          }
        }
      }

      if (!existingNode) {
        graph.addNode({
          id: nodeId,
          name: person.name,
          wikiTitle: person.wikiTitle,
          depth: i,
        });
        nodeNameMap.set(person.name.toLowerCase(), nodeId);

        // Resolve photo
        resolveAndSetPhoto(nodeId, person.name, person.wikiTitle);
      }

      pathNodeIds.push(nodeId);
    }

    // Add edges along the path
    for (let i = 0; i < pathNodeIds.length - 1; i++) {
      const relationship = result.relationships[i] || '';
      graph.addEdge(pathNodeIds[i], pathNodeIds[i + 1], relationship, i + 1);
    }

    refreshStats();
    refreshBudget();

    // Wait briefly for the graph to settle, then animate the path
    await delay(800);

    graph.highlightPath(pathNodeIds);

    // Build chain data for the side panel
    const chainData = result.path.map((person, i) => {
      const nodeId = pathNodeIds[i];
      const node = graph.getNode(nodeId);
      return {
        name: person.name,
        photoUrl: node ? node.photoUrl : null,
        relationship: result.relationships[i] || '',
      };
    });

    ui.showChain(chainData);
    ui.openPanel();
    ui.setShareData(chainData, result.degrees);
    ui.showShareActions();
    ui.setTargetStatus('Path found!');

    // Trigger the big reveal animation
    ui.triggerReveal(result.degrees);

  } catch (err) {
    if (err.name === 'GeminiAuthError') {
      await handleAuthError();
    } else if (err.name === 'GeminiRateLimitError') {
      ui.setTargetStatus('Rate limited — try again shortly.');
      ui.toast(err.message, 'error');
    } else {
      console.error(LOG_PREFIX, 'Path finding failed:', err);
      ui.setTargetStatus('Path search failed. Try again.');
      ui.toast(`${err.message || 'Path search failed.'}`, 'error');
    }
  }
}

/**
 * When the target person is already in the graph, find and visualize
 * the shortest path from the user/first node to that target.
 */
async function handlePathFound() {
  const fromName = getUserOrFirstNode();
  if (!fromName || !targetPerson) return;

  await handleTargetSet(targetPerson);
}

/**
 * Handle a search query. If the person is in the graph, center on them.
 * If not, add them directly and let Gemini validate via expansion.
 *
 * @param {string} query
 */
async function handleSearch(query) {
  // Check if already in graph (case-insensitive)
  const nodes = graph.getNodes();
  const match = nodes.find(
    n => n.name.toLowerCase().includes(query.toLowerCase())
  );

  if (match) {
    graph.centerOnNode(match.id);
    handleNodeClick(match);
    return;
  }

  // Add person directly — Gemini validates via expansion, not Wikipedia
  try {
    ui.toast(`Adding ${query} to the graph...`, 'info');

    const nodeId = generateNodeId(query);
    graph.addNode({
      id: nodeId,
      name: query,
      depth: 0,
    });
    nodeNameMap.set(query.toLowerCase(), nodeId);

    // Resolve photo asynchronously via cascade
    resolveAndSetPhoto(nodeId, query);
    ui.hideEmptyState();
    refreshStats();

    // Auto-expand via Gemini — this validates the person
    const node = graph.getNode(nodeId);
    if (node) {
      await handleNodeExpand(node);
    }
  } catch (err) {
    console.error(LOG_PREFIX, 'Search failed:', err);
    ui.toast('Search failed. Try again.', 'error');
  }
}

/**
 * Show a brief about message.
 */
function showAbout() {
  ui.toast(
    'Six degrees of separation: everyone on Earth is connected ' +
    'through at most six handshakes.',
    'info'
  );
}

// ── Utility ─────────────────────────────────────────────────────────

/**
 * Resolve a photo for a person using a cascade:
 * 1. Wikipedia by exact wikiTitle (if provided)
 * 2. Wikipedia search by name (fuzzy match)
 * 3. Initials fallback (handled by graph.js, no action needed here)
 *
 * @param {string} nodeId
 * @param {string} personName
 * @param {string} [wikiTitle]
 */
async function resolveAndSetPhoto(nodeId, personName, wikiTitle) {
  try {
    // Step 1: try exact wikiTitle
    if (wikiTitle) {
      const url = await wikipedia.getPersonPhoto(wikiTitle);
      if (url) {
        graph.updateNodePhoto(nodeId, url);
        return;
      }
    }

    // Step 2: search Wikipedia by name
    const result = await wikipedia.searchAndGetPhoto(personName);
    if (result.photoUrl) {
      graph.updateNodePhoto(nodeId, result.photoUrl);
      // Backfill wikiTitle on the node if we found one
      if (result.wikiTitle) {
        const node = graph.getNode(nodeId);
        if (node && !node.wikiTitle) {
          node.wikiTitle = result.wikiTitle;
        }
      }
    }
  } catch (err) {
    console.warn(LOG_PREFIX, `Photo resolve failed for ${personName}:`, err);
  }
}

/**
 * Handle Gemini auth errors by re-prompting for the API key.
 */
async function handleAuthError() {
  ui.toast('Invalid API key. Please enter a valid Gemini key.', 'error');
  removeApiKey();

  try {
    const newKey = await ui.showApiKeyModal();
    saveApiKey(newKey);
    gemini = createGeminiClient(newKey);
    ui.toast('API key updated.', 'success');
  } catch (dismissErr) {
    // User dismissed the modal
    ui.toast('API key is required to continue.', 'error');
  }
}

// delay() is now imported from utils/helpers.js

function showDevelopingOverlay(dataUrl) {
  const overlay = document.getElementById('developing-overlay');
  const photo = document.getElementById('developing-photo');
  if (!overlay || !photo) return;
  photo.src = dataUrl;
  overlay.classList.remove('hidden');
}

function hideDevelopingOverlay() {
  const overlay = document.getElementById('developing-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
}

// ── Initialization ──────────────────────────────────────────────────

/**
 * Bootstrap the entire application:
 * 1. Create UI controller
 * 2. Obtain Gemini API key (from storage or modal)
 * 3. Initialize services (Gemini, Wikipedia)
 * 4. Initialize graph engine
 * 5. Initialize upload handler
 * 6. Wire up event listeners
 */
async function init() {
  // 1. Create UI
  ui = createUI();

  // 2. Check for API key
  let apiKey = readApiKey();
  if (!apiKey) {
    try {
      apiKey = await ui.showApiKeyModal();
      saveApiKey(apiKey);
    } catch (err) {
      // User dismissed modal — show a toast and keep trying
      ui.toast('API key is required. Click UPLOAD PHOTO or ABOUT to get started.', 'info');
      console.warn(LOG_PREFIX, 'API key modal dismissed');
      // Re-prompt when they try to do something that needs the key
    }
  }

  // 3. Initialize services
  if (apiKey) {
    gemini = createGeminiClient(apiKey);
  }
  wikipedia = createWikipediaService();

  // Arcade mode
  arcade = createArcadeEngine();

  // 4. Initialize graph
  const svgEl = document.getElementById('graph-canvas');
  graph = createGraph(svgEl);

  // 5. Wire graph callbacks
  graph.onNodeClick(handleNodeClick);
  graph.onNodeExpand(handleNodeExpand);

  selectMode = createSelectMode(graph, wikipedia);
  daily = createDailyManager(gemini, wikipedia);

  // 6. Initialize upload
  upload = initUpload({
    overlayEl: document.getElementById('upload-overlay'),
    zoneEl: document.getElementById('upload-zone'),
    fileInputEl: document.getElementById('file-input'),
    onPhotoReady: handlePhotoUpload,
    onCancel: () => {},
  });

  // 7. Wire UI events
  document.getElementById('btn-upload').addEventListener('click', async () => {
    await ensureApiKey();
    upload.show();
  });

  document.getElementById('btn-start').addEventListener('click', async () => {
    await ensureApiKey();
    upload.show();
  });

  document.getElementById('btn-about').addEventListener('click', showAbout);

  // Name input in empty state
  const nameInput = document.getElementById('name-input');
  const btnNameGo = document.getElementById('btn-name-go');

  nameInput.addEventListener('input', () => {
    btnNameGo.disabled = nameInput.value.trim().length === 0;
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && nameInput.value.trim()) {
      btnNameGo.click();
    }
  });

  btnNameGo.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) return;
    await ensureApiKey();
    await handleSearch(name);
  });

  // Example pills
  document.querySelectorAll('.example-pill').forEach(pill => {
    pill.addEventListener('click', async () => {
      const name = pill.dataset.name;
      if (!name) return;
      nameInput.value = name;
      await ensureApiKey();
      await handleSearch(name);
    });
  });

  // Play button opens mode overlay
  document.getElementById('btn-play').addEventListener('click', () => {
    const overlay = document.getElementById('mode-overlay');
    overlay.classList.remove('hidden');

    // Update daily badge
    const num = daily.getPuzzleNumber();
    document.getElementById('daily-badge').textContent = `DAILY #${num}`;

    const streak = daily.getStreak();
    const streakEl = document.getElementById('mode-streak');
    streakEl.textContent = streak.current > 0 ? `\u{1F525} ${streak.current}` : '';

    const statusEl = document.getElementById('daily-status');
    statusEl.textContent = daily.hasPlayedToday() ? '\u2713 PLAYED' : '';
  });

  // Mode close / back
  document.getElementById('mode-overlay').querySelector('.mode-close').addEventListener('click', () => {
    document.getElementById('mode-overlay').classList.add('hidden');
  });
  document.getElementById('btn-mode-back').addEventListener('click', () => {
    document.getElementById('mode-overlay').classList.add('hidden');
  });

  // Daily mode
  document.getElementById('btn-mode-daily').addEventListener('click', async () => {
    document.getElementById('mode-overlay').classList.add('hidden');

    if (daily.hasPlayedToday()) {
      ui.toast('You already played today! Come back tomorrow.');
      return;
    }

    if (!gemini) {
      ui.toast('Demo mode — using sample puzzles');
    } else {
      ui.toast('Generating daily puzzle...');
    }

    try {
      const puzzle = await daily.getTodaysPuzzle();
      arcade.startGame(puzzle);
      selectMode.startGame(puzzle, arcade, daily);
      refreshBudget();
    } catch (err) {
      console.error('Daily puzzle error:', err);
      ui.toast('Failed to generate puzzle. Try again.');
      refreshBudget();
    }
  });

  // Select mode (practice/random)
  document.getElementById('btn-mode-select').addEventListener('click', async () => {
    document.getElementById('mode-overlay').classList.add('hidden');

    if (!gemini) {
      ui.toast('Demo mode — using sample puzzles');
    } else {
      ui.toast('Generating puzzle...');
    }

    try {
      const puzzle = await daily.generatePracticePuzzle('medium');
      arcade.startGame(puzzle);
      selectMode.startGame(puzzle, arcade, null); // no dailyManager for practice
      refreshBudget();
    } catch (err) {
      console.error('Select mode error:', err);
      ui.toast('Failed to generate puzzle. Try again.');
      refreshBudget();
    }
  });

  // Game close button
  document.getElementById('game-close').addEventListener('click', () => {
    if (selectMode.isActive()) {
      selectMode.endGame();
    }
  });

  ui.onSearch(async (query) => {
    await ensureApiKey();
    handleSearch(query);
  });

  ui.onTargetSet(async (name) => {
    await ensureApiKey();
    handleTargetSet(name);
  });

  // 8. Window resize
  window.addEventListener('resize', () => graph.resize());

  // 9. Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl+K → focus search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const panel = document.body.classList.contains('panel-open');
      if (!panel) {
        ui.openPanel();
      }
      document.getElementById('search-input').focus();
    }

    // Escape → close panel, clear highlight
    if (e.key === 'Escape') {
      ui.closePanel();
      if (graph) graph.clearHighlight();
    }

    // Cmd/Ctrl+U → open upload
    if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
      e.preventDefault();
      ensureApiKey().then(() => upload.show()).catch(() => {});
    }
  });

  // Ready
  ui.toast('Ready. Upload a photo or search for someone.', 'info');
  refreshBudget();
  ui.startTypewriter();
}

/**
 * Ensure we have a Gemini API key before performing any AI operation.
 * If none is configured, prompt the user.
 */
async function ensureApiKey() {
  if (gemini) return;

  try {
    const key = await ui.showApiKeyModal();
    saveApiKey(key);
    gemini = createGeminiClient(key);
  } catch (err) {
    ui.toast('API key is required for this feature.', 'error');
    throw err;
  }
}

// ── Launch ──────────────────────────────────────────────────────────

init().catch(err => {
  console.error(LOG_PREFIX, 'Init failed:', err);
});
