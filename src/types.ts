export type HazardType = 'Earthquake' | 'Fire' | 'Flood' | 'FirstAid';

export type UserRole = 'Student' | 'Teacher' | 'Floor Warden';

export type PortalSection = 'student' | 'teacher' | 'admin';

export type AppView = 'overview' | 'drills' | 'assistant' | 'curriculum' | 'portals';

export interface DrillChoice {
  id: string;
  label: string;
  isOptimal: boolean;
  points: number;
  feedback: string;
  nextZoneId: string;
  hazardDelta: number;
}

export interface DrillStep {
  id: string;
  phaseTitle: string;
  prompt: string;
  timeLimitSec: number;
  activeHazardLabel: string;
  choices: DrillChoice[];
}

export interface FloorplanZone {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'room' | 'corridor' | 'stairwell' | 'assembly' | 'utility';
}

export interface DrillScenario {
  id: string;
  hazard: HazardType;
  title: string;
  location: string;
  difficulty: 'Standard' | 'Elevated' | 'Critical';
  summary: string;
  ndmaRef: string;
  zones: FloorplanZone[];
  initialZoneId: string;
  steps: DrillStep[];
}

export interface DrillStepResult {
  stepId: string;
  phaseTitle: string;
  chosenLabel: string;
  isOptimal: boolean;
  pointsEarned: number;
  reactionSec: number;
  feedback: string;
}

export interface DrillRecord {
  id: string;
  institutionName: string;
  blockName: string;
  hazard: HazardType;
  scenarioTitle: string;
  role: UserRole;
  participants: number;
  evacuationSec: number;
  score: number;
  maxScore: number;
  readinessGrade: string;
  completedAt: string;
  mode: 'Virtual Simulation' | 'Physical Campus Drill';
}

export interface MedikitItem {
  id: string;
  name: string;
  category: 'Trauma & Bleeding' | 'Burns & Eye Care' | 'Fracture & Mobility' | 'Hydration & Triage';
  quantity: number;
  minRequired: number;
  status: 'Stocked' | 'Low Stock' | 'Needs Restock';
  useForMinor: string;
  useForMajor: string;
  improvisedAlternative: string;
  lastChecked: string;
}

export interface KnowledgeDoc {
  id: string;
  category: string;
  title: string;
  source: string;
  severity: string;
  score?: number;
  content: string;
  real_time_steps: string[];
  medikit_items: string[];
  improvised_sources: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CurriculumModule {
  id: string;
  hazard: HazardType;
  title: string;
  ndmaCode: string;
  imagePath: string;
  overview: string;
  duringSteps: string[];
  afterSteps: string[];
  minorInjuryGuide: string;
  majorInjuryGuide: string;
  improvisedResources: string[];
  quiz: QuizQuestion[];
}

export interface AssessmentRecord {
  id: string;
  moduleId: string;
  moduleTitle: string;
  participantName: string;
  role: UserRole;
  score: number;
  total: number;
  percentage: number;
  submittedAt: string;
}

export interface ModuleProgress {
  moduleId: string;
  lessonCompleted: boolean;
  drillCompleted: boolean;
  bestDrillScorePct: number;
  quizCompleted: boolean;
  bestQuizScorePct: number;
  lastActivityAt: string;
}

export interface LearnerProfile {
  id: string;
  name: string;
  role: 'Student' | 'Teacher';
  departmentOrClass: string;
  modules: Record<string, ModuleProgress>;
}

export interface ClassroomChecklistItem {
  id: string;
  title: string;
  block: string;
  assignedTeacher: string;
  completed: boolean;
  updatedAt: string;
}
