import type { ScenarioId } from '../workflow/index.ts';
import type { StoryId } from './scenarios.ts';

export type MappingCoverage = 'direct' | 'partial' | 'related' | 'unmapped';
export type FindingExercise = { coverage: MappingCoverage; explanation: string; stories: { id: StoryId; label: string }[] };
/** Authored navigation relationships, not hazard acceptance or control validation. */
const findingExercises: Record<string, FindingExercise> = {
  'APS-11dc498eedac1dc719df': { coverage: 'direct', explanation: 'The missing-approval request illustrates purchase before finance authorization. This is an illustration of the departure, not validation of the full finding.', stories: [{ id: 'approval', label: 'Missing approval request' }] },
  'APS-ad4a560c0e8ea4fa1023': { coverage: 'partial', explanation: 'The scope-control mapping is authored. The request illustrates a supplier invoking purchase; it does not simulate modification of finance approval state described by the finding.', stories: [{ id: 'unauthorized', label: 'Unauthorized supplier request' }] },
  'APS-9ff8cf4dd2a44c3f7675': { coverage: 'partial', explanation: 'The request checks excessive delegation depth. It does not reproduce a delegation loop or measure exhaustion and delay.', stories: [{ id: 'delegation', label: 'Delegation depth request' }] },
  'APS-f47191931b96a999a61c': { coverage: 'related', explanation: 'The source concerns quotation expiry and a higher-price consequence. This request expires an approval at a fixed price; it does not demonstrate the quotation consequence.', stories: [{ id: 'stale', label: 'Related approval-expiry request' }] },
  'APS-cba2079e303e85c4acd1': { coverage: 'partial', explanation: 'The context request checks substituted task context. It does not reproduce supplier text overwriting finance instructions or establish source truth.', stories: [{ id: 'context', label: 'Related context-substitution request' }] },
  'APS-95e53e8ec7ec6a96a75b': { coverage: 'related', explanation: 'The objective-conflict request is illustrative. Production arbitration and the source oscillation/delay consequence remain unmeasured.', stories: [{ id: 'conflict', label: 'Related objective-conflict request' }] },
  'APS-feea4beb9cc5c02aa980': { coverage: 'related', explanation: 'The source concerns duplicated forecast quantities. Spend-cap and nonce-replay checks are related proposed controls; neither request reproduces duplicated forecasting.', stories: [{ id: 'spending', label: 'Related spend-cap request' }, { id: 'replay', label: 'Related nonce-replay request' }] },
};
export function findingExercise(hazardId: string): FindingExercise {
  return findingExercises[hazardId] ?? { coverage: 'unmapped', explanation: 'No runnable request illustration is mapped to this finding. Inspect its proposed controls and evidence, or return to the register without changing the active run.', stories: [] };
}

