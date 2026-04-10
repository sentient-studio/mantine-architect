import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { existsSync, readFileSync } from 'fs';
import {
  startJob,
  getJob,
  recentLogs,
  findPlanFile,
  readGeneratedFiles,
} from './runner.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const tools: Tool[] = [
  {
    name: 'mantine_plan',
    description:
      'Stage 1 — Generate an architectural plan for a Mantine v7 component from a Figma design URL. ' +
      'Queries the Figma API for exact design tokens (colours, spacing, radius, typography), ' +
      'identifies all variants, and flags any design-code conflicts before any code is written. ' +
      'Returns a job_id immediately; if a fresh plan (<24 h) already exists for the same Figma ' +
      'node-id the job completes instantly from cache — pass force=true to re-run Stage 1. ' +
      'Poll with mantine_status until state is "complete", then call mantine_get_plan to read ' +
      'the full plan document. Always run this first.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        component_name: {
          type: 'string',
          description: 'PascalCase component name, e.g. "Button", "UserCard", "PricingTable"',
        },
        figma_url: {
          type: 'string',
          description: 'Full Figma URL — figma.com/design/... or figma.com/file/... with node-id query param',
        },
        version: {
          type: 'string',
          enum: ['7', '8', '9'],
          description: 'Mantine version to target (default: "7")',
        },
        force: {
          type: 'boolean',
          description: 'Set true to bypass the plan cache and re-run Stage 1 even if a fresh plan exists (default: false)',
        },
      },
      required: ['component_name', 'figma_url'],
    },
  },
  {
    name: 'mantine_generate',
    description:
      'Stage 2+3 — Generate the complete Mantine component: TSX, CSS module, Storybook story, Playwright spec. ' +
      'If a plan already exists from a prior mantine_plan call, Stage 1 is skipped automatically ' +
      '(saves ~50% token spend). Pass the same figma_url used in mantine_plan. ' +
      'Returns a job_id immediately. Poll with mantine_status until state is "complete", ' +
      'then call mantine_get_files to read the generated files. Typical duration: 15–20 minutes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        component_name: {
          type: 'string',
          description: 'PascalCase component name — must match the name used in mantine_plan',
        },
        figma_url: {
          type: 'string',
          description: 'Full Figma URL',
        },
        version: {
          type: 'string',
          enum: ['7', '8', '9'],
          description: 'Mantine version to target (default: "7")',
        },
      },
      required: ['component_name', 'figma_url'],
    },
  },
  {
    name: 'mantine_status',
    description:
      'Poll the status of a mantine_plan or mantine_generate job. ' +
      'Returns state (running / complete / failed), timestamps, and a tail of recent log output. ' +
      'Poll every 60 seconds while state is "running".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        job_id: {
          type: 'string',
          description: 'Job ID returned by mantine_plan or mantine_generate',
        },
        log_lines: {
          type: 'number',
          description: 'How many recent log lines to return (default: 30)',
        },
      },
      required: ['job_id'],
    },
  },
  {
    name: 'mantine_get_plan',
    description:
      'Retrieve the architectural plan document from a completed mantine_plan job. ' +
      'Returns the full markdown plan including: variant mappings, Figma token → Mantine token decisions, ' +
      'design conflict flags (BLOCK / ADAPT / NOTE), and a list of ambiguities for review. ' +
      'Only call this after mantine_status reports state: "complete".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        component_name: {
          type: 'string',
          description: 'Component name used in mantine_plan',
        },
      },
      required: ['component_name'],
    },
  },
  {
    name: 'mantine_get_files',
    description:
      'Retrieve the generated component files from a completed mantine_generate job. ' +
      'Returns the contents of: <Name>.tsx, <Name>.module.css, <Name>.stories.tsx, <Name>.spec.ts. ' +
      'Only call this after mantine_status reports state: "complete".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        component_name: {
          type: 'string',
          description: 'Component name used in mantine_generate',
        },
      },
      required: ['component_name'],
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(text: string): CallToolResult {
  return { content: [{ type: 'text', text }] };
}

