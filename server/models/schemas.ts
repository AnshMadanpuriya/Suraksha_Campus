/**
 * MERN-compatible Data Models for Suraksha Campus.
 * These TypeScript schemas mirror standard MongoDB/Mongoose document structures
 * so the application works identically with the built-in persistent JSON store
 * or an external MongoDB cluster when MONGODB_URI is configured.
 */

export const DrillRecordSchemaSpec = {
  collection: 'drill_records',
  fields: {
    id: 'string (UUID)',
    institutionName: 'string (required)',
    blockName: 'string (required)',
    hazard: 'Earthquake | Fire | Flood | FirstAid',
    scenarioTitle: 'string',
    role: 'Student | Teacher | Floor Warden',
    participants: 'number (min 1)',
    evacuationSec: 'number (min 1)',
    score: 'number',
    maxScore: 'number',
    readinessGrade: 'Exemplary | Prepared | Needs Drill Practice | Critical Risk',
    completedAt: 'ISO-8601 Date string',
    mode: 'Virtual Simulation | Physical Campus Drill',
  },
} as const;

export const MedikitItemSchemaSpec = {
  collection: 'medikit_inventory',
  fields: {
    id: 'string',
    name: 'string',
    category: 'string',
    quantity: 'number',
    minRequired: 'number',
    status: 'Stocked | Low Stock | Needs Restock',
    useForMinor: 'string',
    useForMajor: 'string',
    improvisedAlternative: 'string',
    lastChecked: 'ISO-8601 Date string',
  },
} as const;

export const AssessmentSchemaSpec = {
  collection: 'curriculum_assessments',
  fields: {
    id: 'string',
    moduleId: 'string',
    moduleTitle: 'string',
    participantName: 'string',
    role: 'Student | Teacher | Floor Warden',
    score: 'number',
    total: 'number',
    percentage: 'number',
    submittedAt: 'ISO-8601 Date string',
  },
} as const;
