import { useEffect, useState } from 'react';
import { CurriculumKitView } from './components/CurriculumKitView';
import { Navbar } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { RagChatbotView } from './components/RagChatbotView';
import { RolePortalsView } from './components/RolePortalsView';
import { VirtualDrillView } from './components/VirtualDrillView';
import type {
  AppView,
  AssessmentRecord,
  ClassroomChecklistItem,
  DrillRecord,
  HazardType,
  KnowledgeDoc,
  LearnerProfile,
  MedikitItem,
  PortalSection,
} from './types';
import { HAZARD_TO_MODULE_ID } from './utils/learningTracker';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return 'drills';
    const viewParam = params.get('view') as AppView | null;
    if (
      viewParam &&
      ['overview', 'drills', 'assistant', 'curriculum', 'portals'].includes(viewParam)
    ) {
      return viewParam;
    }
    if (params.get('view') === 'dashboard') return 'portals';
    return 'overview';
  });

  const [portalSection, setPortalSection] = useState<PortalSection>(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('portal') as PortalSection | null;
    if (p && ['student', 'teacher', 'admin'].includes(p)) return p;
    return 'student';
  });

  const [selectedHazard, setSelectedHazard] = useState<HazardType | undefined>(undefined);
  const [prefillAiPrompt, setPrefillAiPrompt] = useState<string | null>(null);

  const [drills, setDrills] = useState<DrillRecord[]>([]);
  const [medikit, setMedikit] = useState<MedikitItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [learners, setLearners] = useState<LearnerProfile[]>([]);
  const [checklists, setChecklists] = useState<ClassroomChecklistItem[]>([]);
  const [activeLearnerId, setActiveLearnerId] = useState<string>('learner-s1');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem('suraksha-theme') === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('suraksha-theme', theme);
  }, [theme]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [drillsRes, medikitRes, assessRes, sourcesRes, learningRes] = await Promise.all([
          fetch('/api/drills'),
          fetch('/api/medikit'),
          fetch('/api/assessments'),
          fetch('/api/rag/sources'),
          fetch('/api/learning'),
        ]);

        if (drillsRes.ok) {
          const d = await drillsRes.json();
          setDrills(d.drills || []);
        }
        if (medikitRes.ok) {
          const m = await medikitRes.json();
          setMedikit(m.items || []);
        }
        if (assessRes.ok) {
          const a = await assessRes.json();
          setAssessments(a.assessments || []);
        }
        if (sourcesRes.ok) {
          const s = await sourcesRes.json();
          setKnowledgeDocs(s.documents || []);
        }
        if (learningRes.ok) {
          const l = await learningRes.json();
          setLearners(l.learners || []);
          setChecklists(l.checklists || []);
          if (Array.isArray(l.learners) && l.learners.length > 0) {
            setActiveLearnerId(l.learners[0].id);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    void loadInitialData();
  }, []);

  async function syncLearnerProgress(payload: {
    learnerId?: string;
    moduleId: string;
    lessonCompleted?: boolean;
    drillCompleted?: boolean;
    drillScorePct?: number;
    quizCompleted?: boolean;
    quizScorePct?: number;
  }) {
    const targetId = payload.learnerId || activeLearnerId;
    if (!targetId) return;
    const resp = await fetch('/api/learning/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, learnerId: targetId }),
    });
    const data = await resp.json();
    if (resp.ok && data.learner) {
      setLearners((prev) =>
        prev.map((l) => (l.id === data.learner.id ? data.learner : l)),
      );
    }
  }

  function handleLaunchScenario(hazard: 'Earthquake' | 'Fire' | 'Flood') {
    setSelectedHazard(hazard);
    setActiveView('drills');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleAskAiAboutMistake(prompt: string) {
    setPrefillAiPrompt(prompt);
    setActiveView('assistant');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleOpenPortal(section: PortalSection) {
    setPortalSection(section);
    setActiveView('portals');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar
        activeView={activeView}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onNavigate={(view) => {
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <main className="flex-1">
        {loading ? (
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16 text-sm text-slate-500">
            Loading campus preparedness modules and learning tracking records...
          </div>
        ) : (
          <>
            {activeView === 'overview' && (
              <OverviewView
                drills={drills}
                medikit={medikit}
                learners={learners}
                indexedDocsCount={knowledgeDocs.length}
                onNavigate={setActiveView}
                onLaunchScenario={handleLaunchScenario}
                onOpenPortal={handleOpenPortal}
              />
            )}

            {activeView === 'drills' && (
              <VirtualDrillView
                initialHazard={selectedHazard}
                theme={theme}
                onDrillSaved={(record) => {
                  setDrills((prev) => [record, ...prev]);
                  const modId = HAZARD_TO_MODULE_ID[record.hazard];
                  if (modId) {
                    const pct =
                      record.maxScore > 0
                        ? Math.round((record.score / record.maxScore) * 100)
                        : 0;
                    void syncLearnerProgress({
                      moduleId: modId,
                      drillCompleted: true,
                      drillScorePct: pct,
                    });
                  }
                }}
                onAskAiAboutMistake={handleAskAiAboutMistake}
              />
            )}

            {activeView === 'assistant' && (
              <RagChatbotView
                knowledgeDocs={knowledgeDocs}
                medikit={medikit}
                prefillPrompt={prefillAiPrompt}
                onClearPrefill={() => setPrefillAiPrompt(null)}
              />
            )}

            {activeView === 'curriculum' && (
              <CurriculumKitView
                medikit={medikit}
                onUpdateMedikit={(updated) =>
                  setMedikit((prev) =>
                    prev.map((item) => (item.id === updated.id ? updated : item)),
                  )
                }
                onAssessmentSubmitted={(record) => {
                  setAssessments((prev) => [record, ...prev]);
                  const matchedLearner = learners.find(
                    (l) => l.name.toLowerCase() === record.participantName.toLowerCase(),
                  );
                  void syncLearnerProgress({
                    learnerId: matchedLearner?.id || activeLearnerId,
                    moduleId: record.moduleId,
                    lessonCompleted: true,
                    quizCompleted: true,
                    quizScorePct: record.percentage,
                  });
                }}
              />
            )}

            {activeView === 'portals' && (
              <RolePortalsView
                portalSection={portalSection}
                onChangePortalSection={setPortalSection}
                learners={learners}
                activeLearnerId={activeLearnerId}
                onSelectLearner={setActiveLearnerId}
                onLearnerUpdated={(updated) =>
                  setLearners((prev) =>
                    prev.map((l) => (l.id === updated.id ? updated : l)),
                  )
                }
                onLearnerCreated={(created) =>
                  setLearners((prev) => [created, ...prev])
                }
                checklists={checklists}
                onChecklistUpdated={(updated) =>
                  setChecklists((prev) =>
                    prev.map((c) => (c.id === updated.id ? updated : c)),
                  )
                }
                drills={drills}
                medikit={medikit}
                assessments={assessments}
                onDrillCreated={(record) => setDrills((prev) => [record, ...prev])}
                onDrillDeleted={(id) =>
                  setDrills((prev) => prev.filter((d) => d.id !== id))
                }
                onNavigate={setActiveView}
                onLaunchDrill={handleLaunchScenario}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>Suraksha Campus · Disaster Preparedness &amp; Response Education System</span>
          <span>Aligned with NDMA School Safety Policy &amp; Indian Red Cross First-Aid SOPs</span>
        </div>
      </footer>
    </div>
  );
}
