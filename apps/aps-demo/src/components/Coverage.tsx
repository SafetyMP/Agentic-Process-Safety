import { experiment, hazards, requirements, workload } from '../data.ts';
import { Stat } from './shared.tsx';

export function Coverage() {
  const controls = [...new Map(requirements.flatMap(r => r.controls).map(c => [c.id, c])).values()];
  const mappedHazards = new Set(requirements.map(r => r.hazard_id));
  const recordedControls = new Set(experiment.trials.flatMap(t => t.requirement_links.flatMap(r => r.controls.map(c => c.id))));
  const tested = controls.filter(c => c.test !== 'none' && c.status !== 'gap');
  return <section className="panel"><h2>Traceability coverage from frozen mappings</h2>
    <p>Counts describe the committed source selection, not safety effectiveness or verified hazard closure. Proposed mappings and test selectors require review.</p>
    <div className="stats">
      <Stat label="Hazards with proposed requirement" value={`${mappedHazards.size}/${hazards.length}`} note="Distinct mapped hazard IDs / all unverified findings"/>
      <Stat label="Controls with test selector" value={`${tested.length}/${controls.length}`} note="Non-gap source test mappings / distinct proposed controls"/>
      <Stat label="Controls linked to recorded trials" value={`${controls.filter(c => recordedControls.has(c.id)).length}/${controls.length}`} note="At least one selected trial link; not independent validation"/>
      <Stat label="Explicit control gaps" value={controls.filter(c => c.status === 'gap').length} note="Source status is gap; no implemented protection implied"/>
    </div>
    <h3>Finite recorded risk-scenario coverage</h3>
    <p>The frozen workload specifies {workload.cases.filter(c => c.fault !== 'benign').length} fault families plus one benign case, once per arm. Workload existence supplies inputs only; matched case digests in the recorded dashboard supply execution provenance. These research families differ from the nine browser stories. Goal conflict measures a spend-rule violation, with objective arbitration unmeasured.</p>
    <div className="table-scroll"><table><caption>Recorded case coverage and prevented attack calls; finite oracle observations</caption><thead><tr><th>Arm</th><th>Fault families recorded / planned</th><th>Benign recorded / planned</th><th>Prevented / attack calls</th><th>Unsafe mutations / attack calls</th></tr></thead><tbody>{Object.entries(experiment.configurations).map(([arm, m]) => {
      const matched = workload.cases.filter(c => experiment.trials.some(t => t.configuration === arm && t.case_id === c.id && t.case_digest === c.digest));
      return <tr key={arm}><td>{arm}</td><td>{matched.filter(c => c.fault !== 'benign').length}/{workload.cases.filter(c => c.fault !== 'benign').length}</td><td>{matched.filter(c => c.fault === 'benign').length}/{workload.cases.filter(c => c.fault === 'benign').length}</td><td>{m.prevented_attempts}/{m.attack_attempts}</td><td>{m.unsafe_mutations}/{m.attack_attempts}</td></tr>;
    })}</tbody></table></div>
    <p>Planned families: {workload.cases.map(c => c.fault).join(', ')}. Unequal attack-call denominators reflect early termination; coverage does not establish real-world effectiveness.</p>
  </section>;
}
