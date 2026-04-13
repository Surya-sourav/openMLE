import { spawn, ChildProcess } from 'child_process';
import { createInterface } from 'readline';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { config } from '../config.js';

export interface SandboxOptions {
  scriptPath: string;
  args?: string[];
  env?: Record<string, string>;
  timeoutMs?: number;
  onStdoutLine?: (line: string) => void;
  onStderrLine?: (line: string) => void;
}

export interface SandboxResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
}

let _pythonExe: string | null = null;
let _depsInstalled = false;

const ML_PACKAGES = [
  'pandas', 'numpy', 'scikit-learn', 'matplotlib', 'seaborn', 'scipy',
];

function resolvePython(): string {
  if (_pythonExe) return _pythonExe;

  const envPy = process.env.OPENMLE_PYTHON;
  if (envPy) {
    _pythonExe = envPy;
    return _pythonExe;
  }

  // Prefer a Python that already has pandas
  const candidates = [
    process.env.HOME + '/miniforge3/bin/python3',
    process.env.HOME + '/miniconda3/bin/python3',
    process.env.HOME + '/anaconda3/bin/python3',
    process.env.HOME + '/.pyenv/shims/python3',
    '/opt/homebrew/bin/python3',
    '/usr/local/bin/python3',
    'python3',
    'python',
  ];

  for (const candidate of candidates) {
    try {
      const out = execSync(`"${candidate}" -c "import pandas; print('ok')" 2>/dev/null`, {
        encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (out === 'ok') {
        _pythonExe = candidate;
        _depsInstalled = true; // already has packages
        return _pythonExe;
      }
    } catch { /* skip */ }
  }

  // Fall back to whatever python3 is on PATH
  for (const candidate of ['python3', 'python']) {
    try {
      execSync(`which ${candidate}`, { stdio: 'ignore' });
      _pythonExe = candidate;
      return _pythonExe;
    } catch { /* skip */ }
  }

  throw new Error(
    'Python not found. Install Python 3 and make sure it is on PATH, or set OPENMLE_PYTHON env var.'
  );
}

function ensureDeps(): void {
  if (_depsInstalled) return;
  const py = resolvePython();
  try {
    console.log('[sandbox] Installing ML dependencies...');
    execSync(
      `"${py}" -m pip install --quiet --disable-pip-version-check ${ML_PACKAGES.join(' ')}`,
      { stdio: 'inherit', timeout: 120_000 },
    );
    _depsInstalled = true;
    console.log('[sandbox] ML dependencies ready.');
  } catch (e) {
    console.warn('[sandbox] pip install failed, proceeding anyway:', e);
    _depsInstalled = true; // don't retry on every run
  }
}

export class SandboxService {
  async executePython(options: SandboxOptions): Promise<SandboxResult> {
    ensureDeps();
    const pythonExe = resolvePython();
    const startMs = Date.now();
    const timeoutMs = options.timeoutMs ?? config.sandboxTimeoutMs;

    return new Promise<SandboxResult>((resolve) => {
      const proc: ChildProcess = spawn(pythonExe, [options.scriptPath, ...(options.args ?? [])], {
        env: { ...process.env, ...(options.env ?? {}) },
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGKILL');
      }, timeoutMs);

      const rl_out = createInterface({ input: proc.stdout! });
      rl_out.on('line', (line) => {
        stdout += line + '\n';
        options.onStdoutLine?.(line);
      });

      const rl_err = createInterface({ input: proc.stderr! });
      rl_err.on('line', (line) => {
        stderr += line + '\n';
        options.onStderrLine?.(line);
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          exitCode: code ?? -1,
          stdout,
          stderr,
          timedOut,
          durationMs: Date.now() - startMs,
        });
      });
    });
  }

  async writeTempScript(code: string, filename: string): Promise<string> {
    const dir = config.sandboxPath;
    fs.mkdirSync(dir, { recursive: true });
    const scriptPath = path.join(dir, filename);
    fs.writeFileSync(scriptPath, code, 'utf-8');
    return scriptPath;
  }

  async detectLocalGPU(): Promise<{ cuda: boolean; mps: boolean; deviceName?: string }> {
    const script = `
import json, sys
try:
    import torch
    cuda = torch.cuda.is_available()
    mps = hasattr(torch.backends, 'mps') and torch.backends.mps.is_available()
    name = torch.cuda.get_device_name(0) if cuda else None
    print(json.dumps({'cuda': cuda, 'mps': mps, 'deviceName': name}))
except ImportError:
    print(json.dumps({'cuda': False, 'mps': False, 'deviceName': None}))
`;
    const scriptPath = await this.writeTempScript(script, 'detect_gpu.py');
    const result = await this.executePython({ scriptPath, timeoutMs: 15_000 });

    try {
      return JSON.parse(result.stdout.trim());
    } catch {
      return { cuda: false, mps: false };
    }
  }

  extractCodeBlock(llmOutput: string): string {
    const match = llmOutput.match(/```python\n([\s\S]*?)```/);
    return match ? match[1].trim() : llmOutput.trim();
  }
}
