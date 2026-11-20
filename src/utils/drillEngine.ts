import type { DrillRecord, DrillStepResult, QuizQuestion } from '../types';

export type ReadinessGrade =
  | 'Exemplary'
  | 'Prepared'
  | 'Needs Drill Practice'
  | 'Critical Risk';

/**
 * Computes reaction time bonus (0..10 pts) for an optimal decision made quickly.
 * Clamped so negative or stale timers never produce invalid scores.
 */
export function calculateStepPoints(
  basePoints: number,
  isOptimal: boolean,
  reactionSec: number,
  timeLimitSec: number,
): number {
  const safeBase = Math.max(0, basePoints);
  if (!isOptimal) {
    return safeBase;
  }
  const safeLimit = Math.max(1, timeLimitSec);
  const clampedReaction = Math.min(Math.max(0, reactionSec), safeLimit);
  const remainingRatio = (safeLimit - clampedReaction) / safeLimit;
  const speedBonus = Math.round(remainingRatio * 10);
  return safeBase + speedBonus;
}

/**
 * Evaluates a completed drill session and returns total score, max possible score,
 * percentage (0..100), and NDMA readiness grade.
 */
export function evaluateDrillSession(
  results: DrillStepResult[],
  maxBasePointsPerStep: number = 20,
): {
  totalScore: number;
  maxScore: number;
  percentage: number;
  optimalCount: number;
  totalReactionSec: number;
  grade: ReadinessGrade;
} {
  if (results.length === 0) {
    return {
      totalScore: 0,
      maxScore: 0,
      percentage: 0,
      optimalCount: 0,
      totalReactionSec: 0,
      grade: 'Critical Risk',
    };
  }

  const maxScore = results.length * (maxBasePointsPerStep + 10);
  const totalScore = Math.min(
    maxScore,
    results.reduce((acc, r) => acc + Math.max(0, r.pointsEarned), 0),
  );
  const optimalCount = results.filter((r) => r.isOptimal).length;
  const totalReactionSec = Math.round(
    results.reduce((acc, r) => acc + Math.max(0, r.reactionSec), 0),
  );
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return {
    totalScore,
    maxScore,
    percentage,
    optimalCount,
    totalReactionSec,
    grade: classifyReadinessGrade(percentage),
  };
}

export function classifyReadinessGrade(percentage: number): ReadinessGrade {
  if (percentage >= 85) return 'Exemplary';
  if (percentage >= 65) return 'Prepared';
  if (percentage >= 45) return 'Needs Drill Practice';
  return 'Critical Risk';
}

/**
 * Grades a curriculum quiz deterministically.
 */
export function gradeCurriculumQuiz(
  questions: QuizQuestion[],
  selectedAnswers: Record<string, number>,
): {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
} {
  if (questions.length === 0) {
    return { score: 0, total: 0, percentage: 0, passed: false };
  }
  let score = 0;
  for (const q of questions) {
    if (selectedAnswers[q.id] === q.correctIndex) {
      score += 1;
    }
  }
  const percentage = Math.round((score / questions.length) * 100);
  return {
    score,
    total: questions.length,
    percentage,
    passed: percentage >= 60,
  };
}

/**
 * Aggregates persistent campus drill logs into dashboard KPI metrics.
 */
export function computeCampusReadinessSummary(records: DrillRecord[]): {
  totalDrills: number;
  totalParticipants: number;
  avgEvacuationSec: number;
  avgScorePct: number;
  hazardsCovered: number;
} {
  if (records.length === 0) {
    return {
      totalDrills: 0,
      totalParticipants: 0,
      avgEvacuationSec: 0,
      avgScorePct: 0,
      hazardsCovered: 0,
    };
  }

  const totalParticipants = records.reduce((sum, r) => sum + Math.max(0, r.participants), 0);
  const avgEvacuationSec = Math.round(
    records.reduce((sum, r) => sum + Math.max(0, r.evacuationSec), 0) / records.length,
  );
  const pctSum = records.reduce((sum, r) => {
    const pct = r.maxScore > 0 ? (r.score / r.maxScore) * 100 : 0;
    return sum + Math.min(100, Math.max(0, pct));
  }, 0);
  const avgScorePct = Math.round(pctSum / records.length);
  const hazardsCovered = new Set(records.map((r) => r.hazard)).size;

  return {
    totalDrills: records.length,
    totalParticipants,
    avgEvacuationSec,
    avgScorePct,
    hazardsCovered,
  };
}
