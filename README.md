# Six Handshakes

Everyone on Earth is connected through at most six handshakes.

Six Handshakes is an interactive web app that visualizes the "six degrees of separation" concept. Upload a photo with a famous person — or just type a name — and watch as a physics-based graph reveals the chain of real, verified meetings connecting you to anyone in history.

## How It Works

### Explore Mode

1. **Upload a photo** with a famous person, or enter their name
2. **Explore connections** — click the expand badge on any node to discover 2-3 people they've verifiably met
3. **Find a path** — enter a target person and the app traces the shortest chain of real-life meetings
4. **Watch the reveal** — a cinematic animation shows your degrees of separation

Every connection in the chain is a documented, real-life meeting — not a guess. The app uses Gemini AI to find verified connections and will refuse to fabricate links, preferring to report "no path found" over including uncertain claims.

### Game Mode

**Daily** and **Select** puzzles challenge you to find the shortest handshake chain between two people.

- **Pick your path** — at each step, choose from options to build a chain of real connections
- **Green picks** advance you along the optimal path; **yellow picks** are detours that stretch the chain
- **Persistent chain** — picked nodes stay on screen, forming a visible handshake sequence from start to target
- **Auto-complete** — the final obvious connection fires automatically
- **Grading** — S (perfect) through D, based on how many detours you took
- **Share results** — Wordle-style emoji grid: `🤝 Six Handshakes #47 +2 🟢🟢🟡🟢🟢🟡`
- **Daily stats** — streaks, win percentage, and score distribution

## Setup

Six Handshakes is a static site with no build step. Serve it with any HTTP server:

```sh
npx serve .
# or
python3 -m http.server
```

On first load, you'll be prompted for a [Google AI Studio](https://aistudio.google.com/apikey) API key (free tier works). The key is stored in your browser's localStorage.

## Tech Stack

- **Vanilla JS** with ES modules — no framework, no bundler
- **D3.js v7** — force-directed graph simulation with SVG rendering
- **Gemini 2.5 Flash** — AI-powered connection discovery, pathfinding, and photo analysis
- **Wikipedia API** — person photos fetched automatically

## Project Structure

```
js/
├── app.js              # Entry point, routing, mode selection
├── upload.js           # Photo upload + analysis
├── wikipedia.js        # Wikipedia photo fetching
├── data/               # Demo puzzles, puzzle data
├── game/               # Game mode engine + UI
│   ├── arcade.js       # Game engine (picks, scoring, grading)
│   ├── daily.js        # Daily puzzle manager (streaks, stats)
│   ├── select-mode.js  # Game UI orchestrator (SVG graph, chain layout)
│   ├── game-pick.js    # Pick handling (chain placement, edges)
│   ├── game-end.js     # End screen, stats modal, connection animation
│   └── game-rendering.js  # SVG drawing primitives (nodes, edges)
├── gemini/             # Gemini AI integration
├── graph/              # Force-directed graph (explore mode)
├── ui/                 # UI components, panels, overlays
└── utils/              # Helpers, storage, IDs
css/
├── tokens.css          # Design tokens (colors, fonts, spacing)
├── base.css            # Reset, body, typography
├── layout.css          # Header, panels, main layout
├── components.css      # Buttons, inputs, cards, toasts
├── game.css            # Game screen, nodes, edges, end screen
├── overlays.css        # Modals, mode selection
├── panel.css           # Side panel, graph controls
└── responsive.css      # Mobile breakpoints
```

## Design

"The Dark Room" — a photographic darkroom aesthetic with film grain, safelight red accents, and monospace typography.

## License

MIT
