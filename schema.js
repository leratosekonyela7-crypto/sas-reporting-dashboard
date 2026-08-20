/* ==========================================================================
   SCHEMA.JS - static reference data describing the SAS programmes,
   practitioners, faculties, risk model, LTA Plan tags and option lists.
   This is the single source of truth other files read from.
   ========================================================================== */

const FACULTY = {
  EDU: "FoEDU", EMS: "FoEMS", HUM: "FoHUM", NAS: "FoNAS", ALL: "All Faculties", NA: "N/A"
};
const FACULTY_LABELS = {
  FoEDU: "Education", FoEMS: "Economic & Management Sciences",
  FoHUM: "Humanities", FoNAS: "Natural & Agricultural Sciences",
  "All Faculties": "All Faculties", "N/A": "N/A"
};

const TERMS = ["Term 1", "Term 2", "Term 3", "Term 4"];
const SEMESTERS = [
  { key: "Semester 1", terms: ["Term 1", "Term 2"] },
  { key: "Semester 2", terms: ["Term 3", "Term 4"] }
];
const ACADEMIC_YEARS = ["2025", "2026", "2027", "2028"];

const RISK_CATEGORIES = [
  { key: "green",  label: "Green",  desc: "Passed all modules",                         status: "good" },
  { key: "yellow", label: "Yellow", desc: "67-94% of modules passed",                    status: "warning" },
  { key: "orange", label: "Orange", desc: "50-66% of modules passed",                    status: "serious" },
  { key: "red",    label: "Red",    desc: "Failed more than 50% of modules",             status: "critical" }
];

const LTA_TAGS = [
  "3.1 Graduate Attributes",
  "3.2 Student-Centredness",
  "9.1 Assessment Principles",
  "9.2 Feedback",
  "11.1 Early Identification & Data-Driven Support",
  "11.2 Enhance Academic Support Structures",
  "11.3 Psychosocial Support & Engagement",
  "11.4 Integrated Student Support Ecosystem",
  "14 Monitoring & Evaluation"
];

const REFERRAL_OPTIONS = {
  advising: ["Advisor directly", "Peer Academic Coaching", "Academic Writing", "Tutorship Support",
             "Student Health & Wellness", "Student Finance", "Faculty Administration", "Lecturer"],
  writing:  ["Direct officer support", "Peer Academic Coaching", "Academic Advising",
             "Student Health & Wellness", "Student Finance", "Faculty Administration", "Lecturer"]
};

const CONSULTATION_MODES = ["Individual", "Workshop", "Group"];
const DELIVERY_MODES = ["Online", "Face-to-face"];

const CORE_CURRICULUM_MODULES = ["SCOR511", "SCOR612"];

/* Every SAS programme: id, display name, colour role (categorical slot),
   which practitioners run it and which faculties each may report against,
   and which "kind" of term-form it uses (drives forms.js rendering). */
const PROGRAMMES = {
  advising: {
    name: "Academic Advising",
    color: "var(--cat-blue)",
    kind: "advising",
    practitioners: {
      "Bonolo Morebodi": [FACULTY.EDU],
      "Boipelo Leeuw":   [FACULTY.EMS],
      "Brendan Thomas":  [FACULTY.HUM],
      "Letlotlo Seane":  [FACULTY.NAS]
    },
    adminFields: "full"
  },
  writing: {
    name: "Academic Writing",
    color: "var(--cat-orange)",
    kind: "writing",
    practitioners: {
      "Sello Mashibini": [FACULTY.EDU, FACULTY.HUM],
      "Hendri Stander":  [FACULTY.EMS, FACULTY.NAS]
    },
    adminFields: "full"
  },
  coreCurriculum: {
    name: "Core Curriculum",
    color: "var(--cat-aqua)",
    kind: "coreCurriculum",
    practitioners: {
      "Sello Mashibini": [FACULTY.ALL],
      "Hendri Stander":  [FACULTY.ALL]
    },
    adminFields: "reduced"
  },
  tutorship: {
    name: "Tutorship Support",
    color: "var(--cat-yellow)",
    kind: "staffed",
    staffLabel: "Tutors",
    hasModules: true,
    practitioners: { "Kagisho Mosikare": [FACULTY.EDU, FACULTY.HUM, FACULTY.EMS, FACULTY.NAS] },
    adminFields: "full"
  },
  si: {
    name: "Supplemental Instruction",
    color: "var(--cat-magenta)",
    kind: "staffed",
    staffLabel: "SI Leaders",
    hasModules: true,
    practitioners: {
      "Kagisho Mosikare": [FACULTY.EDU, FACULTY.HUM, FACULTY.EMS, FACULTY.NAS],
      "Bonolo Morebodi":  [FACULTY.EDU, FACULTY.HUM, FACULTY.EMS, FACULTY.NAS]
    },
    adminFields: "reduced"
  },
  pac: {
    name: "Peer Academic Coaching",
    color: "var(--cat-green)",
    kind: "staffed",
    staffLabel: "PACs",
    hasModules: false,
    hasAssignedStudents: true,
    practitioners: {
      "Bonolo Morebodi": [FACULTY.EDU, FACULTY.EMS],
      "Boipelo Leeuw":   [FACULTY.EDU, FACULTY.EMS]
    },
    adminFields: "reduced"
  },
  additionalSupport: {
    name: "Additional Student Academic Support",
    color: "var(--cat-violet)",
    kind: "additionalSupport",
    staffLabel: "Staff",
    hasModules: true,
    categories: ["Facilitation", "Tutorship", "Buddy Support"],
    practitioners: { "Palesa Lebeko": [FACULTY.EMS, FACULTY.NAS] },
    adminFields: "tracking"
  },
  learningAnalytics: {
    name: "Learning Analytics",
    color: "var(--cat-red)",
    kind: "learningAnalytics",
    practitioners: { "Eli Nimy": [FACULTY.ALL] },
    adminFields: "none"
  }
};

const PROGRAMME_ORDER = ["advising", "writing", "coreCurriculum", "tutorship", "si", "pac", "additionalSupport", "learningAnalytics"];

/* Programmes that generate a normal, comparable "term submission" record
   (i.e. everything except the analytics-only Learning Analytics tab). */
const REPORTING_PROGRAMMES = PROGRAMME_ORDER.filter(k => k !== "learningAnalytics");

/* Admin/compliance field sets referenced by adminFields above. */
const ADMIN_FIELD_SETS = {
  full:     ["sasSystemUpdated", "facultyReportSubmitted", "termAnalysisReport", "stakeholderFeedback", "quarterlyMeeting"],
  reduced:  ["termAnalysisReport", "stakeholderFeedback"],
  tracking: ["trackingSystemUpdated", "termAnalysisReport", "stakeholderFeedback"],
  none:     []
};
const ADMIN_FIELD_LABELS = {
  sasSystemUpdated: "SAS System/Dashboard Updated",
  facultyReportSubmitted: "Faculty Report Submitted",
  termAnalysisReport: "Term Analysis Report Completed",
  stakeholderFeedback: "Stakeholder Feedback Collected",
  quarterlyMeeting: "Attended Faculty Quarterly Meeting",
  trackingSystemUpdated: "Tracking System Updated"
};

function facultiesFor(progKey, practitioner) {
  const p = PROGRAMMES[progKey];
  if (!p) return [];
  return p.practitioners[practitioner] || [];
}
