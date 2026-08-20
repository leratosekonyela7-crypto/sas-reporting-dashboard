/* ==========================================================================
   CHARTS.JS - small vanilla SVG chart components (no external dependencies).
   Bar chart (grouped or stacked), stat tiles, and a satisfaction meter.
   Every chart ships a "view as table" toggle per the accessibility pass.
   ========================================================================== */

function renderStatTile(opts) {
  const status = opts.status ? ` status-${opts.status}` : "";
  const delta = opts.delta ? `<div class="stat-delta ${opts.delta.dir || ''}">${esc(opts.delta.text)}</div>` : "";
  return `<div class="stat-tile${status}">
    <div class="stat-label">${esc(opts.label)}</div>
    <div class="stat-value">${esc(opts.value)}</div>
    ${delta}
  </div>`;
}

function renderMeter(container, opts) {
  /* opts: {label, value (0-100), goodAbove, warnAbove} */
  const v = Math.max(0, Math.min(100, Number(opts.value) || 0));
  let status = "critical";
  if (v >= (opts.goodAbove != null ? opts.goodAbove : 80)) status = "good";
  else if (v >= (opts.warnAbove != null ? opts.warnAbove : 60)) status = "warning";
  else if (v >= 40) status = "serious";
  const colorVar = { good: "--status-good", warning: "--status-warning", serious: "--status-serious", critical: "--status-critical" }[status];
  const wrap = el(`<div class="chart-card">
    <div class="chart-title">${esc(opts.label)}</div>
    <div class="chart-sub">${opts.sub ? esc(opts.sub) : ""}</div>
    <div style="height:14px;border-radius:99px;background:var(--gridline);overflow:hidden;">
      <div style="height:100%;width:${v}%;background:var(${colorVar});border-radius:99px;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;">
      <span style="font-size:20px;font-weight:800;">${fmt1(v)}%</span>
      ${statusBadge(status, status.charAt(0).toUpperCase() + status.slice(1))}
    </div>
  </div>`);
  container.appendChild(wrap);
}

/* Generic bar chart. opts:
   { title, sub, categories:[str], series:[{label,color,values:[num]}], stacked:bool, height:num, valueSuffix:str } */
