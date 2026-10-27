import { fireEvent, screen } from '@testing-library/react';

type StepObservation = {
  phase: string; step: number; lookupMs: number; clickMs: number;
  styleCalls: number; cacheHits: number; cacheMisses: number; nativeStyleMs: number;
  reducerMs: number; reducerCalls: number; renderMs: number; renderCalls: number;
  transitionCount: number; eventCount: number; boundary: boolean; lookupCompleted: boolean;
};
const diagnosticCase = 'shows the race loser without erasing the C winner and exposes A duplicate effects';
// Diagnostic-only state: no records/clocks/output for any other test.
export const workflowDiagnostic = {
  active: false, emitted: false, phase: '', started: 0, wallStarted: 0,
  cpuStarted: null as ReturnType<typeof process.cpuUsage> | null,
  records: [] as StepObservation[], current: null as StepObservation | null,
  clockReads: 0, dropped: 0, recordBookkeepingMs: 0,
  outsideStepRenderMs: 0, outsideStepRenderCalls: 0,
  outsideStepReducerMs: 0, outsideStepReducerCalls: 0,
  transitionCount: 0, eventCount: 0,
  now() { this.clockReads++; return performance.now(); },
  begin(caseName: string) {
    this.active = caseName === diagnosticCase; this.emitted = false;
    this.records = []; this.current = null; this.phase = '';
    this.clockReads = 0; this.dropped = 0; this.recordBookkeepingMs = 0;
    this.outsideStepRenderMs = 0; this.outsideStepRenderCalls = 0;
    this.outsideStepReducerMs = 0; this.outsideStepReducerCalls = 0;
    this.transitionCount = 0; this.eventCount = 0;
    if (this.active) { this.started = this.now(); this.wallStarted = Date.now(); this.cpuStarted = process.cpuUsage(); }
  },
  state(phase: string, transitionCount: number, eventCount: number) {
    if (!this.active) return;
    this.phase = phase; this.transitionCount = transitionCount; this.eventCount = eventCount;
  },
  rendered(duration: number) {
    if (!this.active) return;
    if (this.current) { this.current.renderMs += duration; this.current.renderCalls++; }
    else { this.outsideStepRenderMs += duration; this.outsideStepRenderCalls++; }
  },
  reduced(duration: number) {
    if (!this.active) return;
    if (this.current) { this.current.reducerMs += duration; this.current.reducerCalls++; }
    else { this.outsideStepReducerMs += duration; this.outsideStepReducerCalls++; }
  },
  beginStep(step: number) {
    if (!this.active) return null;
    this.current = { phase: this.phase, step, lookupMs: 0, clickMs: 0, styleCalls: 0, cacheHits: 0, cacheMisses: 0,
      nativeStyleMs: 0, reducerMs: 0, reducerCalls: 0, renderMs: 0, renderCalls: 0,
      transitionCount: this.transitionCount, eventCount: this.eventCount, boundary: false, lookupCompleted: false };
    return this.current;
  },
  endStep(sample: StepObservation | null) {
    if (!sample) return;
    const start = this.now();
    sample.transitionCount = this.transitionCount; sample.eventCount = this.eventCount;
    if (this.records.length < 512) this.records.push(sample); else this.dropped++;
    this.current = null; this.recordBookkeepingMs += this.now() - start;
  },
  emit() {
    if (!this.active || this.emitted) return;
    const elapsedMs = this.now() - this.started;
    const cpu = process.cpuUsage(this.cpuStarted!);
    const boundedWorker = (value: string | undefined) => value && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null;
    const observation = { schema: 'aps-workflow-postcache-diagnostic-1', caseName: diagnosticCase,
      node: process.version, platform: process.platform, architecture: process.arch,
      worker: { id: boundedWorker(process.env.VITEST_WORKER_ID), pool: boundedWorker(process.env.VITEST_POOL_ID) },
      elapsedMs, wallMs: Date.now() - this.wallStarted, cpuUserMs: cpu.user / 1000, cpuSystemMs: cpu.system / 1000,
      clockReads: this.clockReads, recordBookkeepingMs: this.recordBookkeepingMs,
      outsideStepRenderMs: this.outsideStepRenderMs, outsideStepRenderCalls: this.outsideStepRenderCalls,
      outsideStepReducerMs: this.outsideStepReducerMs, outsideStepReducerCalls: this.outsideStepReducerCalls,
      recordCap: 512, byteCap: 262144, droppedRecords: this.dropped, records: this.records,
      finishHookReached: true, truncated: false };
    this.emitted = true; this.active = false; this.current = null;
    let encoded = JSON.stringify(observation);
    if (Buffer.byteLength(encoded) > 262144) encoded = JSON.stringify({ ...observation, records: [], truncated: true });
    console.log('CI_WF01_POSTCACHE_DIAGNOSTIC ' + encoded);
  },
};

// A role query is synchronous and reads a stable DOM. Share repeated style reads
// inside that query only; never cache controls, accessible names or cross-step data.
export function withFreshStyleCache<T>(lookup: () => T): T {
  const original = window.getComputedStyle;
  const styles = new WeakMap<Element, Map<string | null | undefined, CSSStyleDeclaration>>();
  const sample = workflowDiagnostic.active ? workflowDiagnostic.current : null;
  let nativeDepth = 0;
  window.getComputedStyle = (element, pseudoElement) => {
    if (sample) sample.styleCalls++;
    let variants = styles.get(element);
    if (!variants) { variants = new Map(); styles.set(element, variants); }
    let style = variants.get(pseudoElement);
    if (!style) {
      if (sample) sample.cacheMisses++;
      const timed = sample && nativeDepth === 0;
      if (sample) nativeDepth++;
      const start = timed ? workflowDiagnostic.now() : 0;
      try { style = original.call(window, element, pseudoElement); }
      finally {
        if (sample) nativeDepth--;
        if (timed) sample.nativeStyleMs += workflowDiagnostic.now() - start;
      }
      variants.set(pseudoElement, style);
    } else if (sample) sample.cacheHits++;
    return style;
  };
  try { return lookup(); }
  finally { window.getComputedStyle = original; }
}

export function stepToBoundary() {
  for (let step = 0; step < 100; step++) {
    const sample = workflowDiagnostic.beginStep(step);
    try {
      const lookupStart = sample ? workflowDiagnostic.now() : 0;
      let button: HTMLButtonElement;
      try {
        button = withFreshStyleCache(() => screen.getByRole('button', { name: 'Step one transition' })) as HTMLButtonElement;
        if (sample) sample.lookupCompleted = true;
      } finally { if (sample) sample.lookupMs = workflowDiagnostic.now() - lookupStart; }
      if (button.disabled) { if (sample) sample.boundary = true; return; }
      const clickStart = sample ? workflowDiagnostic.now() : 0;
      try { fireEvent.click(button); }
      finally { if (sample) sample.clickMs = workflowDiagnostic.now() - clickStart; }
    } finally { workflowDiagnostic.endStep(sample); }
  }
  throw new Error('No workflow boundary reached in 100 UI steps');
}
