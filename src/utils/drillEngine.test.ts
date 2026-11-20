import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStepPoints,
  classifyReadinessGrade,
  computeCampusReadinessSummary,
  evaluateDrillSession,
  gradeCurriculumQuiz,
} from './drillEngine';
import type { DrillRecord, DrillStepResult, QuizQuestion } from '../types';

test('calculateStepPoints awards speed bonus only on optimal choice and clamps bounds', () => {
  assert.equal(calculateStepPoints(20, true, 0, 20), 30);
  assert.equal(calculateStepPoints(20, true, 10, 20), 25);
  assert.equal(calculateStepPoints(20, true, 25, 20), 20);
  assert.equal(calculateStepPoints(5, false, 1, 20), 5);
});

test('evaluateDrillSession computes grade and percentage accurately', () => {
  const results: DrillStepResult[] = [
    {
      stepId: 's1',
      phaseTitle: 'Drop Cover Hold',
      chosenLabel: 'Under desk',
      isOptimal: true,
      pointsEarned: 28,
      reactionSec: 4,
      feedback: 'Good',
    },
    {
      stepId: 's2',
      phaseTitle: 'Evacuation',
      chosenLabel: 'Staircase',
      isOptimal: true,
      pointsEarned: 26,
      reactionSec: 8,
      feedback: 'Good',
    },
  ];
  const summary = evaluateDrillSession(results, 20);
  assert.equal(summary.totalScore, 54);
  assert.equal(summary.maxScore, 60);
  assert.equal(summary.percentage, 90);
  assert.equal(summary.optimalCount, 2);
  assert.equal(summary.totalReactionSec, 12);
  assert.equal(summary.grade, 'Exemplary');
});

test('classifyReadinessGrade covers all threshold bands', () => {
  assert.equal(classifyReadinessGrade(90), 'Exemplary');
  assert.equal(classifyReadinessGrade(70), 'Prepared');
  assert.equal(classifyReadinessGrade(50), 'Needs Drill Practice');
  assert.equal(classifyReadinessGrade(20), 'Critical Risk');
});

test('gradeCurriculumQuiz scores answers and enforces 60% pass threshold', () => {
  const questions: QuizQuestion[] = [
    { id: 'q1', question: 'Q1', options: ['A', 'B'], correctIndex: 0, explanation: 'A' },
    { id: 'q2', question: 'Q2', options: ['A', 'B'], correctIndex: 1, explanation: 'B' },
    { id: 'q3', question: 'Q3', options: ['A', 'B'], correctIndex: 0, explanation: 'A' },
  ];
  const pass = gradeCurriculumQuiz(questions, { q1: 0, q2: 1, q3: 1 });
  assert.equal(pass.score, 2);
  assert.equal(pass.percentage, 67);
  assert.equal(pass.passed, true);

  const fail = gradeCurriculumQuiz(questions, { q1: 1, q2: 0, q3: 1 });
  assert.equal(fail.score, 0);
  assert.equal(fail.passed, false);
});

test('computeCampusReadinessSummary aggregates drill logs cleanly', () => {
  const logs: DrillRecord[] = [
    {
      id: '1',
      institutionName: 'Delhi Public College',
      blockName: 'Block A',
      hazard: 'Earthquake',
      scenarioTitle: 'Earthquake Drill',
      role: 'Teacher',
      participants: 120,
      evacuationSec: 90,
      score: 135,
      maxScore: 150,
      readinessGrade: 'Exemplary',
      completedAt: '2026-11-20T06:00:00Z',
      mode: 'Virtual Simulation',
    },
    {
      id: '2',
      institutionName: 'Delhi Public College',
      blockName: 'Chem Lab',
      hazard: 'Fire',
      scenarioTitle: 'Lab Fire Drill',
      role: 'Floor Warden',
      participants: 80,
      evacuationSec: 110,
      score: 120,
      maxScore: 150,
      readinessGrade: 'Prepared',
      completedAt: '2026-11-20T06:30:00Z',
      mode: 'Physical Campus Drill',
    },
  ];
  const agg = computeCampusReadinessSummary(logs);
  assert.equal(agg.totalDrills, 2);
  assert.equal(agg.totalParticipants, 200);
  assert.equal(agg.avgEvacuationSec, 100);
  assert.equal(agg.avgScorePct, 85);
  assert.equal(agg.hazardsCovered, 2);
});
