import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { config } from '../config.js';
import { getClient } from '../llm/client.js';
import type { KBResult } from '../types/agent.js';

interface KBEntry {
  id: string;
  content: string;
  source: string;
  vector: number[];
}

// Simple in-memory BM25 implementation for hybrid search
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function bm25Score(query: string[], doc: string[], k1 = 1.5, b = 0.75, avgLen = 200): number {
  const docLen = doc.length;
  const tf = new Map<string, number>();
  doc.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
  return query.reduce((score, term) => {
    const f = tf.get(term) ?? 0;
    return score + (f * (k1 + 1)) / (f + k1 * (1 - b + b * (docLen / avgLen)));
  }, 0);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

export class VectorKBService {
  private entries: KBEntry[] = [];
  private dbPath: string;
  private initialised = false;

  constructor() {
    this.dbPath = path.join(config.vectorKBPath, 'openmle_kb.json');
  }

  async init(): Promise<void> {
    if (this.initialised) return;

    if (fs.existsSync(this.dbPath)) {
      // Load existing index
      try {
        this.entries = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
        this.initialised = true;
        console.log(`[VectorKB] Loaded ${this.entries.length} entries from cache`);
        return;
      } catch {
        this.entries = [];
      }
    }

    // Build index from resources/kb/
    const kbDir = app.isPackaged
      ? path.join(process.resourcesPath, 'kb')
      : path.join(app.getAppPath(), 'resources', 'kb');

    if (!fs.existsSync(kbDir)) {
      console.warn('[VectorKB] Knowledge base directory not found:', kbDir);
      this.initialised = true;
      return;
    }

    const files = fs.readdirSync(kbDir).filter((f) => f.endsWith('.md'));
    console.log(`[VectorKB] Building index from ${files.length} knowledge files...`);

    const chunks = this.chunkDocuments(kbDir, files);
    console.log(`[VectorKB] Created ${chunks.length} chunks, embedding...`);

    // Embed in batches of 50
    for (let i = 0; i < chunks.length; i += 50) {
      const batch = chunks.slice(i, i + 50);
      const vectors = await this.embedBatch(batch.map((c) => c.content));
      batch.forEach((chunk, j) => {
        this.entries.push({ id: `${chunk.source}:${i + j}`, content: chunk.content, source: chunk.source, vector: vectors[j] });
      });
      console.log(`[VectorKB] Embedded ${Math.min(i + 50, chunks.length)} / ${chunks.length}`);
    }

    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    fs.writeFileSync(this.dbPath, JSON.stringify(this.entries), 'utf-8');
    this.initialised = true;
    console.log('[VectorKB] Index built and saved');
  }

  private chunkDocuments(kbDir: string, files: string[]): { content: string; source: string }[] {
    const chunks: { content: string; source: string }[] = [];
    const CHUNK_TOKENS = 400;
    const OVERLAP_TOKENS = 50;
    const CHARS_PER_TOKEN = 4;
    const chunkSize = CHUNK_TOKENS * CHARS_PER_TOKEN;
    const overlap = OVERLAP_TOKENS * CHARS_PER_TOKEN;

    for (const file of files) {
      const text = fs.readFileSync(path.join(kbDir, file), 'utf-8');
      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push({ content: text.slice(start, end), source: file });
        start += chunkSize - overlap;
      }
    }
    return chunks;
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const client = await getClient();
      // Use Anthropic's embeddings endpoint
      const response = await (client as unknown as { post: (path: string, options: unknown) => Promise<{ embeddings: { embedding: number[] }[] }> }).post('/v1/embeddings', {
        body: { model: 'voyage-3', input: texts },
      });
      return response.embeddings.map((e) => e.embedding);
    } catch (err) {
      console.warn('[VectorKB] Embedding failed, using zero vectors:', err);
      // Return zero vectors as fallback so indexing doesn't fail
      return texts.map(() => new Array(1024).fill(0) as number[]);
    }
  }

  private async embedQuery(query: string): Promise<number[]> {
    const vecs = await this.embedBatch([query]);
    return vecs[0];
  }

  async search(query: string, topK = 8): Promise<KBResult[]> {
    if (this.entries.length === 0) return [];
    const qVec = await this.embedQuery(query);

    const scored = this.entries.map((entry) => ({
      content: entry.content,
      source: entry.source,
      score: cosineSimilarity(qVec, entry.vector),
    }));

    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  async hybridSearch(query: string, topK = 8): Promise<KBResult[]> {
    if (this.entries.length === 0) return [];

    const qVec = await this.embedQuery(query);
    const qTokens = tokenize(query);
    const avgDocLen = this.entries.reduce((s, e) => s + tokenize(e.content).length, 0) / this.entries.length;

    const scored = this.entries.map((entry) => {
      const vScore = cosineSimilarity(qVec, entry.vector);
      const docTokens = tokenize(entry.content);
      const kScore = bm25Score(qTokens, docTokens, 1.5, 0.75, avgDocLen);
      // Normalise BM25 to [0,1] range (approximate)
      const kScoreNorm = Math.min(kScore / 10, 1);
      return {
        content: entry.content,
        source: entry.source,
        score: 0.7 * vScore + 0.3 * kScoreNorm,
      };
    });

    // Deduplicate by source (keep highest score per source)
    const bySource = new Map<string, KBResult>();
    for (const r of scored) {
      const existing = bySource.get(r.source);
      if (!existing || r.score > existing.score) bySource.set(r.source, r);
    }

    return [...bySource.values()].sort((a, b) => b.score - a.score).slice(0, topK);
  }

  close(): void {
    // Nothing to close for in-memory implementation
    this.initialised = false;
  }
}
