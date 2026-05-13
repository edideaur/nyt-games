const GAMES: Record<string, (d: string) => string> = {
  wordle: (d) => `https://www.nytimes.com/svc/wordle/v2/${d}.json`,
  connections: (d) => `https://www.nytimes.com/svc/connections/v2/${d}.json`,
  strands: (d) => `https://www.nytimes.com/svc/strands/v2/${d}.json`,
  "spelling-bee": (d) => `https://www.nytimes.com/svc/spelling-bee/v1/${d}.json`,
};

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseDate(input: string): string | null {
  const s = input.trim().toLowerCase();

  const today = () => {
    const n = new Date();
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
  };

  if (s === "today" || s === "now") return formatDate(today());

  if (s === "yesterday") {
    const d = today(); d.setUTCDate(d.getUTCDate() - 1); return formatDate(d);
  }
  if (s === "tomorrow") {
    const d = today(); d.setUTCDate(d.getUTCDate() + 1); return formatDate(d);
  }

  // +N / -N
  const rel = s.match(/^([+-]\d+)$/);
  if (rel) {
    const d = today(); d.setUTCDate(d.getUTCDate() + parseInt(rel[1])); return formatDate(d);
  }

  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return formatDate(new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3])));

  // YYYYMMDD
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return formatDate(new Date(Date.UTC(+compact[1], +compact[2] - 1, +compact[3])));

  // YYYY/MM/DD
  const isoSlash = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (isoSlash) return formatDate(new Date(Date.UTC(+isoSlash[1], +isoSlash[2] - 1, +isoSlash[3])));

  // MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY (also handles DD/MM/YYYY if first > 12)
  const mdy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (mdy) {
    const year = mdy[3].length === 2 ? 2000 + +mdy[3] : +mdy[3];
    let mo = +mdy[1], day = +mdy[2];
    if (mo > 12) [mo, day] = [day, mo];
    return formatDate(new Date(Date.UTC(year, mo - 1, day)));
  }

  // Unix timestamp
  const unix = s.match(/^\d{10,13}$/);
  if (unix) {
    const ts = +s;
    return formatDate(new Date(s.length === 10 ? ts * 1000 : ts));
  }

  // Natural language fallback
  const native = new Date(input);
  if (!isNaN(native.getTime())) {
    return formatDate(new Date(Date.UTC(native.getFullYear(), native.getMonth(), native.getDate())));
  }

  return null;
}

