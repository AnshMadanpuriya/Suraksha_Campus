import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLearnerOverallPct,
  calculateLearnerQuizAvg,
  calculateModuleCompletionPct,
  classifyLearnerStatus,
  cleanChatFormatting,
  computeCohortAnalytics,
  CORE_MODULE_IDS,
} from './learningTracker';
import type { LearnerProfile } from '../types';

test('calculateModuleCompletionPct sums lesson, drill, and quiz weights accurately', () => {
  assert.equal(calculateModuleCompletionPct(undefined), 0);
  assert.equal(
    calculateModuleCompletionPct({
      moduleId: 'mod-earthquake',
      lessonCompleted: true,
      drillCompleted: false,
      bestDrillScorePct: 0,
      quizCompleted: false,
      bestQuizScorePct: 0,
      lastActivityAt: '2026-11-20',
    }),
    30,
  );
  assert.equal(
    calculateModuleCompletionPct({
      moduleId: 'mod-earthquake',
      lessonCompleted: true,
      drillCompleted: true,
      bestDrillScorePct: 90,
      quizCompleted: true,
      bestQuizScorePct: 100,
      lastActivityAt: '2026-11-20',
    }),
    100,
  );
});

test('calculateLearnerOverallPct and classifyLearnerStatus work across all 4 modules', () => {
  const learner: LearnerProfile = {
    id: 'l1',
    name: 'Riya Deshmukh',
    role: 'Student',
    departmentOrClass: 'B.Tech CSE',
    modules: {
      'mod-earthquake': {
        moduleId: 'mod-earthquake',
        lessonCompleted: true,
        drillCompleted: true,
        bestDrillScorePct: 92,
        quizCompleted: true,
        bestQuizScorePct: 100,
        lastActivityAt: '2026-11-20',
      },
      'mod-fire': {
        moduleId: 'mod-fire',
        lessonCompleted: true,
        drillCompleted: true,
        bestDrillScorePct: 80,
        quizCompleted: false,
        bestQuizScorePct: 0,
        lastActivityAt: '2026-11-20',
      },
    },
  };

  // (100 + 65 + 0 + 0) / 4 = 41.25 -> 41%
  assert.equal(calculateLearnerOverallPct(learner, CORE_MODULE_IDS), 41);
  assert.equal(classifyLearnerStatus(41), 'In Progress');
  assert.equal(classifyLearnerStatus(85), 'Certified Ready');
  assert.equal(classifyLearnerStatus(20), 'Needs Training');
  assert.equal(calculateLearnerQuizAvg(learner, CORE_MODULE_IDS), 100);
});

test('computeCohortAnalytics aggregates certified counts and identifies weakest module', () => {
  const cohort: LearnerProfile[] = [
    {
      id: 's1',
      name: 'Student A',
      role: 'Student',
      departmentOrClass: 'Class 11',
      modules: {
        'mod-earthquake': {
          moduleId: 'mod-earthquake',
          lessonCompleted: true,
          drillCompleted: true,
          bestDrillScorePct: 90,
          quizCompleted: true,
          bestQuizScorePct: 100,
          lastActivityAt: '2026-11-20',
        },
        'mod-fire': {
          moduleId: 'mod-fire',
          lessonCompleted: true,
          drillCompleted: true,
          bestDrillScorePct: 85,
          quizCompleted: true,
          bestQuizScorePct: 90,
          lastActivityAt: '2026-11-20',
        },
        'mod-flood': {
          moduleId: 'mod-flood',
          lessonCompleted: true,
          drillCompleted: true,
          bestDrillScorePct: 80,
          quizCompleted: true,
          bestQuizScorePct: 80,
          lastActivityAt: '2026-11-20',
        },
        'mod-firstaid': {
          moduleId: 'mod-firstaid',
          lessonCompleted: true,
          drillCompleted: false,
          bestDrillScorePct: 0,
          quizCompleted: true,
          bestQuizScorePct: 70,
          lastActivityAt: '2026-11-20',
        },
      },
    },
    {
      id: 't1',
      name: 'Teacher B',
      role: 'Teacher',
      departmentOrClass: 'Physics',
      modules: {
        'mod-earthquake': {
          moduleId: 'mod-earthquake',
          lessonCompleted: true,
          drillCompleted: false,
          bestDrillScorePct: 0,
          quizCompleted: false,
          bestQuizScorePct: 0,
          lastActivityAt: '2026-11-20',
        },
      },
    },
  ];

  const stats = computeCohortAnalytics(cohort, CORE_MODULE_IDS);
  assert.equal(stats.totalLearners, 2);
  assert.equal(stats.studentCount, 1);
  assert.equal(stats.teacherCount, 1);
  assert.equal(stats.certifiedCount, 1);
  assert.equal(stats.needsTrainingCount, 1);
  assert.equal(stats.weakestModuleId, 'mod-firstaid');
});

test('cleanChatFormatting strips raw markdown markers cleanly', () => {
  assert.equal(cleanChatFormatting('### **Immediate Action**\n- Drop down'), 'Immediate Action\n- Drop down');
});
