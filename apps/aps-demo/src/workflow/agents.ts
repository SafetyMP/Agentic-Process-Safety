import { AGENT_IDS } from './types.ts';
import { canonical } from './scenarios.ts';
import { validPayload } from './validation.ts';
import type { AgentId, AgentState, AgentLocal, AgentStatus, DraftMessage, Message, Proposal, Quote, SimApproval, WorkflowState } from './types.ts';

export function initialAgents(taskId: string): Record<AgentId, AgentState> {
  const locals: Record<AgentId, AgentLocal> = {
    orchestrator: { role: 'orchestrator', phase: 'assigned', refreshAttempts: 0, reconciliationAttempts: 0, confirmed: false },
    demand: { role: 'demand', acceptedTask: null, forecast: null },
    inventory: { role: 'inventory', forecastMessageId: null, observedStock: null, quantity: null },
    supplier: { role: 'supplier', quantityMessageId: null, quoteId: null, unitPrice: null },
    finance: { role: 'finance', quoteMessageId: null, approvalIds: [] },
    purchase: { role: 'purchase', quoteId: null, approvalIds: [], proposalIds: [], latestWorldVersion: 0, intentId: 'intent-' + taskId, pendingProposalIds: [], outcome: 'none' },
  };
  const build = (id: AgentId): AgentState => ({ id, status: id === 'orchestrator' ? 'working' : 'idle', inbox: [], consumedMessageIds: [], lastEventId: null, local: locals[id] });
  return { orchestrator: build(AGENT_IDS[0]), demand: build(AGENT_IDS[1]), inventory: build(AGENT_IDS[2]), supplier: build(AGENT_IDS[3]), finance: build(AGENT_IDS[4]), purchase: build(AGENT_IDS[5]) };
}
export type Effect = { type: 'send'; message: DraftMessage } | { type: 'demand'; forecast: number }
  | { type: 'inventory'; quantity: number } | { type: 'quote'; quote: Quote } | { type: 'approval' }
  | { type: 'schedule-commit'; messageId: string } | { type: 'consume-fault'; faultId: string }
  | { type: 'purchase-response'; message: Extract<Message, { kind: 'purchase.result' }> }
  | { type: 'query-order'; message: Extract<Message, { kind: 'reconciliation.requested' }> }
  | { type: 'reconciled'; message: Extract<Message, { kind: 'reconciliation.result' }> }
  | { type: 'confirmed'; confirmed: boolean };
export interface Reaction { status: AgentStatus; local: AgentLocal; effects: Effect[]; rejection?: string }
export const ROUTES = {
  'task.assigned': ['orchestrator', 'demand'], 'demand.ready': ['demand', 'inventory'], 'inventory.ready': ['inventory', 'supplier'],
  'quote.ready': ['supplier', 'finance'], 'approval.ready': ['finance', 'purchase'], 'purchase.proposed': ['purchase', 'orchestrator'],
  'purchase.result': ['orchestrator', 'purchase'], 'recovery.requested': ['orchestrator', 'finance'],
  'reconciliation.requested': ['purchase', 'orchestrator'], 'reconciliation.result': ['orchestrator', 'purchase'], 'task.result': ['purchase', 'orchestrator'],
} as const;

function proposal(approval: SimApproval, number: number, intentId: string): Proposal {
  return { taskId: approval.taskId, contextId: approval.contextId, supplierId: approval.supplierId, quantity: approval.quantity, amount: approval.amount,
    quoteId: approval.quoteId, modelVersion: approval.modelVersion, mode: approval.mode, proposalId: 'proposal-' + number, orderIntentId: intentId,
    approvalId: approval.id, expectedWorldVersion: approval.expectedWorldVersion, idempotencyKey: 'purchase-key-' + number };
}

