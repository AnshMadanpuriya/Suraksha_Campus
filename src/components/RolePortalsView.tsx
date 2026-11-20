import {
  CheckCircle2,
  Download,
  GraduationCap,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { CURRICULUM_MODULES } from '../data/curriculumData';
import type {
  AppView,
  AssessmentRecord,
  ClassroomChecklistItem,
  DrillRecord,
  HazardType,
  LearnerProfile,
  MedikitItem,
  PortalSection,
  UserRole,
} from '../types';
import { computeCampusReadinessSummary } from '../utils/drillEngine';
import {
  calculateLearnerOverallPct,
  calculateLearnerQuizAvg,
  calculateModuleCompletionPct,
  classifyLearnerStatus,
  computeCohortAnalytics,
  CORE_MODULE_IDS,
} from '../utils/learningTracker';

interface RolePortalsViewProps {
  portalSection: PortalSection;
  onChangePortalSection: (section: PortalSection) => void;
  learners: LearnerProfile[];
  activeLearnerId: string;
  onSelectLearner: (id: string) => void;
  onLearnerUpdated: (learner: LearnerProfile) => void;
  onLearnerCreated: (learner: LearnerProfile) => void;
  checklists: ClassroomChecklistItem[];
  onChecklistUpdated: (item: ClassroomChecklistItem) => void;
  drills: DrillRecord[];
  medikit: MedikitItem[];
  assessments: AssessmentRecord[];
  onDrillCreated: (record: DrillRecord) => void;
  onDrillDeleted: (id: string) => void;
  onNavigate: (view: AppView) => void;
  onLaunchDrill: (hazard: 'Earthquake' | 'Fire' | 'Flood') => void;
}

export function RolePortalsView({
  portalSection,
  onChangePortalSection,
  learners,
  activeLearnerId,
  onSelectLearner,
  onLearnerUpdated,
  onLearnerCreated,
  checklists,
  onChecklistUpdated,
  drills,
  medikit,
  assessments,
  onDrillCreated,
  onDrillDeleted,
  onNavigate,
  onLaunchDrill,
}: RolePortalsViewProps) {
  // Student section: enroll new learner
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newRole, setNewRole] = useState<'Student' | 'Teacher'>('Student');
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  // Teacher section: filter
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Certified Ready' | 'In Progress' | 'Needs Training'
  >('All');

  // Admin section: physical drill logger + search
  const [search, setSearch] = useState('');
  const [hazardFilter, setHazardFilter] = useState<'All' | HazardType>('All');
  const [showLogForm, setShowLogForm] = useState(false);
  const [instName, setInstName] = useState('');
  const [blockName, setBlockName] = useState('');
  const [hazard, setHazard] = useState<HazardType>('Earthquake');
  const [coordRole, setCoordRole] = useState<UserRole>('Floor Warden');
  const [participants, setParticipants] = useState(120);
  const [evacuationSec, setEvacuationSec] = useState(95);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittingDrill, setSubmittingDrill] = useState(false);

  const studentLearners = learners.filter((l) => l.role === 'Student');
  const activeLearner =
    learners.find((l) => l.id === activeLearnerId) || studentLearners[0] || learners[0];

  const cohortStats = computeCohortAnalytics(studentLearners, CORE_MODULE_IDS);
  const campusDrillSummary = computeCampusReadinessSummary(drills);
  const lowStockMedikit = medikit.filter((m) => m.status !== 'Stocked');

  async function handleToggleLessonDone(learnerId: string, moduleId: string, nextVal: boolean) {
    const resp = await fetch('/api/learning/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learnerId,
        moduleId,
        lessonCompleted: nextVal,
      }),
    });
    const data = await resp.json();
    if (resp.ok && data.learner) {
      onLearnerUpdated(data.learner);
    }
  }

  async function handleEnrollLearner(e: React.FormEvent) {
    e.preventDefault();
    setEnrollError(null);
    if (!newName.trim() || !newDept.trim()) {
      setEnrollError('Please enter both full name and class/department.');
      return;
    }
    setEnrolling(true);
    try {
      const resp = await fetch('/api/learning/learners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          role: newRole,
          departmentOrClass: newDept.trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to enroll learner');
      }
      onLearnerCreated(data.learner);
      onSelectLearner(data.learner.id);
      setNewName('');
      setNewDept('');
    } catch (err) {
      setEnrollError((err as Error).message);
    } finally {
      setEnrolling(false);
    }
  }

  async function handleToggleChecklist(item: ClassroomChecklistItem) {
    const resp = await fetch(`/api/learning/checklists/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !item.completed }),
    });
    const data = await resp.json();
    if (resp.ok && data.checklist) {
      onChecklistUpdated(data.checklist);
    }
  }

  function handleExportCsv() {
    const headers = ['Name', 'Role', 'Class/Department', 'Overall Progress %', 'Quiz Avg %', 'Status'];
    const rows = learners.map((l) => {
      const pct = calculateLearnerOverallPct(l, CORE_MODULE_IDS);
      const quizAvg = calculateLearnerQuizAvg(l, CORE_MODULE_IDS);
      return [
        `"${l.name}"`,
        l.role,
        `"${l.departmentOrClass}"`,
        pct,
        quizAvg,
        classifyLearnerStatus(pct),
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'suraksha-campus-learning-progress.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCreatePhysicalDrill(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!instName.trim() || !blockName.trim()) {
      setFormError('Institution name and building block are required.');
      return;
    }
    setSubmittingDrill(true);
    try {
      const score = evacuationSec <= 100 ? 135 : evacuationSec <= 140 ? 112 : 85;
      const grade = score >= 128 ? 'Exemplary' : score >= 98 ? 'Prepared' : 'Needs Drill Practice';

      const resp = await fetch('/api/drills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionName: instName.trim(),
          blockName: blockName.trim(),
          hazard,
          scenarioTitle: `Physical Campus ${hazard} Evacuation Drill`,
          role: coordRole,
          participants,
          evacuationSec,
          score,
          maxScore: 150,
          readinessGrade: grade,
          mode: 'Physical Campus Drill',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to log campus drill');
      onDrillCreated(data.drill);
      setInstName('');
      setBlockName('');
      setShowLogForm(false);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmittingDrill(false);
    }
  }

  async function handleDeleteDrill(id: string) {
    const resp = await fetch(`/api/drills/${id}`, { method: 'DELETE' });
    if (resp.ok) onDrillDeleted(id);
  }

  const filteredDrills = drills.filter((d) => {
    const matchesHazard = hazardFilter === 'All' || d.hazard === hazardFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      d.institutionName.toLowerCase().includes(q) ||
      d.blockName.toLowerCase().includes(q) ||
      d.scenarioTitle.toLowerCase().includes(q);
    return matchesHazard && matchesSearch;
  });

  const weakestModule = CURRICULUM_MODULES.find((m) => m.id === cohortStats.weakestModuleId);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Role Portal Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Role Portals &amp; Learning Tracking System
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Separate workspaces for Students, Teachers, and Campus Admins with persistent module
            progress, drill logs, and readiness compliance.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Portal Role Switcher"
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 self-start"
        >
          {(
            [
              { id: 'student', label: 'Student Portal' },
              { id: 'teacher', label: 'Teacher Portal' },
              { id: 'admin', label: 'Admin Portal' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={portalSection === tab.id}
              onClick={() => onChangePortalSection(tab.id)}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                portalSection === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================
          SECTION 1: STUDENT PORTAL & INDIVIDUAL LEARNING PROGRESS
      ============================================================ */}
      {portalSection === 'student' && activeLearner && (
        <div className="space-y-8" data-testid="student-portal-section">
          {/* Active Learner Header & Profile Selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-sky-700 inline-flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" />
                Student Learning Tracking Workspace
              </p>
              <h2 className="text-2xl font-bold text-slate-900">
                {activeLearner.name} ·{' '}
                <span className="text-slate-500 font-medium text-lg">
                  {activeLearner.departmentOrClass}
                </span>
              </h2>
              <p className="text-sm text-slate-600">
                Complete each module&apos;s Lesson (30%), Virtual Drill (35%), and Readiness Quiz
                (35%) to achieve Certified Ready status.
              </p>
            </div>

            <div className="w-full lg:w-72 space-y-1.5">
              <label
                htmlFor="active-learner-select"
                className="block text-xs font-medium text-slate-600"
              >
                Switch Active Learner Profile
              </label>
              <select
                id="active-learner-select"
                value={activeLearner.id}
                onChange={(e) => onSelectLearner(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
              >
                {learners.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.role} · {l.departmentOrClass})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Overall Progress Metrics */}
          {(() => {
            const overallPct = calculateLearnerOverallPct(activeLearner, CORE_MODULE_IDS);
            const quizAvg = calculateLearnerQuizAvg(activeLearner, CORE_MODULE_IDS);
            const drillsDone = CORE_MODULE_IDS.filter(
              (id) => activeLearner.modules[id]?.drillCompleted,
            ).length;
            const lessonsDone = CORE_MODULE_IDS.filter(
              (id) => activeLearner.modules[id]?.lessonCompleted,
            ).length;
            const status = classifyLearnerStatus(overallPct);

            return (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Overall Disaster Preparedness Progress
                    </p>
                    <p className="text-xl font-bold text-slate-900 mt-0.5">
                      {status} ·{' '}
                      <span className="font-mono tabular-nums text-sky-700">{overallPct}%</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-6 text-xs text-slate-600 font-mono tabular-nums">
                    <span>Lessons: {lessonsDone}/4</span>
                    <span>Drills: {drillsDone}/4</span>
                    <span>Quiz Avg: {quizAvg}%</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div
                  className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200"
                  role="progressbar"
                  aria-valuenow={overallPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Overall student disaster readiness progress"
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      overallPct >= 80
                        ? 'bg-emerald-600'
                        : overallPct >= 35
                          ? 'bg-sky-700'
                          : 'bg-amber-600'
                    }`}
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* 4 Module Learning Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CURRICULUM_MODULES.map((mod) => {
              const prog = activeLearner.modules[mod.id];
              const modPct = calculateModuleCompletionPct(prog);
              return (
                <div
                  key={mod.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-slate-500">{mod.ndmaCode}</span>
                      <span className="text-sm font-mono tabular-nums font-bold text-slate-900">
                        {modPct}% Complete
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{mod.title}</h3>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-700 transition-all duration-300"
                        style={{ width: `${modPct}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-slate-500">Lesson (30%)</div>
                        <div
                          className={`font-semibold mt-0.5 ${
                            prog?.lessonCompleted ? 'text-emerald-700' : 'text-slate-700'
                          }`}
                        >
                          {prog?.lessonCompleted ? 'Completed' : 'Pending'}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-slate-500">Drill (35%)</div>
                        <div
                          className={`font-semibold mt-0.5 font-mono tabular-nums ${
                            prog?.drillCompleted ? 'text-emerald-700' : 'text-slate-700'
                          }`}
                        >
                          {prog?.drillCompleted ? `${prog.bestDrillScorePct}%` : 'Pending'}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-slate-500">Quiz (35%)</div>
                        <div
                          className={`font-semibold mt-0.5 font-mono tabular-nums ${
                            prog?.quizCompleted ? 'text-emerald-700' : 'text-slate-700'
                          }`}
                        >
                          {prog?.quizCompleted ? `${prog.bestQuizScorePct}%` : 'Pending'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleLessonDone(
                          activeLearner.id,
                          mod.id,
                          !(prog?.lessonCompleted ?? false),
                        )
                      }
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        prog?.lessonCompleted
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {prog?.lessonCompleted ? 'Lesson Verified' : 'Mark Lesson Read'}
                    </button>

                    {mod.hazard !== 'FirstAid' ? (
                      <button
                        type="button"
                        onClick={() => onLaunchDrill(mod.hazard as 'Earthquake' | 'Fire' | 'Flood')}
                        className="px-3 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer"
                      >
                        Practice {mod.hazard} Drill
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigate('assistant')}
                        className="px-3 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer"
                      >
                        Practice Triage AI
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onNavigate('curriculum')}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Take Quiz
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enroll New Student / Learner Profile */}
          <form
            onSubmit={handleEnrollLearner}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">
              Enroll New Student or Teacher in Learning Tracker
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="enroll-name" className="block text-xs font-medium text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  id="enroll-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Sneha Joshi"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                />
              </div>
              <div>
                <label htmlFor="enroll-dept" className="block text-xs font-medium text-slate-600 mb-1">
                  Class / Semester / Dept
                </label>
                <input
                  id="enroll-dept"
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="e.g. B.Tech ECE · Sem 4"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                />
              </div>
              <div>
                <label htmlFor="enroll-role" className="block text-xs font-medium text-slate-600 mb-1">
                  Role
                </label>
                <select
                  id="enroll-role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'Student' | 'Teacher')}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                >
                  <option value="Student">Student</option>
                  <option value="Teacher">Teacher</option>
                </select>
              </div>
            </div>
            {enrollError && <p className="text-xs font-medium text-rose-700">{enrollError}</p>}
            <button
              type="submit"
              disabled={enrolling}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {enrolling ? 'Enrolling...' : 'Enroll Learner'}
            </button>
          </form>
        </div>
      )}

      {/* ============================================================
          SECTION 2: TEACHER PORTAL & CLASS COHORT TRACKER
      ============================================================ */}
      {portalSection === 'teacher' && (
        <div className="space-y-8" data-testid="teacher-portal-section">
          {/* Cohort Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 bg-white rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Tracked Students</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {cohortStats.studentCount}
              </div>
            </div>
            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Cohort Avg. Progress</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-sky-700 mt-1">
                {cohortStats.avgCompletionPct}%
              </div>
            </div>
            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Certified Ready</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                {cohortStats.certifiedCount}
              </div>
            </div>
            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Priority Training Gap</div>
              <div className="text-sm font-semibold text-amber-700 mt-2">
                {weakestModule ? weakestModule.hazard : 'All Balanced'}
              </div>
            </div>
          </div>

          {/* Student & Faculty Learning Progress Table */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-700" />
                  Batch &amp; Classroom Learning Progress Tracker
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Monitor every student&apos;s module completion, drill scores, and readiness status.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                  {(['All', 'Certified Ready', 'In Progress', 'Needs Training'] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                          statusFilter === st
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {st}
                      </button>
                    ),
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-3 pr-4">Learner</th>
                    <th className="py-3 pr-4">Role &amp; Batch</th>
                    <th className="py-3 pr-4">Module Progress</th>
                    <th className="py-3 pr-4 text-right">Quiz Avg</th>
                    <th className="py-3 pr-4">Readiness Status</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {learners
                    .filter((l) => {
                      if (statusFilter === 'All') return true;
                      return (
                        classifyLearnerStatus(calculateLearnerOverallPct(l, CORE_MODULE_IDS)) ===
                        statusFilter
                      );
                    })
                    .map((l) => {
                      const pct = calculateLearnerOverallPct(l, CORE_MODULE_IDS);
                      const quizAvg = calculateLearnerQuizAvg(l, CORE_MODULE_IDS);
                      const status = classifyLearnerStatus(pct);

                      return (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="py-3.5 pr-4 font-semibold text-slate-900">{l.name}</td>
                          <td className="py-3.5 pr-4 text-xs text-slate-600">
                            {l.role} · {l.departmentOrClass}
                          </td>
                          <td className="py-3.5 pr-4 min-w-[160px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-sky-700"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-mono tabular-nums text-xs font-semibold text-slate-900 w-9 text-right">
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {quizAvg}%
                          </td>
                          <td className="py-3.5 pr-4 text-xs font-semibold">
                            <span
                              className={
                                status === 'Certified Ready'
                                  ? 'text-emerald-700'
                                  : status === 'In Progress'
                                    ? 'text-sky-700'
                                    : 'text-amber-700'
                              }
                            >
                              {status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectLearner(l.id);
                                onChangePortalSection('student');
                              }}
                              className="text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer"
                            >
                              Inspect Profile
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Teacher Classroom Safety Verification Checklist */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-sky-700" />
              Classroom &amp; Floor Warden Inspection Checklist
            </h2>
            <div className="divide-y divide-slate-200">
              {checklists.map((chk) => (
                <label
                  key={chk.id}
                  className="py-3.5 flex items-start justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={chk.completed}
                      onChange={() => void handleToggleChecklist(chk)}
                      className="mt-1 w-4 h-4 accent-sky-700"
                    />
                    <div>
                      <div
                        className={`text-sm font-semibold ${
                          chk.completed ? 'line-through text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {chk.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        {chk.block} · Assigned: {chk.assignedTeacher}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ${
                      chk.completed ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {chk.completed ? 'Verified' : 'Action Needed'}
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ============================================================
          SECTION 3: ADMIN PORTAL (CAMPUS GOVERNANCE & DRILL LOGS)
      ============================================================ */}
      {portalSection === 'admin' && (
        <div className="space-y-8" data-testid="admin-portal-section">
          {/* Admin Header Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-6">
            <div>
              <p className="text-xs font-semibold text-sky-700 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Principal &amp; Campus Disaster Management Committee (CDMC)
              </p>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Institutional Compliance, Drill Audit &amp; Resource Stock
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowLogForm((prev) => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {showLogForm ? 'Close Drill Form' : 'Log Physical Campus Drill'}
            </button>
          </div>

          {/* Physical Drill Form */}
          {showLogForm && (
            <form
              onSubmit={handleCreatePhysicalDrill}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-slate-900">Record Physical Campus Drill</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="log-inst" className="block text-xs font-medium text-slate-600 mb-1">
                    School / College Name
                  </label>
                  <input
                    id="log-inst"
                    type="text"
                    value={instName}
                    onChange={(e) => setInstName(e.target.value)}
                    placeholder="e.g. Govt. Engineering College"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="log-block" className="block text-xs font-medium text-slate-600 mb-1">
                    Building / Hostel Block
                  </label>
                  <input
                    id="log-block"
                    type="text"
                    value={blockName}
                    onChange={(e) => setBlockName(e.target.value)}
                    placeholder="e.g. Hostel Wing B"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="log-hazard" className="block text-xs font-medium text-slate-600 mb-1">
                    Hazard Type
                  </label>
                  <select
                    id="log-hazard"
                    value={hazard}
                    onChange={(e) => setHazard(e.target.value as HazardType)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                  >
                    <option value="Earthquake">Earthquake</option>
                    <option value="Fire">Fire</option>
                    <option value="Flood">Flood</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="log-role" className="block text-xs font-medium text-slate-600 mb-1">
                    Coordinator Role
                  </label>
                  <select
                    id="log-role"
                    value={coordRole}
                    onChange={(e) => setCoordRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                  >
                    <option value="Floor Warden">Floor Warden</option>
                    <option value="Teacher">Teacher</option>
                    <option value="Student">Student</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="log-part" className="block text-xs font-medium text-slate-600 mb-1">
                    Total Participants
                  </label>
                  <input
                    id="log-part"
                    type="number"
                    min={1}
                    value={participants}
                    onChange={(e) => setParticipants(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="log-evac" className="block text-xs font-medium text-slate-600 mb-1">
                    Evacuation Duration (seconds)
                  </label>
                  <input
                    id="log-evac"
                    type="number"
                    min={10}
                    value={evacuationSec}
                    onChange={(e) => setEvacuationSec(Math.max(10, Number(e.target.value) || 60))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 font-mono tabular-nums"
                  />
                </div>
              </div>
              {formError && <p className="text-xs font-medium text-rose-700">{formError}</p>}
              <button
                type="submit"
                disabled={submittingDrill}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg cursor-pointer"
              >
                {submittingDrill ? 'Saving...' : 'Save Campus Drill Log'}
              </button>
            </form>
          )}

          {/* Admin KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 bg-white rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Logged Campus Drills</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {campusDrillSummary.totalDrills}
              </div>
            </div>
            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Mean Evacuation Time</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {campusDrillSummary.avgEvacuationSec}s
              </div>
            </div>
            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Campus Learning Avg</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                {cohortStats.avgCompletionPct}%
              </div>
            </div>
            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Medikit Alerts</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1">
                {lowStockMedikit.length} Items
              </div>
            </div>
          </div>

          {/* Drill Records Table */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <label htmlFor="drill-log-search" className="sr-only">
                  Search drill logs
                </label>
                <input
                  id="drill-log-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search institution, block, or scenario..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                {(['All', 'Earthquake', 'Fire', 'Flood'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHazardFilter(h)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      hazardFilter === h
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-3 pr-4">Institution &amp; Block</th>
                    <th className="py-3 pr-4">Scenario &amp; Mode</th>
                    <th className="py-3 pr-4">Coordinator</th>
                    <th className="py-3 pr-4 text-right">Participants</th>
                    <th className="py-3 pr-4 text-right">Evac Time</th>
                    <th className="py-3 pr-4 text-right">Score</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDrills.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-3.5 pr-4">
                        <div className="font-semibold text-slate-900">{d.institutionName}</div>
                        <div className="text-xs text-slate-500">{d.blockName}</div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="font-medium text-slate-900">{d.scenarioTitle}</div>
                        <div className="text-xs text-slate-500">
                          {d.hazard} · {d.mode}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-slate-700">{d.role}</td>
                      <td className="py-3.5 pr-4 text-right font-mono tabular-nums text-slate-900">
                        {d.participants}
                      </td>
                      <td className="py-3.5 pr-4 text-right font-mono tabular-nums text-slate-900">
                        {d.evacuationSec}s
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <div className="font-mono tabular-nums font-semibold text-slate-900">
                          {d.score}/{d.maxScore}
                        </div>
                        <div className="text-xs text-emerald-700 font-medium">{d.readinessGrade}</div>
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDeleteDrill(d.id)}
                          aria-label={`Delete drill record for ${d.institutionName}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Completed Assessments & Medikit Restock Alert */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <h3 className="text-base font-bold text-slate-900">Recent Assessment Submissions</h3>
              <div className="divide-y divide-slate-200">
                {assessments.slice(0, 5).map((a) => (
                  <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {a.participantName} ({a.role})
                      </div>
                      <div className="text-slate-500">{a.moduleTitle}</div>
                    </div>
                    <div className="font-mono tabular-nums font-bold text-emerald-700">
                      {a.score}/{a.total} ({a.percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Medikit Restock Alerts
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigate('curriculum')}
                  className="text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer"
                >
                  Manage Inventory
                </button>
              </div>
              {lowStockMedikit.length === 0 ? (
                <p className="text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  All campus medikit supplies meet minimum thresholds.
                </p>
              ) : (
                <div className="divide-y divide-slate-200">
                  {lowStockMedikit.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-slate-500">Min required: {item.minRequired}</div>
                      </div>
                      <span className="font-mono tabular-nums font-semibold text-amber-700">
                        {item.status} (Qty {item.quantity})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