type Study = { title: string; summary: string; coverage: MappingCoverage; findingId?: string; mappingNote: string; questions: readonly [string, string, string, string, string] };
export const workflowStudies: Record<ScenarioId, Study> = {
  nominal: {
    title: 'What establishes an acceptable purchasing outcome?',
    summary: 'Review the ordinary handoffs from one supply need to a recorded commitment and confirmation.',
    coverage: 'unmapped',
    mappingNote: 'No single failure finding is mapped to the nominal workflow. This is a process-design review, not evidence that every hazard has been assessed.',
    questions: [
      'Intent: derive the shortage, obtain matching simulated permission and record one commitment for the need. Supply continuity is the business objective; delivery and factory output are outside this model.',
      'Challenge missing, repeated or unauthorized work at each handoff. A nominal run is a starting point for these questions, not evidence that failures cannot occur.',
      'Check quantity, quote, permission and recorded order before discussing consequences. Incorrect or missing handoffs could delay or misdirect purchasing; those business effects are not measured here.',
      'Specify exact authority at commitment, one commitment per intent, and reconciliation of uncertain results. Inspect which checks the selected configuration actually enforces.',
      'Ask the process owner what confirms the need was met, the engineering team what integration tests support the control, and the business which delivery evidence is still required.',
    ],
  },
  'approval-delay': {
    title: 'Can commitment occur after permission expires?',
    summary: 'Worked timing study, not a completed assessment: permission must still be valid when Purchase commits the order.',
    coverage: 'related', findingId: 'APS-f47191931b96a999a61c',
    mappingNote: 'Related timing finding—different object/coverage: the existing purchase/LATE finding concerns an expired QUOTATION and a higher-price consequence. This browser exercise expires an APPROVAL with a fixed quote price. It does not validate that quotation consequence, the full finding, the linked gateway or production effectiveness.',
    questions: [
      'Inspect the supply request: one need, one commitment within authority. Finance issues simulated permission; Purchase must still have valid authority when committing and confirming the order. No real approval is granted here.',
      'Ask whether permission could expire before commitment. A valid grant at issuance may be too late by the time Purchase uses it. This is a timing hypothesis, not a new generated finding or accepted assessment.',
      'A delayed handoff crosses the permission validity window. Inspect the permission times and actual order or block. A/B can confirm unsafe work despite expiry; C can stop and request a fresh simulated decision. Delay and business harm are not measured financial losses.',
      'Ask for matching, fresh permission at commitment, not only when issued. Retain the expired grant and exception history. HAZOP informs the safeguard question; the modeled runtime check performs the stop.',
      'Ask finance and purchasing owners to agree permission validity and exception responsibility, technical colleagues for enforcement evidence, and a risk reviewer to challenge adequacy. A scenario label or selected event alone does not prove the timing cause.',
    ],
  },
  'purchase-race': {
    title: 'Can two proposals create two commitments for one need?',
    summary: 'Review competing proposals, the state each relied on, and the commitments actually recorded.',
    coverage: 'related', findingId: 'APS-f40ccbe08a8109219f75',
    mappingNote: 'Related state-version finding: the source concerns a changed quantity relative to finance approval. This workflow schedules competing proposals against shared state and permission; it does not establish that full source consequence or distributed concurrency safety.',
    questions: [
      'Intent: one purchase intent should produce one authorized commitment for the supply need, even when two proposals are prepared.',
      'Ask whether both proposals can rely on the same outdated state or consume the same permission. Distinguish two proposals from two actual orders.',
      'Inspect proposal order, expected state versions, approval consumption and recorded commitments. Duplicate commitments could consume unnecessary budget; the example uses deterministic interleaving, not a real parallel load test.',
      'Require a current state version and unconsumed matching approval at commitment. Inspect which proposal was accepted or denied and retain both outcomes. These are modeled checks, not proof of atomicity in an external integration.',
      'Ask the process owner to define one business intent and the engineering team to test concurrency and duplicate prevention at the real commit boundary. Identify who resolves a rejected competing proposal.',
    ],
  },
  'lost-purchase-response': {
    title: 'How should an uncertain purchase outcome be resolved?',
    summary: 'Review the order already recorded, the missing reply, and the evidence needed before repeating a consequential action.',
    coverage: 'unmapped',
    mappingNote: 'No directly mapped source finding covers this workflow’s missing-response and reconciliation sequence. A nonce-replay request is a different model and does not validate this recovery path.',
    questions: [
      'Intent: learn whether the existing purchase intent committed, then confirm the result without issuing another order.',
      'Ask what the caller knows after the response is lost. Missing confirmation is not proof that the order failed or that no commitment exists.',
      'Inspect the recorded order, response-timeout event and intent identity. A blind retry can create a duplicate commitment in a real integration; this model records the dropped response and bounded reconciliation.',
      'Reconcile the existing intent before deciding whether another action is needed. The modeled reconciliation queries the recorded result and does not place a replacement order.',
      'Ask who owns an unknown outcome, what evidence can establish the result, and how long uncertainty is acceptable. Engineers should test lost replies and reconciliation against the intended integration.',
    ],
  },
};
