import type { KnowledgeDoc, UserRole } from '../src/types';

/**
 * Formats retrieved Python RAG knowledge chunks into a grounded context block
 * for Gemini generation, explicitly emphasizing real-time safety, minor vs.
 * major injury triage, medikit items, and improvised classroom/campus sources.
 */
export function buildGroundedRagPrompt(params: {
  query: string;
  role: UserRole;
  retrievedDocs: KnowledgeDoc[];
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
}): { systemInstruction: string; userPrompt: string } {
  const { query, role, retrievedDocs, history = [] } = params;

  const contextBlock = retrievedDocs
    .map((doc, idx) => {
      return [
        `[Source ${idx + 1}: ${doc.id} | ${doc.title} — ${doc.source}]`,
        `Severity: ${doc.severity} | Category: ${doc.category}`,
        `Protocol: ${doc.content}`,
        `Real-time steps: ${doc.real_time_steps.join(' -> ')}`,
        `Medikit items: ${doc.medikit_items.join(', ')}`,
        `Improvised campus alternatives: ${doc.improvised_sources.join('; ')}`,
      ].join('\n');
    })
    .join('\n\n');

  const historyBlock =
    history.length > 0
      ? history
          .slice(-6)
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
          .join('\n')
      : 'None';

  const systemInstruction = [
    'You are Suraksha Campus Safety & First-Aid Assistant, an authoritative Indian School & College Disaster Preparedness, Evacuation, and First-Aid Trauma Advisor.',
    `The user asking is a ${role} in an Indian school or college.`,
    'Rules:',
    '1. Ground your answer strictly in the provided Retrieved SOP Context below. Cite source IDs inline like [NDMA-EQ-01] or [FIRSTAID-MAJOR-01].',
    '2. Language requirement: ALWAYS respond strictly in clear, concise, authoritative English—even if the user writes their question in Hindi, Hinglish, or another language. Understand Hindi/Hinglish emergency terms (such as bhukamp, aag, baadh, chot, khoon) accurately, and deliver the entire response in English.',
    '3. Structure every emergency response cleanly with short scannable sections (no excessive markdown clutter):',
    '   - Immediate Real-Time Action (what to do right now in seconds)',
    '   - Injury Triage: Minor vs. Major Injury (mild cuts/burns vs. heavy bleeding, fractures, or unconsciousness) whenever injury or trauma is relevant',
    '   - Medikit Items & Improvised Campus Sources (what to pick from the campus medikit, plus safe everyday classroom/hostel substitutes if a medikit is not immediately reachable)',
    '   - What NOT to Do & Indian Emergency Helplines (112, 108, 101, 1070) when severe.',
    '4. Never invent unsafe folk remedies (explicitly warn against toothpaste/ice/butter on burns, cutting snakebites, or moving suspected spinal injuries).',
  ].join('\n');

  const userPrompt = [
    'RETRIEVED SOP CONTEXT:',
    contextBlock || 'No specific chunk matched; use standard NDMA & Red Cross emergency safety principles and advise dialing 112/108.',
    '',
    'RECENT CONVERSATION:',
    historyBlock,
    '',
    `CURRENT USER QUERY (${role}): ${query.trim()}`,
  ].join('\n');

  return { systemInstruction, userPrompt };
}

/**
 * Validates incoming RAG query payloads safely.
 */
export function validateRagQueryInput(body: unknown): {
  valid: boolean;
  query: string;
  role: UserRole;
  category: string;
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, query: '', role: 'Student', category: '', error: 'Request body must be a JSON object.' };
  }
  const obj = body as Record<string, unknown>;
  const query = typeof obj.query === 'string' ? obj.query.trim() : '';
  if (query.length < 2) {
    return { valid: false, query: '', role: 'Student', category: '', error: 'Please enter a disaster safety or first-aid question.' };
  }
  if (query.length > 1000) {
    return { valid: false, query: '', role: 'Student', category: '', error: 'Query exceeds 1000 character limit.' };
  }
  const rawRole = obj.role;
  const role: UserRole =
    rawRole === 'Teacher' || rawRole === 'Floor Warden' ? rawRole : 'Student';
  const category = typeof obj.category === 'string' ? obj.category.trim() : '';
  return { valid: true, query, role, category };
}

/**
 * Formats retrieved SOPs into a clear, structured English emergency response
 * whenever upstream synthesis is temporarily unavailable.
 */
export function buildDeterministicEnglishFallback(params: {
  role: UserRole;
  retrievedDocs: KnowledgeDoc[];
}): string {
  const { role, retrievedDocs } = params;
  if (!retrievedDocs.length) {
    return [
      `Guidance for ${role}:`,
      '',
      'Immediate Real-Time Action:',
      '- Stay calm, move to an open safe area away from hazards, and alert campus staff immediately.',
      '- Call 112 (Unified Emergency), 108 (Ambulance), or 101 (Fire Brigade) if anyone is injured or trapped.',
    ].join('\n');
  }

  const primary = retrievedDocs[0];
  const secondary = retrievedDocs[1];
  const lines: string[] = [
    `Based on ${primary.source} [${primary.id}], follow these steps in English (${role} Guidance):`,
    '',
    'Immediate Real-Time Action:',
    ...primary.real_time_steps.map((step, i) => `${i + 1}. ${step}`),
  ];

  if (secondary && secondary.real_time_steps.length > 0) {
    lines.push('');
    lines.push(`Additional Protocol (${secondary.title} [${secondary.id}]):`);
    secondary.real_time_steps.slice(0, 3).forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`);
    });
  }

  const medikitList = Array.from(
    new Set(retrievedDocs.slice(0, 2).flatMap((d) => d.medikit_items)),
  );
  const substituteList = Array.from(
    new Set(retrievedDocs.slice(0, 2).flatMap((d) => d.improvised_sources)),
  );

  if (medikitList.length > 0) {
    lines.push('');
    lines.push(`Campus Medikit Items: ${medikitList.join(', ')}`);
  }
  if (substituteList.length > 0) {
    lines.push(`Classroom Substitutes (if medikit unavailable): ${substituteList.join('; ')}`);
  }

  lines.push('');
  lines.push('Emergency Helplines: 112 (Emergency) · 108 (Ambulance) · 101 (Fire) · 1070 (Disaster)');

  return lines.join('\n');
}
