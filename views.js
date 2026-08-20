/* ==========================================================================
   VIEWS.JS - aggregation logic + the eight page views.
   ========================================================================== */

/* ---------------- aggregation helpers ---------------- */

function allTermSubmissions() { return loadStore(STORE_KEYS.term); }
function allSemesterRecords() { return loadStore(STORE_KEYS.semester); }
function allLaMetrics() { return loadStore(STORE_KEYS.laMetrics); }

function filterSubs(subs, filters) {
  filters = filters || {};
  return subs.filter(s =>
    (!filters.programme || s.programme === filters.programme) &&
    (!filters.practitioner || s.practitioner === filters.practitioner) &&
    (!filters.faculty || s.faculty === filters.faculty) &&
    (!filters.category || s.category === filters.category) &&
    (!filters.year || s.year === filters.year) &&
    (!filters.term || s.term === filters.term)
  );
}

function isSubmissionComplete(sub) {
  const p = PROGRAMMES[sub.programme];
  if (!p) return true;
  const fields = ADMIN_FIELD_SETS[p.adminFields] || [];
  if (!fields.length) return true;
  return fields.every(f => sub.form[f] === "Yes");
}
function followUpPriority(sub) {
  const complete = isSubmissionComplete(sub);
  const sr = Number(sub.form.selfRatedScore) || null;
  if (complete && (!sr || sr >= 4)) return "No Follow-up Needed";
  if (!complete && sr && sr <= 2) return "Priority 1 - Immediate";
  if (!complete) return "Priority 2 - Moderate";
  return "Priority 3 - Monitor";
}

function computeAggregate(subs) {
  const f = subs.map(s => s.form);
  const riskGreen = sum(f.map(x => x.risk_green));
  const riskYellow = sum(f.map(x => x.risk_yellow));
  const riskOrange = sum(f.map(x => x.risk_orange));
  const riskRed = sum(f.map(x => x.risk_red));
  const sat5 = sum(f.map(x => x.sat_5)), sat4 = sum(f.map(x => x.sat_4)), sat3 = sum(f.map(x => x.sat_3)),
        sat2 = sum(f.map(x => x.sat_2)), sat1 = sum(f.map(x => x.sat_1));
  const satTotal = sat5 + sat4 + sat3 + sat2 + sat1;
  const avgSat = satTotal ? (sat5 * 5 + sat4 * 4 + sat3 * 3 + sat2 * 2 + sat1 * 1) / satTotal : null;
  const pctSat = satTotal ? (sat5 + sat4) / satTotal * 100 : null;
  const actualCost = sum(f.map(x => (x.budget_workedHours || 0) * (x.budget_activeStaff || 0) * (x.budget_rate || 0)));
  const approvedCost = sum(f.map(x => (x.budget_approvedHours || 0) * (x.budget_approvedStaff || 0) * (x.budget_rate || 0)));
  const completeCount = subs.filter(isSubmissionComplete).length;
  const ltaTagCounts = {};
  LTA_TAGS.forEach(t => ltaTagCounts[t] = 0);
  f.forEach(x => {
    const tags = Array.isArray(x.ltaTag) ? x.ltaTag : (x.ltaTag ? [x.ltaTag] : []);
    tags.forEach(t => { if (ltaTagCounts[t] != null) ltaTagCounts[t]++; });
  });
  const followUp = { "Priority 1 - Immediate": 0, "Priority 2 - Moderate": 0, "Priority 3 - Monitor": 0, "No Follow-up Needed": 0 };
  subs.forEach(s => { followUp[followUpPriority(s)]++; });
  const recommendations = subs.filter(s => s.form.recommendation && s.form.recommendationPriority === "High")
    .map(s => ({ programme: PROGRAMMES[s.programme] ? PROGRAMMES[s.programme].name : s.programme, practitioner: s.practitioner, text: s.form.recommendation, owner: s.form.recommendationOwner, target: s.form.targetKPI }));
  const highlights = subs.filter(s => s.form.keyOutcomes).map(s => ({ practitioner: s.practitioner, text: s.form.keyOutcomes }));
  const challenges = subs.filter(s => s.form.challenges).map(s => ({ practitioner: s.practitioner, text: s.form.challenges }));
  return {
    count: subs.length,
    reachTotal: sum(f.map(x => x.reach_total)),
    firstYear: sum(f.map(x => x.reach_firstYear)),
    seniorReturning: sum(f.map(x => x.reach_seniorReturning)),
    postgraduate: sum(f.map(x => x.reach_postgraduate)),
    risk: { green: riskGreen, yellow: riskYellow, orange: riskOrange, red: riskRed },
    riskTotal: riskYellow + riskOrange + riskRed,
    riskAssisted: sum(f.map(x => x.riskAssisted)),
    satisfaction: { avg: avgSat, pct: pctSat, total: satTotal },
    budget: { actualCost, approvedCost, variance: actualCost - approvedCost },
    compliance: { complete: completeCount, total: subs.length, pct: subs.length ? completeCount / subs.length * 100 : null },
    ltaTagCounts, followUp, recommendations, highlights, challenges
  };
}

/* ---------------- shared small components ---------------- */

function yearTermPicker(idPrefix, currentYear, currentTerm) {
  return `<div class="field"><span class="lbl">Academic Year</span>
      <select id="${idPrefix}Year">${ACADEMIC_YEARS.map(y => `<option ${y === currentYear ? "selected" : ""}>${y}</option>`).join("")}</select></div>
    <div class="field"><span class="lbl">Term</span>
      <select id="${idPrefix}Term">${TERMS.map(t => `<option ${t === currentTerm ? "selected" : ""}>${t}</option>`).join("")}</select></div>`;
}

function riskChartFromAgg(container, agg, title) {
  const wrap = el(`<div class="chart-card"><div class="chart-title">${esc(title || "At-Risk Category Breakdown")}</div><div class="chart-sub">Institution-wide model: Green = passed all modules, Red = failed &gt;50%</div><div id="riskbars" style="display:flex;gap:14px;align-items:flex-end;height:180px;padding-top:10px;"></div><div class="chart-legend"></div></div>`);
  container.appendChild(wrap);
  const bars = wrap.querySelector("#riskbars");
  const cats = RISK_CATEGORIES.map(r => ({ ...r, value: agg.risk[r.key] || 0 }));
  const max = Math.max(1, ...cats.map(c => c.value));
  cats.forEach(c => {
    const h = Math.max(4, (c.value / max) * 150);
    const colorVar = { good: "--status-good", warning: "--status-warning", serious: "--status-serious", critical: "--status-critical" }[c.status];
    bars.insertAdjacentHTML("beforeend", `<div style="flex:1;text-align:center;">
      <div style="font-size:13px;font-weight:800;margin-bottom:4px;">${fmtNum(c.value)}</div>
      <div style="height:${h}px;background:var(${colorVar});border-radius:6px 6px 3px 3px;"></div>
      <div style="font-size:11px;color:var(--text-secondary);margin-top:6px;">${c.label}</div>
    </div>`);
  });
}

