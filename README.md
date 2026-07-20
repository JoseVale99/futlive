<div align="center">

# FutLibre

**Live football scores, multi-source HD streams, lineups, stats and standings — for the world's top leagues.**

A Progressive Web App that brings every signal you need to follow a match into one fast, installable, mobile-first interface. Built around the Mundial 2026 cycle with full coverage of the major European leagues, CONMEBOL and Liga MX.

[**Live demo**](https://futlibre.qzz.io/) · [**Report a bug**](https://github.com/JoseVale99/nexatv/issues) · [**Request a feature**](https://github.com/JoseVale99/nexatv/issues)

</div>

---

## Table of contents

- [Highlights](#highlights)
- [Screenshots](#screenshots)
- [Features](#features)
- [Supported leagues](#supported-leagues)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Deployment](#deployment)
- [Project scripts](#project-scripts)
- [Disclaimer](#disclaimer)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Highlights

- Real-time scores with automatic polling, elapsed-clock sync and live indicators.
- Multi-source stream aggregation with HD/SD classification and quality selector.
- Interactive lineups rendered from ESPN formation data.
- Match chronology (goals, cards, substitutions) with timestamps.
- Side-by-side live stats with comparison bars.
- Group standings that update as matches finish, plus knockout bracket view.
- Top scorers / assists leaderboards.
- Progressive Web App: installable on iOS and Android, fully usable offline.

## Screenshots

> Drop captures into a `docs/screenshots/` folder and reference them here. Suggested shots: live match scoreboard, channel selector, lineup view, statistics tab, standings, bracket, mobile PWA install.

```
docs/screenshots/
  home-desktop.png
  match-detail-desktop.png
  standings-desktop.png
  mobile-pwa.png
```

Reference them like this once added:

```markdown
![Home — desktop](docs/screenshots/home-desktop.png)
![Match detail — desktop](docs/screenshots/match-detail-desktop.png)
```

## Features

### Match center

- Live, scheduled and finished tabs with smart grouping by status and date.
- Expanded scoreboard cards for live matches with gradient "EN VIVO" badges and minute-by-minute clock.
- Quick navigation to stream, lineup, stats, chronology and H2H from a single match detail screen.

### Streaming

- Aggregates channels from multiple public sources (lacancha.tv, futbol-libres.su, futbollibrex.net, la12hd.com).
- HLS playback via `hls.js` with iframe fallback for sources that do not expose a direct `.m3u8`.
- CORS-aware client-side resolver for sources that block server-side requests.
- Channel selector with quality labels and one-click source switching.

### Match detail tabs

- **Alineaciones** — formation grid with starters, substitutes and coach.
- **Cronología** — chronological feed of goals, cards and substitutions.
- **Estadísticas** — side-by-side bars for possession, shots, fouls, corners, etc.
- **Standings, scorers, bracket** — surfaced from the parent league view.

### League experience

- Landing page with live and upcoming match counts per competition.
- Per-league accent color and branding strip.
- League-scoped standings, scorers and bracket (when the tournament is in knockout phase).

### Platform

- Angular Service Worker with offline cache for previously visited matches.
- Single-file components: template, logic and styles live in one `.ts` file.
- Lazy-loaded routes per feature for fast initial load.
- Dark theme by default; light theme adapts automatically.
- Strict TypeScript across the entire codebase.

## Supported leagues

| League | Country | Slug |
| --- | --- | --- |
| Mundial 2026 | FIFA | `worldcup` |
| Premier League | England | `premier` |
| La Liga | Spain | `laliga` |
| Bundesliga | Germany | `bundesliga` |
| Ligue 1 | France | `ligue1` |
| UEFA Champions League | UEFA | `champions` |
| Copa Libertadores | CONMEBOL | `libertadores` |
| Liga MX | Mexico | `ligamx` |
| MLS | United States | `mls` |

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Angular 22 (standalone components, signals, modern control flow) |
| Styling | Tailwind CSS 4 (inline utility classes, no per-component CSS) |
| State | Angular signals — RxJS reserved for HTTP, polling and async streams |
| PWA | Angular Service Worker |
| API | Vercel Serverless Functions (Node.js) |
| Data source | ESPN Summary API |
| Streaming | Custom Node.js proxy + client-side HLS / iframe resolution |
| Tests | Vitest + fast-check (property-based) |
| Hosting | Vercel |
| DNS / CDN | Cloudflare |
| Domain | DigitalPlant (`.qzz.io`) |

## Architecture

```
src/app/
  core/         Services, models, guards, interceptors, environment config
  features/     Feature modules
    home/       Today's matches, live scoreboard group
    matches/    Match list, cards and filters
    streaming/  Player, channel selector, lineups, stats, chronology
    leagues/    Landing + per-league detail
    standings/  Group standings
    scorers/    Top scorers / assists
    bracket/    Knockout bracket view
    not-found/  404
  shared/       Utilities, pipes, directives, constants

api/            Vercel serverless functions
  espn.js       ESPN proxy (matches, lineups, stats)
  streams.js    Stream channel aggregation
  standings.js  Group standings
  bracket.js    Knockout bracket
  scorers.js    Top scorers / assists
  embed.js      iframe embedding helper
  leagues.js    Supported leagues catalogue

proxy/          Local development stream proxy (streams-proxy.js)
scripts/        Build-time environment injection (write-env.js)
```

### Design principles

- **Signals over RxJS for state.** Components hold state in signals; RxJS is used only for HTTP, polling and observable async streams.
- **Single-file components.** Template and styles live next to the class — no scattered CSS files, easy to grep.
- **Lazy by feature.** Each route loads its own bundle; the home screen stays light.
- **Strict TypeScript.** No `any`. Models live in `core/models/` and are shared by the API and the UI where useful.
- **Lean serverless.** Each Vercel function does one thing (proxy, scrape, resolve) and stays under the default timeout budget.

## Quick start

### Prerequisites

- Node.js **20+**
- npm **10+**
- Angular CLI **22** (`npm i -g @angular/cli@22`)

### Installation

```bash
git clone https://github.com/JoseVale99/nexatv.git
cd nexatv
npm install
cp .env.example .env
```

Fill in the variables you need in `.env` (most are optional for local development).

### Development

```bash
# Run the Angular dev server and the local stream proxy in parallel
npm run dev

# Or run them individually
npm start          # Angular dev server at http://localhost:4200
npm run proxy      # Stream proxy at http://localhost:3001
```

### Production build

```bash
npm run build
```

The bundle is emitted to `dist/nexatv/browser` and is ready to deploy as a static site plus the `api/` serverless functions.

### Tests

```bash
npm test
```

Vitest runs unit tests in headless mode; `fast-check` provides property-based coverage for the trickier utilities (date formatting, status resolution, team-name translation, stream URL building).

## Deployment

The app is deployed on **Vercel**. The build pipeline runs `scripts/write-env.js` (which injects runtime environment variables) before invoking `ng build --configuration production`.

```bash
vercel --prod
```

Live deployment: **[futlibre.qzz.io](https://futlibre.qzz.io/)**

### Infrastructure

```
DigitalPlant  (domain registrar — futlibre.qzz.io)
        |
        v
Cloudflare    (DNS, CDN, SSL)
        |
        v
Vercel        (Angular SPA + serverless API)
```

See [`docs/dominio.md`](docs/dominio.md) for the full DNS / Vercel configuration walkthrough.

## Project scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Run Angular dev server and stream proxy in parallel |
| `npm start` | Angular dev server only (`http://localhost:4200`) |
| `npm run proxy` | Stream proxy only (`http://localhost:3001`) |
| `npm run build` | Production build to `dist/nexatv/browser` |
| `npm run watch` | Development build with file watcher |
| `npm test` | Run unit tests once (headless) |

## Disclaimer

FutLibre is a non-commercial, educational project.

- **Match data** (scores, lineups, statistics, standings) is sourced from the public ESPN Summary API.
- **Streaming channels** are aggregated from third-party providers that are publicly accessible on the open web (lacancha.tv, futbol-libres.su, futbollibrex.net, la12hd.com).
- FutLibre does **not** host, store, transcode or re-distribute any media. It only resolves and embeds sources that are already publicly available on those third-party sites.
- If you are a rights holder and would like a source removed, please open an issue with the affected URL.

## Contributing

Contributions are welcome.

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a pull request describing the change and the motivation.

Please open an issue first for larger changes so we can align on direction before you invest time.

## Roadmap

- [ ] Push notifications for goals and final whistles
- [ ] Per-team follow with personalized fixture list
- [ ] Watch-party synchronized chat
- [ ] Native iOS / Android wrappers via Capacitor
- [ ] More leagues: Serie A, Eredivisie, Primeira Liga, Brasileirão
- [ ] Saved / favorite matches with offline-first sync

## License

Private project. All rights reserved. Contact the maintainer for usage permissions.

## Acknowledgements

- [ESPN](https://www.espn.com/) for the public match data API.
- [lacancha.tv](https://lacancha.tv), [futbol-libres.su](https://futbol-libres.su) and [futlibrex.net](https://futlibrex.net) for the publicly accessible stream sources.
- The Angular team for the framework and signals API.
- [Tailwind CSS](https://tailwindcss.com) for the styling system.
- [Vercel](https://vercel.com) for hosting and serverless infrastructure.
- [Cloudflare](https://www.cloudflare.com) for DNS, CDN and SSL.
- [DigitalPlant](https://digitalplant.org) for the free `.qzz.io` domain.

---

<div align="center">
<sub>If FutLibre is useful to you, consider starring the repo. It helps others find the project.</sub>
</div>