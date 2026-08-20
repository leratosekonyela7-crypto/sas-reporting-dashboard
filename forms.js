/* ==========================================================================
   FORMS.JS - reusable field "blocks" plus one template-builder per programme
   kind (advising / writing / coreCurriculum / staffed / additionalSupport /
   learningAnalytics). Each builder returns an HTML string; wireXxx() functions
   attach the small bits of live behaviour (budget auto-calc) after injection.
   ========================================================================== */

function block_reach(data) {
  data = data || {};
  return `
  <h3 class="section-title">Student Reach & At-Risk Categories</h3>
  <div class="grid cols-4">
    ${fNumber("reach_total", "Total students reached", data.reach_total)}
    ${fNumber("reach_firstYear", "First-year students", data.reach_firstYear)}
    ${fNumber("reach_seniorReturning", "Senior/returning students", data.reach_seniorReturning)}
    ${fNumber("reach_postgraduate", "Postgraduate students", data.reach_postgraduate)}
  </div>
  <div class="grid cols-4" style="margin-top:10px;">
    ${fNumber("risk_green", "🟢 Green (passed all modules)", data.risk_green)}
    ${fNumber("risk_yellow", "🟡 Yellow (67-94% passed)", data.risk_yellow)}
    ${fNumber("risk_orange", "🟠 Orange (50-66% passed)", data.risk_orange)}
    ${fNumber("risk_red", "🔴 Red (<50% passed)", data.risk_red)}
  </div>
  <div class="grid cols-4" style="margin-top:10px;">
    ${fNumber("riskAssisted", "At-risk students assisted", data.riskAssisted)}
  </div>`;
}

function block_referral(kind, data) {
  data = data || {};
  const opts = REFERRAL_OPTIONS[kind] || [];
  return `
  <h3 class="section-title">How were at-risk students assisted?</h3>
  ${fCheckboxGroup("referral", "Select all that apply", opts, data.referral)}`;
}

function block_consultation(data) {
  data = data || {};
  return `
  <h3 class="section-title">Consultation Type (number of sessions)</h3>
  <div class="grid cols-6">
    ${fNumber("consult_individual_online", "Individual — Online", data.consult_individual_online)}
    ${fNumber("consult_individual_f2f", "Individual — Face-to-face", data.consult_individual_f2f)}
    ${fNumber("consult_workshop_online", "Workshop — Online", data.consult_workshop_online)}
    ${fNumber("consult_workshop_f2f", "Workshop — Face-to-face", data.consult_workshop_f2f)}
    ${fNumber("consult_group_online", "Group — Online", data.consult_group_online)}
    ${fNumber("consult_group_f2f", "Group — Face-to-face", data.consult_group_f2f)}
  </div>`;
}

function block_hoursSplit(data) {
  data = data || {};
  return `
  <h3 class="section-title">Session Hours</h3>
  <div class="grid cols-4">
    ${fNumber("hours_online", "Total hours — online sessions", data.hours_online)}
    ${fNumber("hours_f2f", "Total hours — face-to-face sessions", data.hours_f2f)}
  </div>`;
}

function block_satisfaction(data) {
  data = data || {};
  return `
  <h3 class="section-title">Student Satisfaction (survey responses)</h3>
  <div class="grid cols-6">
    ${fNumber("sat_5", "5 stars", data.sat_5)}
    ${fNumber("sat_4", "4 stars", data.sat_4)}
    ${fNumber("sat_3", "3 stars", data.sat_3)}
    ${fNumber("sat_2", "2 stars", data.sat_2)}
    ${fNumber("sat_1", "1 star", data.sat_1)}
  </div>
  <p class="help-note">Enter the number of survey responses at each star level — the average score and % satisfied are calculated automatically everywhere in this dashboard.</p>`;
}

