import { stories, type Mode, type StoryId } from './scenarios.ts';

export type Decision = 'allow' | 'deny' | 'review';
export interface Request {
  actor: 'purchase' | 'supplier'; amount: number; depth: number;
  approved: boolean; approvalAge: number; replay: boolean;
  contextBound: boolean; objectivesResolved: boolean;
}
export interface Outcome { decision: Decision; reason: string }
export interface RuleResult { rule: string; status: 'pass' | 'fail' | 'skipped'; reason: string; terminal?: Decision }
export interface Event extends Outcome {
  id: string; tick: number; stage: string; category: 'Illustrative browser simulation';
  control: string; unsafe: boolean; executed: boolean; amount: number;
}
export interface State {
  seed: number; mode: Mode; story: StoryId; tick: number;
  running: boolean; completed: boolean; events: Event[]; fault: StoryId | null;
  pending: Request | null;
}
export type Action = { type: 'start' | 'pause' | 'step' | 'timer' | 'reset' }
  | { type: 'configure'; seed?: unknown; mode?: Mode; story?: StoryId }
  | { type: 'inject'; story: StoryId }
  | { type: 'resolve'; approved: boolean };

export function boundedSeed(value: unknown): number {
  const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? Math.min(2147483647, Math.max(0, Math.floor(parsed))) : 1;
}
/** Integer mixing, intentionally independent of Python workload generation. */
function quantity(seed: number): number {
  let n = seed | 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return 100 + ((n ^ (n >>> 16)) >>> 0) % 300;
}
export function requestFor(story: StoryId, seed: number): Request {
  const request: Request = { actor: 'purchase', amount: quantity(seed), depth: 1,
    approved: true, approvalAge: 0, replay: false, contextBound: true, objectivesResolved: true };
  switch (story) {
    case 'unauthorized': request.actor = 'supplier'; break;
    case 'spending': request.amount = 1200; break;
    case 'delegation': request.depth = 4; break;
    case 'approval': request.approved = false; break;
    case 'replay': request.replay = true; break;
    case 'stale': request.approvalAge = 61; break;
    case 'conflict': request.objectivesResolved = false; break;
    case 'context': request.contextBound = false; break;
  }
  return request;
}
export function evaluate(mode: Mode, request: Request): Outcome {
  const terminal = decisionTrace(mode, request).find(check => check.terminal);
  return terminal ? { decision: terminal.terminal!, reason: terminal.reason }
    : { decision: 'allow', reason: mode === 'A' ? 'Baseline illustration: no gateway checks'
      : mode === 'B' ? 'Conventional actor/tool and spend checks pass'
      : 'Illustrative scope, spend, binding, freshness and uniqueness checks pass' };
}
/** Exposes the same ordered, short-circuit model checks without claiming OPA execution. */
export function decisionTrace(mode: Mode, request: Request): RuleResult[] {
  if (mode === 'A') return [{ rule: 'Baseline', status: 'skipped', reason: 'Arm A has no gateway checks' }];
  const checks: [string, boolean, string, Decision?][] = [
    ['Tool authority', request.actor === 'purchase', request.actor === 'purchase' ? 'Purchase actor has tool permission' : 'Actor lacks purchase tool permission'],
    ['Spend ceiling', Number.isFinite(request.amount) && request.amount > 0 && request.amount <= 1000, 'Spend must be positive and within the 1000-unit ceiling'],
  ];
  if (mode === 'C') checks.push(
    ['Delegation', request.depth <= 3, 'Depth at most three'],
    ['Approval binding', request.approved, 'Matching finance approval exists'],
    ['Replay protection', !request.replay, 'Purchase nonce has not been consumed'],
    ['Approval freshness', request.approvalAge < 60, 'Age below 60 logical seconds'],
    ['Context binding', request.contextBound, 'Shared context bound to this task'],
    ['Objective review', request.objectivesResolved, 'Unresolved objectives enter illustrative review; production arbitration is a gap', 'review'],
    ['Human threshold', request.amount <= 500, 'Amounts above 500 enter illustrative human review', 'review'],
  );
  let stopped = false;
  return checks.map(([rule, passes, reason, decision = 'deny']) => {
    const status = stopped ? 'skipped' : passes ? 'pass' : 'fail';
    if (!passes) stopped = true;
    return { rule, status, ...(status === 'fail' ? { terminal: decision } : {}), reason: status === 'skipped' ? 'Not evaluated after an earlier terminal rule' : reason };
  });
}
export function initialState(seed: unknown = 1, mode: Mode = 'C', story: StoryId = 'normal'): State {
  return { seed: boundedSeed(seed), mode, story, tick: 0, running: false, completed: false,
    events: [], fault: null, pending: null };
}
function advance(state: State): State {
  if (state.completed || state.pending) return state;
  const tick = state.tick + 1;
  if (tick < 3) return { ...state, tick };
  const story = state.fault ?? state.story;
  const request = requestFor(story, state.seed);
  const outcome = evaluate(state.mode, request);
  const event: Event = { ...outcome, id: `sim-${state.seed}-${state.mode}-${story}-${tick}`,
    tick, stage: 'SIMULATED gateway decision', category: 'Illustrative browser simulation',
    control: stories.find(item => item.id === story)!.control, unsafe: story !== 'normal',
    executed: outcome.decision === 'allow', amount: request.amount };
  return { ...state, tick, events: [...state.events, event], running: false,
    pending: outcome.decision === 'review' ? request : null, completed: outcome.decision !== 'review' };
}
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'configure': {
      const seed = boundedSeed(action.seed ?? state.seed);
      const mode = action.mode ?? state.mode;
      const story = action.story ?? state.story;
      return seed === state.seed && mode === state.mode && story === state.story
        ? state : initialState(seed, mode, story);
    }
    case 'reset': return initialState(state.seed, state.mode, state.story);
    case 'start': return state.completed || state.pending ? state : { ...state, running: true };
    case 'pause': return { ...state, running: false };
    case 'timer': return state.running ? advance(state) : state;
    case 'step': return advance({ ...state, running: false });
    case 'inject': return state.completed || state.pending ? state : { ...state, fault: action.story };
    case 'resolve': {
      if (!state.pending) return state;
      const last = state.events[state.events.length - 1];
      const event: Event = { ...last, id: `${last.id}-review`, tick: state.tick + 1,
        stage: 'SIMULATED human review', decision: action.approved ? 'allow' : 'deny',
        executed: action.approved, reason: action.approved ? 'Illustrative reviewer approved; no production authorization issued' : 'Illustrative reviewer denied' };
      return { ...state, tick: event.tick, pending: null, completed: true, running: false, events: [...state.events, event] };
    }
  }
}
export function metrics(state: State) {
  return { unsafeAttempts: state.events.filter(event => event.unsafe && event.stage === 'SIMULATED gateway decision').length,
    unsafeExecuted: state.events.filter(event => event.unsafe && event.executed).length,
    blocked: state.events.filter(event => event.decision === 'deny').length,
    taskCompleted: state.events.some(event => event.executed), category: 'Illustrative browser simulation' as const };
}
