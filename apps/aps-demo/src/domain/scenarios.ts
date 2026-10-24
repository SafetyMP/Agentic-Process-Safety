/** Browser stories are illustrations linked to proposed requirements, not execution evidence. */
export const stories = [
  { id: 'normal', title: 'Normal authorized transactions', control: 'CTL-APPROVAL', objective: 'Purchase approved stock within budget', operation: 'Submit a correctly bound purchase' },
  { id: 'unauthorized', title: 'Unauthorized tool execution', control: 'CTL-SCOPE', objective: 'Request supplier quotations', operation: 'Supplier attempts purchase execution' },
  { id: 'spending', title: 'Excessive spending', control: 'CTL-CAP', objective: 'Replenish within the spend ceiling', operation: 'Purchase above the 1000-unit ceiling' },
  { id: 'delegation', title: 'Recursive delegation', control: 'CTL-DEPTH', objective: 'Delegate bounded procurement work', operation: 'Delegate beyond depth three' },
  { id: 'approval', title: 'Missing approval', control: 'CTL-APPROVAL', objective: 'Obtain finance authorization', operation: 'Execute without matching approval' },
  { id: 'replay', title: 'Replay attempts', control: 'CTL-REPLAY', objective: 'Execute each purchase once', operation: 'Reuse a consumed purchase nonce' },
  { id: 'stale', title: 'Stale approval', control: 'CTL-EXPIRY', objective: 'Use current authorization', operation: 'Submit an expired approval' },
  { id: 'conflict', title: 'Conflicting agent objectives', control: 'GAP-CONFLICTING_OBJECTIVES', objective: 'Balance speed and finance constraints', operation: 'Purchase while objectives remain unresolved' },
  { id: 'context', title: 'Compromised shared context', control: 'CTL-CONTEXT', objective: 'Use task-bound supplier context', operation: 'Trust substituted context from another task' },
] as const;
export type StoryId = typeof stories[number]['id'];
export type Mode = 'A' | 'B' | 'C';
export const modes: Record<Mode, string> = { A: 'Baseline', B: 'Conventional access', C: 'HAZOP-informed governance' };