function renderBarChart(container, opts) {
  const width = Math.max(360, container.clientWidth || 480);
  const height = opts.height || 260;
  const padL = 42, padR = 14, padT = 10, padB = 46;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const cats = opts.categories;
  const series = opts.series;
  const suffix = opts.valueSuffix || "";

  let maxVal = 0;
  if (opts.stacked) {
    cats.forEach((_, i) => { maxVal = Math.max(maxVal, sum(series.map(s => s.values[i] || 0))); });
  } else {
    series.forEach(s => s.values.forEach(v => { maxVal = Math.max(maxVal, v || 0); }));
  }
  maxVal = maxVal <= 0 ? 1 : maxVal * 1.15;
  const niceMax = niceCeiling(maxVal);

  const groupW = plotW / cats.length;
  const barGap = 2;
  const barW = opts.stacked ? Math.min(46, groupW * 0.55) : Math.min(30, (groupW * 0.7) / series.length);

  const yTicks = 4;
  let gridSvg = "", axisLabels = "";
  for (let t = 0; t <= yTicks; t++) {
    const val = niceMax * t / yTicks;
    const y = padT + plotH - (val / niceMax) * plotH;
    gridSvg += `<line x1="${padL}" x2="${width - padR}" y1="${y}" y2="${y}" stroke="var(--gridline)" stroke-width="1"/>`;
    axisLabels += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10.5" fill="var(--text-muted)">${Math.round(val).toLocaleString()}</text>`;
  }

  let bars = "", catLabels = "";
  cats.forEach((cat, i) => {
    const gx = padL + i * groupW;
    catLabels += `<text x="${gx + groupW / 2}" y="${height - padB + 18}" text-anchor="middle" font-size="11" fill="var(--text-secondary)">${escSvg(truncate(cat, 14))}</text>`;
    if (opts.stacked) {
      let yCursor = padT + plotH;
      series.forEach(s => {
        const v = s.values[i] || 0;
        const h = (v / niceMax) * plotH;
        const x = gx + (groupW - barW) / 2;
        const y = yCursor - h;
        if (v > 0) {
          bars += `<rect data-tip="${escSvg(s.label)} (${escSvg(cat)}): ${escSvg(fmtNum(v))}${escSvg(suffix)}" x="${x}" y="${y}" width="${barW}" height="${Math.max(h - 2, 0)}" rx="3" fill="${s.color}"></rect>`;
        }
        yCursor -= h;
      });
    } else {
      series.forEach((s, si) => {
        const v = s.values[i] || 0;
        const h = (v / niceMax) * plotH;
        const x = gx + (groupW - series.length * barW) / 2 + si * barW;
        const y = padT + plotH - h;
        bars += `<rect data-tip="${escSvg(s.label)} (${escSvg(cat)}): ${escSvg(fmtNum(v))}${escSvg(suffix)}" x="${x + 1}" y="${y}" width="${Math.max(barW - barGap, 2)}" height="${Math.max(h, 0)}" rx="3" fill="${s.color}"></rect>`;
      });
    }
  });

  const legend = series.length > 1 ? `<div class="chart-legend">${series.map(s => `<span><span class="swatch" style="background:${s.color}"></span>${esc(s.label)}</span>`).join("")}</div>` : "";

  const chartId = "chart_" + Math.random().toString(36).slice(2, 9);
  const wrap = el(`<div class="chart-card" style="position:relative;">
    <div class="chart-title">${esc(opts.title || "")}</div>
    <div class="chart-sub">${opts.sub ? esc(opts.sub) : ""}</div>
    <svg id="${chartId}" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow:visible;display:block;">
      ${gridSvg}
      <line x1="${padL}" x2="${width - padR}" y1="${padT + plotH}" y2="${padT + plotH}" stroke="var(--baseline)" stroke-width="1.4"/>
      ${bars}
      ${axisLabels}
      ${catLabels}
    </svg>
    ${legend}
    <button class="table-toggle" data-role="toggle-table">View as table</button>
    <div class="table-scroll" data-role="table-view" style="display:none;margin-top:8px;"></div>
  </div>`);
  container.appendChild(wrap);

  const tooltip = document.getElementById("chart-tooltip-shared") || (() => {
    const tp = el(`<div class="chart-tooltip" id="chart-tooltip-shared"></div>`);
    document.body.appendChild(tp);
    return tp;
  })();
  wrap.querySelectorAll("rect[data-tip]").forEach(rect => {
    rect.addEventListener("mousemove", (e) => {
      tooltip.textContent = rect.getAttribute("data-tip");
      tooltip.style.left = (e.pageX + 12) + "px";
      tooltip.style.top = (e.pageY - 10) + "px";
      tooltip.style.opacity = 1;
    });
    rect.addEventListener("mouseleave", () => { tooltip.style.opacity = 0; });
  });

  const toggleBtn = wrap.querySelector('[data-role="toggle-table"]');
  const tableView = wrap.querySelector('[data-role="table-view"]');
  toggleBtn.addEventListener("click", () => {
    const showing = tableView.style.display !== "none";
    if (!showing) {
      let html = `<table class="data-table"><thead><tr><th>Category</th>${series.map(s => `<th>${esc(s.label)}</th>`).join("")}</tr></thead><tbody>`;
      cats.forEach((cat, i) => {
        html += `<tr><td>${esc(cat)}</td>${series.map(s => `<td>${fmtNum(s.values[i] || 0)}${suffix}</td>`).join("")}</tr>`;
      });
      html += `</tbody></table>`;
      tableView.innerHTML = html;
    }
    tableView.style.display = showing ? "none" : "block";
    toggleBtn.textContent = showing ? "View as table" : "Hide table";
  });
}

function niceCeiling(v) {
  const mag = Math.pow(10, Math.floor(Math.log10(v || 1)));
  const norm = v / mag;
  let step;
  if (norm <= 1) step = 1; else if (norm <= 2) step = 2; else if (norm <= 5) step = 5; else step = 10;
  return step * mag;
}
function escSvg(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function truncate(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