function recommendationList(container, recs) {
  if (!recs.length) { container.innerHTML = `<div class="empty-state">No high-priority recommendations for this period.</div>`; return; }
  container.innerHTML = `<ul style="margin:0;padding-left:18px;">${recs.map(r =>
    `<li style="margin-bottom:8px;"><b>${esc(r.programme || "")}</b>${r.practitioner ? " · " + esc(r.practitioner) : ""}: ${esc(r.text)}${r.owner ? ` <span class="help-note">(Owner: ${esc(r.owner)}${r.target ? ", Target: " + esc(r.target) : ""})</span>` : ""}</li>`
  ).join("")}</ul>`;
}

/* ==========================================================================
   OVERVIEW
   ========================================================================== */
function renderOverviewView(container) {
  const state = { year: ACADEMIC_YEARS[1], term: "Term 2" };
  function draw() {
    const subs = filterSubs(allTermSubmissions(), { year: state.year, term: state.term });
    const agg = computeAggregate(subs);
    container.innerHTML = `
      <div class="card">
        <div class="two-col-header">
          <div><h2>Institution-wide Overview</h2><p class="help-note">Rolls up every programme's Term submissions for the selected period.</p></div>
          <div class="grid cols-2" style="min-width:280px;">${yearTermPicker("ov", state.year, state.term)}</div>
        </div>
        <div class="grid cols-4" id="ovTiles" style="margin-top:6px;"></div>
      </div>
      <div class="grid cols-2">
        <div id="ovRiskChart"></div>
        <div id="ovReachChart"></div>
      </div>
      <div class="grid cols-2">
        <div id="ovSatChart"></div>
        <div class="card"><h2>High-Priority Recommendations</h2><div id="ovRecs"></div></div>
      </div>`;
    const tiles = container.querySelector("#ovTiles");
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Total students reached", value: fmtNum(agg.reachTotal) }));
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Total at-risk (Y+O+R)", value: fmtNum(agg.riskTotal), status: agg.riskTotal > 0 ? "warning" : "good" }));
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Avg satisfaction /5", value: agg.satisfaction.avg != null ? fmt1(agg.satisfaction.avg) : "—" }));
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Reporting compliance", value: agg.compliance.pct != null ? fmtPct(agg.compliance.pct) : "—", status: (agg.compliance.pct || 0) >= 80 ? "good" : "warning" }));

    riskChartFromAgg(container.querySelector("#ovRiskChart"), agg, "Institution-wide At-Risk Breakdown");

    const reachByProg = REPORTING_PROGRAMMES.map(k => ({ k, agg: computeAggregate(filterSubs(subs, { programme: k })) }));
    renderBarChart(container.querySelector("#ovReachChart"), {
      title: "Student Reach by Programme", sub: `${state.term} ${state.year}`,
      categories: reachByProg.map(x => PROGRAMMES[x.k].name),
      series: [{ label: "Students reached", color: "var(--cat-blue)", values: reachByProg.map(x => x.agg.reachTotal) }]
    });
    renderBarChart(container.querySelector("#ovSatChart"), {
      title: "Average Satisfaction by Programme (out of 5)", sub: `${state.term} ${state.year}`,
      categories: reachByProg.map(x => PROGRAMMES[x.k].name),
      series: [{ label: "Avg /5", color: "var(--cat-aqua)", values: reachByProg.map(x => x.agg.satisfaction.avg || 0) }],
      valueSuffix: "/5"
    });
    recommendationList(container.querySelector("#ovRecs"), agg.recommendations);

    container.querySelector("#ovYear").onchange = e => { state.year = e.target.value; draw(); };
    container.querySelector("#ovTerm").onchange = e => { state.term = e.target.value; draw(); };
  }
  draw();
}

/* ==========================================================================
   SUBMIT A TERM REPORT
   ========================================================================== */
