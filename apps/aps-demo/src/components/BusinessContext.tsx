import type { AgentId, ScenarioId, TaskInput } from '../workflow/index.ts';

// BUSINESS-VISITOR-COPY.md d6fbd627…; explanations never dispatch or derive outcomes.
const roleOrder: readonly AgentId[] = ['demand', 'inventory', 'supplier', 'finance', 'purchase', 'orchestrator'];
const roles: Record<AgentId, { name: string; work: string; question: string }> = {
  demand: { name: 'Demand', work: 'Takes the required quantity from the task input.', question: 'What need are we trying to meet, and who stands behind that input?' },
  inventory: { name: 'Inventory', work: 'Works out the shortage from demand and stock.', question: 'Are we buying the shortage rather than the full demand again?' },
  supplier: { name: 'Supplier', work: 'Prepares a simulated quote for that quantity.', question: 'Which quantity and price would this decision cover?' },
  finance: { name: 'Finance', work: 'Issues a simulated approval tied to the purchase details.', question: 'What was approved, and is that approval still valid?' },
  purchase: { name: 'Purchase', work: 'Proposes the order and tracks its outcome.', question: 'Was an order recorded, denied, or left with an uncertain outcome?' },
  orchestrator: { name: 'Orchestrator', work: 'Coordinates handoffs and the purchase boundary.', question: 'Did the required steps happen, and is confirmation supported?' },
};
const situations: Record<ScenarioId, { title: string; question: string; inspect: string }> = {
  nominal: { title: 'The ordinary purchase', question: 'What would count as a correct, acceptable result?', inspect: 'Inspect the replenishment quantity, recorded order, spend and confirmation. Placing an order does not mean supplies arrived.' },
  'approval-delay': { title: 'Permission expires while work continues', question: 'When must we stop, and what fresh evidence permits continuation?', inspect: 'Inspect the expiry, denial and order count before requesting a fresh approval. Blocking protects a boundary but delays progress; recovery keeps the original problem in the history.' },
  'purchase-race': { title: 'One need, competing proposals', question: 'How do we keep one business need from becoming two purchases?', inspect: 'Compare the proposal order, decisions, order count and spend. Proposals run in a fixed, visible order, not on two real workers running at once.' },
  'lost-purchase-response': { title: 'No reply does not mean no order', question: 'Should we check what happened before trying again?', inspect: 'Inspect the existing order and unknown outcome. Reconciliation checks the existing intent; it does not place a replacement order.' },
};

export function BusinessOverview() {
  return <section className="business-context business-welcome" aria-labelledby="business-welcome-title">
    <p className="eyebrow">A SHARED BUSINESS CONVERSATION</p><h2 id="business-welcome-title">Keep supplies moving. Keep purchasing control.</h2>
    <p>Imagine you are responsible for keeping a factory supplied. What would you let agents decide, where would you put limits, and what evidence would you need before accepting the result?</p>
    <p>Follow one purchasing example with your technical team. Six simulated roles divide the work. Discuss consequences and ownership while colleagues inspect the same handoffs, approvals and event history. You do not need to read code to take part.</p>
    <p className="business-boundary"><strong>Research demonstration.</strong> The factory is an illustrative story, not a production model. Agents, approvals, orders and spending are simulated; no live models, external APIs or purchases run. An order does not mean goods arrived, and a favorable model result does not certify a real system as safe.</p>
    <a className="button primary" href="#/simulator">Try the factory-supply exercise →</a>
    <details><summary>How HAZOP helps frame the questions</summary><p>HAZOP means Hazard and Operability study. Ask what each part is intended to do and how behavior could depart from that intent: too much, too late, or beyond its authority. HAZOP Lab provides structured questions, not automatic risk ratings. Findings remain unverified, with no supplied severity or likelihood ratings. Agent-specific categories are project extensions; this demonstration is not a complete qualified study or approval of requirements.</p></details>
  </section>;
}

