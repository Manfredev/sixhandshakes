# Six Handshakes — Project Instructions

## Overview
Interactive web visualization of the "six degrees of separation" concept. Users upload a photo with a famous person (or name one), and an interactive physics-based graph reveals connection chains through famous people who have verifiably met. Includes arcade game modes (Daily Handshake + Select) where players navigate connection chains by choosing the most efficient path.

## Tech Stack
- **No framework, no build step** — Vanilla HTML/CSS/JS with ES modules
- **D3.js v7** (CDN) — Force-directed graph with SVG rendering
- **Gemini API** (`@google/generative-ai` CDN, model: `gemini-2.5-flash`) — Image recognition, connection chains, pathfinding, puzzle generation
- **Wikipedia/Wikimedia API** — Person photos (CORS-friendly with `origin=*`)
- **No backend** — API key stored in localStorage, all calls client-side

## File Structure
```
├── index.html                    # Single-page entry point
├── css/
│   ├── styles.css                # @import chain only (~10 lines)
│   ├── tokens.css                # Design tokens (colors, typography)
│   ├── base.css                  # Reset, body, grain overlay, keyframes
│   ├── layout.css                # Header, graph container, empty state, SVG styles
│   ├── panel.css                 # Side panel, chain display, person detail
│   ├── overlays.css              # Upload, reveal, developing, API key modal
│   ├── components.css            # Toasts, budget pill, stats bar, share actions
│   ├── game.css                  # Mode overlay, game screen, end screen, stats modal
│   └── responsive.css            # All @media queries
├── js/
│   ├── app.js                    # Entry point — orchestrates all modules
│   ├── upload.js                 # Drag-drop + click file upload
│   ├── wikipedia.js              # Wikipedia REST + action API for person photos
│   ├── utils/
│   │   ├── helpers.js            # delay, todayString, escapeHtml, truncate, initials, shuffleArray, debounce
│   │   ├── ids.js                # makeExploreNodeId, makeGameNodeId, makeEdgeId
│   │   ├── storage.js            # readStorage, writeStorage, readApiKey, saveApiKey, removeApiKey
│   │   └── constants.js          # TIMING, LAYOUT, API, COLORS objects
│   ├── graph/
│   │   ├── graph.js              # D3 force simulation, zoom, drag, public API
│   │   ├── graph-render.js       # D3 data join for nodes and edges
│   │   ├── graph-highlight.js    # Path highlight, traveling dot, pulse, centerOnNode
│   │   └── graph-loading.js      # Orbiting particles, glow ring, badge
│   ├── gemini/
│   │   ├── gemini.js             # Factory + public methods (getConnections, findPath, etc.)
│   │   ├── gemini-prompts.js     # 4 prompt template builder functions
│   │   └── gemini-rate-limit.js  # safeCall, RPM throttle, RPD counter, error classifiers
│   ├── ui/
│   │   ├── ui.js                 # Thin facade re-exporting all sub-modules
│   │   ├── panel.js              # Side panel open/close, swipe, person detail, chain
│   │   ├── toasts.js             # Toast notifications
│   │   ├── modals.js             # API key modal
│   │   ├── reveal.js             # Reveal animation, camera flash, particles
│   │   ├── stats-display.js      # Stats bar, share text/image export
│   │   └── empty-state.js        # Show/hide empty state + typewriter animation
│   ├── game/
│   │   ├── arcade.js             # Game engine — state machine, scoring, grading
│   │   ├── daily.js              # Daily puzzle manager — generation, caching, streaks, stats
│   │   ├── select-mode.js        # Game UI controller — state, startGame, renderStep
│   │   ├── game-rendering.js     # SVG drawing primitives (drawNode, drawEdge, etc.)
│   │   ├── game-pick.js          # handlePick — green/yellow branching logic
│   │   └── game-end.js           # End screen, stats modal, animateConnection
│   └── data/
│       └── demo-puzzles.js       # Sample puzzles for demo/offline mode
└── assets/
    └── noise.png                 # 128x128 tiling grain texture
```

## Architecture

