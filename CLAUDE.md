# Six Handshakes — Project Instructions

## Overview
Interactive web visualization of the "six degrees of separation" concept. Users upload a photo with a famous person (or name one), and an interactive physics-based graph reveals connection chains through famous people who have verifiably met.

## Tech Stack
- **No framework, no build step** — Vanilla HTML/CSS/JS with ES modules
- **D3.js v7** (CDN) — Force-directed graph with SVG rendering
- **Gemini API** (`@google/generative-ai` CDN, model: `gemini-2.5-flash`) — Image recognition, connection chains, pathfinding
- **Wikipedia/Wikimedia API** — Person photos (CORS-friendly with `origin=*`)
- **No backend** — API key stored in localStorage, all calls client-side

## File Structure
```
├── index.html              # Single-page entry point
├── css/
│   ├── tokens.css          # Design tokens (colors, typography, layout)
│   └── styles.css          # All styles (imports tokens)
├── js/
│   ├── app.js              # Entry point — orchestrates all modules, manages user flow
│   ├── graph.js            # D3 force simulation + SVG rendering (nodes, edges, path highlight)
│   ├── gemini.js           # Gemini API client (getConnections, findConnectionPath, analyzePhoto)
│   ├── wikipedia.js        # Wikipedia REST + action API for person photos with in-memory cache
│   ├── upload.js           # Drag-drop + click file upload, validation, base64 conversion
│   └── ui.js               # Side panel, toasts, modals, reveal animation, stats bar
└── assets/
    └── noise.png           # 128x128 tiling grain texture
```

## Architecture

```
index.html
    ↓
app.js (orchestrator)
    ├→ graph.js    — D3 force-directed graph + SVG rendering
    ├→ gemini.js   — Gemini API client
    ├→ wikipedia.js — Photo fetching with cache
    ├→ upload.js   — File upload handler
    └→ ui.js       — All UI components
```

### Data Flow
1. User uploads photo or enters name
2. `gemini.js` identifies/validates person via AI
3. `app.js` creates nodes + edges in graph
4. `wikipedia.js` fetches photos (cascade: exact wikiTitle → search → initials fallback)
5. `graph.js` renders D3 force-directed graph
6. `ui.js` manages side panel, toasts, path reveal animation

### Key APIs

**gemini.js:**
- `getConnections(name, {exclude, targetBias})` → `[{name, relationship, confidence, wikiTitle}]`
- `findConnectionPath(from, to, maxSteps=10)` → `{found, path, relationships, degrees}`
- `analyzePhoto(base64, mimeType)` → `{people: [{name, wikiTitle}], description}`

**graph.js:**
- `addNode()`, `addEdge()`, `removeNode()`, `getNode()`, `getNodes()`, `getEdges()`
- `highlightPath()`, `clearHighlight()`, `centerOnNode()`, `updateNodePhoto()`
- `onNodeClick()`, `onNodeExpand()`, `resize()`

**ui.js:**
- `openPanel()`, `closePanel()`, `showPersonDetail()`, `showChain()`
- `showToast(msg, type)`, `promptApiKey()`, `updateStats()`
- `showRevealAnimation(degrees)` — 2.5s cinematic reveal animation

## Design System — "The Dark Room"
Photographic darkroom metaphor. Dark background with film grain.

### Colors
- Background: `#0A0A0C`, Surface: `#14141A`, Surface-up: `#1E1E28`
- Safelight red: `#E63228`, Red glow: `#FF6B5A`, Fixer gold: `#C4A35A`
- Text: `#E8E4DF`, Text dim: `#9A9490`, Paper: `#F5F0E8`

### Typography
- Headlines: DM Serif Display, serif
- Body/mono: IBM Plex Mono, monospace

## Code Conventions
- **Module pattern:** Each module exports `create<Name>(args)` factory returning object with public API
- **ES modules** (`type="module"`) — no bundler
- **IDs:** Nodes: `node_` + sanitized lowercase name. Edges: `edge_${sourceId}_${targetId}`
- **State:** Graph state in `graph`, UI state in `ui`, orchestration in `app.js`
- **Async:** async/await throughout with Promise-based callbacks
- **Error handling:** Custom error types via `.name` property (`GeminiAuthError`, `GeminiRateLimitError`, `GeminiError`)
- **HTML safety:** All user input escaped via `escapeHtml()` — no raw innerHTML
- **D3 patterns:** Data joins with `selectAll().data(array, d => d.id).enter().append()...`
- **Wikipedia caching:** In-memory `Map` — explicit misses cached as `null`
- **API key:** `localStorage('gemini-api-key')`, prompted on first load or auth failure

## Anti-Hallucination Design
The Gemini prompts prioritize accuracy over short paths:
- Strong accuracy mandate ("Returning found:false is ALWAYS better than uncertain connections")
- Low temperature (0.1 for pathfinding, 0.3 for connections) for deterministic output
- `maxSteps=10` to reduce pressure to fabricate short paths
- Rules requiring specific verifiable context in relationship descriptions
- Prohibition on reasoning/hedging text in output
- `getConnections` instructed to return fewer results or empty array rather than fabricate

## Serving
Static files only — any HTTP server works. No build step.

```sh
npx serve .
# or
python3 -m http.server
```