export function BusinessExercise({ task }: { task: Readonly<TaskInput> }) {
  return <section className="panel business-context" aria-labelledby="business-exercise-title">
    <p className="eyebrow">FACTORY-SUPPLY DISCUSSION</p><h2 id="business-exercise-title">When should purchasing continue?</h2>
    <p>Suggested discussion time: 10–15 minutes, not a measured visitor completion time. Use the generated workflow here; keep the separate single-request policy illustration below closed for this exercise.</p>
    <p className="business-current-inputs">This run's task inputs: demand {task.demand}, stock {task.stock}, unit price {task.unitPrice}, budget {task.budget} simulated units. Inventory derives what to buy; inspect the world records below for the resulting quantity and quote.</p>
    <p>Start with Nominal procurement and C · Defended browser comparator using the controls below. Apply the selection, then start or step. Open the exercise for discussion prompts and comparisons.</p>
    <details><summary>Follow the four-stage exercise</summary>
    <ol className="business-steps">
      <li><h3>See the ordinary path</h3><p>Choose Nominal procurement and C · Defended browser comparator, then Apply selection and start new run. Check the Active labels. Use Start workflow or Step one transition. Read orders and spend alongside Task confirmed (business confirmation) and Safe model completion. What has—and has not—happened?</p></li>
      <li><h3>Handle an expired approval</h3><p>Choose Expired approval and recovery, keep C, apply and run. Inspect the denial and whether an order exists before using Request one approval refresh. Continue and inspect the retained history. What risk does stopping address, and what delay or effort does it introduce?</p></li>
      <li><h3>Compare completion with controlled completion</h3><p>Record your observations before changing runs: Apply clears the current history. Keep the expiry scenario, switch to A · Baseline browser comparator, apply and run. Compare Task confirmed with safe completion and unsafe effects. Confirmation alone can coexist with an expired approval. Would that satisfy your business objective?</p></li>
      <li><h3>Explain the decision together</h3><p>Select an event under What caused this? Inspect its reason and Direct causes, then Typed handoffs and What changed in the world? Where would a person intervene in a real process, who would own that decision, and what additional evidence would they need?</p></li>
    </ol>
    </details>
    <details><summary>Built-in example and simulation limits</summary><p>The built-in example has demand 100, stock 20, unit price 5 and budget 1,000 simulated units: an 80-unit replenishment quoted at 400. These are model defaults, not measured savings or a result already achieved. Imported replays may use other inputs; this run's task and world records remain authoritative.</p><p>Demand is supplied input, not a validated forecast. The supplier role does not search a market. Production schedules, physical stock accuracy and delivery are not modeled. Approval refresh is a fresh modeled decision, not authenticated human approval. Logical time and playback pace are not measured factory delay or business performance.</p></details>
  </section>;
}

export function BusinessScenarioNote({ scenario }: { scenario: ScenarioId }) {
  const situation = situations[scenario];
  return <div className="business-context business-situation" aria-label="Active business situation">
    <h3>{situation.title}</h3><p><strong>{situation.question}</strong></p><p>{situation.inspect}</p>
    <details><summary>Other business situations in this model</summary><dl className="business-scenario-list">{Object.entries(situations).map(([id, item]) => <div key={id}><dt>{item.title}</dt><dd>{item.question} {item.inspect}</dd></div>)}</dl><p>These are the four existing scenarios, not new levels of agent capability. Choose another emphasis using the existing scenario control; explanation depth never changes safeguards or evidence.</p></details>
  </div>;
}

export function BusinessRoles() {
  return <div className="business-context business-role-legend">
    <p>Five specialist roles and one coordinator share the work. Their names describe responsibilities, not real people or live AI services.</p>
    <dl className="business-role-grid">{roleOrder.map(id => <div key={id}><dt>{roles[id].name}</dt><dd>{roles[id].work}</dd></div>)}</dl>
    <details><summary>Business questions behind the six roles</summary><dl className="business-role-questions">{roleOrder.map(id => <div key={id}><dt>{roles[id].name} asks</dt><dd>{roles[id].question}</dd></div>)}</dl><p>Several roles can pass along the same incorrect assumption. Coordination does not make inputs true or create collective verification. People would need to establish input quality and the authority behind each action.</p></details>
  </div>;
}