function renderSubmitView(container) {
  const progOptions = REPORTING_PROGRAMMES.map(k => ({ value: k, label: PROGRAMMES[k].name }));
  container.innerHTML = `
    <div class="card">
      <h2>Submit a Term Report</h2>
      <p class="help-note">Pick your programme, your name and faculty, then fill in the fields that apply to your programme — the form changes to match it.</p>
      <form id="termForm">
        <div class="grid cols-4">
          ${fSelect("programme", "Programme", progOptions, REPORTING_PROGRAMMES[0])}
          <div id="practitionerFieldWrap"></div>
          <div id="facultyFieldWrap"></div>
          <div id="categoryFieldWrap"></div>
        </div>
        <div class="grid cols-4" style="margin-top:10px;">
          ${fSelect("year", "Academic Year", ACADEMIC_YEARS, ACADEMIC_YEARS[1])}
          ${fSelect("term", "Term", TERMS, "Term 2")}
        </div>
        <div id="dynamicFields"></div>
        <div class="btn-row">
          <button type="submit" class="btn">Save Submission</button>
          <span class="help-note">Saved to this browser. Use the Data Manager tab to export/share.</span>
        </div>
      </form>
    </div>
    <div class="card"><h2>Recent Submissions (this browser)</h2><div id="recentSubs"></div></div>`;

  const form = container.querySelector("#termForm");
  const progSel = form.querySelector('[name="programme"]');

  function renderPractitionerAndFaculty() {
    const progKey = progSel.value;
    const p = PROGRAMMES[progKey];
    const practitioners = Object.keys(p.practitioners);
    container.querySelector("#practitionerFieldWrap").innerHTML = fSelect("practitioner", "Practitioner", practitioners, practitioners[0]);
    const catWrap = container.querySelector("#categoryFieldWrap");
    catWrap.innerHTML = progKey === "additionalSupport" ? fSelect("category", "Support Category", p.categories, p.categories[0]) : "";
    renderFaculty();
    form.querySelector('[name="practitioner"]').addEventListener("change", renderFaculty);
  }
  function renderFaculty() {
    const progKey = progSel.value;
    const practitioner = form.querySelector('[name="practitioner"]').value;
    const faculties = facultiesFor(progKey, practitioner);
    container.querySelector("#facultyFieldWrap").innerHTML = fSelect("faculty", "Faculty", faculties.map(f => ({ value: f, label: FACULTY_LABELS[f] || f })), faculties[0]);
  }
  function renderDynamicFields() {
    const progKey = progSel.value;
    const builder = FORM_BUILDERS[progKey];
    container.querySelector("#dynamicFields").innerHTML = builder ? builder({}) : "";
    wireBudgetCalc(container.querySelector("#dynamicFields"));
  }
  function renderRecent() {
    const subs = allTermSubmissions().slice(-15).reverse();
    const box = container.querySelector("#recentSubs");
    if (!subs.length) { box.innerHTML = `<div class="empty-state">No submissions yet. Try "Load Sample Data" in the Data Manager tab to see the dashboard in action.</div>`; return; }
    box.innerHTML = `<div class="table-scroll"><table class="data-table"><thead><tr>
      <th>Programme</th><th>Practitioner</th><th>Faculty</th><th>Period</th><th>Reach</th><th>At-Risk</th><th>Satisfaction</th><th></th>
      </tr></thead><tbody>${subs.map(s => {
        const agg = computeAggregate([s]);
        return `<tr><td>${esc(PROGRAMMES[s.programme] ? PROGRAMMES[s.programme].name : s.programme)}</td><td>${esc(s.practitioner)}</td>
          <td>${esc(s.faculty)}${s.category ? " · " + esc(s.category) : ""}</td><td>${esc(s.term)} ${esc(s.year)}</td>
          <td>${fmtNum(agg.reachTotal)}</td><td>${fmtNum(agg.riskTotal)}</td><td>${agg.satisfaction.avg != null ? fmt1(agg.satisfaction.avg) + "/5" : "—"}</td>
          <td><button class="btn ghost" data-del="${s.id}">Delete</button></td></tr>`;
      }).join("")}</tbody></table></div>`;
    box.querySelectorAll("[data-del]").forEach(btn => btn.addEventListener("click", () => {
      const arr = allTermSubmissions().filter(x => x.id !== btn.getAttribute("data-del"));
      saveStore(STORE_KEYS.term, arr);
      renderRecent();
      showToast("Submission deleted.");
    }));
  }

  progSel.addEventListener("change", () => { renderPractitionerAndFaculty(); renderDynamicFields(); });
  renderPractitionerAndFaculty();
  renderDynamicFields();
  renderRecent();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = collectForm(form);
    const record = {
      id: uid(), createdAt: new Date().toISOString(),
      programme: data.programme, practitioner: data.practitioner, faculty: data.faculty,
      category: data.category || null, year: data.year, term: data.term,
      form: data
    };
    const arr = allTermSubmissions();
    arr.push(record);
    saveStore(STORE_KEYS.term, arr);
    showToast("Submission saved to this browser.");
    renderRecent();
    form.reset();
    renderPractitionerAndFaculty();
    renderDynamicFields();
  });
}

/* ==========================================================================
   PROGRAMME DASHBOARDS
   ========================================================================== */
function renderProgrammesView(container) {
  const state = { programme: REPORTING_PROGRAMMES[0], year: ACADEMIC_YEARS[1], term: "Term 2" };
  container.innerHTML = `
    <div class="card">
      <div class="two-col-header">
        <div><h2 id="pdTitle"></h2><p class="help-note">Auto-computed from that programme's Term submissions.</p></div>
        <div class="grid cols-2" style="min-width:280px;">${yearTermPicker("pd", state.year, state.term)}</div>
      </div>
      <div class="pill-select" id="pdPills" style="margin-top:6px;"></div>
    </div>
    <div class="grid cols-4" id="pdTiles"></div>
    <div class="grid cols-2">
      <div id="pdRiskChart"></div>
      <div id="pdCompareChart"></div>
    </div>
    <div class="grid cols-2">
      <div id="pdSatMeter"></div>
      <div id="pdComplianceMeter"></div>
    </div>
    <div class="grid cols-2">
      <div class="card"><h3 class="section-title" style="margin-top:0;">Highlights</h3><div id="pdHighlights"></div></div>
      <div class="card"><h3 class="section-title" style="margin-top:0;">Challenges</h3><div id="pdChallenges"></div></div>
    </div>
    <div class="card"><h2>Submissions this period</h2><div id="pdTable"></div></div>`;

  const pillsBox = container.querySelector("#pdPills");
  pillsBox.innerHTML = REPORTING_PROGRAMMES.map(k => `<button data-k="${k}" class="${k === state.programme ? "active" : ""}">${esc(PROGRAMMES[k].name)}</button>`).join("");
  pillsBox.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    state.programme = b.getAttribute("data-k");
    pillsBox.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    draw();
  }));
  container.querySelector("#pdYear").onchange = e => { state.year = e.target.value; draw(); };
  container.querySelector("#pdTerm").onchange = e => { state.term = e.target.value; draw(); };

  function draw() {
    const p = PROGRAMMES[state.programme];
    container.querySelector("#pdTitle").textContent = p.name + " — Programme Report";
    const subs = filterSubs(allTermSubmissions(), { programme: state.programme, year: state.year, term: state.term });
    const agg = computeAggregate(subs);
    const tiles = container.querySelector("#pdTiles");
    tiles.innerHTML = "";
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Submissions", value: agg.count }));
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Students reached", value: fmtNum(agg.reachTotal) }));
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "At-risk assisted", value: fmtNum(agg.riskAssisted) + " / " + fmtNum(agg.riskTotal) }));
    if (agg.budget.approvedCost || agg.budget.actualCost) {
      const over = agg.budget.variance > 0;
      tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Budget variance", value: "R" + fmtNum(Math.round(agg.budget.variance)), status: over ? "critical" : "good" }));
    } else {
      tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Reporting compliance", value: agg.compliance.pct != null ? fmtPct(agg.compliance.pct) : "—", status: (agg.compliance.pct || 0) >= 80 ? "good" : "warning" }));
    }
    container.querySelector("#pdRiskChart").innerHTML = "";
    riskChartFromAgg(container.querySelector("#pdRiskChart"), agg, "At-Risk Breakdown");
    const byPractitioner = Object.keys(p.practitioners).map(name => ({ name, a: computeAggregate(filterSubs(subs, { practitioner: name })) }));
    container.querySelector("#pdCompareChart").innerHTML = "";
    renderBarChart(container.querySelector("#pdCompareChart"), {
      title: "Reach by Practitioner", categories: byPractitioner.map(x => x.name),
      series: [{ label: "Students reached", color: p.color, values: byPractitioner.map(x => x.a.reachTotal) }]
    });
    container.querySelector("#pdSatMeter").innerHTML = "";
    renderMeter(container.querySelector("#pdSatMeter"), {
      label: "% Satisfied (4-5 stars)", sub: `${agg.satisfaction.total} survey responses`,
      value: agg.satisfaction.pct != null ? agg.satisfaction.pct : 0
    });
    container.querySelector("#pdComplianceMeter").innerHTML = "";
    renderMeter(container.querySelector("#pdComplianceMeter"), {
      label: "Reporting Compliance", sub: `${agg.compliance.complete} of ${agg.compliance.total} submissions fully complete`,
      value: agg.compliance.pct != null ? agg.compliance.pct : 0
    });
    const hl = container.querySelector("#pdHighlights");
    hl.innerHTML = agg.highlights.length ? `<ul style="margin:0;padding-left:16px;">${agg.highlights.map(h => `<li style="margin-bottom:6px;"><b>${esc(h.practitioner)}:</b> ${esc(h.text)}</li>`).join("")}</ul>` : `<div class="empty-state">No entries yet.</div>`;
    const ch = container.querySelector("#pdChallenges");
    ch.innerHTML = agg.challenges.length ? `<ul style="margin:0;padding-left:16px;">${agg.challenges.map(h => `<li style="margin-bottom:6px;"><b>${esc(h.practitioner)}:</b> ${esc(h.text)}</li>`).join("")}</ul>` : `<div class="empty-state">No entries yet.</div>`;

    const tbl = container.querySelector("#pdTable");
    if (!subs.length) { tbl.innerHTML = `<div class="empty-state">No submissions for this programme/period yet.</div>`; return; }
    tbl.innerHTML = `<div class="table-scroll"><table class="data-table"><thead><tr><th>Practitioner</th><th>Faculty</th><th>Reach</th><th>At-Risk</th><th>Satisfaction</th><th>Compliance</th><th></th></tr></thead><tbody>
      ${subs.map(s => {
        const a = computeAggregate([s]);
        return `<tr><td>${esc(s.practitioner)}</td><td>${esc(s.faculty)}${s.category ? " · " + esc(s.category) : ""}</td>
          <td>${fmtNum(a.reachTotal)}</td><td>${fmtNum(a.riskTotal)}</td><td>${a.satisfaction.avg != null ? fmt1(a.satisfaction.avg) + "/5" : "—"}</td>
          <td>${statusBadge(isSubmissionComplete(s) ? "good" : "warning", isSubmissionComplete(s) ? "Complete" : followUpPriority(s))}</td>
          <td><button class="btn ghost" data-del="${s.id}">Delete</button></td></tr>`;
      }).join("")}</tbody></table></div>`;
    tbl.querySelectorAll("[data-del]").forEach(btn => btn.addEventListener("click", () => {
      saveStore(STORE_KEYS.term, allTermSubmissions().filter(x => x.id !== btn.getAttribute("data-del")));
      draw();
    }));
  }
  draw();
}

