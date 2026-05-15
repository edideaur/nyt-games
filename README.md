# NYT Games

A web interface for viewing New York Times daily puzzle data (Wordle, Connections, Strands, Spelling Bee).

## Setup

```bash
bun install
```

## Development

```bash
bun dev
```

Opens at `http://localhost:8787`

## API

Access the API at `/api` for interactive documentation, or query directly:

- `/api/all/{date}` - Get all games for a date
- `/api/wordle/{date}`
- `/api/connections/{date}`
- `/api/strands/{date}`
- `/api/spelling-bee/{date}`

Date formats supported: `YYYY-MM-DD`, `YYYYMMDD`, `today`, `yesterday`, `+1`, `-1`, timestamps

## Deployment

Deploys automatically to Cloudflare Pages on push to main.