export function BusinessOutcomeGuide() {
  return <section className="business-context business-outcome-guide" aria-labelledby="business-outcome-title">
    <h2 id="business-outcome-title">Read the result in two parts</h2>
    <p><strong>Task confirmed (business confirmation)</strong> means the modeled order outcome was supported and confirmed. <strong>Safe model completion: Yes</strong> also requires no order flagged unsafe and all required model checks to pass. Confirmation alone is not an acceptable-outcome decision for your organization.</p>
    <p>Committed means recorded in the simulated order list—not goods delivered. No, unknown or a stopped run calls for inspection: work may be incomplete, a control may have stopped it, or an effect may exist without its reply. Zero observed unsafe effects alone does not prove completion or safety.</p>
    <details><summary>Technical explanation of the outcome checks</summary><p>The model checks prerequisite evidence, approval freshness and matching details, approval consumption/state version, one order per intent, budget and confirmation evidence. Their technical names remain in Model observations and limits below. These invariants are computed within this model, not independently certified real-world safety. An unsafe committed effect is a simulated order violating a modeled check; a denial alone does not prove harm was prevented.</p></details>
  </section>;
}

const takeaways = [
  ['Define the outcome, not only the task', 'Explain what matters, what must not happen and what would make completion unacceptable. An order and reliable factory supply are different outcomes.'],
  ['Make authority explicit', 'Identify what agents may read, propose or change and which commitments need a person. Ask how boundaries would be enforced; role names alone do not enforce them.'],
  ['Explain the consequences behind a control', 'Discuss invalid approval, duplicate work or uncertainty alongside the delay or effort a control introduces. This demo supplies no measured cost-benefit answer.'],
  ['Plan the exception path', 'Name an accountable role, the evidence it needs and how work resumes without hiding the original problem. An escalation without an available owner is unfinished.'],
  ['Ask for evidence that matches the claim', 'Ask what changed, which approval covered it and what remains unknown. A completion message is not the same as an acceptable outcome.'],
  ['Keep remaining risk visible', 'Ask what was modeled or tested and what remains outside the evidence. A favorable simulation starts discussion; it does not accept real-world risk.'],
  ['Share ownership across business and technology', 'Business supplies intent, constraints and consequences; technical teams explain mechanisms, failure modes and evidence. Agree who decides and maintains the controls.'],
] as const;

export function BusinessDebrief() {
  return <section className="panel business-context" aria-labelledby="business-debrief-title">
    <h2 id="business-debrief-title">Turn the example into a team conversation</h2>
    <ul className="business-prompts"><li>What must the result achieve, and what would make a completed task unacceptable?</li><li>Who owns a stop, an expired permission or an unknown outcome—and what must that person inspect?</li><li>What evidence is missing before your organization could accept the remaining risk?</li></ul>
    <p>A useful takeaway is one shared decision question, an accountable role and a concrete evidence need. APS neither assigns that person nor implements real human approval.</p>
    <details><summary>Seven ways to support your technical team</summary><ol className="business-takeaways">{takeaways.map(([title, explanation]) => <li key={title}><h3>{title}</h3><p>{explanation}</p></li>)}</ol></details>
    <details><summary>Words to use together</summary><dl className="business-glossary"><div><dt>Intent</dt><dd>The business action the model is trying to carry out, such as one replenishment purchase.</dd></div><div><dt>Approval binding</dt><dd>Tying permission to specific purchase details so it cannot simply cover different work.</dd></div><div><dt>State version</dt><dd>A marker of changes to the model's recorded facts.</dd></div><div><dt>Reconciliation</dt><dd>Checking an existing modeled outcome when a reply is missing, rather than blindly ordering again.</dd></div><div><dt>Idempotency</dt><dd>A mechanism intended to stop a repeated request creating another effect; scope and inputs matter.</dd></div><div><dt>Causal trace</dt><dd>Events linked to earlier causes so a result can be inspected.</dd></div><div><dt>Replay</dt><dd>Recomputing a supported saved browser run, or stepping through frozen calls in Assurance. Neither supplies new external evidence.</dd></div></dl></details>
    <p className="business-boundary">Business and technical readers use the same controls, records and uncertainty. Disclosures only explain more; they do not change the run, add capabilities or hide its evidence. Frozen experiments in Assurance remain separate from this active browser run.</p>
  </section>;
}
