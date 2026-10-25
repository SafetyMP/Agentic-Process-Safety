import { LIMITS } from './types.ts';
import type { Mode, RunSpec, ScenarioId, TaskInput } from './types.ts';

/** Consistency checksum only: not cryptographic identity, signatures or safety evidence. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key])).join(',') + '}';
}
export function digest(value: unknown): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(canonical(value))) hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  return 'fnv1a64:' + hash.toString(16).padStart(16, '0');
}
export const DEFAULT_TASK: TaskInput = { id: 'task-1', contextId: 'context-1', demand: 100, stock: 20, unitPrice: 5, budget: 1000, approvalTtl: 60 };
export const SCENARIOS: readonly { id: ScenarioId; title: string; description: string }[] = [
  { id: 'nominal', title: 'Nominal procurement', description: 'Five simulated workers derive one confirmed replenishment order.' },
  { id: 'approval-delay', title: 'Expired approval and recovery', description: 'Delayed delivery expires the first approval; a bounded refresh obtains a new approval.' },
  { id: 'purchase-race', title: 'Competing purchase proposals', description: 'Two same-version proposals compete in an explicit simulated interleaving.' },
  { id: 'lost-purchase-response', title: 'Lost response and reconciliation', description: 'An order commits but its response is lost; inspect the unknown outcome and reconcile.' },
];
export const MODE_LABELS: Record<Mode, string> = { A: 'A · Baseline browser comparator', B: 'B · Actor/tool and budget browser comparator', C: 'C · Defended browser comparator' };
export function scenarioSpec(scenario: ScenarioId = 'nominal', mode: Mode = 'C', schedule: RunSpec['schedule'] = 'proposal-1-first'): RunSpec {
  return { schemaVersion: 'aps-browser-workflow/1', modelVersion: 'procurement-local/1', schedulerVersion: 'logical-fifo/1', scenario, scenarioVersion: 1,
    fixtureDigest: digest(DEFAULT_TASK), seed: 1, mode, task: { ...DEFAULT_TASK }, schedule, limits: { ...LIMITS },
    faults: scenario === 'approval-delay' ? [{ id: 'fault-delay', kind: 'delay-approval', delay: 60 }]
      : scenario === 'purchase-race' ? [{ id: 'fault-race', kind: 'duplicate-purchase-proposal' }]
      : scenario === 'lost-purchase-response' ? [{ id: 'fault-response', kind: 'drop-first-purchase-response' }] : [] };
}