/* ==========================================================================
   SEMESTER ROLL-UP
   ========================================================================== */
function renderSemesterView(container) {
  const state = { programme: REPORTING_PROGRAMMES[0], year: ACADEMIC_YEARS[1], semesterIdx: 0 };
  function currentPractitioners() { return Object.keys(PROGRAMMES[state.programme].practitioners); }

  container.innerHTML = `
    <div class="card">
      <h2>Semester Roll-up</h2>
      <p class="help-note">Semester 1 auto-fills from Term 1 + Term 2; Semester 2 from Term 3 + Term 4. Add performance/progression/retention and programme feedback here — these don't need re-entering at term level.</p>
      <div class="grid cols-4">
        ${fSelect("smProgramme", "Programme", REPORTING_PROGRAMMES.map(k => ({ value: k, label: PROGRAMMES[k].name })), state.programme)}
        <div id="smPractitionerWrap"></div>
        <div id="smFacultyWrap"></div>
        ${fSelect("smSemester", "Semester", SEMESTERS.map((s, i) => ({ value: i, label: s.key })), 0)}
      </div>
      <div class="grid cols-2" style="margin-top:10px;max-width:340px;">
        ${fSelect("smYear", "Academic Year", ACADEMIC_YEARS, state.year)}
      </div>
    </div>
    <div class="card"><h2>Auto-filled from Term submissions</h2><div id="smAutoTiles" class="grid cols-4"></div></div>
    <div class="card">
      <h2>Performance, Progression & Retention</h2>
      <form id="semForm">
        <div class="grid cols-3">
          ${fNumber("perf_first_pass", "First-year — pass rate %", 0, { step: "0.1" })}
          ${fNumber("perf_first_prog", "First-year — progression %", 0, { step: "0.1" })}
          ${fNumber("perf_first_ret", "First-year — retention %", 0, { step: "0.1" })}
        </div>
        <div class="grid cols-3" style="margin-top:8px;">
          ${fNumber("perf_second_pass", "Second-year — pass rate %", 0, { step: "0.1" })}
          ${fNumber("perf_second_prog", "Second-year — progression %", 0, { step: "0.1" })}
          ${fNumber("perf_second_ret", "Second-year — retention %", 0, { step: "0.1" })}
        </div>
        <div class="grid cols-3" style="margin-top:8px;">
          ${fNumber("perf_third_pass", "Third-year — pass rate %", 0, { step: "0.1" })}
          ${fNumber("perf_third_prog", "Third-year — progression %", 0, { step: "0.1" })}
          ${fNumber("perf_third_ret", "Third-year — retention %", 0, { step: "0.1" })}
        </div>
        <div id="smModuleWrap"></div>
        <h3 class="section-title">Programme Feedback</h3>
        <div class="grid cols-2">
          ${fTextarea("overallSatisfactionFeedback", "Overall student satisfaction feedback", "")}
          ${fTextarea("semesterFeedback", "Semester feedback", "")}
        </div>
        <div class="grid cols-2" style="margin-top:8px;">
          ${fTextarea("stakeholderFeedbackText", "Stakeholder feedback", "")}
        </div>
        <div class="btn-row"><button class="btn" type="submit">Save Semester Record</button></div>
      </form>
    </div>
    <div class="card"><h2>Saved Semester Records</h2><div id="smSaved"></div></div>`;

  function moduleBlockHtml() {
    const p = PROGRAMMES[state.programme];
    if (!p.hasModules && p.kind !== "staffed") return "";
    return `<h3 class="section-title">Module-level detail (optional)</h3>
      ${fTextarea("moduleDetail", "One module per line: Module Code, Pass rate %, Progression %, Retention %", "")}
      <p class="help-note">Example: NMAT515, 78, 82, 90</p>`;
  }

  function recordKey() {
    return [state.programme, container.querySelector('[name="practitioner"]') ? container.querySelector('[name="practitioner"]').value : "",
            container.querySelector('[name="faculty"]') ? container.querySelector('[name="faculty"]').value : "",
            state.year, SEMESTERS[state.semesterIdx].key].join("|");
  }

  function drawAuto() {
    const practitioner = container.querySelector("#smPractitionerWrap select") ? container.querySelector("#smPractitionerWrap select").value : "";
    const faculty = container.querySelector("#smFacultyWrap select") ? container.querySelector("#smFacultyWrap select").value : "";
    const termsInSem = SEMESTERS[state.semesterIdx].terms;
    const subs = allTermSubmissions().filter(s => s.programme === state.programme && s.practitioner === practitioner &&
      s.faculty === faculty && s.year === state.year && termsInSem.includes(s.term));
    const agg = computeAggregate(subs);
    const tiles = container.querySelector("#smAutoTiles");
    tiles.innerHTML = "";
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Term submissions found", value: agg.count }));
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Students reached", value: fmtNum(agg.reachTotal) }));
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "At-risk total", value: fmtNum(agg.riskTotal) }));
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Avg satisfaction /5", value: agg.satisfaction.avg != null ? fmt1(agg.satisfaction.avg) : "—" }));
  }

  function drawSaved() {
    const all = allSemesterRecords();
    const box = container.querySelector("#smSaved");
    if (!all.length) { box.innerHTML = `<div class="empty-state">No semester records saved yet.</div>`; return; }
    box.innerHTML = `<div class="table-scroll"><table class="data-table"><thead><tr><th>Programme</th><th>Practitioner</th><th>Faculty</th><th>Semester</th><th>Year</th><th></th></tr></thead><tbody>
      ${all.map(r => `<tr><td>${esc(PROGRAMMES[r.programme] ? PROGRAMMES[r.programme].name : r.programme)}</td><td>${esc(r.practitioner)}</td><td>${esc(r.faculty)}</td><td>${esc(r.semester)}</td><td>${esc(r.year)}</td>
        <td><button class="btn ghost" data-del="${r.key}">Delete</button></td></tr>`).join("")}</tbody></table></div>`;
    box.querySelectorAll("[data-del]").forEach(btn => btn.addEventListener("click", () => {
      saveStore(STORE_KEYS.semester, allSemesterRecords().filter(x => x.key !== btn.getAttribute("data-del")));
      drawSaved();
    }));
  }

  function renderPractitionerFaculty() {
    const practitioners = currentPractitioners();
    container.querySelector("#smPractitionerWrap").innerHTML = fSelect("practitioner", "Practitioner", practitioners, practitioners[0]);
    const facSel = container.querySelector('[name="practitioner"]');
    function renderFac() {
      const faculties = facultiesFor(state.programme, facSel.value);
      container.querySelector("#smFacultyWrap").innerHTML = fSelect("faculty", "Faculty", faculties.map(f => ({ value: f, label: FACULTY_LABELS[f] || f })), faculties[0]);
      container.querySelector('[name="faculty"]').addEventListener("change", drawAuto);
      drawAuto();
    }
    facSel.addEventListener("change", renderFac);
    renderFac();
  }

  container.querySelector('[name="smProgramme"]').addEventListener("change", (e) => {
    state.programme = e.target.value;
    renderPractitionerFaculty();
    container.querySelector("#smModuleWrap").innerHTML = moduleBlockHtml();
  });
  container.querySelector('[name="smYear"]').addEventListener("change", (e) => { state.year = e.target.value; drawAuto(); });
  container.querySelector('[name="smSemester"]').addEventListener("change", (e) => { state.semesterIdx = Number(e.target.value); drawAuto(); });

  renderPractitionerFaculty();
  container.querySelector("#smModuleWrap").innerHTML = moduleBlockHtml();
  drawSaved();

  container.querySelector("#semForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = collectForm(e.target);
    const key = recordKey();
    const record = {
      key, programme: state.programme,
      practitioner: container.querySelector('[name="practitioner"]').value,
      faculty: container.querySelector('[name="faculty"]').value,
      year: state.year, semester: SEMESTERS[state.semesterIdx].key,
      data
    };
    const arr = allSemesterRecords().filter(r => r.key !== key);
    arr.push(record);
    saveStore(STORE_KEYS.semester, arr);
    showToast("Semester record saved.");
    drawSaved();
  });
}

