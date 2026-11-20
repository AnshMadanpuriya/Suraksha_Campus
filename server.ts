import { spawn } from 'child_process';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { readDatabase, writeDatabase } from './server/db';
import {
  buildDeterministicEnglishFallback,
  buildGroundedRagPrompt,
  validateRagQueryInput,
} from './server/ragHelper';
import type {
  AssessmentRecord,
  DrillRecord,
  KnowledgeDoc,
  LearnerProfile,
  ModuleProgress,
} from './src/types';

dotenv.config();

const PORT = 3000;

interface PythonRagResponse {
  engine: string;
  expanded_tokens: string[];
  total_indexed_docs: number;
  matches: KnowledgeDoc[];
}

async function retrieveViaPython(
  query: string,
  topK: number = 4,
  category: string = '',
): Promise<PythonRagResponse> {
  const externalUrl = process.env.PYTHON_RAG_URL?.trim();
  if (externalUrl) {
    const resp = await fetch(externalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: topK, category }),
    });
    if (!resp.ok) {
      throw new Error(`Python RAG service returned HTTP ${resp.status}`);
    }
    return (await resp.json()) as PythonRagResponse;
  }

  const scriptPath = path.resolve(process.cwd(), 'python', 'rag_retriever.py');
  const kbPath = path.resolve(process.cwd(), 'data', 'knowledge_base.json');
  const payload = JSON.stringify({ query, top_k: topK, category, kb_path: kbPath });

  return new Promise((resolve, reject) => {
    const py = spawn('python3', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    py.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    py.on('error', (err) => reject(err));
    py.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python RAG retriever exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as PythonRagResponse);
      } catch (err) {
        reject(new Error(`Invalid JSON from Python RAG retriever: ${(err as Error).message}`));
      }
    });

    py.stdin.write(payload);
    py.stdin.end();
  });
}

