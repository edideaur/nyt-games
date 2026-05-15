// ── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDate(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatDateLabel(iso) {
  const today = todayISO();
  const yesterday = shiftDate(today, -1);
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const short = dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (iso === today) return `Today · ${short}`;
  if (iso === yesterday) return `Yesterday · ${short}`;
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function setLoading(id) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  el.classList.remove("content-loaded");
  el.classList.add("loading");
}

function setContent(id, html) {
  const el = document.getElementById(id);
  el.classList.remove("loading", "content-loaded");
  el.innerHTML = html;
  void el.offsetHeight;
  el.classList.add("content-loaded");
}

// ── Renderers ─────────────────────────────────────────────────────────────────

function renderWordle(data) {
  const solution = data.solution ?? "?????";
  const tiles = solution
    .split("")
    .map((l, i) => `<div class="wordle-tile" style="--d:${i * 0.07}s">${escapeHtml(l)}</div>`)
    .join("");
  const id = data.id ?? data.days_since_launch;
  return `
    <div class="wordle-meta">${id ? `Wordle #${id}` : ""}</div>
    <div class="wordle-tiles">${tiles}</div>
  `;
}

function renderConnections(data) {
  const cats = data.categories ?? data.groups ?? [];
  if (!cats.length) return `<span class="error-msg">No data</span>`;

  const groups = cats.map((cat, idx) => {
    const rawMembers = cat.cards ?? cat.members ?? [];
    const members = rawMembers.map((m) =>
      typeof m === "string" ? m : (m.content ?? m.text ?? m.name ?? "")
    );
    return { title: cat.title ?? cat.name ?? "", level: cat.level ?? idx, members };
  });

  groups.sort((a, b) => a.level - b.level);

  return `<div class="connections-groups">${groups.map((g, i) => `
    <div class="conn-group" data-level="${g.level}" style="--d:${i * 0.08}s">
      <div class="conn-group-title">${escapeHtml(g.title)}</div>
      <div class="conn-members-list">${g.members.map((m) => `<span class="conn-member">${escapeHtml(m)}</span>`).join("")}</div>
    </div>
  `).join("")}</div>`;
}

function renderStrands(data) {
  const theme = data.clue ?? data.theme ?? data.headline ?? "";
  const spangram = data.spangram ?? "";
  const themeWords = data.themeWords ?? data.theme_words ?? [];
  const words = themeWords
    .map((w, i) => `<span class="strands-word" style="--d:${0.12 + i * 0.05}s">${escapeHtml(w)}</span>`)
    .join("");
  return `
    <div class="strands-theme">${escapeHtml(theme)}</div>
    ${spangram ? `<div class="strands-spangram">${escapeHtml(spangram)}</div>` : ""}
    <div class="strands-words">${words}</div>
  `;
}

function renderSpellingBee(data) {
  const center = String(data.center_letter ?? data.centerLetter ?? "?").toUpperCase();
  const outerRaw = data.outer_letters ?? data.outerLetters ?? [];
  const outerArr = Array.isArray(outerRaw)
    ? outerRaw
    : String(outerRaw).split("").filter(Boolean);
  const outer = outerArr.map((l) => String(l).toUpperCase());

  const answers = data.answers ?? [];
  const pangrams = data.pangrams ?? [];
  const pangSet = new Set(pangrams.map((p) => p.toLowerCase()));

  const lettersHtml = `<div class="bee-letters">
    <span class="bee-letter center" style="--d:0s">${escapeHtml(center)}</span>
    ${outer.map((l, i) => `<span class="bee-letter" style="--d:${(i + 1) * 0.055}s">${escapeHtml(l)}</span>`).join("")}
  </div>`;

  const meta = `<div class="bee-meta"><strong>${answers.length}</strong> word${answers.length !== 1 ? "s" : ""} &middot; <strong>${pangrams.length}</strong> pangram${pangrams.length !== 1 ? "s" : ""}</div>`;

  const sorted = answers.slice().sort();
  const answerList = `<div class="bee-answers">${sorted.map((a) => {
    const isP = pangSet.has(a.toLowerCase());
    return `<span class="bee-word${isP ? " pangram" : ""}">${escapeHtml(a)}</span>`;
  }).join("")}</div>`;

  return lettersHtml + meta + answerList;
}

// ── Fetch & render ────────────────────────────────────────────────────────────

const IDS = ["body-wordle", "body-connections", "body-strands", "body-spelling-bee"];

async function load(date) {
  IDS.forEach(setLoading);

  let allData;
  try {
    const r = await fetch(`/api/all/${date}`);
    allData = await r.json();
  } catch {
    IDS.forEach((id) => setContent(id, `<span class="error-msg">Network error</span>`));
    return;
  }

  const data = allData.data ?? {};

  const render = (id, key, fn) => {
    if (data[key]) {
      try {
        setContent(id, fn(data[key]));
      } catch (e) {
        setContent(id, `<span class="error-msg">Render error: ${escapeHtml(e.message)}</span>`);
      }
    } else {
      setContent(id, `<span class="error-msg">No data for this date</span>`);
    }
  };

  render("body-wordle", "wordle", renderWordle);
  render("body-connections", "connections", renderConnections);
  render("body-strands", "strands", renderStrands);
  render("body-spelling-bee", "spelling-bee", renderSpellingBee);
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  const input     = document.getElementById("date-input");
  const btnPrev   = document.getElementById("btn-prev");
  const btnNext   = document.getElementById("btn-next");
  const btnToday  = document.getElementById("btn-today");
  const dateLabel = document.getElementById("date-label");
  const mainEl    = document.querySelector("main");

  let current = todayISO();
  input.value = current;

  const updateLabel = (date) => { dateLabel.textContent = formatDateLabel(date); };

  const go = (date, dir = 0) => {
    if (!date) return;
    current = date;
    input.value = date;
    updateLabel(date);
    mainEl.dataset.dir = dir;
    load(date);
  };

  btnPrev.addEventListener("click", () => go(shiftDate(current, -1), -1));
  btnNext.addEventListener("click", () => go(shiftDate(current,  1),  1));
  btnToday.addEventListener("click", () => go(todayISO(), 0));

  const onDateChange = () => {
    if (input.value && input.value !== current) {
      const dir = input.value > current ? 1 : -1;
      go(input.value, dir);
    }
  };
  input.addEventListener("input", onDateChange);
  input.addEventListener("change", onDateChange);

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.metaKey || e.ctrlKey) return;
    if (e.key === "ArrowLeft")  go(shiftDate(current, -1), -1);
    if (e.key === "ArrowRight") go(shiftDate(current,  1),  1);
  });

  updateLabel(current);
  load(current);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
