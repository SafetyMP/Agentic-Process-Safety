import { canonical, digest, SCENARIOS } from './scenarios.ts';
import { LIMITS } from './types.ts';
import type { Message, RunSpec } from './types.ts';

export function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
export function exact(value: unknown, keys: string[]): value is Record<string, unknown> {
  return plain(value) && canonical(Object.keys(value).sort()) === canonical([...keys].sort());
}
export function safeTree(value: unknown, depth = 0): boolean {
  if (depth > 30) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isSafeInteger(value);
  if (typeof value === 'string') return value.length <= 128;
  if (Array.isArray(value)) return value.length <= 1000 && value.every(item => safeTree(item, depth + 1));
  if (!plain(value)) return false;
  return Object.entries(value).every(([key, item]) => !['__proto__', 'prototype', 'constructor'].includes(key) && key.length <= 128 && safeTree(item, depth + 1));
}
export function validateSpec(value: unknown): string | null {
  if (!safeTree(value) || !exact(value, ['schemaVersion', 'modelVersion', 'schedulerVersion', 'scenario', 'scenarioVersion', 'fixtureDigest', 'seed', 'mode', 'task', 'faults', 'schedule', 'limits'])) return 'invalid-structure';
  if (value.schemaVersion !== 'aps-browser-workflow/1' || value.modelVersion !== 'procurement-local/1' || value.schedulerVersion !== 'logical-fifo/1' || value.scenarioVersion !== 1) return 'unsupported-version';
  if (!SCENARIOS.some(item => item.id === value.scenario) || !['A', 'B', 'C'].includes(value.mode as string) || !['proposal-1-first', 'proposal-2-first'].includes(value.schedule as string)) return 'invalid-structure';
  if (!Number.isSafeInteger(value.seed) || (value.seed as number) < 0 || (value.seed as number) > 2147483647) return 'invalid-structure';
  if (!exact(value.task, ['id', 'contextId', 'demand', 'stock', 'unitPrice', 'budget', 'approvalTtl'])) return 'invalid-structure';
  const task = value.task;
  if (![task.id, task.contextId].every(id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id))) return 'invalid-structure';
  if (!['demand', 'stock', 'unitPrice', 'budget', 'approvalTtl'].every(key => Number.isSafeInteger(task[key]) && (task[key] as number) >= 0 && (task[key] as number) <= 100000)) return 'invalid-structure';
  if ((task.approvalTtl as number) < 1 || (task.approvalTtl as number) > 1000 || (task.unitPrice as number) < 1) return 'invalid-structure';
  if (value.fixtureDigest !== digest(task)) return 'digest-mismatch';
  if (canonical(value.limits) !== canonical(LIMITS)) return 'resource-limit';
  if (!Array.isArray(value.faults) || value.faults.length > 1) return 'resource-limit';
  const ids = new Set<string>(), kinds = new Set<string>();
  for (const f of value.faults) {
    if (!plain(f) || !exact(f, f.kind === 'delay-approval' ? ['id', 'kind', 'delay'] : ['id', 'kind']) || typeof f.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(f.id)
      || !['delay-approval', 'duplicate-purchase-proposal', 'drop-first-purchase-response'].includes(f.kind as string) || (f.kind === 'delay-approval' && f.delay !== 60) || ids.has(f.id) || kinds.has(f.kind as string)) return 'invalid-structure';
    ids.add(f.id); kinds.add(f.kind as string);
  }
  return null;
}
export function isRunSpec(value: unknown): value is RunSpec { return validateSpec(value) === null; }

const bindingFields = ['taskId', 'contextId', 'supplierId', 'quantity', 'amount', 'quoteId', 'modelVersion', 'mode'];
const payloadFields = {
  'task.assigned': ['id', 'contextId', 'demand', 'stock', 'unitPrice', 'budget', 'approvalTtl'],
  'demand.ready': ['forecast', 'sourceTaskMessageId'], 'inventory.ready': ['quantity', 'observedStock', 'forecastMessageId'],
  'quote.ready': ['id', 'supplierId', 'quantity', 'unitPrice', 'amount', 'sourceQuantityMessageId'],
  'approval.ready': [...bindingFields, 'id', 'issuedAt', 'expiresAt', 'expectedWorldVersion', 'consumedByOrderId'],
  'purchase.proposed': [...bindingFields, 'proposalId', 'orderIntentId', 'approvalId', 'expectedWorldVersion', 'idempotencyKey'],
  'purchase.result': ['proposalId', 'outcome', 'reasonCode', 'orderId', 'observedWorldVersion'],
  'recovery.requested': ['blockedEventId', 'quoteId', 'orderIntentId', 'refreshAttempt'],
  'reconciliation.requested': ['proposalId', 'orderIntentId', 'idempotencyKey', 'unknownEventId'],
  'reconciliation.result': ['order', 'observedWorldVersion', 'requestMessageId'],
  'task.result': ['orderIntentId', 'confirmedOrderIds', 'outcome'],
} as const;
export function validPayload(message: Message): boolean {
  const fields = payloadFields[message.kind];
  if (!fields || !safeTree(message.payload) || !exact(message.payload, [...fields])) return false;
  const numericFields = ['demand', 'stock', 'unitPrice', 'budget', 'approvalTtl', 'forecast', 'quantity', 'observedStock', 'amount', 'issuedAt', 'expiresAt', 'expectedWorldVersion', 'observedWorldVersion', 'refreshAttempt'];
  for (const [key, value] of Object.entries(message.payload)) {
    if (numericFields.includes(key) && typeof value !== 'number') return false;
    if (!numericFields.includes(key) && !['order', 'confirmedOrderIds'].includes(key) && value !== null && typeof value !== 'string') return false;
    if (typeof value === 'number' && (value < 0 || value > 1000000000000)) return false;
    if (typeof value === 'string' && !value.length) return false;
    if (value === null && !['orderId', 'consumedByOrderId', 'order'].includes(key)) return false;
  }
  if ('modelVersion' in message.payload && message.payload.modelVersion !== 'procurement-local/1') return false;
  if ('mode' in message.payload && (typeof message.payload.mode !== 'string' || !['A', 'B', 'C'].includes(message.payload.mode))) return false;
  if (message.kind === 'purchase.result' && !['committed', 'cached', 'denied'].includes(message.payload.outcome)) return false;
  if (message.kind === 'task.result' && (!['confirmed', 'failed'].includes(message.payload.outcome) || !Array.isArray(message.payload.confirmedOrderIds))) return false;
  return true;
}