function block_budget(staffLabel, hasModules, data) {
  data = data || {};
  const modulesRow = hasModules ? `
    ${fNumber("budget_approvedModules", "Modules approved", data.budget_approvedModules)}
    ${fNumber("budget_activeModules", "Modules active", data.budget_activeModules)}` : "";
  return `
  <h3 class="section-title">${esc(staffLabel)} & Budget</h3>
  <div class="grid cols-4">
    ${modulesRow}
    ${fNumber("budget_approvedHours", "Hours approved", data.budget_approvedHours)}
    ${fNumber("budget_workedHours", "Hours worked", data.budget_workedHours)}
  </div>
  <div class="grid cols-4" style="margin-top:10px;">
    ${fNumber("budget_approvedStaff", `${esc(staffLabel)} approved`, data.budget_approvedStaff)}
    ${fNumber("budget_activeStaff", `${esc(staffLabel)} active`, data.budget_activeStaff)}
    ${fNumber("budget_rate", `${esc(staffLabel)} rate (R/hour)`, data.budget_rate, { step: "0.01" })}
  </div>
  <div class="computed-box" data-role="budget-computed">Enter hours, staff counts and rate above to see cost vs. approved budget.</div>`;
}

function block_admin(setKey, data) {
  data = data || {};
  const fields = ADMIN_FIELD_SETS[setKey] || [];
  if (!fields.length) return "";
  const rows = fields.map(f => fSelect(f, ADMIN_FIELD_LABELS[f], YESNO_INPROGRESS, data[f])).join("");
  return `<h3 class="section-title">Reporting Compliance</h3><div class="grid cols-3">${rows}</div>`;
}

function block_reflection(mode, data) {
  data = data || {};
  const full = mode !== "light";
  return `
  <h3 class="section-title">Reflection & Recommendations</h3>
  ${fCheckboxGroup("ltaTag", "LTA Plan Alignment Tag(s) — select all that apply", LTA_TAGS, data.ltaTag)}
  <div class="grid cols-2" style="margin-top:10px;">
    ${full ? fSelect("selfRatedScore", "Self-Rated Achievement Score (1-5)", ["1", "2", "3", "4", "5"], data.selfRatedScore) : ""}
  </div>
  <div class="grid cols-2" style="margin-top:10px;">
    ${fTextarea("keyOutcomes", "Key Outcomes Achieved", data.keyOutcomes)}
    ${fTextarea("challenges", "Main Challenges Encountered", data.challenges)}
  </div>
  <div class="grid cols-2" style="margin-top:10px;">
    ${fTextarea("lessonsLearned", "Lessons Learned", data.lessonsLearned)}
    ${fTextarea("additionalComments", "Additional Comments", data.additionalComments)}
  </div>
  ${full ? `
  <div class="grid cols-4" style="margin-top:10px;">
    ${fText("recommendation", "Recommendation", data.recommendation)}
    ${fSelect("recommendationPriority", "Priority", ["High", "Medium", "Low"], data.recommendationPriority)}
    ${fText("recommendationOwner", "Owner", data.recommendationOwner)}
    ${fText("targetKPI", "Target / KPI for Next Term", data.targetKPI)}
  </div>` : ""}`;
}

function block_topics(data) {
  data = data || {};
  return `<h3 class="section-title">Main Topics Covered (up to 5)</h3>
  ${fTextarea("mainTopics", "One topic per line, maximum five", data.mainTopics)}`;
}

