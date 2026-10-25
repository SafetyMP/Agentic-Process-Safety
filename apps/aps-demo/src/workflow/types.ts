/** Browser-only protocol. These records never confer real operational authority. */
export const SIMULATION_LABEL = 'SIMULATED — deterministic local agents; no live models, APIs or purchases.';
export const AGENT_IDS = ['orchestrator', 'demand', 'inventory', 'supplier', 'finance', 'purchase'] as const;
export type AgentId = typeof AGENT_IDS[number];
export type Mode = 'A' | 'B' | 'C';
export type ScenarioId = 'nominal' | 'approval-delay' | 'purchase-race' | 'lost-purchase-response';
export type RunStatus = 'ready' | 'active' | 'blocked-recoverable' | 'outcome-unknown' | 'completed' | 'failed' | 'budget-exhausted';
export type AgentStatus = 'idle' | 'waiting' | 'ready' | 'working' | 'blocked' | 'unknown' | 'done' | 'failed';
export type FaultSpec = { id: string; kind: 'delay-approval'; delay: 60 }
  | { id: string; kind: 'duplicate-purchase-proposal' | 'drop-first-purchase-response' };
export const LIMITS = { maxTransitions: 100, maxMessages: 100, maxLogicalTime: 1000, maxRefreshAttempts: 1, maxReconciliationAttempts: 1 } as const;
export const MAX_EVENTS = 1000;
export const MAX_JOURNAL = 100;
export const MAX_EXPORT_BYTES = 262144;
export interface TaskInput { id: string; contextId: string; demand: number; stock: number; unitPrice: number; budget: number; approvalTtl: number }
export interface RunSpec {
  schemaVersion: 'aps-browser-workflow/1'; modelVersion: 'procurement-local/1'; schedulerVersion: 'logical-fifo/1';
  scenario: ScenarioId; scenarioVersion: 1; fixtureDigest: string; seed: number; mode: Mode; task: TaskInput;
  faults: readonly FaultSpec[]; schedule: 'proposal-1-first' | 'proposal-2-first'; limits: typeof LIMITS;
}
export interface Binding { taskId: string; contextId: string; supplierId: string; quantity: number; amount: number; quoteId: string; modelVersion: 'procurement-local/1'; mode: Mode }
export interface Quote { id: string; supplierId: 'simulated-supplier'; quantity: number; unitPrice: number; amount: number }
export interface SimApproval extends Binding { id: string; issuedAt: number; expiresAt: number; expectedWorldVersion: number; consumedByOrderId: string | null }
export interface Proposal extends Binding { proposalId: string; orderIntentId: string; approvalId: string; expectedWorldVersion: number; idempotencyKey: string }
export interface SimOrder extends Binding { id: string; label: 'SIMULATED'; orderIntentId: string; proposalId: string; idempotencyKey: string; approvalId: string; committedAt: number; worldVersion: number; causedByEventIds: readonly string[] }
export interface WorldState { version: number; taskId: string; contextId: string; demand: number | null; stock: number; quantity: number | null; quote: Quote | null; approvals: SimApproval[]; orders: SimOrder[]; spent: number; idempotentResults: { key: string; semanticFingerprint: string; orderId: string }[] }
export type AgentLocal =
  | { role: 'orchestrator'; phase: string; refreshAttempts: number; reconciliationAttempts: number; confirmed: boolean }
  | { role: 'demand'; acceptedTask: TaskInput | null; forecast: number | null }
  | { role: 'inventory'; forecastMessageId: string | null; observedStock: number | null; quantity: number | null }
  | { role: 'supplier'; quantityMessageId: string | null; quoteId: string | null; unitPrice: number | null }
  | { role: 'finance'; quoteMessageId: string | null; approvalIds: string[] }
  | { role: 'purchase'; quoteId: string | null; approvalIds: string[]; proposalIds: string[]; latestWorldVersion: number; intentId: string; pendingProposalIds: string[]; outcome: 'none' | 'waiting' | 'unknown' | 'confirmed' | 'failed' };
