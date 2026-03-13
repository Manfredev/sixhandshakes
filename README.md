# Six Handshakes

Everyone on Earth is connected through at most six handshakes.

Six Handshakes is an interactive web app that visualizes the "six degrees of separation" concept. Upload a photo with a famous person — or just type a name — and watch as a physics-based graph reveals the chain of real, verified meetings connecting you to anyone in history.

## How It Works

1. **Upload a photo** with a famous person, or enter their name
2. **Explore connections** — click the expand badge on any node to discover 2-3 people they've verifiably met
3. **Find a path** — enter a target person and the app traces the shortest chain of real-life meetings
4. **Watch the reveal** — a cinematic animation shows your degrees of separation

Every connection in the chain is a documented, real-life meeting — not a guess. The app uses Gemini AI to find verified connections and will refuse to fabricate links, preferring to report "no path found" over including uncertain claims.

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

## Design

"The Dark Room" — a photographic darkroom aesthetic with film grain, safelight red accents, and monospace typography.

## License

MIT