/* ==========================================================================
   LEARNING ANALYTICS
   ========================================================================== */
function renderAnalyticsView(container) {
  container.innerHTML = `
    <div class="card">
      <h2>Learning Analytics</h2>
      <p class="help-note">Learning Analytics doesn't re-collect what other programmes already report — it logs the institutional metrics only LA holds (from ITS/Moodle) and cross-analyses what every other programme has already submitted.</p>
      <form id="laForm">
        <div class="grid cols-4">
          ${fSelect("faculty", "Faculty", [FACULTY.EDU, FACULTY.EMS, FACULTY.HUM, FACULTY.NAS, FACULTY.ALL], FACULTY.ALL)}
          ${fSelect("programmeContext", "Programme (optional)", ["All Programmes"].concat(REPORTING_PROGRAMMES.map(k => PROGRAMMES[k].name)), "All Programmes")}
          ${fSelect("yearOfStudy", "Year of Study", ["All", "First-year", "Second-year", "Third-year", "Postgraduate"], "All")}
          ${fText("moduleCode", "Module code (optional)", "")}
        </div>
        <div class="grid cols-3" style="margin-top:8px;">
          ${fNumber("performanceRate", "Performance/pass rate %", 0, { step: "0.1" })}
          ${fNumber("progressionRate", "Progression rate %", 0, { step: "0.1" })}
          ${fNumber("retentionRate", "Retention rate %", 0, { step: "0.1" })}
        </div>
        ${fTextarea("notes", "Notes", "")}
        <div class="btn-row"><button class="btn" type="submit">Add Metric Entry</button></div>
      </form>
    </div>
    <div class="card"><h2>Logged Institutional Metrics</h2><div id="laTable"></div></div>
    <div class="grid cols-2">
      <div id="laSatChart"></div>
      <div id="laPerfChart"></div>
    </div>
    <div class="card"><h2>Programme & Stakeholder Feedback (from Semester Roll-ups)</h2><div id="laFeedback"></div></div>
    <div class="card"><h2>Core Curriculum Facilitators' Feedback</h2><div id="laCoreCurriculum"></div></div>`;

  function drawTable() {
    const rows = allLaMetrics();
    const box = container.querySelector("#laTable");
    if (!rows.length) { box.innerHTML = `<div class="empty-state">No metrics logged yet.</div>`; return; }
    box.innerHTML = `<div class="table-scroll"><table class="data-table"><thead><tr><th>Faculty</th><th>Programme</th><th>Year</th><th>Module</th><th>Perf%</th><th>Progr%</th><th>Retn%</th><th></th></tr></thead><tbody>
      ${rows.slice().reverse().map(r => `<tr><td>${esc(r.faculty)}</td><td>${esc(r.programmeContext)}</td><td>${esc(r.yearOfStudy)}</td><td>${esc(r.moduleCode || "—")}</td>
        <td>${fmtPct(r.performanceRate)}</td><td>${fmtPct(r.progressionRate)}</td><td>${fmtPct(r.retentionRate)}</td>
        <td><button class="btn ghost" data-del="${r.id}">Delete</button></td></tr>`).join("")}</tbody></table></div>`;
    box.querySelectorAll("[data-del]").forEach(btn => btn.addEventListener("click", () => {
      saveStore(STORE_KEYS.laMetrics, allLaMetrics().filter(x => x.id !== btn.getAttribute("data-del")));
      drawTable(); drawCharts();
    }));
  }

  function drawCharts() {
    const subs = allTermSubmissions();
    const perProg = REPORTING_PROGRAMMES.map(k => ({ k, agg: computeAggregate(filterSubs(subs, { programme: k })) }));
    container.querySelector("#laSatChart").innerHTML = "";
    renderBarChart(container.querySelector("#laSatChart"), {
      title: "Satisfaction by Programme (all periods)", categories: perProg.map(x => PROGRAMMES[x.k].name),
      series: [{ label: "Avg /5", color: "var(--cat-blue)", values: perProg.map(x => x.agg.satisfaction.avg || 0) }], valueSuffix: "/5"
    });
    const metrics = allLaMetrics();
    const byFaculty = [FACULTY.EDU, FACULTY.EMS, FACULTY.HUM, FACULTY.NAS].map(fac => {
      const rows = metrics.filter(m => m.faculty === fac);
      return { fac, perf: avg(rows.map(r => r.performanceRate)) || 0, prog: avg(rows.map(r => r.progressionRate)) || 0, ret: avg(rows.map(r => r.retentionRate)) || 0 };
    });
    container.querySelector("#laPerfChart").innerHTML = "";
    renderBarChart(container.querySelector("#laPerfChart"), {
      title: "Performance / Progression / Retention by Faculty", categories: byFaculty.map(x => x.fac),
      series: [
        { label: "Performance %", color: "var(--cat-blue)", values: byFaculty.map(x => x.perf) },
        { label: "Progression %", color: "var(--cat-aqua)", values: byFaculty.map(x => x.prog) },
        { label: "Retention %", color: "var(--cat-violet)", values: byFaculty.map(x => x.ret) }
      ], valueSuffix: "%"
    });
  }

  function drawFeedback() {
    const recs = allSemesterRecords();
    const box = container.querySelector("#laFeedback");
    if (!recs.length) { box.innerHTML = `<div class="empty-state">No semester feedback recorded yet — add some in the Semester Roll-up tab.</div>`; return; }
    box.innerHTML = `<div class="table-scroll"><table class="data-table"><thead><tr><th>Programme</th><th>Semester</th><th>Overall Satisfaction</th><th>Semester Feedback</th><th>Stakeholder Feedback</th></tr></thead><tbody>
      ${recs.map(r => `<tr><td>${esc(PROGRAMMES[r.programme] ? PROGRAMMES[r.programme].name : r.programme)}</td><td>${esc(r.semester)} ${esc(r.year)}</td>
        <td>${esc(r.data.overallSatisfactionFeedback || "—")}</td><td>${esc(r.data.semesterFeedback || "—")}</td><td>${esc(r.data.stakeholderFeedbackText || "—")}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function drawCoreCurriculum() {
    const subs = allTermSubmissions().filter(s => s.programme === "coreCurriculum");
    const box = container.querySelector("#laCoreCurriculum");
    if (!subs.length) { box.innerHTML = `<div class="empty-state">No Core Curriculum submissions yet.</div>`; return; }
    box.innerHTML = `<ul style="margin:0;padding-left:16px;">${subs.map(s => `<li style="margin-bottom:6px;"><b>${esc(s.form.module)} (${esc(s.term)} ${esc(s.year)}):</b> ${esc(s.form.facilitatorComments || "No comment")} — satisfaction ${esc(s.form.facilitatorSatisfaction || "—")}/5</li>`).join("")}</ul>`;
  }

  container.querySelector("#laForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = collectForm(e.target);
    data.id = uid();
    const arr = allLaMetrics(); arr.push(data);
    saveStore(STORE_KEYS.laMetrics, arr);
    showToast("Metric entry added.");
    drawTable(); drawCharts();
    e.target.reset();
  });

  drawTable(); drawCharts(); drawFeedback(); drawCoreCurriculum();
}

