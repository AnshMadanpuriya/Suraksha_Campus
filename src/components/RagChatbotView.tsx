import {
  AlertTriangle,
  BookMarked,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  RotateCcw,
  Search,
  Send,
  ShieldPlus,
  User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { KnowledgeDoc, MedikitItem, UserRole } from '../types';
import { cleanChatFormatting } from '../utils/learningTracker';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  roleContext?: UserRole;
  sources?: KnowledgeDoc[];
  isPartialNotice?: boolean;
}

interface RagChatbotViewProps {
  knowledgeDocs: KnowledgeDoc[];
  medikit: MedikitItem[];
  prefillPrompt?: string | null;
  onClearPrefill?: () => void;
}

const TOPIC_FILTERS = [
  { id: '', label: 'All Hazards' },
  { id: 'Earthquake', label: 'Earthquake' },
  { id: 'Fire', label: 'Fire & Smoke' },
  { id: 'Flood', label: 'Monsoon Flood' },
  { id: 'FirstAid', label: 'First-Aid & Medikit' },
];

const QUICK_PROMPTS: Array<{ label: string; category: string; query: string }> = [
  {
    label: 'Earthquake + Heavy Bleeding',
    category: 'Earthquake',
    query:
      'An earthquake just hit our classroom and a student has a deep leg wound with heavy bleeding. What should we do in real time, which medikit items should we use, and what classroom substitutes work if a medikit is unavailable?',
  },
  {
    label: 'Lab Fire + Minor Burn',
    category: 'Fire',
    query:
      'An electrical short circuit caused a fire in the chemistry lab and a student suffered a minor hand burn. What are the real-time fire safety steps and medikit first-aid treatment?',
  },
  {
    label: 'Flood + Snakebite & Cutoff',
    category: 'Flood',
    query:
      'Monsoon floodwater is entering the ground floor and someone was bitten by a snake. What are the electrical cutoff steps and snakebite first-aid protocol?',
  },
  {
    label: 'Fracture / Unconscious (No Medikit)',
    category: 'FirstAid',
    query:
      'A student fainted in the stairwell and appears to have an arm fracture. How do we triage minor vs. major injuries if a medikit is not nearby?',
  },
];

const INITIAL_MESSAGE = (docs: KnowledgeDoc[]): ChatMessage => ({
  id: 'welcome-1',
  sender: 'assistant',
  text: 'Welcome! I am the Suraksha Campus Safety & First-Aid Assistant.\n\nAsk any emergency question—for example, what to do during an earthquake, fire, or flood, how to treat minor vs. major injuries, which medikit items to apply, or safe classroom substitutes if a medikit is unavailable. I will provide clear, step-by-step guidance in English.',
  sources: docs.slice(0, 2),
});