```
index.html
    ↓
app.js (orchestrator)
    ├→ graph/graph.js      — D3 force-directed graph + SVG rendering
    │   ├→ graph-render.js    (D3 data joins)
    │   ├→ graph-highlight.js (path visualization)
    │   └→ graph-loading.js   (loading animations)
    ├→ gemini/gemini.js    — Gemini API client
    │   ├→ gemini-prompts.js     (prompt templates)
    │   └→ gemini-rate-limit.js  (throttling + error handling)
    ├→ wikipedia.js        — Photo fetching with cache
    ├→ upload.js           — File upload handler
    ├→ ui/ui.js            — All UI components (explore mode)
    │   ├→ panel.js, toasts.js, modals.js
    │   ├→ reveal.js, stats-display.js, empty-state.js
    ├→ game/arcade.js      — Game engine (pure logic, no DOM)
    ├→ game/daily.js       — Daily puzzle management + stats
    └→ game/select-mode.js — Game UI controller
        ├→ game-rendering.js  (SVG primitives)
        ├→ game-pick.js       (pick handling)
        └→ game-end.js        (end screen + stats)

Shared:
    utils/helpers.js    — delay, todayString, escapeHtml, shuffleArray, etc.
    utils/ids.js        — deterministic ID generators
    utils/storage.js    — localStorage helpers
    utils/constants.js  — magic numbers collected as named constants
```

### Module Patterns

**Graph sub-modules** use a shared context object (`ctx`) passed to all functions:
```js
const ctx = { nodes, edges, svg, simulation, ... };
render(ctx);           // graph-render.js
highlightPath(ctx, nodeIds); // graph-highlight.js
showLoadingState(ctx, nodeId); // graph-loading.js
```

**UI sub-modules** are initialized with DOM refs and return API objects:
```js
const { toast } = initToasts(container);
const panel = initPanel(els);
// ui.js re-exports everything as a flat API
```

**Game sub-modules** use a context snapshot built per-call:
```js
function getCtx() { return { _engine, _puzzle, ... }; }
handlePick(getCtx(), option, ...);
```

### Data Flow — Explore Mode
1. User uploads photo or enters name
2. `gemini.js` identifies/validates person via AI
3. `app.js` creates nodes + edges in graph
4. `wikipedia.js` fetches photos (cascade: exact wikiTitle → search → initials fallback)
5. `graph.js` renders D3 force-directed graph
6. `ui.js` manages side panel, toasts, path reveal animation

### Data Flow — Game Modes
1. User clicks PLAY → mode overlay → Daily Handshake or Select
2. `daily.js` calls `gemini.generatePuzzle()` (single API call per puzzle)
3. `daily.js` fetches Wikipedia photos for all people in puzzle
4. `arcade.js` manages game state (picks, scoring, grading)
5. `select-mode.js` renders SVG game graph, delegates to game-pick.js and game-end.js
6. On completion: end screen with grade, share card, statistics

### Key APIs

**gemini/gemini.js:**
- `getConnections(name, {exclude, targetBias})` → `[{name, relationship, confidence, wikiTitle}]`
- `findConnectionPath(from, to, maxSteps=10)` → `{found, path, relationships, degrees}`
- `analyzePhoto(base64, mimeType)` → `{people: [{name, wikiTitle}], description}`
- `generatePuzzle({difficulty})` → `{start, target, optimalPath, steps[], optimalLength}`
- `getDailyUsage()` → `{used, remaining, limit}`

**graph/graph.js:**
- `addNode()`, `addEdge()`, `removeNode()`, `getNode()`, `getNodes()`, `getEdges()`
- `highlightPath()`, `clearHighlight()`, `centerOnNode()`, `updateNodePhoto()`
- `showLoadingState()`, `hideLoadingState()` — orbiting particles + pulsing glow
- `onNodeClick()`, `onNodeExpand()`, `resize()`

**ui/ui.js:**
- `openPanel()`, `closePanel()`, `showPersonDetail()`, `showChain()`
- `toast(msg, type)`, `showApiKeyModal()`, `updateStats()`
- `triggerReveal()` — cinematic reveal with camera flash + particles
- `setShareData()`, `showShareActions()`, `hideShareActions()`
- `startTypewriter()`, `hideEmptyState()`, `showEmptyState()`

