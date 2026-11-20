import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeterministicEnglishFallback,
  buildGroundedRagPrompt,
  validateRagQueryInput,
} from './ragHelper';
import type { KnowledgeDoc } from '../src/types';

test('validateRagQueryInput rejects empty or oversized queries and normalizes role', () => {
  assert.equal(validateRagQueryInput(null).valid, false);
  assert.equal(validateRagQueryInput({ query: ' ' }).valid, false);
  assert.equal(validateRagQueryInput({ query: 'a'.repeat(1001) }).valid, false);

  const ok = validateRagQueryInput({ query: 'Bhukamp me chot lagi hai', role: 'Teacher' });
  assert.equal(ok.valid, true);
  assert.equal(ok.role, 'Teacher');

  const fallbackRole = validateRagQueryInput({ query: 'Fire alarm', role: 'Unknown' });
  assert.equal(fallbackRole.valid, true);
  assert.equal(fallbackRole.role, 'Student');
});

test('buildGroundedRagPrompt embeds retrieved citations, medikit items, and improvised sources', () => {
  const docs: KnowledgeDoc[] = [
    {
      id: 'FIRSTAID-MAJOR-01',
      category: 'FirstAid_Major',
      title: 'Severe Bleeding Control',
      source: 'Indian Red Cross',
      severity: 'Critical',
      content: 'Apply firm direct pressure.',
      real_time_steps: ['Call 108', 'Press sterile gauze'],
      medikit_items: ['Trauma dressing', 'Gloves'],
      improvised_sources: ['Clean folded cotton shirt'],
    },
  ];
  const built = buildGroundedRagPrompt({
    query: 'Classroom me jyada khoon beh raha hai',
    role: 'Floor Warden',
    retrievedDocs: docs,
  });

  assert.match(built.systemInstruction, /Floor Warden/);
  assert.match(built.systemInstruction, /ALWAYS respond strictly in clear, concise, authoritative English/);
  assert.match(built.userPrompt, /FIRSTAID-MAJOR-01/);
  assert.match(built.userPrompt, /Clean folded cotton shirt/);
});

test('buildDeterministicEnglishFallback produces clean English steps and medikit guidance', () => {
  const docs: KnowledgeDoc[] = [
    {
      id: 'NDMA-EQ-01',
      category: 'Earthquake',
      title: 'Drop, Cover, Hold On',
      source: 'NDMA Guidelines',
      severity: 'Critical',
      content: 'Take cover under a sturdy desk.',
      real_time_steps: ['Drop to hands and knees', 'Hold onto desk leg'],
      medikit_items: ['Sterile gauze'],
      improvised_sources: ['Clean cotton handkerchief'],
    },
  ];
  const output = buildDeterministicEnglishFallback({ role: 'Student', retrievedDocs: docs });
  assert.match(output, /Immediate Real-Time Action:/);
  assert.match(output, /NDMA-EQ-01/);
  assert.match(output, /Sterile gauze/);
  assert.match(output, /Clean cotton handkerchief/);
});
