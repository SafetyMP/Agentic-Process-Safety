import { AGENT_IDS, SIMULATION_LABEL } from './types.ts';
import type { WorkflowState, WorkflowView } from './types.ts';
import { MODE_LABELS, SCENARIOS } from './scenarios.ts';
import { canAdvance } from './scheduler.ts';
import { availableFaultKinds } from './engine.ts';
import { observeInvariants, workflowMetrics } from './oracle.ts';

/** Detached data: UI mutation cannot change the engine's owned state. */
export function selectWorkflow(s: WorkflowState): WorkflowView {
  const o = s.agents.orchestrator.local;
  return structuredClone({ runKey: s.runKey, scenarioTitle: SCENARIOS.find(item => item.id === s.spec.scenario)!.title, modeLabel: MODE_LABELS[s.spec.mode], status: s.status, running: s.running,
    logicalTime: s.logicalTime, transitionCount: s.transitionCount, agents: AGENT_IDS.map(id => s.agents[id]), messages: s.messages, events: s.events, worldSummary: s.world,
    invariants: observeInvariants(s), metrics: workflowMetrics(s), controls: { canStart: canAdvance(s) && !s.running, canPause: s.running, canStep: canAdvance(s), canReset: true,
      canRecover: s.status === 'blocked-recoverable' && o.role === 'orchestrator' && o.refreshAttempts < 1,
      canReconcile: s.status === 'outcome-unknown' && o.role === 'orchestrator' && o.reconciliationAttempts < 1, canInject: availableFaultKinds(s).length > 0,
      reasonCode: s.status, blockedEventId: s.blockedEventId, unknownEventId: s.unknownEventId, availableFaultKinds: availableFaultKinds(s) },
    limitations: [SIMULATION_LABEL, 'Simulated interleaving; no parallel operating-system workers.', 'Browser comparator rules are not Python/OPA execution or production authorization.', 'No human review or general objective arbitration. Existing objective-arbitration gap remains.', 'New browser run; frozen recorded experiments remain separate.', 'Seed is replay metadata in model v1; explicit inputs and schedules determine behavior.', 'FNV-1a consistency checksums do not authenticate identity or establish safety.'], label: SIMULATION_LABEL });
}