export interface AgentState { id: AgentId; status: AgentStatus; inbox: string[]; consumedMessageIds: string[]; lastEventId: string | null; local: AgentLocal }
export interface PurchaseResult { proposalId: string; outcome: 'committed' | 'cached' | 'denied'; reasonCode: string; orderId: string | null; observedWorldVersion: number }
export interface PayloadMap {
  'task.assigned': TaskInput;
  'demand.ready': { forecast: number; sourceTaskMessageId: string };
  'inventory.ready': { quantity: number; observedStock: number; forecastMessageId: string };
  'quote.ready': Quote & { sourceQuantityMessageId: string };
  'approval.ready': SimApproval;
  'purchase.proposed': Proposal;
  'purchase.result': PurchaseResult;
  'recovery.requested': { blockedEventId: string; quoteId: string; orderIntentId: string; refreshAttempt: 1 };
  'reconciliation.requested': { proposalId: string; orderIntentId: string; idempotencyKey: string; unknownEventId: string };
  'reconciliation.result': { order: SimOrder | null; observedWorldVersion: number; requestMessageId: string };
  'task.result': { orderIntentId: string; confirmedOrderIds: string[]; outcome: 'confirmed' | 'failed' };
}
export type MessageKind = keyof PayloadMap;
export type Message = { [K in MessageKind]: { id: string; taskId: string; contextId: string; from: AgentId; to: AgentId; kind: K; payload: PayloadMap[K]; causedByEventIds: string[]; createdAt: number; deliverAt: number; deliveredAt?: number; consumedAt?: number; attempt: number; status: 'queued' | 'delivered' | 'consumed' | 'dropped' | 'rejected' } }[MessageKind];
export type DraftMessage = { [K in MessageKind]: { kind: K; payload: PayloadMap[K]; from: AgentId; to: AgentId } }[MessageKind];
export type TransitionKind = 'deliver-message' | 'consume-message' | 'commit-purchase' | 'purchase-response-timeout';
export interface ScheduledTransition { id: string; dueAt: number; priority: number; insertionSequence: number; kind: TransitionKind; messageId: string; causedByEventIds: string[] }
export interface EventDataMap {
  'run-created': { simulationOnly: true; scenario: ScenarioId };
  'message-queued': { kind: MessageKind; to: AgentId };
  'message-delivered': { kind: MessageKind; from: AgentId };
  'message-consumed': { kind: MessageKind; from: AgentId };
  'message-dropped': { kind: MessageKind; faultId: string };
  'agent-transition': { role: AgentId };
  'approval-issued': { approvalId: string; expiresAt: number };
  'purchase-decided': PurchaseResult;
  'order-committed': { orderId: string; proposalId: string };
  'response-timeout': { proposalId: string };
  'recovery-requested': { blockedEventId: string };
  'reconciliation-observed': { orderId: string | null };
  'invariant-observed': { invariantId: string; status: 'pass' | 'fail' | 'unknown' };
  'run-terminal': { status: RunStatus; canceledTransitionIds: string[] };
  'command-rejected': { command: string };
}
export type EventType = keyof EventDataMap;
export type WorkflowEvent = { [K in EventType]: { id: string; runKey: string; sequence: number; logicalTime: number; transitionId: string; type: K; actor: AgentId; messageId?: string; parentEventIds: string[]; worldVersionBefore: number; worldVersionAfter: number; agentStatusBefore?: AgentStatus; agentStatusAfter?: AgentStatus; reasonCode?: string; data: EventDataMap[K] } }[EventType];
export type WorkflowCommand = { type: 'start' | 'pause' | 'step' | 'timer' | 'reset' }
  | { type: 'configure'; spec: RunSpec } | { type: 'recover'; blockedEventId: string }
  | { type: 'reconcile'; unknownEventId: string } | { type: 'inject'; fault: FaultSpec };
export interface JournalEntry { atTransition: number; command: Extract<WorkflowCommand, { type: 'recover' | 'reconcile' | 'inject' }> }
export interface WorkflowState { spec: RunSpec; runKey: string; status: RunStatus; running: boolean; logicalTime: number; transitionCount: number; agents: Record<AgentId, AgentState>; messages: Message[]; queue: ScheduledTransition[]; world: WorldState; events: WorkflowEvent[]; journal: JournalEntry[]; consumedFaultIds: string[]; injectedFaults: FaultSpec[]; nextId: number; currentTransitionId: string; blockedEventId: string | null; unknownEventId: string | null }
export interface InvariantObservation { id: string; status: 'pass' | 'fail' | 'unknown'; evidenceEventIds: string[]; explanationCode: string }
export interface WorkflowMetrics { committedOrders: number; spent: number; unsafeCommittedEffects: number; deniedProposals: number; cachedResults: number; recoveryAttempts: number; reconciliationAttempts: number; completed: boolean; safeCompleted: boolean; pendingMessages: number }
export interface WorkflowView { runKey: string; scenarioTitle: string; modeLabel: string; status: RunStatus; running: boolean; logicalTime: number; transitionCount: number; agents: readonly AgentState[]; messages: readonly Message[]; events: readonly WorkflowEvent[]; worldSummary: WorldState; invariants: readonly InvariantObservation[]; metrics: WorkflowMetrics; controls: { canStart: boolean; canPause: boolean; canStep: boolean; canReset: boolean; canRecover: boolean; canReconcile: boolean; canInject: boolean; reasonCode: string; blockedEventId: string | null; unknownEventId: string | null; availableFaultKinds: FaultSpec['kind'][] }; limitations: readonly string[]; label: string }
export type ImportErrorCode = 'invalid-json' | 'invalid-structure' | 'unsupported-version' | 'digest-mismatch' | 'resource-limit' | 'replay-mismatch';
export type ImportResult = { ok: true; state: WorkflowState } | { ok: false; code: ImportErrorCode; message: string };
