import fs from "node:fs";
import path from "node:path";
import { decodeGloble } from "../functions/api/globle.ts";

const NYT_GAMES = {
  wordle: (d) => `https://www.nytimes.com/svc/wordle/v2/${d}.json`,
  connections: (d) => `https://www.nytimes.com/svc/connections/v2/${d}.json`,
  strands: (d) => `https://www.nytimes.com/svc/strands/v2/${d}.json`,
  "spelling-bee": (d) => `https://www.nytimes.com/svc/spelling-bee/v1/${d}.json`,
};

const baseDir = path.resolve("./assets/games");
fs.mkdirSync(baseDir, { recursive: true });

// Window: 7 days in past to 21 days in future
const today = new Date();
const dates = [];
for (let i = -7; i <= 21; i++) {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  dates.push(`${y}-${m}-${day}`);
}

console.log(`Checking/updating static assets for ${dates.length} dates (${dates[0]} to ${dates[dates.length - 1]})...`);

let updatedCount = 0;

for (const date of dates) {
  const dateDir = path.join(baseDir, date);
  fs.mkdirSync(dateDir, { recursive: true });

  const allFilePath = path.join(dateDir, "all.json");
  let allData = {};
  if (fs.existsSync(allFilePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(allFilePath, "utf8"));
      allData = parsed.data || {};
    } catch {}
  }

  // 1. Globle
  const globleData = decodeGloble(date);
  const globleFilePath = path.join(dateDir, "globle.json");
  if (!fs.existsSync(globleFilePath)) {
    fs.writeFileSync(globleFilePath, JSON.stringify(globleData, null, 2));
    updatedCount++;
  }
  allData["globle"] = globleData;

  // 2. NYT Games
  for (const [gameName, getUrl] of Object.entries(NYT_GAMES)) {
    const filePath = path.join(dateDir, `${gameName}.json`);
    if (fs.existsSync(filePath)) {
      try {
        allData[gameName] = JSON.parse(fs.readFileSync(filePath, "utf8"));
        continue;
      } catch {}
    }

    try {
      const res = await fetch(getUrl(date), {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (res.ok) {
        const json = await res.json();
        const normalized = { date, ...json };
        fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2));
        allData[gameName] = normalized;
        updatedCount++;
        console.log(`[+] Fetched ${gameName} for ${date}`);
      } else {
        // e.g., NYT hasn't published the future puzzle yet
      }
    } catch (err) {
      console.warn(`[!] Failed fetching ${gameName} for ${date}:`, err.message);
    }
  }

  // Save all.json
  fs.writeFileSync(allFilePath, JSON.stringify({ date, data: allData }, null, 2));
}

console.log(`Finished update. New assets written: ${updatedCount}.`);
