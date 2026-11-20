import type { LearnerProfile, ModuleProgress } from '../types';

export const CORE_MODULE_IDS = [
  'mod-earthquake',
  'mod-fire',
  'mod-flood',
  'mod-firstaid',
] as const;

export const HAZARD_TO_MODULE_ID: Record<string, string> = {
  Earthquake: 'mod-earthquake',
  Fire: 'mod-fire',
  Flood: 'mod-flood',
  FirstAid: 'mod-firstaid',
};

/**
 * Calculates single-module completion percentage:
 * - Lesson study completed: 30%
 * - Virtual drill simulation completed: 35%
 * - Competency quiz completed: 35%
 */
export function calculateModuleCompletionPct(progress?: ModuleProgress): number {
  if (!progress) return 0;
  let pct = 0;
  if (progress.lessonCompleted) pct += 30;
  if (progress.drillCompleted) pct += 35;
  if (progress.quizCompleted) pct += 35;
  return Math.min(100, pct);
}

/**
 * Calculates overall curriculum readiness percentage across all 4 core modules.
 */
export function calculateLearnerOverallPct(
  learner: LearnerProfile,
  moduleIds: readonly string[] = CORE_MODULE_IDS,
): number {
  if (moduleIds.length === 0) return 0;
  const sum = moduleIds.reduce(
    (acc, modId) => acc + calculateModuleCompletionPct(learner.modules[modId]),
    0,
  );
  return Math.round(sum / moduleIds.length);
}

/**
 * Computes average quiz score across modules where a quiz was attempted.
 */
export function calculateLearnerQuizAvg(
  learner: LearnerProfile,
  moduleIds: readonly string[] = CORE_MODULE_IDS,
): number {
  const attempted = moduleIds
    .map((id) => learner.modules[id])
    .filter((m): m is ModuleProgress => Boolean(m && m.quizCompleted));
  if (attempted.length === 0) return 0;
  const total = attempted.reduce((acc, m) => acc + Math.max(0, m.bestQuizScorePct), 0);
  return Math.round(total / attempted.length);
}

export function classifyLearnerStatus(
  overallPct: number,
): 'Certified Ready' | 'In Progress' | 'Needs Training' {
  if (overallPct >= 80) return 'Certified Ready';
  if (overallPct >= 35) return 'In Progress';
  return 'Needs Training';
}

export function computeCohortAnalytics(
  learners: LearnerProfile[],
  moduleIds: readonly string[] = CORE_MODULE_IDS,
): {
  totalLearners: number;
  studentCount: number;
  teacherCount: number;
  avgCompletionPct: number;
  certifiedCount: number;
  inProgressCount: number;
  needsTrainingCount: number;
  weakestModuleId: string | null;
} {
  if (learners.length === 0) {
    return {
      totalLearners: 0,
      studentCount: 0,
      teacherCount: 0,
      avgCompletionPct: 0,
      certifiedCount: 0,
      inProgressCount: 0,
      needsTrainingCount: 0,
      weakestModuleId: null,
    };
  }

  let certifiedCount = 0;
  let inProgressCount = 0;
  let needsTrainingCount = 0;
  let completionSum = 0;

  for (const l of learners) {
    const pct = calculateLearnerOverallPct(l, moduleIds);
    completionSum += pct;
    const status = classifyLearnerStatus(pct);
    if (status === 'Certified Ready') certifiedCount += 1;
    else if (status === 'In Progress') inProgressCount += 1;
    else needsTrainingCount += 1;
  }

  let weakestModuleId: string | null = null;
  let lowestAvg = Infinity;
  for (const modId of moduleIds) {
    const modAvg =
      learners.reduce(
        (acc, l) => acc + calculateModuleCompletionPct(l.modules[modId]),
        0,
      ) / learners.length;
    if (modAvg < lowestAvg) {
      lowestAvg = modAvg;
      weakestModuleId = modId;
    }
  }

  return {
    totalLearners: learners.length,
    studentCount: learners.filter((l) => l.role === 'Student').length,
    teacherCount: learners.filter((l) => l.role === 'Teacher').length,
    avgCompletionPct: Math.round(completionSum / learners.length),
    certifiedCount,
    inProgressCount,
    needsTrainingCount,
    weakestModuleId,
  };
}

/**
 * Strips raw markdown bold/heading clutter into clean scannable lines for chat cards.
 */
export function cleanChatFormatting(raw: string): string {
  return raw
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^#{1,4}\s+/gm, '')
    .trim();
}
