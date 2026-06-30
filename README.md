# FutLive

Progressive Web Application for live FIFA World Cup 2026 match tracking. Provides real-time scores, live streaming links, lineups, match statistics, standings, and bracket visualization.

## Features

- Real-time match scores with automatic polling
- Live streaming channel aggregation (multi-source, HD/SD quality classification)
- Interactive formation/lineup visualization with ESPN data
- Match chronology (goals, cards, substitutions)
- Live match statistics comparison
- Group standings with live position updates
- Bracket view for knockout stages
- Top scorers leaderboard
- PWA with offline support and installable on mobile

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 22 (standalone, signals, modern control flow) |
| Styling | Tailwind CSS 4 (inline templates, no component CSS) |
| API | Vercel Serverless Functions (Node.js) |
| Data Source | ESPN Summary API |
| Streaming Proxy | Custom Node.js proxy for stream URL resolution |
| PWA | Angular Service Worker |
| Testing | Vitest + fast-check (property-based testing) |
| Deployment | Vercel |

## Architecture

```
src/app/
  core/         Services, models, guards, interceptors, config
  features/     Feature modules (home, matches, streaming, standings, scorers)
  shared/       Utilities, pipes, directives, constants

api/            Vercel serverless functions (ESPN proxy, streams, standings, bracket)
proxy/          Local development stream proxy
```

Key architectural decisions:

- Single-file components with inline templates and Tailwind classes
- Signal-based reactive state (no BehaviorSubject in components)
- RxJS reserved for HTTP streams, WebSockets, and polling
- Lazy-loaded routes per feature
- Strict typing throughout (no `any`)

## Prerequisites

- Node.js 20+
- npm 10+
- Angular CLI 22

## Setup

```bash
npm install
```

Create a `.env` file based on `.env.example` with required environment variables.

## Development

```bash
# Start Angular dev server + stream proxy
npm run dev

# Angular dev server only
npm start

# Stream proxy only
npm run proxy
```

The app runs at `http://localhost:4200`.

## Build

```bash
npm run build
```

Output goes to `dist/nexatv/browser`.

## Testing

```bash
npm test
```

## Deployment

Deployed on Vercel. The build command injects environment variables at build time via `scripts/write-env.js`.

## License

Private project. All rights reserved.