/** Each reaction is computed from a delivered input and private local state, never a transcript. */
export function react(state: WorkflowState, message: Message): Reaction {
  const agent = state.agents[message.to];
  const local = structuredClone(agent.local);
  const reject = (reason: string): Reaction => ({ status: agent.status, local, effects: [], rejection: reason });
  const route = ROUTES[message.kind];
  if (!route || route[0] !== message.from || route[1] !== message.to || message.taskId !== state.spec.task.id || message.contextId !== state.spec.task.contextId) return reject('invalid-message-route');
  if (!validPayload(message)) return reject('invalid-message-payload');
  if (agent.consumedMessageIds.includes(message.id)) return reject('duplicate-message');
  const effects: Effect[] = [];
  const send = (draft: DraftMessage) => effects.push({ type: 'send', message: draft });
  switch (message.kind) {
    case 'task.assigned': {
      if (local.role !== 'demand' || local.acceptedTask !== null || canonical(message.payload) !== canonical(state.spec.task)) return reject('missing-or-repeated-prerequisite');
      local.acceptedTask = message.payload; local.forecast = message.payload.demand;
      effects.push({ type: 'demand', forecast: local.forecast });
      send({ from: 'demand', to: 'inventory', kind: 'demand.ready', payload: { forecast: local.forecast, sourceTaskMessageId: message.id } });
      return { status: 'done', local, effects };
    }
    case 'demand.ready': {
      if (local.role !== 'inventory' || local.forecastMessageId || state.world.demand !== message.payload.forecast || !state.messages.some(m => m.id === message.payload.sourceTaskMessageId && m.kind === 'task.assigned' && m.status === 'consumed')) return reject('missing-or-repeated-prerequisite');
      local.forecastMessageId = message.id; local.observedStock = state.world.stock; local.quantity = Math.max(0, message.payload.forecast - local.observedStock);
      effects.push({ type: 'inventory', quantity: local.quantity });
      send({ from: 'inventory', to: 'supplier', kind: 'inventory.ready', payload: { quantity: local.quantity, observedStock: local.observedStock, forecastMessageId: message.id } });
      return { status: 'done', local, effects };
    }
    case 'inventory.ready': {
      if (local.role !== 'supplier' || local.quantityMessageId || state.world.quantity !== message.payload.quantity || state.world.stock !== message.payload.observedStock || !state.messages.some(m => m.id === message.payload.forecastMessageId && m.kind === 'demand.ready' && m.status === 'consumed')) return reject('missing-or-repeated-prerequisite');
      local.quantityMessageId = message.id; local.quoteId = 'quote-1'; local.unitPrice = state.spec.task.unitPrice;
      const quote: Quote = { id: local.quoteId, supplierId: 'simulated-supplier', quantity: message.payload.quantity, unitPrice: local.unitPrice, amount: message.payload.quantity * local.unitPrice };
      effects.push({ type: 'quote', quote });
      send({ from: 'supplier', to: 'finance', kind: 'quote.ready', payload: { ...quote, sourceQuantityMessageId: message.id } });
      return { status: 'done', local, effects };
    }
    case 'quote.ready': {
      const { sourceQuantityMessageId, ...quote } = message.payload;
      if (local.role !== 'finance' || local.quoteMessageId || canonical(state.world.quote) !== canonical(quote) || !state.messages.some(m => m.id === sourceQuantityMessageId && m.kind === 'inventory.ready' && m.status === 'consumed')) return reject('missing-or-repeated-prerequisite');
      local.quoteMessageId = message.id; effects.push({ type: 'approval' });
      return { status: 'done', local, effects };
    }
    case 'recovery.requested': {
      if (local.role !== 'finance' || !local.quoteMessageId || message.payload.quoteId !== state.world.quote?.id || message.payload.refreshAttempt !== 1) return reject('missing-prerequisite');
      effects.push({ type: 'approval' }); return { status: 'done', local, effects };
    }
    case 'approval.ready': {
      if (local.role !== 'purchase' || !state.world.approvals.some(a => canonical(a) === canonical(message.payload)) || local.approvalIds.includes(message.payload.id)) return reject('missing-or-repeated-prerequisite');
      local.quoteId = message.payload.quoteId; local.approvalIds.push(message.payload.id); local.latestWorldVersion = state.world.version;
      const fault = [...state.spec.faults, ...state.injectedFaults].find(f => f.kind === 'duplicate-purchase-proposal' && !state.consumedFaultIds.includes(f.id));
      const first = proposal(message.payload, local.proposalIds.length + 1, local.intentId);
      const proposals = fault ? [first, proposal(message.payload, local.proposalIds.length + 2, local.intentId)] : [first];
      if (fault) effects.push({ type: 'consume-fault', faultId: fault.id });
      local.proposalIds.push(...proposals.map(p => p.proposalId)); local.pendingProposalIds.push(...proposals.map(p => p.proposalId)); local.outcome = 'waiting';
      if (state.spec.schedule === 'proposal-2-first') proposals.reverse();
      for (const p of proposals) send({ from: 'purchase', to: 'orchestrator', kind: 'purchase.proposed', payload: p });
      return { status: 'waiting', local, effects };
    }
    case 'purchase.proposed': {
      if (local.role !== 'orchestrator' || !state.agents.purchase.consumedMessageIds.some(id => state.messages.find(m => m.id === id)?.kind === 'approval.ready')) return reject('missing-prerequisite');
      local.phase = 'committing'; effects.push({ type: 'schedule-commit', messageId: message.id });
      return { status: 'working', local, effects };
    }
    case 'purchase.result': {
      if (local.role !== 'purchase' || !local.pendingProposalIds.includes(message.payload.proposalId)) return reject('missing-or-repeated-prerequisite');
      local.pendingProposalIds = local.pendingProposalIds.filter(id => id !== message.payload.proposalId); local.latestWorldVersion = message.payload.observedWorldVersion;
      if (message.payload.orderId) local.outcome = 'confirmed';
      effects.push({ type: 'purchase-response', message });
      return { status: local.outcome === 'confirmed' ? 'done' : 'blocked', local, effects };
    }
    case 'reconciliation.requested': {
      if (local.role !== 'orchestrator') return reject('invalid-recipient');
      local.phase = 'reconciling'; effects.push({ type: 'query-order', message }); return { status: 'working', local, effects };
    }
    case 'reconciliation.result': {
      if (local.role !== 'purchase' || local.outcome !== 'unknown') return reject('missing-prerequisite');
      local.latestWorldVersion = message.payload.observedWorldVersion; local.outcome = message.payload.order ? 'confirmed' : 'failed'; local.pendingProposalIds = [];
      effects.push({ type: 'reconciled', message }); return { status: message.payload.order ? 'done' : 'failed', local, effects };
    }
    case 'task.result': {
      if (local.role !== 'orchestrator') return reject('invalid-recipient');
      local.confirmed = message.payload.outcome === 'confirmed' && message.payload.confirmedOrderIds.length > 0 && message.payload.confirmedOrderIds.every(id => state.world.orders.some(o => o.id === id && o.orderIntentId === message.payload.orderIntentId));
      local.phase = local.confirmed ? 'confirmed' : 'failed'; effects.push({ type: 'confirmed', confirmed: local.confirmed });
      return { status: local.confirmed ? 'done' : 'failed', local, effects };
    }
  }
}
