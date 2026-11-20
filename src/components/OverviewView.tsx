import {
  ArrowRight,
  BookOpenCheck,
  Flame,
  GraduationCap,
  MessageSquareText,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  Users,
  Waves,
} from 'lucide-react';
import { useState } from 'react';
import type { AppView, DrillRecord, LearnerProfile, MedikitItem, PortalSection } from '../types';
import { computeCampusReadinessSummary } from '../utils/drillEngine';
import { computeCohortAnalytics, CORE_MODULE_IDS } from '../utils/learningTracker';

interface OverviewViewProps {
  drills: DrillRecord[];
  medikit: MedikitItem[];
  learners: LearnerProfile[];
  indexedDocsCount: number;
  onNavigate: (view: AppView) => void;
  onLaunchScenario: (hazard: 'Earthquake' | 'Fire' | 'Flood') => void;
  onOpenPortal: (section: PortalSection) => void;
}

export function OverviewView({
  drills,
  medikit,
  learners,
  indexedDocsCount,
  onNavigate,
  onLaunchScenario,
  onOpenPortal,
}: OverviewViewProps) {
  const [heroImgError, setHeroImgError] = useState(false);
  const summary = computeCampusReadinessSummary(drills);
  const cohort = computeCohortAnalytics(
    learners.filter((l) => l.role === 'Student'),
    CORE_MODULE_IDS,
  );
  const lowStockCount = medikit.filter((m) => m.status !== 'Stocked').length;

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Split Section */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-8 lg:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between py-2 space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-medium text-sky-800 tracking-wide">
                NDMA School Safety Policy 2016 · NBC Part IV · Indian Red Cross Triage
              </p>
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12]"
                style={{ textWrap: 'balance' }}
              >
                Disaster preparedness and live drill simulation for Indian campuses
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Train students, teachers, and campus admins with interactive emergency floorplan
                drills, a campus safety &amp; first-aid assistant, and role-based learning
                progress tracking.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('drills')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
              >
                Launch Virtual Drill
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('assistant')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <MessageSquareText className="w-4 h-4 text-sky-700" />
                Open Safety Assistant
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 pt-2 border-t border-slate-200">
              <span>3 Interactive Hazard Simulations</span>
              <span aria-hidden="true">·</span>
              <span>{indexedDocsCount || 15} Grounded NDMA &amp; Trauma SOPs</span>
              <span aria-hidden="true">·</span>
              <span>Student, Teacher &amp; Admin Tracking</span>
            </div>
          </div>

          <div className="lg:col-span-5 flex">
            <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[260px] lg:min-h-full relative">
              {!heroImgError ? (
                <img
                  src="/src/assets/images/hero_campus_preparedness_1795188745270.jpg"
                  alt="Indian university campus courtyard with emergency assembly zone signage"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="w-full h-full object-cover lg:h-full"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-sky-50">
                  <ShieldAlert className="w-10 h-10 text-sky-700 mb-3" />
                  <p className="text-sm font-semibold text-slate-800">Campus Assembly Zone Visual</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4-Column Full-Width Campus Readiness Strip */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6" aria-label="Campus Readiness Metrics">
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 bg-white rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-5 sm:p-6">
            <p className="text-xs font-medium text-slate-500">Logged Campus Drills</p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {summary.totalDrills}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {summary.totalParticipants} students &amp; staff trained
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-xs font-medium text-slate-500">Avg. Evacuation Time</p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {summary.avgEvacuationSec}s
            </p>
            <p className="mt-1 text-xs text-slate-500">Target NDMA benchmark &le; 120s</p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-xs font-medium text-slate-500">Cohort Learning Progress</p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-700 font-mono tabular-nums">
              {cohort.avgCompletionPct}%
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {cohort.certifiedCount}/{cohort.studentCount} students certified
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-xs font-medium text-slate-500">Medikit Readiness</p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {medikit.length - lowStockCount}/{medikit.length}
            </p>
            <p className="mt-1 text-xs text-amber-700 font-medium">
              {lowStockCount > 0 ? `${lowStockCount} items need restock` : 'All supplies stocked'}
            </p>
          </div>
        </div>
      </section>

      {/* 01. Interactive Disaster Simulations */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">01. Interactive Disaster Simulations</h2>
            <p className="text-sm text-slate-600 mt-1">
              Select a campus scenario to test real-time decision timing and evacuation routing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('curriculum')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:text-sky-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpenCheck className="w-4 h-4" />
            Explore Curriculum &amp; Medikit
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-amber-700 inline-flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Seismic Zone IV
                </span>
                <span>4 Phases · 80s</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Earthquake Classroom Drill</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Practice Drop-Cover-Hold On during active shaking, Chemistry Lab gas shutoff, stairwell
                bleeding triage, and open-ground headcount.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onLaunchScenario('Earthquake')}
              className="w-full py-2.5 px-4 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Start Earthquake Drill
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-rose-700 inline-flex items-center gap-1.5">
                  <Flame className="w-4 h-4" />
                  Class C / Toxic Smoke
                </span>
                <span>3 Phases · 60s</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Lab Fire &amp; Smoke Evacuation</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Select CO2/ABC extinguishers using PASS, check doors with the back of your hand, crawl
                low under smoke, and treat scald burns.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onLaunchScenario('Fire')}
              className="w-full py-2.5 px-4 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Start Fire Drill
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-sky-700 inline-flex items-center gap-1.5">
                  <Waves className="w-4 h-4" />
                  Monsoon Surge
                </span>
                <span>3 Phases · 60s</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Campus Flood &amp; Mains Cutoff</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Isolate ground-floor electrical MCBs safely, shift medikits and ORS to upper terraces,
                and handle flood-displaced snakebite triage.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onLaunchScenario('Flood')}
              className="w-full py-2.5 px-4 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Start Flood Drill
            </button>
          </div>
        </div>
      </section>

      {/* 02. Role-Based Portals & Learning Tracking System */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-bold text-slate-900">
            02. Student, Teacher &amp; Admin Portals
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Dedicated learning tracking, classroom readiness verification, and campus governance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-sky-700 inline-flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" />
                Student Portal
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Personal Learning Progress</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Track module completion across Earthquake, Fire, Flood, and First-Aid lessons, best
                drill scores, and quiz readiness certifications.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenPortal('student')}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors cursor-pointer"
            >
              Open Student Portal
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Teacher Portal
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Class Progress &amp; Checklists</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Monitor every student&apos;s module completion percentage, export CSV progress
                reports, and verify floor warden safety checklists.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenPortal('teacher')}
              className="w-full py-2.5 px-4 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Open Teacher Portal
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Admin Portal
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Campus Audit &amp; Drill Logs</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Manage institutional evacuation logs, review medikit restock alerts, and oversee
                campus-wide safety compliance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenPortal('admin')}
              className="w-full py-2.5 px-4 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Open Admin Portal
            </button>
          </div>
        </div>
      </section>

      {/* Verified Indian Emergency Helplines Footer Strip */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6" aria-label="Indian National Emergency Helplines">
        <div className="bg-slate-900 text-slate-100 rounded-xl p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-sky-400" />
              Verified Indian Emergency Helplines
            </h2>
            <p className="text-sm text-slate-300">
              Display these numbers inside every classroom, laboratory, and hostel notice board.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm font-mono tabular-nums">
            <div className="border border-slate-700 rounded-lg px-4 py-2.5">
              <div className="text-xs text-slate-400 font-sans">Unified Emergency</div>
              <div className="text-lg font-semibold text-white">112</div>
            </div>
            <div className="border border-slate-700 rounded-lg px-4 py-2.5">
              <div className="text-xs text-slate-400 font-sans">Trauma Ambulance</div>
              <div className="text-lg font-semibold text-white">108</div>
            </div>
            <div className="border border-slate-700 rounded-lg px-4 py-2.5">
              <div className="text-xs text-slate-400 font-sans">Fire Brigade</div>
              <div className="text-lg font-semibold text-white">101</div>
            </div>
            <div className="border border-slate-700 rounded-lg px-4 py-2.5">
              <div className="text-xs text-slate-400 font-sans">State Disaster</div>
              <div className="text-lg font-semibold text-white">1070</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