/* ==========================================================================
   SENATE STLC REPORT
   ========================================================================== */
function renderSenateView(container) {
  const state = { year: ACADEMIC_YEARS[1], term: "Term 2" };
  container.innerHTML = `
    <div class="card">
      <div class="two-col-header">
        <div><h2>Senate Teaching & Learning Committee Report</h2><p class="help-note">Builds automatically from every Programme Report for the selected period.</p></div>
        <div class="grid cols-2" style="min-width:280px;">${yearTermPicker("sn", state.year, state.term)}</div>
      </div>
    </div>
    <div class="grid cols-4" id="snTiles"></div>
    <div class="card"><h2>1. Programme Scorecard</h2><div id="snScorecard"></div></div>
    <div class="grid cols-2">
      <div id="snRiskChart"></div>
      <div class="card"><h2>2. LTA Plan Alignment Tally</h2><div id="snLta"></div></div>
    </div>
    <div class="card"><h2>3. Institutional High-Priority Recommendations</h2><div id="snRecs"></div></div>
    <div class="card"><h2>4. Reporting Compliance by Programme</h2><div id="snCompliance"></div></div>
    <div class="card"><h2>5. Student Success Story & Conclusion (narrative)</h2>
      <div class="grid cols-2">
        <label class="field wide"><span class="lbl">Student Success Story</span><textarea id="snStory"></textarea></label>
        <label class="field wide"><span class="lbl">Conclusion & Strategic Way Forward</span><textarea id="snConclusion"></textarea></label>
      </div>
      <div class="btn-row"><button class="btn secondary" id="snSaveNarrative">Save Narrative</button>
      <button class="btn" id="snExport">Export This Report as Text</button></div>
    </div>`;

  container.querySelector("#snStory").value = localStorage.getItem("sas_senate_story_v1") || "";
  container.querySelector("#snConclusion").value = localStorage.getItem("sas_senate_conclusion_v1") || "";
  container.querySelector("#snSaveNarrative").addEventListener("click", () => {
    localStorage.setItem("sas_senate_story_v1", container.querySelector("#snStory").value);
    localStorage.setItem("sas_senate_conclusion_v1", container.querySelector("#snConclusion").value);
    showToast("Narrative saved.");
  });

  function draw() {
    const subs = filterSubs(allTermSubmissions(), { year: state.year, term: state.term });
    const agg = computeAggregate(subs);
    const tiles = container.querySelector("#snTiles"); tiles.innerHTML = "";
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Total students reached", value: fmtNum(agg.reachTotal) }));
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Total at-risk students", value: fmtNum(agg.riskTotal) }));
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Overall satisfaction /5", value: agg.satisfaction.avg != null ? fmt1(agg.satisfaction.avg) : "—" }));
    tiles.insertAdjacentHTML("beforeend", renderStatTile({ label: "Reporting compliance", value: agg.compliance.pct != null ? fmtPct(agg.compliance.pct) : "—", status: (agg.compliance.pct || 0) >= 80 ? "good" : "warning" }));

    const rows = REPORTING_PROGRAMMES.map(k => ({ k, a: computeAggregate(filterSubs(subs, { programme: k })) }));
    container.querySelector("#snScorecard").innerHTML = `<div class="table-scroll"><table class="data-table"><thead><tr>
      <th>Programme</th><th>Submissions</th><th>Reached</th><th>At-Risk</th><th>Satisfaction</th><th>Compliance</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(PROGRAMMES[r.k].name)}</td><td>${r.a.count}</td><td>${fmtNum(r.a.reachTotal)}</td><td>${fmtNum(r.a.riskTotal)}</td>
        <td>${r.a.satisfaction.avg != null ? fmt1(r.a.satisfaction.avg) + "/5" : "—"}</td><td>${r.a.compliance.pct != null ? fmtPct(r.a.compliance.pct) : "—"}</td></tr>`).join("")}
      <tr style="font-weight:700;"><td>TOTAL</td><td>${agg.count}</td><td>${fmtNum(agg.reachTotal)}</td><td>${fmtNum(agg.riskTotal)}</td>
        <td>${agg.satisfaction.avg != null ? fmt1(agg.satisfaction.avg) + "/5" : "—"}</td><td>${agg.compliance.pct != null ? fmtPct(agg.compliance.pct) : "—"}</td></tr>
      </tbody></table></div>`;

    container.querySelector("#snRiskChart").innerHTML = "";
    riskChartFromAgg(container.querySelector("#snRiskChart"), agg, "Institution-wide At-Risk Overview");

    const ltaBox = container.querySelector("#snLta");
    ltaBox.innerHTML = `<div class="table-scroll"><table class="data-table"><thead><tr><th>LTA Plan Clause</th><th>Submissions tagged</th></tr></thead><tbody>
      ${LTA_TAGS.map(t => `<tr><td>${esc(t)}</td><td>${agg.ltaTagCounts[t] || 0}</td></tr>`).join("")}</tbody></table></div>`;

    recommendationList(container.querySelector("#snRecs"), agg.recommendations);

    const compBox = container.querySelector("#snCompliance");
    compBox.innerHTML = `<div class="table-scroll"><table class="data-table"><thead><tr><th>Programme</th><th>Fully Complete</th><th>Priority 1</th><th>Priority 2</th><th>Priority 3</th></tr></thead><tbody>
      ${rows.map(r => {
        const f = r.a.followUp;
        return `<tr><td>${esc(PROGRAMMES[r.k].name)}</td><td>${f["No Follow-up Needed"] || 0}/${r.a.count}</td><td>${f["Priority 1 - Immediate"] || 0}</td><td>${f["Priority 2 - Moderate"] || 0}</td><td>${f["Priority 3 - Monitor"] || 0}</td></tr>`;
      }).join("")}</tbody></table></div>`;

    container.querySelector("#snExport").onclick = () => {
      let text = `STUDENT ACADEMIC SUPPORT — SENATE TLC REPORT (${state.term} ${state.year})\n\n`;
      text += `1. PROGRAMME SCORECARD\n`;
      rows.forEach(r => { text += `- ${PROGRAMMES[r.k].name}: ${fmtNum(r.a.reachTotal)} students reached, ${fmtNum(r.a.riskTotal)} at-risk, satisfaction ${r.a.satisfaction.avg != null ? fmt1(r.a.satisfaction.avg) + "/5" : "n/a"}\n`; });
      text += `\n2. AT-RISK OVERVIEW\nGreen ${agg.risk.green} | Yellow ${agg.risk.yellow} | Orange ${agg.risk.orange} | Red ${agg.risk.red}\n`;
      text += `\n3. HIGH-PRIORITY RECOMMENDATIONS\n`;
      agg.recommendations.forEach(r => { text += `- [${r.programme}] ${r.text} (Owner: ${r.owner || "TBD"})\n`; });
      text += `\n4. STUDENT SUCCESS STORY\n${container.querySelector("#snStory").value || "(none captured)"}\n`;
      text += `\n5. CONCLUSION & STRATEGIC WAY FORWARD\n${container.querySelector("#snConclusion").value || "(none captured)"}\n`;
      const blob = new Blob([text], { type: "text/plain" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `Senate_STLC_Report_${state.term.replace(" ", "")}_${state.year}.txt`;
      document.body.appendChild(a); a.click(); a.remove();
    };
  }
  container.querySelector("#snYear").onchange = e => { state.year = e.target.value; draw(); };
  container.querySelector("#snTerm").onchange = e => { state.term = e.target.value; draw(); };
  draw();
}

/* ==========================================================================
   DATA MANAGER
   ========================================================================== */
function renderDataView(container) {
  container.innerHTML = `
    <div class="card">
      <h2>Data Manager</h2>
      <p class="help-note">Everything is saved in this browser only. To share your submissions with a coordinator, export a file and send it to them (email/OneDrive) — they import it into their own browser to see the combined dashboard.</p>
      <div class="btn-row">
        <button class="btn" id="btnExport">Export All Data (.json)</button>
        <label class="btn secondary" style="cursor:pointer;">Import Data (.json)<input type="file" id="btnImport" accept="application/json" style="display:none;"></label>
        <button class="btn secondary" id="btnSample">Load Sample Data</button>
        <button class="btn danger" id="btnClear">Clear All Data</button>
      </div>
    </div>
    <div class="card"><h2>All Term Submissions (${allTermSubmissions().length})</h2><div id="dmTermTable"></div></div>
    <div class="card"><h2>All Semester Records (${allSemesterRecords().length})</h2><div id="dmSemTable"></div></div>`;

  function drawTables() {
    const subs = allTermSubmissions();
    const t1 = container.querySelector("#dmTermTable");
    t1.innerHTML = subs.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>Programme</th><th>Practitioner</th><th>Faculty</th><th>Period</th><th>Saved</th></tr></thead><tbody>
      ${subs.slice().reverse().map(s => `<tr><td>${esc(PROGRAMMES[s.programme] ? PROGRAMMES[s.programme].name : s.programme)}</td><td>${esc(s.practitioner)}</td><td>${esc(s.faculty)}</td><td>${esc(s.term)} ${esc(s.year)}</td><td>${new Date(s.createdAt).toLocaleString()}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state">No data yet.</div>`;
    const recs = allSemesterRecords();
    const t2 = container.querySelector("#dmSemTable");
    t2.innerHTML = recs.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>Programme</th><th>Practitioner</th><th>Faculty</th><th>Semester</th></tr></thead><tbody>
      ${recs.map(r => `<tr><td>${esc(PROGRAMMES[r.programme] ? PROGRAMMES[r.programme].name : r.programme)}</td><td>${esc(r.practitioner)}</td><td>${esc(r.faculty)}</td><td>${esc(r.semester)} ${esc(r.year)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state">No data yet.</div>`;
  }
  drawTables();

  container.querySelector("#btnExport").addEventListener("click", () => {
    downloadJSON(`sas-dashboard-export-${Date.now()}.json`, {
      term: allTermSubmissions(), semester: allSemesterRecords(), laMetrics: allLaMetrics()
    });
    showToast("Exported.");
  });
  container.querySelector("#btnImport").addEventListener("change", (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        const termArr = allTermSubmissions(); const semArr = allSemesterRecords(); const laArr = allLaMetrics();
        const termIds = new Set(termArr.map(x => x.id));
        (obj.term || []).forEach(x => { if (!termIds.has(x.id)) termArr.push(x); });
        const semKeys = new Set(semArr.map(x => x.key));
        (obj.semester || []).forEach(x => { if (!semKeys.has(x.key)) semArr.push(x); else Object.assign(semArr.find(s => s.key === x.key), x); });
        const laIds = new Set(laArr.map(x => x.id));
        (obj.laMetrics || []).forEach(x => { if (!laIds.has(x.id)) laArr.push(x); });
        saveStore(STORE_KEYS.term, termArr); saveStore(STORE_KEYS.semester, semArr); saveStore(STORE_KEYS.laMetrics, laArr);
        showToast("Import complete.");
        drawTables();
      } catch (err) { showToast("Could not read that file."); }
    };
    reader.readAsText(file);
  });
  container.querySelector("#btnSample").addEventListener("click", () => { loadSampleData(); drawTables(); showToast("Sample data loaded."); });
  container.querySelector("#btnClear").addEventListener("click", () => {
    if (!confirm("This clears all submissions, semester records and LA metrics in this browser. Continue?")) return;
    saveStore(STORE_KEYS.term, []); saveStore(STORE_KEYS.semester, []); saveStore(STORE_KEYS.laMetrics, []);
    drawTables(); showToast("All data cleared.");
  });
}

