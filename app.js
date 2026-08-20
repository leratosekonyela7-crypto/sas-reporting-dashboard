/* ==========================================================================
   APP.JS - navigation wiring, theme toggle, sample-data seeding, boot.
   ========================================================================== */

const VIEW_RENDERERS = {
  overview: renderOverviewView,
  submit: renderSubmitView,
  programmes: renderProgrammesView,
  semester: renderSemesterView,
  analytics: renderAnalyticsView,
  senate: renderSenateView,
  data: renderDataView,
  help: renderHelpView
};

function activateView(name) {
  document.querySelectorAll("#mainTabs button").forEach(b => b.classList.toggle("active", b.getAttribute("data-view") === name));
  document.querySelectorAll("main .view").forEach(v => v.classList.toggle("active", v.id === "view-" + name));
  const container = document.getElementById("view-" + name);
  container.innerHTML = "";
  const renderer = VIEW_RENDERERS[name];
  if (!renderer) return;
  try {
    renderer(container);
  } catch (err) {
    container.insertAdjacentHTML("beforeend", `<div class="card" style="border-color:var(--status-critical);">
      <h2 style="color:var(--status-critical);">This view hit an error</h2>
      <p>${esc(err.message)}</p><pre style="white-space:pre-wrap;font-size:11px;color:var(--text-muted);">${esc(err.stack || "")}</pre>
    </div>`);
  }
}

function initNav() {
  document.querySelectorAll("#mainTabs button").forEach(b => {
    b.addEventListener("click", () => activateView(b.getAttribute("data-view")));
  });
}

function initTheme() {
  const btn = document.getElementById("themeToggle");
  const saved = localStorage.getItem(STORE_KEYS.theme) || "light";
  document.documentElement.setAttribute("data-theme", saved);
  btn.textContent = saved === "dark" ? "☀️ Light mode" : "🌙 Dark mode";
  btn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", cur);
    localStorage.setItem(STORE_KEYS.theme, cur);
    btn.textContent = cur === "dark" ? "☀️ Light mode" : "🌙 Dark mode";
    activateView(document.querySelector("#mainTabs button.active").getAttribute("data-view"));
  });
}

function mkSub(programme, practitioner, faculty, year, term, form, category) {
  const withPeriod = Object.assign({ periodStart: "2026-04-14", periodEnd: "2026-06-19" }, form);
  return { id: uid(), createdAt: new Date().toISOString(), programme, practitioner, faculty, category: category || null, year, term, form: withPeriod };
}

