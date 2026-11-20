import { CheckCircle2, Minus, Plus, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { CURRICULUM_MODULES } from '../data/curriculumData';
import type { AssessmentRecord, CurriculumModule, MedikitItem, UserRole } from '../types';
import { gradeCurriculumQuiz } from '../utils/drillEngine';

interface CurriculumKitViewProps {
  medikit: MedikitItem[];
  onUpdateMedikit: (updated: MedikitItem) => void;
  onAssessmentSubmitted: (record: AssessmentRecord) => void;
}

export function CurriculumKitView({
  medikit,
  onUpdateMedikit,
  onAssessmentSubmitted,
}: CurriculumKitViewProps) {
  const [selectedMod, setSelectedMod] = useState<CurriculumModule>(CURRICULUM_MODULES[0]);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Quiz state
  const [participantName, setParticipantName] = useState('');
  const [participantRole, setParticipantRole] = useState<UserRole>('Student');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<{
    score: number;
    total: number;
    percentage: number;
    passed: boolean;
  } | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  function handleSelectModule(mod: CurriculumModule) {
    setSelectedMod(mod);
    setAnswers({});
    setQuizResult(null);
    setQuizError(null);
  }

  async function adjustMedikitQty(item: MedikitItem, delta: number) {
    const nextQty = Math.max(0, item.quantity + delta);
    setUpdatingId(item.id);
    try {
      const resp = await fetch(`/api/medikit/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: nextQty }),
      });
      const data = await resp.json();
      if (resp.ok && data.item) {
        onUpdateMedikit(data.item);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleQuizSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQuizError(null);

    if (!participantName.trim()) {
      setQuizError('Please enter your name before submitting the readiness assessment.');
      return;
    }

    const unanswered = selectedMod.quiz.some((q) => typeof answers[q.id] !== 'number');
    if (unanswered) {
      setQuizError('Please answer all quiz questions before grading.');
      return;
    }

    const graded = gradeCurriculumQuiz(selectedMod.quiz, answers);
    setSubmittingQuiz(true);
    try {
      const resp = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: selectedMod.id,
          moduleTitle: selectedMod.title,
          participantName: participantName.trim(),
          role: participantRole,
          score: graded.score,
          total: graded.total,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to save assessment');
      }
      setQuizResult(graded);
      onAssessmentSubmitted(data.assessment);
    } catch (err) {
      setQuizError((err as Error).message);
    } finally {
      setSubmittingQuiz(false);
    }
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Header & Module Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Disaster Curriculum &amp; Medikit Triage
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Structured NDMA school safety lessons, minor vs. major injury procedures, and live
            medikit stock management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
          {CURRICULUM_MODULES.map((mod) => (
            <button
              key={mod.id}
              type="button"
              onClick={() => handleSelectModule(mod)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedMod.id === mod.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mod.hazard === 'FirstAid' ? 'First-Aid & Medikit' : mod.hazard}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Module Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Illustration + Protocol Guide */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
              {!imgErrors[selectedMod.id] ? (
                <img
                  src={selectedMod.imagePath}
                  alt={selectedMod.title}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setImgErrors((prev) => ({ ...prev, [selectedMod.id]: true }))
                  }
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-100">
                  <ShieldCheck className="w-10 h-10 text-sky-700 mb-2" />
                  <p className="text-sm font-semibold text-slate-800">{selectedMod.title}</p>
                </div>
              )}
            </div>
            <div className="p-6 space-y-4">
              <div className="text-xs font-mono text-slate-500">
                {selectedMod.ndmaCode} · {selectedMod.hazard} Safety Module
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{selectedMod.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{selectedMod.overview}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-200">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">
                    01. Real-Time Response Steps
                  </h3>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700 list-disc pl-4">
                    {selectedMod.duringSteps.map((st, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {st}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">
                    02. Post-Impact &amp; Evacuation
                  </h3>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700 list-disc pl-4">
                    {selectedMod.afterSteps.map((st, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {st}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Minor vs Major Injury & Improvised Resources Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Injury Triage &amp; Improvised Campus Sources
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 space-y-1.5">
                <p className="text-xs font-semibold text-amber-900">
                  Minor Injury (Kam Chot) Protocol
                </p>
                <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                  {selectedMod.minorInjuryGuide}
                </p>
              </div>
              <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 space-y-1.5">
                <p className="text-xs font-semibold text-rose-900">
                  Major Trauma (Jyada Chot) Protocol
                </p>
                <p className="text-xs sm:text-sm text-rose-950 leading-relaxed">
                  {selectedMod.majorInjuryGuide}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2">
                When Medikit is Unavailable — Safe Classroom &amp; Hostel Substitutes:
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600 list-disc pl-4">
                {selectedMod.improvisedResources.map((res, idx) => (
                  <li key={idx}>{res}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right: Graded Readiness Quiz */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-xs font-semibold text-sky-700">Module Competency Check</p>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              {selectedMod.hazard} Readiness Quiz
            </h2>
          </div>

          <form onSubmit={handleQuizSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="quiz-participant-name"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Student / Faculty Name
                </label>
                <input
                  id="quiz-participant-name"
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="e.g. Aarav Verma"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                />
              </div>
              <div>
                <label
                  htmlFor="quiz-participant-role"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Role
                </label>
                <select
                  id="quiz-participant-role"
                  value={participantRole}
                  onChange={(e) => setParticipantRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                >
                  <option value="Student">Student</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Floor Warden">Floor Warden</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {selectedMod.quiz.map((q, qIdx) => (
                <div
                  key={q.id}
                  role="group"
                  aria-labelledby={`quiz-q-${q.id}`}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5"
                >
                  <p id={`quiz-q-${q.id}`} className="text-sm font-semibold text-slate-900">
                    {qIdx + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => (
                      <label
                        key={oIdx}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === oIdx}
                          onChange={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: oIdx }))
                          }
                          className="mt-1 accent-sky-700"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                  {quizResult && (
                    <p
                      className={`text-xs pt-1 font-medium ${
                        answers[q.id] === q.correctIndex
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {quizError && <p className="text-xs font-medium text-rose-700">{quizError}</p>}

            {quizResult && (
              <div
                className={`p-4 rounded-lg border flex items-center justify-between ${
                  quizResult.passed
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {quizResult.passed ? 'Certified Ready' : 'Review Recommended'}
                  </span>
                </div>
                <span className="font-mono tabular-nums text-base font-bold">
                  {quizResult.score}/{quizResult.total} ({quizResult.percentage}%)
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={submittingQuiz}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              {submittingQuiz ? 'Submitting...' : 'Submit & Grade Assessment'}
            </button>
          </form>
        </div>
      </section>

      {/* Institutional Medikit Stock & Triage Table */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Campus First-Aid Medikit Inventory &amp; Triage Guide
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Update live quantities after physical drills or restocking; changes persist in the
              campus database.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-3 pr-4">Medikit Item</th>
                <th className="py-3 pr-4">Minor Injury Use</th>
                <th className="py-3 pr-4">Major Trauma Use</th>
                <th className="py-3 pr-4">Improvised Substitute</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Stock Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {medikit.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3.5 pr-4 align-top">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.category}</div>
                  </td>
                  <td className="py-3.5 pr-4 align-top text-xs text-slate-700 max-w-[210px]">
                    {item.useForMinor}
                  </td>
                  <td className="py-3.5 pr-4 align-top text-xs text-slate-700 max-w-[210px]">
                    {item.useForMajor}
                  </td>
                  <td className="py-3.5 pr-4 align-top text-xs text-slate-600 max-w-[210px]">
                    {item.improvisedAlternative}
                  </td>
                  <td className="py-3.5 pr-4 align-top whitespace-nowrap">
                    <span
                      className={`text-xs font-semibold ${
                        item.status === 'Stocked'
                          ? 'text-emerald-700'
                          : item.status === 'Low Stock'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                      }`}
                    >
                      {item.status} (Min {item.minRequired})
                    </span>
                  </td>
                  <td className="py-3.5 align-top text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        disabled={updatingId === item.id || item.quantity <= 0}
                        onClick={() => void adjustMedikitQty(item, -1)}
                        aria-label={`Decrease quantity for ${item.name}`}
                        className="w-7 h-7 inline-flex items-center justify-center rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono tabular-nums font-semibold w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={updatingId === item.id}
                        onClick={() => void adjustMedikitQty(item, 1)}
                        aria-label={`Increase quantity for ${item.name}`}
                        className="w-7 h-7 inline-flex items-center justify-center rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