/* ==========================================================================
   HELP
   ========================================================================== */
function renderHelpView(container) {
  container.innerHTML = `
  <div class="card">
    <h2>How this dashboard works</h2>
    <h3 class="section-title" style="margin-top:0;">Three layers, one flow</h3>
    <p><b>Submit a Term Report</b> — every practitioner fills in a form tailored to their own programme (Academic Advising's referral pathways look nothing like Tutorship's budget & staffing block — the form changes automatically when you pick your programme). Saved instantly to your browser.</p>
    <p><b>Programme Dashboards</b> — pick any of the 7 reporting programmes and everything totals, charts and lists itself from that programme's submissions for the period you choose.</p>
    <p><b>Semester Roll-up</b> — Semester 1 auto-sums Term 1+2, Semester 2 auto-sums Term 3+4. You just add performance/progression/retention by year level and programme feedback on top.</p>
    <p><b>Learning Analytics</b> — logs the institutional metrics only LA holds, and cross-analyses everything the other programmes already reported (no double entry).</p>
    <p><b>Senate STLC Report</b> — automatically rolls every programme up into a Senate-ready scorecard, at-risk overview, LTA Plan alignment tally and high-priority recommendation list. Export it as a text summary to paste into the formal Senate document.</p>

    <h3 class="section-title">Getting an online link</h3>
    <p>This is a self-contained set of files (no server/database needed) — open <code>index.html</code> in any browser and it works. Two ways to share it as a real link:</p>
    <ul>
      <li><b>Fastest:</b> keep it in this OneDrive folder. OneDrive will download the file rather than render it as a live page when someone clicks a share link — fine for you to open locally, but not a "click and it just works" experience for others.</li>
      <li><b>A true clickable link:</b> drag this folder onto <a href="https://app.netlify.com/drop" target="_blank">Netlify Drop</a> (no account needed) or push it to a free GitHub Pages site. Either gives you one URL that opens the live dashboard for anyone.</li>
    </ul>

    <h3 class="section-title">Sharing data between practitioners (no server involved)</h3>
    <p>Data lives in your browser only (localStorage) — it is <i>not</i> automatically shared between people. Each practitioner fills in their own submissions, then in <b>Data Manager</b> clicks <b>Export All Data</b> to download a small .json file. Send that file to the programme coordinator (or upload it to a shared OneDrive folder); the coordinator opens the dashboard in their own browser and clicks <b>Import Data</b> to merge everyone's submissions into one combined view. Duplicate imports are safe — records are matched by ID and won't double up.</p>

    <h3 class="section-title">At-risk categories</h3>
    <p><span class="badge good">Green</span> passed all modules &nbsp; <span class="badge warning">Yellow</span> 67-94% of modules passed &nbsp; <span class="badge serious">Orange</span> 50-66% of modules passed &nbsp; <span class="badge critical">Red</span> failed more than 50% of modules — the institution-wide model from the Oct 2025 Senate report.</p>

    <h3 class="section-title">Budget variance</h3>
    <p>For Tutorship, Supplemental Instruction, Peer Academic Coaching and Additional Support, cost = hours worked × active staff × rate, compared automatically against approved hours × approved staff × rate. Overspend/underspend is flagged live as you type.</p>
  </div>`;
}