function fail(text: string): CallToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

function nextStep(job: ReturnType<typeof getJob>): string {
  if (!job) return '';
  if (job.state === 'running') return 'Poll again in 60 seconds with mantine_status.';
  if (job.state === 'complete' && job.operation === 'plan') {
    return 'Call mantine_get_plan to read the plan document.';
  }
  if (job.state === 'complete' && job.operation === 'generate') {
    return 'Call mantine_get_files to read the generated component files.';
  }
  return 'Job failed — check recent_logs for the error. Fix the issue and start a new job.';
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function handleTool(
  name: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  switch (name) {
    case 'mantine_plan':
    case 'mantine_generate': {
      const componentName = String(args['component_name'] ?? '').trim();
      const figmaUrl = String(args['figma_url'] ?? '').trim();
      const version = String(args['version'] ?? '7');

      if (!componentName) return fail('component_name is required');
      if (!figmaUrl) return fail('figma_url is required');
      if (!/^\d+$/.test(componentName[0]!) && !/^[A-Z]/.test(componentName)) {
        return fail(`component_name should be PascalCase (e.g. "Button"), got: "${componentName}"`);
      }

      const operation = name === 'mantine_plan' ? 'plan' : 'generate';
      const force = operation === 'plan' ? Boolean(args['force']) : false;
      let jobId: string;
      try {
        jobId = startJob(componentName, figmaUrl, version, operation, force);
      } catch (e) {
        return fail(`Failed to start job: ${e instanceof Error ? e.message : String(e)}`);
      }

      const durationHint = operation === 'plan' ? '5–10 minutes' : '20–30 minutes';

      return ok(
        JSON.stringify(
          {
            job_id: jobId,
            component_name: componentName,
            operation,
            state: 'running',
            message: `${operation === 'plan' ? 'Plan' : 'Generate'} job started for ${componentName}. Typical duration: ${durationHint}.`,
            next_step: 'Poll with mantine_status in 60 seconds.',
          },
          null,
          2,
        ),
      );
    }

    case 'mantine_status': {
      const jobId = String(args['job_id'] ?? '').trim();
      const logLines = typeof args['log_lines'] === 'number' ? args['log_lines'] : 30;

      if (!jobId) return fail('job_id is required');

      const job = getJob(jobId);
      if (!job) return fail(`Job not found: ${jobId}. Job state is only kept in memory — it is lost if the MCP server restarts.`);

      return ok(
        JSON.stringify(
          {
            job_id: job.id,
            component_name: job.componentName,
            operation: job.operation,
            state: job.state,
            exit_code: job.exitCode,
            started_at: job.startedAt,
            completed_at: job.completedAt,
            next_step: nextStep(job),
            recent_logs: recentLogs(job, logLines),
          },
          null,
          2,
        ),
      );
    }

    case 'mantine_get_plan': {
      const componentName = String(args['component_name'] ?? '').trim();
      if (!componentName) return fail('component_name is required');

      const planFile = findPlanFile(componentName);
      if (!planFile) {
        return fail(
          `No plan file found for "${componentName}". ` +
            'Run mantine_plan and wait for state: "complete" before calling this.',
        );
      }

      if (!existsSync(planFile)) {
        return fail(`Plan file path resolved but file missing: ${planFile}`);
      }

      return ok(readFileSync(planFile, 'utf-8'));
    }

    case 'mantine_get_files': {
      const componentName = String(args['component_name'] ?? '').trim();
      if (!componentName) return fail('component_name is required');

      const files = readGeneratedFiles(componentName);
      if (Object.keys(files).length === 0) {
        return fail(
          `No generated files found for "${componentName}" in 02-generated/${componentName}/. ` +
            'Run mantine_generate and wait for state: "complete" before calling this.',
        );
      }

      const body = Object.entries(files)
        .map(([filename, content]) => `## ${filename}\n\n\`\`\`\n${content}\n\`\`\``)
        .join('\n\n---\n\n');

      return ok(body);
    }

    default:
      return fail(`Unknown tool: "${name}"`);
  }
}
