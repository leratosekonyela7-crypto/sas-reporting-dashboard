/* ==========================================================================
   UI.JS - generic helpers: storage, id/formatting utilities, form-field
   template snippets, generic form collection, toast, small DOM helpers.
   ========================================================================== */

const STORE_KEYS = {
  term: "sas_dashboard_term_submissions_v1",
  semester: "sas_dashboard_semester_records_v1",
  laMetrics: "sas_dashboard_la_metrics_v1",
  theme: "sas_dashboard_theme_v1"
};

function loadStore(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch (e) { return []; }
}
function saveStore(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }

function uid() { return 'r_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtNum(n) { n = Number(n) || 0; return n.toLocaleString(); }
function fmtPct(n) { if (n === "" || n === null || n === undefined || isNaN(n)) return "—"; return Math.round(Number(n) * 10) / 10 + "%"; }
function fmt1(n) { if (n === "" || n === null || n === undefined || isNaN(n)) return "—"; return (Math.round(Number(n) * 10) / 10).toString(); }
function avg(arr) { const a = arr.filter(v => typeof v === "number" && !isNaN(v)); return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null; }
function sum(arr) { return arr.reduce((s, v) => s + (Number(v) || 0), 0); }

let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------- form-field template snippets ---------- */
function fNumber(name, label, value, opts) {
  opts = opts || {};
  return `<label class="field"><span class="lbl">${esc(label)}</span>
    <input type="number" name="${esc(name)}" value="${value == null ? 0 : value}" min="${opts.min != null ? opts.min : 0}" step="${opts.step || 1}"></label>`;
}
function fText(name, label, value) {
  return `<label class="field"><span class="lbl">${esc(label)}</span>
    <input type="text" name="${esc(name)}" value="${esc(value || "")}"></label>`;
}
function fDate(name, label, value) {
  return `<label class="field"><span class="lbl">${esc(label)}</span>
    <input type="date" name="${esc(name)}" value="${esc(value || "")}"></label>`;
}
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateRange(start, end) {
  const s = fmtDate(start), e = fmtDate(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `From ${s}`;
  if (e) return `Until ${e}`;
  return "—";
}
function fTextarea(name, label, value) {
  return `<label class="field wide"><span class="lbl">${esc(label)}</span>
    <textarea name="${esc(name)}">${esc(value || "")}</textarea></label>`;
}
function fSelect(name, label, options, value) {
  const opts = options.map(o => {
    const v = typeof o === "object" ? o.value : o;
    const l = typeof o === "object" ? o.label : o;
    return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(l)}</option>`;
  }).join("");
  return `<label class="field"><span class="lbl">${esc(label)}</span>
    <select name="${esc(name)}">${opts}</select></label>`;
}
function fCheckboxGroup(name, label, options, checkedValues) {
  checkedValues = checkedValues || [];
  const boxes = options.map(o => `
    <label class="checkbox-row"><input type="checkbox" name="${esc(name)}" value="${esc(o)}" ${checkedValues.includes(o) ? "checked" : ""}> ${esc(o)}</label>`
  ).join("");
  return `<fieldset class="field wide"><legend>${esc(label)}</legend><div class="checkbox-group">${boxes}</div></fieldset>`;
}
const YESNO_INPROGRESS = ["Yes", "No", "In-progress"];

/* Reads any <form> generically: numbers -> Number, checkbox groups -> array,
   everything else -> trimmed string. Works for every programme's form because
   it inspects DOM input types rather than a hard-coded field list. */
function collectForm(form) {
  const data = {};
  const els = Array.from(form.elements).filter(el => el.name);
  const seen = new Set();
  for (const el of els) {
    if (seen.has(el.name)) continue;
    seen.add(el.name);
    const group = els.filter(e => e.name === el.name);
    if (el.type === "checkbox") {
      data[el.name] = group.filter(e => e.checked).map(e => e.value);
    } else if (el.type === "radio") {
      const c = group.find(e => e.checked);
      data[el.name] = c ? c.value : "";
    } else if (el.type === "number") {
      data[el.name] = el.value === "" ? 0 : Number(el.value);
    } else {
      data[el.name] = (el.value || "").trim();
    }
  }
  return data;
}

function statusBadge(status, label) {
  return `<span class="badge ${status}">${esc(label)}</span>`;
}
function riskStatusFor(key) { return (RISK_CATEGORIES.find(r => r.key === key) || {}).status || "neutral"; }

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function downloadTextFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime || "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