function loadSampleData() {
  const Y = "2026", T = "Term 2";
  const subs = [];

  // Academic Advising - 4 advisors, 4 faculties
  subs.push(mkSub("advising", "Boipelo Leeuw", FACULTY.EMS, Y, T, {
    mainTopics: "Course & Module Selection\nProgression rules\nTimetable clashes",
    reach_total: 480, reach_firstYear: 310, reach_seniorReturning: 150, reach_postgraduate: 20,
    risk_green: 300, risk_yellow: 110, risk_orange: 50, risk_red: 20, riskAssisted: 170,
    referral: ["Advisor directly", "Faculty Administration"],
    consult_individual_online: 40, consult_individual_f2f: 30, consult_workshop_online: 5, consult_workshop_f2f: 5, consult_group_online: 5, consult_group_f2f: 5,
    sat_5: 40, sat_4: 30, sat_3: 10, sat_2: 3, sat_1: 2,
    sasSystemUpdated: "Yes", facultyReportSubmitted: "Yes", termAnalysisReport: "Yes", stakeholderFeedback: "Yes", quarterlyMeeting: "Yes",
    ltaTag: ["11.2 Enhance Academic Support Structures", "3.2 Student-Centredness"], selfRatedScore: "3",
    keyOutcomes: "Class visits completed across EMS; supported programme changes for 480 students.",
    challenges: "No prerequisite rules let students combine 1st/2nd-year modules, raising clash/credit-load risk.",
    lessonsLearned: "Progression-rule flexibility needs closer monitoring.",
    recommendation: "Resolve timetable clashes centrally across faculties.", recommendationPriority: "High", recommendationOwner: "Registrar's Office", targetKPI: "Cut clash-related at-risk cases by 20%"
  }));
  subs.push(mkSub("advising", "Bonolo Morebodi", FACULTY.EDU, Y, T, {
    mainTopics: "Student Support\nSelf-Management",
    reach_total: 390, reach_firstYear: 250, reach_seniorReturning: 120, reach_postgraduate: 20,
    risk_green: 240, risk_yellow: 90, risk_orange: 40, risk_red: 20, riskAssisted: 140,
    referral: ["Advisor directly", "Student Health & Wellness"],
    consult_individual_online: 30, consult_individual_f2f: 30, consult_workshop_online: 6, consult_workshop_f2f: 4, consult_group_online: 5, consult_group_f2f: 5,
    sat_5: 25, sat_4: 20, sat_3: 12, sat_2: 5, sat_1: 3,
    sasSystemUpdated: "In-progress", facultyReportSubmitted: "Yes", termAnalysisReport: "No", stakeholderFeedback: "Yes", quarterlyMeeting: "Yes",
    ltaTag: ["11.3 Psychosocial Support & Engagement"], selfRatedScore: "2",
    keyOutcomes: "Two at-risk deregistrations avoided through referral.",
    challenges: "High caseload combined with student emotional resistance limits session depth.",
    lessonsLearned: "Advisors need training in emotional support, not just academic planning.",
    recommendation: "Train advisors on emotional support and trust-building.", recommendationPriority: "High", recommendationOwner: "CTLPD", targetKPI: "All advisors trained by Term 3"
  }));
  subs.push(mkSub("advising", "Brendan Thomas", FACULTY.HUM, Y, T, {
    mainTopics: "Course & Module Selection\nAcademic planning",
    reach_total: 610, reach_firstYear: 400, reach_seniorReturning: 180, reach_postgraduate: 30,
    risk_green: 380, risk_yellow: 140, risk_orange: 60, risk_red: 30, riskAssisted: 200,
    referral: ["Advisor directly", "Student Finance"],
    consult_individual_online: 50, consult_individual_f2f: 30, consult_workshop_online: 8, consult_workshop_f2f: 4, consult_group_online: 4, consult_group_f2f: 4,
    sat_5: 45, sat_4: 28, sat_3: 8, sat_2: 2, sat_1: 1,
    sasSystemUpdated: "Yes", facultyReportSubmitted: "Yes", termAnalysisReport: "Yes", stakeholderFeedback: "Yes", quarterlyMeeting: "Yes",
    ltaTag: ["11.1 Early Identification & Data-Driven Support", "14 Monitoring & Evaluation"], selfRatedScore: "4",
    keyOutcomes: "Hosted 2 of 3 planned webinars; used prior-year data to target at-risk modules early.",
    challenges: "Socio-economic barriers (funding, late registration, food security) affect follow-through.",
    lessonsLearned: "Early data-driven targeting works, but non-academic barriers need cross-referral.",
    recommendation: "Fast-track referral pathway to Financial Aid.", recommendationPriority: "Medium", recommendationOwner: "Student Wellness", targetKPI: "Referral turnaround <5 days"
  }));
  subs.push(mkSub("advising", "Letlotlo Seane", FACULTY.NAS, Y, T, {
    mainTopics: "Class Timetable/Schedule",
    reach_total: 445, reach_firstYear: 290, reach_seniorReturning: 135, reach_postgraduate: 20,
    risk_green: 260, risk_yellow: 100, risk_orange: 55, risk_red: 30, riskAssisted: 150,
    referral: ["Advisor directly", "Lecturer"],
    consult_individual_online: 30, consult_individual_f2f: 20, consult_workshop_online: 6, consult_workshop_f2f: 4, consult_group_online: 3, consult_group_f2f: 3,
    sat_5: 20, sat_4: 22, sat_3: 15, sat_2: 6, sat_1: 4,
    sasSystemUpdated: "Not Done", facultyReportSubmitted: "No", termAnalysisReport: "No", stakeholderFeedback: "Yes", quarterlyMeeting: "No",
    ltaTag: ["14 Monitoring & Evaluation"], selfRatedScore: "2",
    keyOutcomes: "Faculty-by-faculty advising delivered per the traditional schedule.",
    challenges: "Timetable clashes with the single Education venue went unresolved all term.",
    lessonsLearned: "Plans need to be grounded in prior-year performance data before term starts.",
    recommendation: "Ground next term's plan in prior-year module performance data.", recommendationPriority: "Medium", recommendationOwner: "Letlotlo Seane", targetKPI: "Submit data-informed plan by week 1"
  }));

  // Academic Writing - 2 practitioners
  subs.push(mkSub("writing", "Sello Mashibini", FACULTY.HUM, Y, T, {
    mainTopics: "Referencing\nAssignment structure\nPostgraduate proposals",
    reach_total: 171, reach_firstYear: 110, reach_seniorReturning: 45, reach_postgraduate: 16,
    risk_green: 100, risk_yellow: 45, risk_orange: 18, risk_red: 8, riskAssisted: 71,
    referral: ["Direct officer support", "Academic Advisor"],
    consult_individual_online: 4, consult_individual_f2f: 12, consult_workshop_online: 1, consult_workshop_f2f: 3, consult_group_online: 1, consult_group_f2f: 3,
    sat_5: 30, sat_4: 15, sat_3: 4, sat_2: 1, sat_1: 0,
    sasSystemUpdated: "Yes", facultyReportSubmitted: "Yes", termAnalysisReport: "Yes", stakeholderFeedback: "Yes", quarterlyMeeting: "Yes",
    ltaTag: ["9.1 Assessment Principles"], selfRatedScore: "3",
    keyOutcomes: "4 workshops + 16 individual consultations reached 171 students.",
    challenges: "Low uptake of postgraduate workshop invitations from some faculties.",
    lessonsLearned: "Faculty-specific scheduling improves postgraduate attendance.",
    recommendation: "Coordinate postgraduate invitations through faculty offices directly.", recommendationPriority: "Medium", recommendationOwner: "Sello Mashibini", targetKPI: "Postgraduate attendance +25%"
  }));
  subs.push(mkSub("writing", "Hendri Stander", FACULTY.EMS, Y, T, {
    mainTopics: "Digital literacy integration\nStudy guides",
    reach_total: 140, reach_firstYear: 95, reach_seniorReturning: 35, reach_postgraduate: 10,
    risk_green: 80, risk_yellow: 35, risk_orange: 15, risk_red: 6, riskAssisted: 56,
    referral: ["Direct officer support", "Faculty Administration"],
    consult_individual_online: 3, consult_individual_f2f: 9, consult_workshop_online: 1, consult_workshop_f2f: 2, consult_group_online: 1, consult_group_f2f: 2,
    sat_5: 18, sat_4: 12, sat_3: 5, sat_2: 2, sat_1: 1,
    sasSystemUpdated: "In-progress", facultyReportSubmitted: "Yes", termAnalysisReport: "No", stakeholderFeedback: "No", quarterlyMeeting: "Yes",
    ltaTag: ["9.2 Feedback"], selfRatedScore: "3",
    keyOutcomes: "Study guide sharing improved across EMS modules.",
    challenges: "Low uptake/response to service invitations from some lecturers.",
    lessonsLearned: "Direct lecturer buy-in drives attendance more than general invites.",
    recommendation: "Route invitations through module coordinators.", recommendationPriority: "Low", recommendationOwner: "Hendri Stander", targetKPI: "Uptake +15%"
  }));

  // Core Curriculum - 2 modules
  subs.push(mkSub("coreCurriculum", "Sello Mashibini", FACULTY.ALL, Y, T, {
    module: "SCOR511", passRate: 86.1, attendance: 92, facilitatorSatisfaction: "4", atRiskInModule: 45,
    facilitatorComments: "Blended sessions helped engagement; timetable clashes with Education modules persist.",
    interventions: "Self-paced catch-up sessions and peer study groups.",
    termAnalysisReport: "Yes", stakeholderFeedback: "Yes",
    ltaTag: ["3.2 Student-Centredness"], keyOutcomes: "Overall pass rate of 86.1%.", challenges: "Venue constraints for Education faculty.", lessonsLearned: "Blended delivery needs more venue flexibility.", additionalComments: ""
  }));
  subs.push(mkSub("coreCurriculum", "Hendri Stander", FACULTY.ALL, Y, T, {
    module: "SCOR612", passRate: 79.2, attendance: 88, facilitatorSatisfaction: "3", atRiskInModule: 60,
    facilitatorComments: "Digital literacy component needs clearer integration with facilitation.",
    interventions: "Extra digital-literacy labs scheduled mid-term.",
    termAnalysisReport: "In-progress", stakeholderFeedback: "No",
    ltaTag: ["9.1 Assessment Principles"], keyOutcomes: "Digital literacy sub-score improved from last term.", challenges: "Unclear division of digital literacy content ownership.", lessonsLearned: "Needs a clearer facilitation-vs-digital-literacy split.", additionalComments: ""
  }));

  // Tutorship - 4 faculties
  const tutFac = [[FACULTY.EDU, 800, 20], [FACULTY.EMS, 1400, 34], [FACULTY.HUM, 700, 15], [FACULTY.NAS, 1783, 15]];
  tutFac.forEach(([fac, reach, tutors]) => {
    subs.push(mkSub("tutorship", "Kagisho Mosikare", fac, Y, T, {
      budget_approvedModules: Math.round(tutors * 1.1), budget_activeModules: tutors,
      budget_approvedHours: reach * 0.4, budget_workedHours: reach * 0.37,
      budget_approvedStaff: tutors, budget_activeStaff: tutors, budget_rate: 90,
      reach_total: reach, reach_firstYear: Math.round(reach * 0.7), reach_seniorReturning: Math.round(reach * 0.27), reach_postgraduate: Math.round(reach * 0.03),
      risk_green: Math.round(reach * 0.6), risk_yellow: Math.round(reach * 0.26), risk_orange: Math.round(reach * 0.1), risk_red: Math.round(reach * 0.04), riskAssisted: Math.round(reach * 0.34),
      hours_online: Math.round(reach * 0.1), hours_f2f: Math.round(reach * 0.3),
      sat_5: Math.round(reach * 0.05), sat_4: Math.round(reach * 0.02), sat_3: Math.round(reach * 0.006), sat_2: 2, sat_1: 1,
      sasSystemUpdated: "Yes", facultyReportSubmitted: "Yes", termAnalysisReport: "Yes", stakeholderFeedback: "Yes", quarterlyMeeting: "Yes",
      ltaTag: ["11.2 Enhance Academic Support Structures"], selfRatedScore: "4",
      keyOutcomes: `${fmtNum(reach)} students reached via tutorials in ${FACULTY_LABELS[fac]}.`,
      challenges: fac === FACULTY.NAS ? "Tutor-appointment approvals running behind schedule for 2nd semester." : "Standard scheduling constraints.",
      lessonsLearned: "Faculty-by-faculty appointment tracking catches delays early.",
      recommendation: fac === FACULTY.NAS ? "Centrally monitor 2nd-semester tutor appointment pipeline." : "", recommendationPriority: fac === FACULTY.NAS ? "High" : "Low", recommendationOwner: "Kagisho Mosikare", targetKPI: "Close appointment gap before term start"
    }));
  });

  // Supplemental Instruction - 2 faculties
  [[FACULTY.EDU, 320, 5], [FACULTY.HUM, 280, 5]].forEach(([fac, reach, leaders]) => {
    subs.push(mkSub("si", "Bonolo Morebodi", fac, Y, T, {
      budget_approvedModules: leaders, budget_activeModules: leaders,
      budget_approvedHours: reach * 0.2, budget_workedHours: reach * 0.18,
      budget_approvedStaff: leaders, budget_activeStaff: leaders, budget_rate: 75,
      reach_total: reach, reach_firstYear: Math.round(reach * 0.8), reach_seniorReturning: Math.round(reach * 0.18), reach_postgraduate: Math.round(reach * 0.02),
      risk_green: Math.round(reach * 0.55), risk_yellow: Math.round(reach * 0.3), risk_orange: Math.round(reach * 0.1), risk_red: Math.round(reach * 0.05), riskAssisted: Math.round(reach * 0.3),
      hours_online: Math.round(reach * 0.05), hours_f2f: Math.round(reach * 0.15),
      sat_5: Math.round(reach * 0.04), sat_4: Math.round(reach * 0.02), sat_3: 3, sat_2: 1, sat_1: 0,
      termAnalysisReport: "Yes", stakeholderFeedback: "Yes",
      ltaTag: ["11.2 Enhance Academic Support Structures"], selfRatedScore: "4",
      keyOutcomes: `SI reached ${fmtNum(reach)} students across ${leaders} modules in ${FACULTY_LABELS[fac]}.`,
      challenges: "Some modules have only one assessment on record so far.",
      lessonsLearned: "Earlier assessment scheduling would sharpen at-risk targeting.",
      additionalComments: ""
    }));
  });

  // Peer Academic Coaching - 2 faculties
  [[FACULTY.EDU, "Bonolo Morebodi", 150, 6], [FACULTY.EMS, "Boipelo Leeuw", 130, 5]].forEach(([fac, name, reach, pacs]) => {
    subs.push(mkSub("pac", name, fac, Y, T, {
      budget_approvedHours: reach * 0.15, budget_workedHours: reach * 0.14,
      budget_approvedStaff: pacs, budget_activeStaff: pacs, budget_rate: 60,
      assignedFirstYear: Math.round(reach * 0.75), assignedSeniorReturning: Math.round(reach * 0.25),
      reach_total: reach, reach_firstYear: Math.round(reach * 0.75), reach_seniorReturning: Math.round(reach * 0.25), reach_postgraduate: 0,
      risk_green: Math.round(reach * 0.5), risk_yellow: Math.round(reach * 0.3), risk_orange: Math.round(reach * 0.14), risk_red: Math.round(reach * 0.06), riskAssisted: Math.round(reach * 0.4),
      hours_online: Math.round(reach * 0.05), hours_f2f: Math.round(reach * 0.1),
      sat_5: Math.round(reach * 0.35), sat_4: Math.round(reach * 0.3), sat_3: 5, sat_2: 1, sat_1: 0,
      termAnalysisReport: "Yes", stakeholderFeedback: "Yes",
      ltaTag: ["11.3 Psychosocial Support & Engagement", "11.2 Enhance Academic Support Structures"], selfRatedScore: "4",
      keyOutcomes: `70.1% of coached students sought additional campus support because of coaching (${FACULTY_LABELS[fac]}).`,
      challenges: "Coach caseload grows quickly once students self-refer.",
      lessonsLearned: "Coaching drives onward referral more than direct academic fixes.",
      additionalComments: ""
    }));
  });

  // Additional Student Academic Support - 2 faculties, Facilitation category
  [[FACULTY.EMS, 90], [FACULTY.NAS, 38]].forEach(([fac, reach]) => {
    subs.push(mkSub("additionalSupport", "Palesa Lebeko", fac, Y, T, {
      budget_approvedModules: 6, budget_activeModules: 6,
      budget_approvedHours: reach * 0.3, budget_workedHours: reach * 0.28,
      budget_approvedStaff: 4, budget_activeStaff: 4, budget_rate: 70,
      reach_total: reach, reach_firstYear: Math.round(reach * 0.85), reach_seniorReturning: Math.round(reach * 0.15), reach_postgraduate: 0,
      risk_green: Math.round(reach * 0.45), risk_yellow: Math.round(reach * 0.3), risk_orange: Math.round(reach * 0.17), risk_red: Math.round(reach * 0.08), riskAssisted: reach,
      hours_online: Math.round(reach * 0.05), hours_f2f: Math.round(reach * 0.25),
      sat_5: Math.round(reach * 0.2), sat_4: Math.round(reach * 0.15), sat_3: 6, sat_2: 3, sat_1: 3,
      studentsTracked: reach, positiveReinforcementCount: Math.round(reach * 0.3), checkInCount: Math.round(reach * 0.5), removalCount: Math.round(reach * 0.05),
      trackingSystemUpdated: "In-progress", termAnalysisReport: "No", stakeholderFeedback: "No",
      ltaTag: ["11.4 Integrated Student Support Ecosystem"], selfRatedScore: "3",
      keyOutcomes: `${fmtNum(reach)} FASSET-funded students supported in ${FACULTY_LABELS[fac]}; buddy training delivered on Saturdays.`,
      challenges: "Fewer than half of invited students attended; verification rate sits around 42%.",
      lessonsLearned: "Attendance/verification tracking needs a faster capture method.",
      recommendation: "Introduce a QR/digital verification step at each session.", recommendationPriority: "High", recommendationOwner: "Palesa Lebeko", targetKPI: "Verification rate to 70%+"
    }, "Facilitation"));
  });

  saveStore(STORE_KEYS.term, subs);

  const laMetrics = [
    { id: uid(), faculty: FACULTY.EDU, programmeContext: "All Programmes", yearOfStudy: "All", moduleCode: "", performanceRate: 88, progressionRate: 84, retentionRate: 91, notes: "Faculty of Education early-warning pilot." },
    { id: uid(), faculty: FACULTY.EMS, programmeContext: "All Programmes", yearOfStudy: "All", moduleCode: "", performanceRate: 82, progressionRate: 79, retentionRate: 87, notes: "" },
    { id: uid(), faculty: FACULTY.HUM, programmeContext: "All Programmes", yearOfStudy: "All", moduleCode: "", performanceRate: 85, progressionRate: 81, retentionRate: 89, notes: "" },
    { id: uid(), faculty: FACULTY.NAS, programmeContext: "All Programmes", yearOfStudy: "All", moduleCode: "", performanceRate: 79, progressionRate: 75, retentionRate: 84, notes: "NAS tutor-appointment delays flagged as risk to progression." }
  ];
  saveStore(STORE_KEYS.laMetrics, laMetrics);

  const semRecords = [{
    key: ["advising", "Boipelo Leeuw", FACULTY.EMS, Y, "Semester 1"].join("|"),
    programme: "advising", practitioner: "Boipelo Leeuw", faculty: FACULTY.EMS, year: Y, semester: "Semester 1",
    data: {
      perf_first_pass: 78, perf_first_prog: 82, perf_first_ret: 90,
      perf_second_pass: 81, perf_second_prog: 85, perf_second_ret: 92,
      perf_third_pass: 84, perf_third_prog: 88, perf_third_ret: 94,
      overallSatisfactionFeedback: "Students consistently praise same-day appointment availability.",
      semesterFeedback: "Programme changes (e.g. HC Entrepreneurship to RBM) processed smoothly this semester.",
      stakeholderFeedbackText: "Faculty EMS management noted improved advising turnaround vs. 2025."
    }
  }];
  saveStore(STORE_KEYS.semester, semRecords);
}

function boot() {
  initNav();
  initTheme();
  activateView("overview");
}
document.addEventListener("DOMContentLoaded", boot);
