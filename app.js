const PRESETS = {
  google: { medium: "cpc" },
  meta: { medium: "cpc" },
  tiktok: { medium: "cpc" },
  email: { medium: "email" },
  instagram: { medium: "social" },
  youtube: { medium: "video" },
  linkedin: { medium: "cpc" },
  whatsapp: { medium: "social" },
};
const BADGE_STYLES = [
  {
    key: "utm_source",
    id: "utmSource",
    bg: "#1a0f00",
    border: "#CC9966",
    color: "#FFBB77",
  },
  {
    key: "utm_medium",
    id: "utmMedium",
    bg: "#0d1200",
    border: "#667744",
    color: "#AACC66",
  },
  {
    key: "utm_campaign",
    id: "utmCampaign",
    bg: "#0f0d00",
    border: "#AA8844",
    color: "#DDBB66",
  },
  {
    key: "utm_term",
    id: "utmTerm",
    bg: "#0d0d0d",
    border: "#555555",
    color: "#AAAAAA",
  },
  {
    key: "utm_content",
    id: "utmContent",
    bg: "#100a0a",
    border: "#775544",
    color: "#BB8866",
  },
];
const sanitize = (v) => v.trim().toLowerCase().replace(/\s+/g, "-");
const $ = (id) => document.getElementById(id);
const getHistory = () => {
  try {
    return JSON.parse(localStorage.getItem("utm_history") || "[]");
  } catch {
    return [];
  }
};

// ensure dataLayer exists
window.dataLayer = window.dataLayer || [];

// helper: push utm_saved event once per saved entry (dedupe via ts)
function pushUtmSavedEvent(entry) {
  try {
    if (!entry || !entry.ts) return;
    const last = sessionStorage.getItem("last_utm_saved_ts");
    if (String(last) === String(entry.ts)) return; // already pushed this entry
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "utm_saved",
      utm_url: entry.url,
      utm_source: entry.source,
      utm_medium: entry.medium,
      utm_campaign: entry.campaign,
      utm_ts: entry.ts,
    });
    sessionStorage.setItem("last_utm_saved_ts", String(entry.ts));
  } catch (e) {
    console.warn("dataLayer push failed", e);
  }
}

// helper: push utm_copied event once per copy action (dedupe via ts)
function pushUtmCopiedEvent(entry) {
  try {
    if (!entry || !entry.ts) return;
    const last = sessionStorage.getItem("last_utm_copied_ts");
    if (String(last) === String(entry.ts)) return; // already pushed this copy
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "utm_copied",
      utm_url: entry.url,
      utm_source: entry.source,
      utm_medium: entry.medium,
      utm_campaign: entry.campaign,
      utm_ts: entry.ts,
    });
    sessionStorage.setItem("last_utm_copied_ts", String(entry.ts));
  } catch (e) {
    console.warn("dataLayer copied push failed", e);
  }
}

function buildUrl() {
  const base = $("baseUrl").value.trim(),
    source = sanitize($("utmSource").value),
    medium = sanitize($("utmMedium").value),
    campaign = sanitize($("utmCampaign").value),
    term = sanitize($("utmTerm").value),
    content = sanitize($("utmContent").value);
  if (!base || !source || !medium || !campaign) return null;
  try {
    const url = new URL(base);
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", medium);
    url.searchParams.set("utm_campaign", campaign);
    if (term) url.searchParams.set("utm_term", term);
    if (content) url.searchParams.set("utm_content", content);
    return url.toString();
  } catch {
    return null;
  }
}

function buildPreview() {
  const url = buildUrl(),
    card = $("previewCard"),
    empty = $("emptyPreview");
  if (!url) {
    card.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }
  card.classList.remove("hidden");
  card.classList.add("fade-in");
  empty.classList.add("hidden");
  $("urlPreview").textContent = url;
  const active = BADGE_STYLES.filter((b) => sanitize($(b.id).value));
  $("paramsBreakdown").innerHTML = active
    .map((b) => {
      const val = sanitize($(b.id).value);
      return `<span class="badge" style="background:${b.bg};border-color:${b.border};color:${b.color};"><span class="badge__key">${b.key}=</span><strong>${val}</strong></span>`;
    })
    .join("");
}

