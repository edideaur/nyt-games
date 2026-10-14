# NYT & Daily Games

A fast web interface and static API for viewing daily puzzle data (Wordle, Connections, Strands, Spelling Bee) and Globle's mystery country.

## Architecture

- **Static Assets (`/assets/games/{date}/`)**: All game data is stored as static JSON assets:
  - `/assets/games/{date}/wordle.json`
  - `/assets/games/{date}/connections.json`
  - `/assets/games/{date}/strands.json`
  - `/assets/games/{date}/spelling-bee.json`
  - `/assets/games/{date}/globle.json`
  - `/assets/games/{date}/all.json`
- **Globle**: Deterministically decoded on the fly or pre-generated via Globle's country map index.
- **Pages Functions**: Resolves flexible date aliases (`today`, `yesterday`, `-1`, timestamps) and routes to the static assets.

## Setup

```bash
bun install
```

## Development

```bash
bun run dev
```

Opens at `http://localhost:8788`

## API

Access the API at `/api` for interactive Scalar documentation, or fetch static assets directly from `/assets/games/{date}/all.json`.

Date formats supported: `YYYY-MM-DD`, `YYYYMMDD`, `today`, `yesterday`, `+1`, `-1`, timestamps

## Deployment

Deploys automatically to Cloudflare Pages on push to main.