**game/arcade.js:**
- `startGame(puzzle)` → initial state
- `pickOption(option)` → `{result, advance, gameOver}` — all picks advance (no fail state)
- `getGrade()` → S(+0) / A(+1) / B(+2) / C(+3) / D(+4+)
- `getShareEmoji()` → green/yellow sequence
- `getShareText(puzzleNumber, streak)` → spoiler-free share card

**game/daily.js:**
- `getTodaysPuzzle()` → cached puzzle (localStorage by date)
- `hasPlayedToday()`, `getPuzzleNumber()`, `getStreak()`
- `recordResult({grade, scoreOverOptimal, picks, pathLength, optimalLength})`
- `getStats()` → `{played, winPct, currentStreak, maxStreak, distribution}`
- `generatePracticePuzzle(difficulty)` — uncached, for Select mode

**game/select-mode.js:**
- `startGame(puzzle, engine, dailyManager)` — renders game UI, hides explore UI
- `endGame()` — restores explore UI
- `isActive()` — whether a game is in progress

## Game Design Principles
- **No red herrings** — all 4 options at each step are real verified connections (1 green optimal + 3 yellow detours)
- **No fail state** — every player completes every puzzle; grading is purely efficiency-based
- **Scarcity** — one daily puzzle per day, same for everyone (Wordle model)
- **Share cards** — spoiler-free emoji grids for social distribution
- **Puzzle structure** — single Gemini call generates full puzzle; zero marginal cost per player

## Design System — "The Dark Room"
Photographic darkroom metaphor. Dark background with film grain.

### Colors
- Background: `#0A0A0C`, Surface: `#14141A`, Surface-up: `#1E1E28`
- Safelight red: `#E63228`, Red glow: `#FF6B5A`, Fixer gold: `#C4A35A`
- Text: `#E8E4DF`, Text dim: `#9A9490`, Paper: `#F5F0E8`
- Game correct: `#4ADE80`, Game detour: `#FBBF24`

### Typography
- Headlines: DM Serif Display, serif
- Body/mono: IBM Plex Mono, monospace

## Code Conventions
- **Module pattern:** Each module exports `create<Name>(args)` factory returning object with public API
- **ES modules** (`type="module"`) — no bundler
- **IDs:** Nodes: `node_` + sanitized lowercase name. Game nodes: `game_` + sanitized name. Edges: `edge_${sourceId}_${targetId}`
- **Shared utilities:** Import from `utils/` — never duplicate `delay()`, `shuffleArray()`, ID generators, or storage helpers
- **State:** Graph state in `graph`, UI state in `ui`, game state in `arcade`, orchestration in `app.js`
- **Async:** async/await throughout with Promise-based callbacks
- **Error handling:** Custom error types via `.name` property (`GeminiAuthError`, `GeminiRateLimitError`, `GeminiError`)
- **HTML safety:** All user input escaped via `escapeHtml()` — no raw innerHTML
- **D3 patterns:** Data joins with `selectAll().data(array, d => d.id).enter().append()...`
- **Wikipedia caching:** In-memory `Map` — explicit misses cached as `null`
- **API key:** `localStorage('gemini-api-key')` via `utils/storage.js`, prompted on first load or auth failure
- **Game persistence:** `localStorage` for daily puzzles, results, streaks, stats (keys: `daily-puzzle-{date}`, `daily-result-{date}`, `daily-streak`, `daily-stats`)

## Anti-Hallucination Design
The Gemini prompts prioritize accuracy over short paths:
- Strong accuracy mandate ("Returning found:false is ALWAYS better than uncertain connections")
- Low temperature (0.1 for pathfinding, 0.3 for connections, 0.4 for puzzle generation)
- `maxSteps=10` to reduce pressure to fabricate short paths
- Rules requiring specific verifiable context in relationship descriptions
- Prohibition on reasoning/hedging text in output
- `getConnections` instructed to return fewer results or empty array rather than fabricate
- Puzzle generation: all options must be real verified connections (no red herrings)

## Serving
Static files only — any HTTP server works. No build step.

```sh
npx serve .
# or
python3 -m http.server
```
