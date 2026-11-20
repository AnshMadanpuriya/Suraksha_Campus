import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DRILL_SCENARIOS } from '../data/drillsData';
import type { DrillChoice, DrillRecord, DrillScenario, DrillStepResult, HazardType, UserRole } from '../types';
import { calculateStepPoints, evaluateDrillSession } from '../utils/drillEngine';

interface VirtualDrillViewProps {
  initialHazard?: HazardType;
  theme?: 'light' | 'dark';
  onDrillSaved: (record: DrillRecord) => void;
  onAskAiAboutMistake: (prompt: string) => void;
}

export function VirtualDrillView({
  initialHazard,
  theme = 'light',
  onDrillSaved,
  onAskAiAboutMistake,
}: VirtualDrillViewProps) {
  const defaultScenario =
    DRILL_SCENARIOS.find((s) => s.hazard === initialHazard) || DRILL_SCENARIOS[0];

  const [selectedScenario, setSelectedScenario] = useState<DrillScenario>(defaultScenario);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(defaultScenario.steps[0].timeLimitSec);
  const [activeZoneId, setActiveZoneId] = useState(defaultScenario.initialZoneId);
  const [hazardLevel, setHazardLevel] = useState(65);
  const [results, setResults] = useState<DrillStepResult[]>([]);
  const [lastFeedback, setLastFeedback] = useState<{
    isOptimal: boolean;
    message: string;
    points: number;
  } | null>(null);

  // Save drill form state
  const [institutionName, setInstitutionName] = useState('Kendriya Vidyalaya Campus');
  const [blockName, setBlockName] = useState(defaultScenario.location);
  const [role, setRole] = useState<UserRole>('Teacher');
  const [participants, setParticipants] = useState(60);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const stepStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (initialHazard) {
      const match = DRILL_SCENARIOS.find((s) => s.hazard === initialHazard);
      if (match) {
        resetSimulation(match);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHazard]);

  const currentStep = selectedScenario.steps[stepIndex];

  useEffect(() => {
    if (status !== 'running') return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  function resetSimulation(scenario: DrillScenario = selectedScenario) {
    setSelectedScenario(scenario);
    setStatus('idle');
    setStepIndex(0);
    setTimeLeft(scenario.steps[0].timeLimitSec);
    setActiveZoneId(scenario.initialZoneId);
    setHazardLevel(65);
    setResults([]);
    setLastFeedback(null);
    setBlockName(scenario.location);
    setSaveSuccess(null);
    setSaveError(null);
  }

  function handleStartDrill() {
    if (status === 'completed') {
      resetSimulation(selectedScenario);
    }
    stepStartRef.current = Date.now();
    setStatus('running');
  }

  function handleSelectChoice(choice: DrillChoice) {
    if (status !== 'running' || !currentStep) return;

    const elapsedSec = Math.max(
      1,
      Math.min(currentStep.timeLimitSec, currentStep.timeLimitSec - timeLeft),
    );
    const pointsEarned = calculateStepPoints(
      choice.points,
      choice.isOptimal,
      elapsedSec,
      currentStep.timeLimitSec,
    );

    const stepResult: DrillStepResult = {
      stepId: currentStep.id,
      phaseTitle: currentStep.phaseTitle,
      chosenLabel: choice.label,
      isOptimal: choice.isOptimal,
      pointsEarned,
      reactionSec: elapsedSec,
      feedback: choice.feedback,
    };

    const nextResults = [...results, stepResult];
    setResults(nextResults);
    setActiveZoneId(choice.nextZoneId);
    setHazardLevel((prev) => Math.max(5, Math.min(100, prev + choice.hazardDelta)));
    setLastFeedback({
      isOptimal: choice.isOptimal,
      message: choice.feedback,
      points: pointsEarned,
    });

    if (stepIndex + 1 >= selectedScenario.steps.length) {
      setStatus('completed');
    } else {
      const nextStep = selectedScenario.steps[stepIndex + 1];
      setStepIndex(stepIndex + 1);
      setTimeLeft(nextStep.timeLimitSec);
      stepStartRef.current = Date.now();
    }
  }

  const evaluation = evaluateDrillSession(results, 20);

  async function handleSaveRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!institutionName.trim() || !blockName.trim()) {
      setSaveError('Please enter both institution name and building block.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const resp = await fetch('/api/drills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionName: institutionName.trim(),
          blockName: blockName.trim(),
          hazard: selectedScenario.hazard,
          scenarioTitle: selectedScenario.title,
          role,
          participants,
          evacuationSec: Math.max(25, evaluation.totalReactionSec * 3),
          score: evaluation.totalScore,
          maxScore: evaluation.maxScore,
          readinessGrade: evaluation.grade,
          mode: 'Virtual Simulation',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to save drill record');
      }
      onDrillSaved(data.drill);
      setSaveSuccess('Drill record saved to Institution Logs.');
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const activeZone = selectedScenario.zones.find((z) => z.id === activeZoneId);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header & Scenario Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Virtual Campus Drill Simulator
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {selectedScenario.ndmaRef} · {selectedScenario.location}
          </p>
        </div>

        {/* Interactive Scenario Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          {DRILL_SCENARIOS.map((sc) => {
            const active = sc.id === selectedScenario.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => resetSimulation(sc)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sc.hazard} Drill
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-Zone Sandbox Layout (65% Stage / 35% Decision Deck) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT STAGE: Interactive Campus Floorplan & Playback Controls */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          {/* Playback & Telemetry Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              {status !== 'running' ? (
                <button
                  type="button"
                  onClick={handleStartDrill}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  {status === 'paused' ? 'Resume Drill' : status === 'completed' ? 'Replay Drill' : 'Start Drill'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStatus('paused')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              )}

              <button
                type="button"
                onClick={() => resetSimulation(selectedScenario)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>

            <div className="flex items-center gap-5 text-sm font-mono tabular-nums">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Phase Timer: {timeLeft}s</span>
              </div>
              <div
                className={`font-semibold ${
                  hazardLevel >= 65
                    ? 'text-rose-700'
                    : hazardLevel >= 35
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                }`}
              >
                Risk Index: {hazardLevel}%
              </div>
            </div>
          </div>

          {/* Interactive SVG Campus Floorplan */}
          <div
            data-testid="drill-floorplan-stage"
            className={`relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden ${
              status === 'running' && selectedScenario.hazard === 'Earthquake' && stepIndex === 0
                ? 'animate-quake'
                : ''
            }`}
          >
            {/* Explicit Semantic Hazard Readout Bar */}
            <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between text-xs">
              <span className="font-semibold tracking-wide inline-flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                {status === 'completed'
                  ? 'DRILL COMPLETE · ASSEMBLY ZONE SECURED'
                  : currentStep?.activeHazardLabel}
              </span>
              <span className="font-mono tabular-nums text-slate-300">
                Step {Math.min(stepIndex + 1, selectedScenario.steps.length)}/{selectedScenario.steps.length}
              </span>
            </div>

            <svg
              viewBox="0 0 620 400"
              className="w-full h-auto block"
              role="img"
              aria-label={`Interactive floorplan for ${selectedScenario.title}. Current evacuee location: ${activeZone?.label || 'Classroom'}`}
            >
              {/* Grid background */}
              <defs>
                <pattern id="floorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'}
                    strokeWidth="0.7"
                  />
                </pattern>
              </defs>
              <rect width="620" height="400" fill={theme === 'dark' ? '#0b1120' : '#f8fafc'} />
              <rect width="620" height="400" fill="url(#floorGrid)" />

              {/* Hazard Atmosphere Overlay */}
              {status === 'running' && selectedScenario.hazard === 'Fire' && (
                <rect x="32" y="34" width="422" height="236" fill="rgba(220, 38, 38, 0.14)" rx="8" />
              )}
              {status === 'running' && selectedScenario.hazard === 'Flood' && (
                <rect x="32" y="204" width="422" height="166" fill="rgba(2, 132, 199, 0.18)" rx="8" />
              )}

              {/* Zones */}
              {selectedScenario.zones.map((zone) => {
                const isCurrent = zone.id === activeZoneId;
                const fillMap: Record<string, string> =
                  theme === 'dark'
                    ? {
                        room: isCurrent ? '#0c4a6e' : '#111827',
                        corridor: isCurrent ? '#78350f' : '#1e293b',
                        stairwell: isCurrent ? '#14532d' : '#064e3b',
                        assembly: isCurrent ? '#166534' : '#052e16',
                        utility: isCurrent ? '#7f1d1d' : '#450a0a',
                      }
                    : {
                        room: isCurrent ? '#e0f2fe' : '#ffffff',
                        corridor: isCurrent ? '#fef3c7' : '#f1f5f9',
                        stairwell: isCurrent ? '#dcfce7' : '#ecfdf5',
                        assembly: isCurrent ? '#bbf7d0' : '#f0fdf4',
                        utility: isCurrent ? '#fee2e2' : '#fef2f2',
                      };
                const strokeMap: Record<string, string> =
                  theme === 'dark'
                    ? {
                        room: isCurrent ? '#38bdf8' : '#475569',
                        corridor: isCurrent ? '#fbbf24' : '#475569',
                        stairwell: isCurrent ? '#4ade80' : '#10b981',
                        assembly: isCurrent ? '#4ade80' : '#22c55e',
                        utility: isCurrent ? '#f87171' : '#dc2626',
                      }
                    : {
                        room: isCurrent ? '#0369a1' : '#94a3b8',
                        corridor: isCurrent ? '#b45309' : '#94a3b8',
                        stairwell: isCurrent ? '#15803d' : '#10b981',
                        assembly: isCurrent ? '#15803d' : '#22c55e',
                        utility: isCurrent ? '#b91c1c' : '#fca5a5',
                      };

                return (
                  <g key={zone.id}>
                    <rect
                      x={zone.x}
                      y={zone.y}
                      width={zone.w}
                      height={zone.h}
                      rx={8}
                      fill={fillMap[zone.kind]}
                      stroke={strokeMap[zone.kind]}
                      strokeWidth={isCurrent ? 2.5 : 1.5}
                    />
                    <text
                      x={zone.x + 12}
                      y={zone.y + 24}
                      fill={theme === 'dark' ? '#f1f5f9' : '#0f172a'}
                      fontSize="12"
                      fontWeight={isCurrent ? '700' : '600'}
                    >
                      {zone.label}
                    </text>
                    {isCurrent && (
                      <g>
                        <rect
                          x={zone.x + zone.w / 2 - 34}
                          y={zone.y + zone.h / 2 - 6}
                          width="68"
                          height="24"
                          rx="12"
                          fill="#0369a1"
                        />
                        <text
                          x={zone.x + zone.w / 2}
                          y={zone.y + zone.h / 2 + 10}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="700"
                        >
                          CLASS
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Recommended Escape Route Arrow */}
              <path
                d="M 142 184 L 142 252 L 532 252 L 532 292"
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeDasharray="6 4"
              />
            </svg>
          </div>

          {/* Live Pedagogical Feedback Strip */}
          {lastFeedback && (
            <div
              className={`rounded-lg border p-4 flex items-start gap-3 ${
                lastFeedback.isOptimal
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              {lastFeedback.isOptimal ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-sm">
                <div className="font-semibold">
                  {lastFeedback.isOptimal ? 'Safe Decision' : 'Hazardous Choice'} · +
                  {lastFeedback.points} pts
                </div>
                <p className="leading-relaxed">{lastFeedback.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT DECK: Step Decision Controls OR Final Debrief & Persistence */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
          {status === 'idle' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-sky-700">Scenario Brief</p>
                <h2 className="text-xl font-bold text-slate-900">{selectedScenario.title}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{selectedScenario.summary}</p>
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-2 text-sm text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Hazard Classification</span>
                  <span className="font-semibold">{selectedScenario.hazard}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Decision Phases</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {selectedScenario.steps.length} Phases
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Difficulty Tier</span>
                  <span className="font-semibold">{selectedScenario.difficulty}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartDrill}
                className="w-full py-3 px-4 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors cursor-pointer"
              >
                Begin Timed Simulation
              </button>
            </div>
          )}

          {(status === 'running' || status === 'paused') && currentStep && (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-sky-700">{currentStep.phaseTitle}</p>
                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  {currentStep.prompt}
                </h2>
              </div>

              {status === 'paused' && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900">
                  Simulation paused. Click Resume Drill to submit your decision.
                </div>
              )}

              <div className="space-y-2.5">
                {currentStep.choices.map((choice, idx) => (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={status !== 'running'}
                    onClick={() => handleSelectChoice(choice)}
                    className="w-full text-left p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-mono font-semibold text-slate-500 block mb-1">
                      Option {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm font-medium text-slate-900 leading-snug block">
                      {choice.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Drill Debrief Complete
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    Grade: {evaluation.grade}
                  </h2>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-2xl font-bold text-slate-900">{evaluation.percentage}%</div>
                  <div className="text-xs text-slate-500">
                    {evaluation.totalScore}/{evaluation.maxScore} pts
                  </div>
                </div>
              </div>

              {/* Step Review */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {results.map((r) => (
                  <div
                    key={r.stepId}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>{r.phaseTitle}</span>
                      <span className={r.isOptimal ? 'text-emerald-700' : 'text-rose-700'}>
                        {r.isOptimal ? 'Optimal' : 'Unsafe'} · {r.reactionSec}s
                      </span>
                    </div>
                    <p className="text-slate-600">{r.chosenLabel}</p>
                  </div>
                ))}
              </div>

              {evaluation.optimalCount < results.length && (
                <button
                  type="button"
                  onClick={() =>
                    onAskAiAboutMistake(
                      `During our ${selectedScenario.hazard} drill (${selectedScenario.title}), what are the exact real-time steps and medikit items needed if someone gets injured?`,
                    )
                  }
                  className="w-full py-2 px-3 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
                >
                  Ask Safety Assistant to Review Protocols &amp; First-Aid
                </button>
              )}

              {/* Persist Drill Log Form */}
              <form onSubmit={handleSaveRecord} className="border-t border-slate-200 pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Save Drill Record to Institution Logs
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="drill-inst-name"
                      className="block text-xs font-medium text-slate-600 mb-1"
                    >
                      School / College Name
                    </label>
                    <input
                      id="drill-inst-name"
                      type="text"
                      required
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="drill-block-name"
                      className="block text-xs font-medium text-slate-600 mb-1"
                    >
                      Campus Block / Wing
                    </label>
                    <input
                      id="drill-block-name"
                      type="text"
                      required
                      value={blockName}
                      onChange={(e) => setBlockName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="drill-role"
                      className="block text-xs font-medium text-slate-600 mb-1"
                    >
                      Participant Role
                    </label>
                    <select
                      id="drill-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                    >
                      <option value="Student">Student</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Floor Warden">Floor Warden</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="drill-participants"
                      className="block text-xs font-medium text-slate-600 mb-1"
                    >
                      Participants
                    </label>
                    <input
                      id="drill-participants"
                      type="number"
                      min={1}
                      max={2000}
                      value={participants}
                      onChange={(e) => setParticipants(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 font-mono tabular-nums"
                    />
                  </div>
                </div>

                {saveError && (
                  <p className="text-xs font-medium text-rose-700">{saveError}</p>
                )}
                {saveSuccess && (
                  <p className="text-xs font-medium text-emerald-700">{saveSuccess}</p>
                )}

                <button
                  type="submit"
                  disabled={saving || Boolean(saveSuccess)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving Record...' : saveSuccess ? 'Saved to Institution Logs' : 'Save Drill Record'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