/* ---------- per-programme term-form builders ---------- */
function formAdvising(data) {
  data = data || {};
  return block_topics(data) + block_reach(data) + block_referral("advising", data) +
    block_consultation(data) + block_satisfaction(data) + block_admin("full", data) + block_reflection("full", data);
}
function formWriting(data) {
  data = data || {};
  return block_topics(data) + block_reach(data) + block_referral("writing", data) +
    block_consultation(data) + block_satisfaction(data) + block_admin("full", data) + block_reflection("full", data);
}
function formCoreCurriculum(data) {
  data = data || {};
  return `
  <h3 class="section-title">Module</h3>
  <div class="grid cols-3">
    ${fSelect("module", "Module", CORE_CURRICULUM_MODULES, data.module)}
    ${fNumber("passRate", "Pass rate (%)", data.passRate, { step: "0.1" })}
    ${fNumber("attendance", "Student attendance (%)", data.attendance, { step: "0.1" })}
  </div>
  <div class="grid cols-3" style="margin-top:10px;">
    ${fSelect("facilitatorSatisfaction", "Facilitator's overall satisfaction (1-5)", ["1", "2", "3", "4", "5"], data.facilitatorSatisfaction)}
    ${fNumber("atRiskInModule", "Students at risk in the module", data.atRiskInModule)}
  </div>
  <div class="grid cols-2" style="margin-top:10px;">
    ${fTextarea("facilitatorComments", "Facilitator comments", data.facilitatorComments)}
    ${fTextarea("interventions", "Interventions for at-risk students", data.interventions)}
  </div>
  ${block_admin("reduced", data)}
  ${block_reflection("light", data)}`;
}
function formStaffed(progKey, data) {
  data = data || {};
  const p = PROGRAMMES[progKey];
  const assigned = p.hasAssignedStudents ? `
    <h3 class="section-title">Assigned Students</h3>
    <div class="grid cols-2">
      ${fNumber("assignedFirstYear", "Assigned — first-year", data.assignedFirstYear)}
      ${fNumber("assignedSeniorReturning", "Assigned — senior/returning", data.assignedSeniorReturning)}
    </div>` : "";
  let extra = "";
  if (progKey === "additionalSupport") {
    extra = `<h3 class="section-title">Student Tracking</h3>
    <div class="grid cols-4">
      ${fNumber("studentsTracked", "Number of students tracked", data.studentsTracked)}
      ${fNumber("positiveReinforcementCount", "Positive reinforcement (count)", data.positiveReinforcementCount)}
      ${fNumber("checkInCount", "Support check-in (count)", data.checkInCount)}
      ${fNumber("removalCount", "Removal from programme (count)", data.removalCount)}
    </div>`;
  }
  return block_budget(p.staffLabel, !!p.hasModules, data) + assigned + block_reach(data) +
    block_hoursSplit(data) + block_satisfaction(data) + extra +
    block_admin(p.adminFields, data) + block_reflection("full", data);
}
function formAdditionalSupport(data) { return formStaffed("additionalSupport", data); }

/* Wire the live budget calculator inside a rendered form container. */
function wireBudgetCalc(container) {
  const box = container.querySelector('[data-role="budget-computed"]');
  if (!box) return;
  const names = ["budget_approvedModules", "budget_activeModules", "budget_approvedHours", "budget_workedHours",
    "budget_approvedStaff", "budget_activeStaff", "budget_rate"];
  const inputs = names.map(n => container.querySelector(`[name="${n}"]`)).filter(Boolean);
  function recalc() {
    const v = {};
    names.forEach(n => { const inp = container.querySelector(`[name="${n}"]`); v[n] = inp ? Number(inp.value) || 0 : 0; });
    const cost = v.budget_workedHours * v.budget_activeStaff * v.budget_rate;
    const approvedCost = v.budget_approvedHours * v.budget_approvedStaff * v.budget_rate;
    const variance = cost - approvedCost;
    const status = variance > 0.5 ? "Overspend" : (variance < -0.5 ? "Underspend" : "On budget");
    const statusClass = variance > 0.5 ? "critical" : (variance < -0.5 ? "warning" : "good");
    box.innerHTML = `Actual cost: <b>R${fmtNum(Math.round(cost))}</b> &nbsp;|&nbsp; Approved budget: <b>R${fmtNum(Math.round(approvedCost))}</b>
      &nbsp;|&nbsp; Variance: <b>R${fmtNum(Math.round(variance))}</b> ${statusBadge(statusClass, status)}`;
  }
  inputs.forEach(inp => inp.addEventListener("input", recalc));
  recalc();
}

const FORM_BUILDERS = {
  advising: formAdvising,
  writing: formWriting,
  coreCurriculum: formCoreCurriculum,
  tutorship: (d) => formStaffed("tutorship", d),
  si: (d) => formStaffed("si", d),
  pac: (d) => formStaffed("pac", d),
  additionalSupport: formAdditionalSupport
};