export const onRequest: PagesFunction = async (context) => {
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const routeParam = context.params["route"];
  const parts = Array.isArray(routeParam)
    ? routeParam
    : (routeParam ?? "").split("/").filter(Boolean);

  const game = parts[0] ?? "";
  const url = new URL(context.request.url);
  const rawDate =
    parts.length > 1
      ? parts.slice(1).join("/")
      : (url.searchParams.get("date") ?? "today");

  // Serve API docs at /api
  if (game === "") {
    return new Response(`<!DOCTYPE html>
<html>
    <head>
        <title>NYT Games API</title>
        <link rel="icon" href="https://Prigoana.com/favicon.png"/>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@600&display=swap" rel="stylesheet"/>
        <style>
            body { background: #0f0f0f; }
            :root {
                --scalar-custom-header-height: 50px;
                --scalar-background-1: #0f0f0f;
                --scalar-border-color: #0f0f0f;
                --scalar-color-1: rgba(255,255,255,0.9);
                --scalar-color-2: rgba(255,255,255,0.5);
            }
            .custom-header {
                height: var(--scalar-custom-header-height);
                background-color: var(--scalar-background-1);
                box-shadow: inset 0 -1px 0 var(--scalar-border-color);
                color: var(--scalar-color-1);
                font-size: var(--scalar-font-size-2);
                padding: 0 18px;
                position: sticky;
                justify-content: space-between;
                top: 0;
                z-index: 100;
            }
            .custom-header, .custom-header nav {
                display: flex;
                align-items: center;
                gap: 18px;
            }
            .custom-header nav a {
                display: flex;
                align-items: center;
                color: inherit;
            }
            .custom-header nav a:hover {
                color: var(--scalar-color-2);
            }
            .custom-header nav a svg {
                width: 18px;
                height: 18px;
                fill: currentColor;
                display: block;
            }
            .custom-header .site-title {
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: var(--scalar-font-size-2);
            }
        </style>
    </head>
    <body>
        <header class="custom-header scalar-app">
            <span class="site-title">NYT Games API</span>
            <nav>
                <a href="https://discord.gg/UdCUsd2X" title="Discord" aria-label="Discord">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.42,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
                </a>
                <a href="https://github.com/edideaur/nyt-games" title="GitHub" aria-label="GitHub">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.509 11.509,0,0,1,3.004-.404c1.02.005,2.047.138,3.006.404,2.291-1.552,3.297-1.23,3.297-1.23.653,1.653.242,2.874.118,3.176.77.84,1.235,1.911,1.235,3.221,0,4.609-2.807,5.624-5.479,5.921.43.372.823,1.102.823,2.222v3.293c0,.319.192.694.801.576C20.566,21.797,24,17.3,24,12c0-6.63-5.37-12-12-12z"/></svg>
                </a>
                <a href="https://instagram.com/edideaur" title="Instagram" aria-label="Instagram">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                </a>
                <a href="https://ko-fi.com/edideaur" title="Ko-fi" aria-label="Ko-fi">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.351 2.715c-2.7 0-4.986.025-6.83.26C2.078 3.285 0 5.154 0 8.61c0 3.506.182 6.13 1.585 8.493 1.584 2.701 4.233 4.182 7.662 4.182h.83c4.209 0 6.494-2.234 7.637-4a9.5 9.5 0 0 0 1.091-2.338C21.792 14.688 24 12.22 24 9.208v-.415c0-3.247-2.13-5.507-5.792-5.87-1.558-.156-2.65-.208-6.857-.208m0 1.947c4.208 0 5.09.052 6.571.182 2.624.311 4.13 1.584 4.13 4v.39c0 2.156-1.792 3.844-3.87 3.844h-.935l-.156.649c-.208 1.013-.597 1.818-1.039 2.546-.909 1.428-2.545 3.064-5.922 3.064h-.805c-2.571 0-4.831-.883-6.078-3.195-1.09-2-1.298-4.155-1.298-7.506 0-2.181.857-3.402 3.012-3.714 1.533-.233 3.559-.26 6.39-.26m6.547 2.287c-.416 0-.65.234-.65.546v2.935c0 .311.234.545.65.545 1.324 0 2.051-.754 2.051-2s-.727-2.026-2.052-2.026m-10.39.182c-1.818 0-3.013 1.48-3.013 3.142 0 1.533.858 2.857 1.949 3.897.727.701 1.87 1.429 2.649 1.896a1.47 1.47 0 0 0 1.507 0c.78-.467 1.922-1.195 2.623-1.896 1.117-1.039 1.974-2.364 1.974-3.897 0-1.662-1.247-3.142-3.039-3.142-1.065 0-1.792.545-2.338 1.298-.493-.753-1.246-1.298-2.312-1.298"/></svg>
                </a>
                <a href="/" title="Home" aria-label="Home">Home</a>
            </nav>
        </header>
        <script id="api-reference" data-url="/openapi.json"></script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    </body>
</html>`, {
      headers: { "Content-Type": "text/html" },
    });
  }

  const date = parseDate(rawDate);
  if (!date) return json({ error: `Cannot parse date: "${rawDate}"` }, 400);

  if (game === "all") {
    const results = await Promise.allSettled(
      Object.entries(GAMES).map(async ([name, endpoint]) => {
        const r = await fetch(endpoint(date), { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!r.ok) throw new Error(`${r.status}`);
        return [name, await r.json()] as [string, unknown];
      })
    );
    const data: Record<string, unknown> = {};
    for (const r of results) {
      if (r.status === "fulfilled") data[r.value[0]] = r.value[1];
    }
    return json({ date, data });
  }

  if (!(game in GAMES)) {
    return json({ error: `Unknown game "${game}". Valid: ${Object.keys(GAMES).join(", ")}` }, 404);
  }

  const r = await fetch(GAMES[game](date), { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) return json({ error: `NYT returned ${r.status} for ${date}` }, 502);

  const data = await r.json() as object;
  return json({ date, ...data });
};