async function generateWithTimeoutAndFallback(
  ai: GoogleGenAI,
  systemInstruction: string,
  userPrompt: string,
): Promise<{ text: string; modelUsed: string }> {
  const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let lastError: unknown;

  for (const modelName of candidateModels) {
    try {
      const result = await Promise.race([
        ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: { systemInstruction },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${modelName} request timed out after 10s`)), 10000),
        ),
      ]);

      const text = result.text?.trim();
      if (text) {
        return { text, modelUsed: modelName };
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All Gemini models failed to respond');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // 1. Health & Architecture Check
  app.get('/api/health', (_req, res) => {
    const kbPath = path.resolve(process.cwd(), 'data', 'knowledge_base.json');
    let indexedDocs = 0;
    try {
      const raw = fs.readFileSync(kbPath, 'utf-8');
      indexedDocs = (JSON.parse(raw) as unknown[]).length;
    } catch {
      indexedDocs = 0;
    }
    res.json({
      status: 'ok',
      service: 'Suraksha Campus Full-Stack Server',
      storageMode: process.env.MONGODB_URI ? 'MongoDB + Local Cache' : 'Persistent JSON Store',
      ragEngine: 'Python 3 BM25 Bilingual Retriever + Gemini',
      indexedDocs,
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
      ),
    });
  });

  // 2. Knowledge Base Inspection
  app.get('/api/rag/sources', (_req, res) => {
    try {
      const kbPath = path.resolve(process.cwd(), 'data', 'knowledge_base.json');
      const docs = JSON.parse(fs.readFileSync(kbPath, 'utf-8')) as KnowledgeDoc[];
      res.json({ total: docs.length, documents: docs });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // 3. Pure Python RAG Retrieval
  app.post('/api/rag/retrieve', async (req, res) => {
    const validation = validateRagQueryInput(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }
    try {
      const rag = await retrieveViaPython(validation.query, 4, validation.category);
      res.json(rag);
    } catch (error) {
      res.status(500).json({ error: `Python RAG retrieval failed: ${(error as Error).message}` });
    }
  });

  // 4. Full RAG AI Chatbot Endpoint (Python BM25 + Gemini with model fallback)
  app.post('/api/rag/query', async (req, res) => {
    const validation = validateRagQueryInput(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const rawHistory = Array.isArray((req.body as Record<string, unknown>)?.history)
      ? ((req.body as Record<string, unknown>).history as Array<{ role: 'user' | 'assistant'; text: string }>)
      : [];

    let ragResult: PythonRagResponse;
    try {
      ragResult = await retrieveViaPython(validation.query, 4, validation.category);
    } catch (error) {
      res.status(500).json({ error: `Python RAG retrieval error: ${(error as Error).message}` });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error: 'Gemini API key is not configured on the server. Please configure GEMINI_API_KEY in Settings > Secrets.',
        retrievedSources: ragResult.matches,
        engine: ragResult.engine,
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const { systemInstruction, userPrompt } = buildGroundedRagPrompt({
        query: validation.query,
        role: validation.role,
        retrievedDocs: ragResult.matches,
        history: rawHistory,
      });

      const { text, modelUsed } = await generateWithTimeoutAndFallback(
        ai,
        systemInstruction,
        userPrompt,
      );

      res.json({
        answer: text,
        engine: `${ragResult.engine} + ${modelUsed}`,
        expandedTokens: ragResult.expanded_tokens.slice(0, 18),
        retrievedSources: ragResult.matches,
      });
    } catch {
      const fallbackAnswer = buildDeterministicEnglishFallback({
        role: validation.role,
        retrievedDocs: ragResult.matches,
      });
      res.json({
        answer: fallbackAnswer,
        engine: ragResult.engine,
        expandedTokens: ragResult.expanded_tokens.slice(0, 18),
        retrievedSources: ragResult.matches,
      });
    }
  });

  // 5. Persistent Drill Logs CRUD
  app.get('/api/drills', (_req, res) => {
    const db = readDatabase();
    res.json({ drills: db.drills });
  });

  app.post('/api/drills', (req, res) => {
    const body = req.body as Partial<DrillRecord>;
    if (
      !body.institutionName?.trim() ||
      !body.blockName?.trim() ||
      !body.hazard ||
      !body.scenarioTitle?.trim()
    ) {
      res.status(400).json({ error: 'Institution name, block name, hazard type, and scenario title are required.' });
      return;
    }

    const participants = Math.max(1, Number(body.participants) || 1);
    const evacuationSec = Math.max(1, Number(body.evacuationSec) || 60);
    const score = Math.max(0, Number(body.score) || 0);
    const maxScore = Math.max(1, Number(body.maxScore) || 150);

    const record: DrillRecord = {
      id: `drill-${Date.now()}`,
      institutionName: body.institutionName.trim(),
      blockName: body.blockName.trim(),
      hazard: body.hazard,
      scenarioTitle: body.scenarioTitle.trim(),
      role: body.role || 'Teacher',
      participants,
      evacuationSec,
      score,
      maxScore,
      readinessGrade: body.readinessGrade || 'Prepared',
      completedAt: new Date().toISOString(),
      mode: body.mode || 'Virtual Simulation',
    };

    const db = readDatabase();
    db.drills.unshift(record);
    writeDatabase(db);
    res.status(201).json({ drill: record });
  });

  app.delete('/api/drills/:id', (req, res) => {
    const { id } = req.params;
    const db = readDatabase();
    const before = db.drills.length;
    db.drills = db.drills.filter((d) => d.id !== id);
    if (db.drills.length === before) {
      res.status(404).json({ error: 'Drill record not found.' });
      return;
    }
    writeDatabase(db);
    res.json({ deletedId: id });
  });

  // 6. Campus Medikit Inventory
  app.get('/api/medikit', (_req, res) => {
    const db = readDatabase();
    res.json({ items: db.medikit });
  });

  app.patch('/api/medikit/:id', (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body as { quantity?: number };
    if (typeof quantity !== 'number' || Number.isNaN(quantity) || quantity < 0) {
      res.status(400).json({ error: 'Valid non-negative quantity is required.' });
      return;
    }

    const db = readDatabase();
    const item = db.medikit.find((m) => m.id === id);
    if (!item) {
      res.status(404).json({ error: 'Medikit item not found.' });
      return;
    }

    item.quantity = Math.floor(quantity);
    item.status =
      item.quantity === 0
        ? 'Needs Restock'
        : item.quantity < item.minRequired
          ? 'Low Stock'
          : 'Stocked';
    item.lastChecked = new Date().toISOString().slice(0, 10);
    writeDatabase(db);
    res.json({ item });
  });

  // 7. Curriculum Quiz Assessments
  app.get('/api/assessments', (_req, res) => {
    const db = readDatabase();
    res.json({ assessments: db.assessments });
  });

  app.post('/api/assessments', (req, res) => {
    const body = req.body as Partial<AssessmentRecord>;
    if (!body.moduleId || !body.moduleTitle || !body.participantName?.trim()) {
      res.status(400).json({ error: 'Participant name and module metadata are required.' });
      return;
    }

    const score = Math.max(0, Number(body.score) || 0);
    const total = Math.max(1, Number(body.total) || 1);
    const record: AssessmentRecord = {
      id: `assess-${Date.now()}`,
      moduleId: body.moduleId,
      moduleTitle: body.moduleTitle,
      participantName: body.participantName.trim(),
      role: body.role || 'Student',
      score,
      total,
      percentage: Math.round((score / total) * 100),
      submittedAt: new Date().toISOString(),
    };

    const db = readDatabase();
    db.assessments.unshift(record);
    writeDatabase(db);
    res.status(201).json({ assessment: record });
  });

  // 8. Learning Tracking System & Role Portals API
  app.get('/api/learning', (_req, res) => {
    const db = readDatabase();
    res.json({ learners: db.learners, checklists: db.checklists });
  });

  app.post('/api/learning/learners', (req, res) => {
    const body = req.body as Partial<LearnerProfile>;
    if (!body.name?.trim() || !body.departmentOrClass?.trim()) {
      res.status(400).json({ error: 'Name and class/department are required.' });
      return;
    }

    const newLearner: LearnerProfile = {
      id: `learner-${Date.now()}`,
      name: body.name.trim(),
      role: body.role === 'Teacher' ? 'Teacher' : 'Student',
      departmentOrClass: body.departmentOrClass.trim(),
      modules: {},
    };

    const db = readDatabase();
    db.learners.unshift(newLearner);
    writeDatabase(db);
    res.status(201).json({ learner: newLearner });
  });

  app.post('/api/learning/progress', (req, res) => {
    const body = req.body as {
      learnerId?: string;
      moduleId?: string;
      lessonCompleted?: boolean;
      drillCompleted?: boolean;
      drillScorePct?: number;
      quizCompleted?: boolean;
      quizScorePct?: number;
    };

    if (!body.learnerId || !body.moduleId) {
      res.status(400).json({ error: 'learnerId and moduleId are required.' });
      return;
    }

    const db = readDatabase();
    const learner = db.learners.find((l) => l.id === body.learnerId);
    if (!learner) {
      res.status(404).json({ error: 'Learner profile not found.' });
      return;
    }

    const existing: ModuleProgress = learner.modules[body.moduleId] || {
      moduleId: body.moduleId,
      lessonCompleted: false,
      drillCompleted: false,
      bestDrillScorePct: 0,
      quizCompleted: false,
      bestQuizScorePct: 0,
      lastActivityAt: new Date().toISOString().slice(0, 10),
    };

    const updated: ModuleProgress = {
      moduleId: body.moduleId,
      lessonCompleted:
        typeof body.lessonCompleted === 'boolean' ? body.lessonCompleted : existing.lessonCompleted,
      drillCompleted:
        typeof body.drillCompleted === 'boolean' ? body.drillCompleted : existing.drillCompleted,
      bestDrillScorePct:
        typeof body.drillScorePct === 'number'
          ? Math.max(existing.bestDrillScorePct, Math.min(100, Math.max(0, body.drillScorePct)))
          : existing.bestDrillScorePct,
      quizCompleted:
        typeof body.quizCompleted === 'boolean' ? body.quizCompleted : existing.quizCompleted,
      bestQuizScorePct:
        typeof body.quizScorePct === 'number'
          ? Math.max(existing.bestQuizScorePct, Math.min(100, Math.max(0, body.quizScorePct)))
          : existing.bestQuizScorePct,
      lastActivityAt: new Date().toISOString().slice(0, 10),
    };

    learner.modules[body.moduleId] = updated;
    writeDatabase(db);
    res.json({ learner });
  });

  app.patch('/api/learning/checklists/:id', (req, res) => {
    const { id } = req.params;
    const { completed } = req.body as { completed?: boolean };
    if (typeof completed !== 'boolean') {
      res.status(400).json({ error: 'Boolean completed state is required.' });
      return;
    }

    const db = readDatabase();
    const item = db.checklists.find((c) => c.id === id);
    if (!item) {
      res.status(404).json({ error: 'Checklist item not found.' });
      return;
    }

    item.completed = completed;
    item.updatedAt = new Date().toISOString().slice(0, 10);
    writeDatabase(db);
    res.json({ checklist: item });
  });

  // 9. Vite Middleware (Dev) or Static Assets (Production)
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Suraksha Campus Full-Stack Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