export function RagChatbotView({
  knowledgeDocs,
  medikit,
  prefillPrompt,
  onClearPrefill,
}: RagChatbotViewProps) {
  const [role, setRole] = useState<UserRole>('Student');
  const [topicCategory, setTopicCategory] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [kbSearch, setKbSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSourcesId, setExpandedSourcesId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    INITIAL_MESSAGE(knowledgeDocs),
  ]);

  const scrollBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefillPrompt) {
      setInput(prefillPrompt);
      onClearPrefill?.();
    }
  }, [prefillPrompt, onClearPrefill]);

  useEffect(() => {
    const el = scrollBoxRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  async function submitQuery(queryText: string, overrideCategory?: string) {
    const trimmed = queryText.trim();
    if (!trimmed || loading) return;

    const activeCategory = overrideCategory !== undefined ? overrideCategory : topicCategory;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      roleContext: role,
    };

    const historyPayload = messages
      .filter((m) => !m.isPartialNotice && m.id !== 'welcome-1')
      .map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        text: m.text,
      }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          role,
          category: activeCategory,
          history: historyPayload,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        const retrieved = Array.isArray(data.retrievedSources)
          ? (data.retrievedSources as KnowledgeDoc[])
          : [];
        const errId = `err-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: errId,
            sender: 'assistant',
            text:
              data.error ||
              'Live advisory service is briefly busy. Verified NDMA emergency steps and medikit guidance are attached below.',
            sources: retrieved,
            isPartialNotice: true,
          },
        ]);
        if (retrieved.length > 0) {
          setExpandedSourcesId(errId);
        }
        return;
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: cleanChatFormatting(data.answer || ''),
        sources: data.retrievedSources || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `Connection error: ${(err as Error).message}. Please ensure the server is running.`,
          isPartialNotice: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitQuery(input);
  }

  function handleCopy(msg: ChatMessage) {
    void navigator.clipboard?.writeText(msg.text);
    setCopiedId(msg.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  }

  const filteredKb = knowledgeDocs.filter((doc) => {
    const matchesCat =
      !topicCategory || doc.category.toLowerCase().includes(topicCategory.toLowerCase());
    const q = kbSearch.trim().toLowerCase();
    const matchesText =
      !q ||
      doc.title.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      doc.content.toLowerCase().includes(q) ||
      doc.medikit_items.some((i) => i.toLowerCase().includes(q));
    return matchesCat && matchesText;
  });

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header & Role Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Campus Safety &amp; First-Aid Assistant
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Grounded in {knowledgeDocs.length} NDMA School Safety, NBC Fire &amp; Indian Red Cross
            SOPs (English Responses)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            {(['Student', 'Teacher', 'Floor Warden'] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  role === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMessages([INITIAL_MESSAGE(knowledgeDocs)])}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Enhanced Chat UI (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl flex flex-col h-[700px]">
          {/* Topic Filter & Quick Prompts Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {TOPIC_FILTERS.map((tf) => (
                <button
                  key={tf.id || 'all'}
                  type="button"
                  onClick={() => setTopicCategory(tf.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    topicCategory === tf.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setTopicCategory(qp.category);
                    void submitQuery(qp.query, qp.category);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-sky-900 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Stream */}
          <div
            ref={scrollBoxRef}
            data-testid="rag-chat-messages"
            className="flex-1 overflow-y-auto p-5 space-y-5 bg-white"
          >
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar Icon */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
                      isUser
                        ? 'bg-slate-900 text-white'
                        : 'bg-sky-100 text-sky-800 border border-sky-200'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble + SOP Cards */}
                  <div
                    className={`flex flex-col max-w-[88%] ${
                      isUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <span className="font-medium text-slate-700">
                        {isUser ? `${msg.roleContext || role}` : 'Suraksha Safety Assistant'}
                      </span>
                    </div>

                    <div
                      className={`rounded-xl px-4 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-slate-900 text-white'
                          : msg.isPartialNotice
                            ? 'bg-amber-50 border border-amber-200 text-amber-950'
                            : 'bg-slate-50 border border-slate-200 text-slate-900'
                      }`}
                    >
                      {msg.isPartialNotice && (
                        <div className="flex items-center gap-1.5 font-semibold text-amber-900 mb-1.5 text-xs">
                          <AlertTriangle className="w-4 h-4" />
                          Verified NDMA &amp; First-Aid Protocol Reference
                        </div>
                      )}
                      {msg.text}

                      {!isUser && !msg.isPartialNotice && (
                        <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            Helplines: 112 (Emergency) · 108 (Ambulance) · 101 (Fire)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(msg)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-700" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Cited NDMA & First-Aid Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 w-full">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSourcesId((cur) => (cur === msg.id ? null : msg.id))
                          }
                          aria-expanded={expandedSourcesId === msg.id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer"
                        >
                          <BookMarked className="w-3.5 h-3.5" />
                          {expandedSourcesId === msg.id
                            ? 'Hide Retrieved NDMA & First-Aid Sources'
                            : `View ${msg.sources.length} Retrieved SOP Sources`}
                          {expandedSourcesId === msg.id ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {expandedSourcesId === msg.id && (
                          <div className="mt-2 space-y-2.5">
                            {msg.sources.map((src) => (
                              <div
                                key={src.id}
                                className="p-3.5 rounded-lg border border-slate-200 bg-white text-xs space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2 font-semibold text-slate-900">
                                  <span>
                                    [{src.id}] {src.title}
                                  </span>
                                  <span className="text-slate-500 font-medium">
                                    {src.severity} Priority
                                  </span>
                                </div>
                                <p className="text-slate-600">{src.source}</p>
                                {src.real_time_steps?.length > 0 && (
                                  <div>
                                    <span className="font-semibold text-slate-800">
                                      Immediate Steps:{' '}
                                    </span>
                                    <span className="text-slate-700">
                                      {src.real_time_steps.join(' → ')}
                                    </span>
                                  </div>
                                )}
                                <p className="text-slate-700">
                                  <span className="font-semibold text-slate-800">Medikit: </span>
                                  {src.medikit_items.join(', ')}
                                </p>
                                <p className="text-slate-700">
                                  <span className="font-semibold text-slate-800">
                                    Classroom Substitutes:{' '}
                                  </span>
                                  {src.improvised_sources.join(' · ')}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 border border-sky-200 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="rounded-xl px-4 py-3 bg-slate-50 border border-slate-200 text-sm text-slate-600">
                  Checking NDMA safety protocols and first-aid guidance...
                </div>
              </div>
            )}
          </div>

          {/* Input Composer */}
          <form
            onSubmit={handleFormSubmit}
            className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl"
          >
            <label htmlFor="rag-query-input" className="sr-only">
              Ask a disaster preparedness or first-aid question
            </label>
            <div className="flex items-center gap-2">
              <input
                id="rag-query-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about earthquake, fire, flood, or first-aid medikit steps..."
                className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
              />
              <button
                type="submit"
                disabled={loading || input.trim().length < 2}
                aria-label="Send query"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT: Indexed SOP Corpus & Medikit Stock Quick Reference (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Indexed NDMA &amp; Trauma Knowledge Base
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {filteredKb.length} SOPs
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <label htmlFor="kb-search-input" className="sr-only">
                Search indexed disaster safety SOPs
              </label>
              <input
                id="kb-search-input"
                type="text"
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                placeholder="Filter SOPs (bleeding, burn, snakebite, flood)..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
              />
            </div>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {filteredKb.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-700">{doc.id}</span>
                    <span>
                      {doc.category} · {doc.severity}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{doc.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{doc.content}</p>
                  <button
                    type="button"
                    onClick={() =>
                      void submitQuery(
                        `Explain ${doc.title} (${doc.id}): exact real-time steps, minor vs major injury care, medikit items, and classroom alternatives.`,
                      )
                    }
                    className="text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer pt-1"
                  >
                    Get Protocol Guidance
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldPlus className="w-4 h-4 text-sky-700" />
              Campus Medikit &amp; Improvised Sources
            </h2>
            <div className="divide-y divide-slate-200 max-h-[240px] overflow-y-auto pr-1">
              {medikit.slice(0, 5).map((item) => (
                <div key={item.id} className="py-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>{item.name}</span>
                    <span className="font-mono tabular-nums text-slate-600">
                      Qty {item.quantity}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-800">Substitute:</span>{' '}
                    {item.improvisedAlternative}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
