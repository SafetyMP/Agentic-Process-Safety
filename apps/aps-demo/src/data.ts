import hazards from './fixtures/hazards.json';
import requirements from './fixtures/requirements.json';
import topology from './fixtures/topology.json';
import experiment from './fixtures/experiment.json';
import manifest from './fixtures/manifest.json';
import acceptance from './fixtures/acceptance.json';
import references from './fixtures/scenarios.json';
import stages from './fixtures/stages.json';
import workload from './fixtures/workload.json';
export { workload };
export { hazards, requirements, topology, experiment, manifest, acceptance, references, stages };

export const scopeRequirement = requirements.find(r => r.controls.some(c => c.id === 'CTL-SCOPE'))!;
export const scopeHazard = hazards.find(h => h.id === scopeRequirement.hazard_id)!;
export const storyFault: Record<string, string | undefined> = {
  normal: 'benign', unauthorized: 'unauthorized_tool', delegation: 'recursive_delegation',
  stale: 'stale_approval', replay: 'duplicate_action', context: 'message_poisoning', conflict: 'goal_conflict',
};
export function controlRequirement(control: string) {
  return requirements.find(r => r.controls.some(c => c.id === control));
}
export function routeLink(route: string, key?: string, value?: string) {
  return `#/${route}${key && value ? `?${key}=${encodeURIComponent(value)}` : ''}`;
}
