/**
 * Job runner — manages dispatch-agent.sh child processes.
 *
 * Optimisations applied:
 *  1. mantine_generate uses --stage2 (skips Stage 1) when a plan already exists.
 *  2. Job state is persisted to logs/mcp-jobs.json — survives MCP server restarts.
 *  3. mantine_plan returns a cached plan immediately when one exists for the same
 *     Figma node-id and is < 24 h old (pass force=true to bypass).
 *  4. mantine-llms.txt refresh is skipped when the local copy is < 6 h old
 *     (SKIP_LLMS_REFRESH=1 env var picked up by dispatch-agent.sh).
 */
import { spawn } from 'child_process';
import {
  createWriteStream,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  mkdirSync,
} from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';
import os from 'os';

export type JobOperation = 'plan' | 'generate';
export type JobState = 'running' | 'complete' | 'failed';

export interface Job {
  id: string;
  componentName: string;
  figmaUrl: string;
  version: string;
  operation: JobOperation;
  state: JobState;
  logPath: string;
  pid: number | undefined;
  startedAt: string;
  completedAt: string | null;
  exitCode: number | null;
}

const jobs = new Map<string, Job>();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} is not set`);
  return value;
}

function scriptsDir(): string {
  return requireEnv('MANTINE_SCRIPTS_DIR');
}

function workDir(): string {
  return process.env['MANTINE_WORK_DIR'] ?? process.cwd();
}

// ─── Fix 2: Job state persistence ────────────────────────────────────────────

function stateFilePath(): string {
  return path.join(workDir(), 'logs', 'mcp-jobs.json');
}

function loadPersistedJobs(): void {
  const filePath = stateFilePath();
  if (!existsSync(filePath)) return;
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as Job[];
    for (const job of raw) {
      // Any job still marked 'running' had its process die when the server
      // restarted — downgrade to 'failed' so callers don't poll forever.
      if (job.state === 'running') {
        job.state = 'failed';
        job.completedAt = job.completedAt ?? new Date().toISOString();
      }
      jobs.set(job.id, job);
    }
  } catch {
    // Corrupt state file — start fresh
  }
}

function persistJobs(): void {
  const filePath = stateFilePath();
  try {
    const logsDir = path.dirname(filePath);
    if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
    writeFileSync(filePath, JSON.stringify([...jobs.values()], null, 2));
  } catch {
    // Non-fatal — in-memory state still works for this session
  }
}

// Load persisted state on module init
loadPersistedJobs();

// ─── Fix 3: Plan cache (Figma context cache) ──────────────────────────────────

const PLAN_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Extract the Figma node-id query param from a URL for stable comparison. */
function extractNodeId(url: string): string | null {
  const match = url.match(/node-id=([^&\s]+)/);
  return match ? decodeURIComponent(match[1]!) : null;
}

/**
 * Returns the path of an existing plan file for this component if:
 *   - it is < 24 h old, AND
 *   - the Figma node-id in its header matches the requested URL.
 * Returns null otherwise (cache miss → run Stage 1).
 */
function findFreshPlan(componentName: string, figmaUrl: string): string | null {
  const planFile = findPlanFile(componentName);
  if (!planFile) return null;

  try {
    const { mtimeMs } = statSync(planFile);
    if (Date.now() - mtimeMs > PLAN_CACHE_MAX_AGE_MS) return null;
  } catch {
    return null;
  }

  // Verify Figma node-id matches (tolerates URL param ordering differences)
  try {
    const header = readFileSync(planFile, 'utf-8').split('\n').slice(0, 8).join('\n');
    const urlMatch = header.match(/^Figma:\s*(.+)$/m);
    if (!urlMatch) return null;

    const planNodeId = extractNodeId(urlMatch[1]!);
    const requestNodeId = extractNodeId(figmaUrl);
    if (!planNodeId || !requestNodeId || planNodeId !== requestNodeId) return null;
  } catch {
    return null;
  }

  return planFile;
}

// ─── Fix 4: mantine-llms.txt freshness check ─────────────────────────────────

const LLMS_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

function isLlmsFileFresh(): boolean {
  const llmsPath = path.join(workDir(), '00-setup', 'mantine-llms.txt');
  try {
    const { mtimeMs } = statSync(llmsPath);
    return Date.now() - mtimeMs < LLMS_MAX_AGE_MS;
  } catch {
    return false; // Missing — let the script fetch it
  }
}

// ─── Job management ───────────────────────────────────────────────────────────

export function startJob(
  componentName: string,
  figmaUrl: string,
  version: string,
  operation: JobOperation,
  force = false,
): string {
  const id = randomUUID();
  const logPath = path.join(os.tmpdir(), `mantine-architect-${id}.log`);
  const script = path.join(scriptsDir(), 'dispatch-agent.sh');
  const cwd = workDir();

  if (!existsSync(script)) {
    throw new Error(`dispatch-agent.sh not found at: ${script}`);
  }

  // ── Fix 3: Return cached plan immediately if fresh ────────────────────────
  if (operation === 'plan' && !force) {
    const cachedPlan = findFreshPlan(componentName, figmaUrl);
    if (cachedPlan) {
      const syntheticJob: Job = {
        id,
        componentName,
        figmaUrl,
        version,
        operation,
        state: 'complete',
        logPath,
        pid: undefined,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        exitCode: 0,
      };
      jobs.set(id, syntheticJob);
      persistJobs();

      const logStream = createWriteStream(logPath);
      logStream.write(`[mantine-architect] Plan cache HIT for ${componentName}\n`);
      logStream.write(`[mantine-architect] Cached plan: ${cachedPlan}\n`);
      logStream.write(`[mantine-architect] Skipped Stage 1 — pass force=true to re-run.\n`);
      logStream.end();

      return id;
    }
  }

  // ── Fix 1: Use --stage2 when plan exists, --auto-approve otherwise ────────
  const args = [componentName, figmaUrl, '--version', version];
  if (operation === 'plan') {
    args.push('--plan-only');
  } else {
    const existingPlan = findPlanFile(componentName);
    if (existingPlan) {
      // Pass the explicit plan path so dispatch-agent.sh uses it even if a
      // newer (failed) plan-*.md file was written since.
      args.push(`--plan=${existingPlan}`);
    } else {
      args.push('--auto-approve'); // No plan at all — run full pipeline
    }
  }

  // ── Fix 4: Skip llms refresh when file is fresh ───────────────────────────
  const childEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) childEnv[k] = v;
  }
  if (isLlmsFileFresh()) {
    childEnv['SKIP_LLMS_REFRESH'] = '1';
  }

  const job: Job = {
    id,
    componentName,
    figmaUrl,
    version,
    operation,
    state: 'running',
    logPath,
    pid: undefined,
    startedAt: new Date().toISOString(),
    completedAt: null,
    exitCode: null,
  };
  jobs.set(id, job);
  persistJobs();

  const logStream = createWriteStream(logPath, { flags: 'a' });
  logStream.write(`[mantine-architect] Starting ${operation} job for ${componentName}\n`);
  logStream.write(`[mantine-architect] Command: ${script} ${args.join(' ')}\n`);
  if (childEnv['SKIP_LLMS_REFRESH']) {
    logStream.write(`[mantine-architect] mantine-llms.txt is fresh (<6 h) — skipping network refresh\n`);
  }
  logStream.write('\n');

  const child = spawn(script, args, {
    cwd,
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  job.pid = child.pid;
  child.stdout?.pipe(logStream);
  child.stderr?.pipe(logStream);

  child.on('close', (code) => {
    job.exitCode = code;
    job.completedAt = new Date().toISOString();
    job.state = code === 0 ? 'complete' : 'failed';
    logStream.write(`\n[mantine-architect] Process exited with code ${code}\n`);
    logStream.end();
    persistJobs();
  });

  child.on('error', (err) => {
    job.state = 'failed';
    job.completedAt = new Date().toISOString();
    logStream.write(`\n[mantine-architect] Spawn error: ${err.message}\n`);
    logStream.end();
    persistJobs();
  });

  return id;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function recentLogs(job: Job, tailLines = 30): string {
  try {
    const content = readFileSync(job.logPath, 'utf-8');
    const lines = content.split('\n');
    return lines.slice(-tailLines).join('\n');
  } catch {
    return '(no logs yet)';
  }
}

export function findPlanFile(componentName: string): string | null {
  const logsDir = path.join(workDir(), 'logs');
  if (!existsSync(logsDir)) return null;

  const planFiles = readdirSync(logsDir)
    .filter((f) => f.startsWith(`plan-${componentName}-`) && f.endsWith('.md'))
    .sort()
    .reverse(); // most recent first

  return planFiles.length > 0 ? path.join(logsDir, planFiles[0]!) : null;
}

export function readGeneratedFiles(componentName: string): Record<string, string> {
  const dir = path.join(workDir(), '02-generated', componentName);
  if (!existsSync(dir)) return {};

  const targets = [
    `${componentName}.tsx`,
    `${componentName}.module.css`,
    `${componentName}.stories.tsx`,
    `${componentName}.spec.ts`,
  ];

  const result: Record<string, string> = {};
  for (const filename of targets) {
    const filePath = path.join(dir, filename);
    if (existsSync(filePath)) {
      result[filename] = readFileSync(filePath, 'utf-8');
    }
  }
  return result;
}