function applyPreset() {
  const src = $("sourcePreset").value;
  if (!src) return;
  $("utmSource").value = src;
  const p = PRESETS[src];
  if (p) {
    $("utmMedium").value = p.medium;
    $("mediumPreset").value = p.medium;
  }
  buildPreview();
}
function applyMediumPreset() {
  const med = $("mediumPreset").value;
  if (!med) return;
  $("utmMedium").value = med;
  buildPreview();
}

function copyUrl() {
  const url = buildUrl();
  if (!url) return;

  // build a small entry object like saveToHistory uses (ts used for dedupe)
  const entry = {
    url,
    source: sanitize($("utmSource").value),
    medium: sanitize($("utmMedium").value),
    campaign: sanitize($("utmCampaign").value),
    ts: Date.now(),
  };

  navigator.clipboard.writeText(url).then(
    () => {
      const t = $("copyBtnText");
      if (t) {
        t.textContent = "✓ Copiado";
        setTimeout(() => (t.textContent = "Copiar"), 2000);
      }
    },
    (err) => console.error("Failed to copy URL: ", err)
  );

  // push to dataLayer reliably after copy (deduped by ts)
  pushUtmCopiedEvent(entry);
}

function saveToHistory() {
  const url = buildUrl();
  if (!url) {
    return;
  }
  const entry = {
    url,
    source: sanitize($("utmSource").value),
    medium: sanitize($("utmMedium").value),
    campaign: sanitize($("utmCampaign").value),
    date: new Date().toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    ts: Date.now(),
  };

  // remove any existing item with same url (keep newest)
  const h = getHistory().filter((x) => x.url !== url);
  h.unshift(entry);
  localStorage.setItem("utm_history", JSON.stringify(h.slice(0, 20)));
  renderHistory();

  // push to dataLayer reliably after history update (deduped by ts)
  pushUtmSavedEvent(entry);

  const btn = document.querySelector(".btn-primary");
  if (btn) {
    btn.textContent = "✓ GUARDADO";
    setTimeout(() => (btn.textContent = "GUARDAR EN HISTORIAL"), 1500);
  }
}

function renderHistory() {
  const list = $("historyList"),
    empty = $("emptyHistory"),
    h = getHistory();
  list.querySelectorAll(".history-item").forEach((el) => el.remove());
  if (!h.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  h.forEach((entry, i) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<div class="history-item__inner"><div class="history-item__meta"><div class="history-item__badges"><span class="history-item__badge badge--source">${entry.source}</span><span class="history-item__badge badge--medium">${entry.medium}</span><span class="history-item__badge badge--campaign">${entry.campaign}</span><span class="history-item__date">${entry.date}</span></div><p class="history-item__url">${entry.url}</p></div><div class="history-item__actions"><button class="btn-history-copy" onclick="copyHistoryUrl(${i})"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button><button class="btn-history-load" onclick="loadHistory(${i})"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button><button class="btn-history-del" onclick="deleteHistory(${i})"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div></div>`;
    list.appendChild(div);
  });
}

function copyHistoryUrl(i) {
  const u = getHistory()[i]?.url;
  if (u) navigator.clipboard.writeText(u);
}
function loadHistory(i) {
  const e = getHistory()[i];
  if (!e) return;
  try {
    const url = new URL(e.url);
    $("baseUrl").value = url.origin + url.pathname;
    $("utmSource").value = url.searchParams.get("utm_source") || "";
    $("utmMedium").value = url.searchParams.get("utm_medium") || "";
    $("utmCampaign").value = url.searchParams.get("utm_campaign") || "";
    $("utmTerm").value = url.searchParams.get("utm_term") || "";
    $("utmContent").value = url.searchParams.get("utm_content") || "";
    buildPreview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch {}
}
function deleteHistory(i) {
  const h = getHistory();
  h.splice(i, 1);
  localStorage.setItem("utm_history", JSON.stringify(h));
  renderHistory();
}
function clearHistory() {
  if (!confirm("¿Borrar todo el historial?")) return;
  localStorage.removeItem("utm_history");
  renderHistory();
}
function clearForm() {
  [
    "baseUrl",
    "utmSource",
    "utmMedium",
    "utmCampaign",
    "utmTerm",
    "utmContent",
  ].forEach((id) => ($(id).value = ""));
  $("sourcePreset").value = "";
  $("mediumPreset").value = "";
  buildPreview();
}

[
  "baseUrl",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
].forEach((id) => $(id).addEventListener("input", buildPreview));
renderHistory();
buildPreview();
