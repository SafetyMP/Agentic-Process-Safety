import { controlRequirement, storyFault } from '../data.ts';
import { stories, type StoryId } from './scenarios.ts';
import { requestFor, type Request } from './simulation.ts';

export interface CaseDefinition {
  id: StoryId;
  title: string;
  objective: string;
  operation: string;
  control: string;
  hazardId?: string;
  fault?: string;
  evidenceNote: string;
  limitation: string;
  preset: Request;
  effectMode: 'purchase' | 'unmodeled';
}

const titles: Partial<Record<StoryId, string>> = {
  stale: 'Purchase after approval expiry',
  normal: 'A currently authorized purchase',
  unauthorized: 'A supplier attempts a purchase',
  context: 'Context belongs to another task',
};
export const caseDefinitions: CaseDefinition[] = stories.map(story => ({
  ...story,
  title: titles[story.id] ?? story.title,
  objective: story.id === 'stale' ? 'Execute one currently authorized purchase' : story.objective,
  operation: story.id === 'stale' ? 'Submit a purchase after finance approval expires' : story.operation,
  hazardId: controlRequirement(story.control)?.hazard_id,
  fault: storyFault[story.id],
  preset: { ...requestFor(story.id, 42), amount: story.id === 'spending' ? 1200 : 300 },
  effectMode: ['normal', 'unauthorized', 'stale'].includes(story.id) ? 'purchase' : 'unmodeled',
  evidenceNote: story.id === 'context'
    ? 'Related fault family only: the recorded mismatch occurs at demand; this browser request is a purchase.'
    : story.id === 'conflict'
      ? 'The recorded goal-conflict case measures a budget violation, not objective arbitration.'
      : storyFault[story.id]
        ? 'Related recorded fault family and control; this edited browser request is not the recorded trial.'
        : 'No distinct recorded trial maps to this browser story.',
  limitation: story.id === 'stale'
    ? 'Fresh approval does not establish quotation validity, stock truth or whether the purchase is needed.'
    : story.id === 'conflict'
      ? 'Objective arbitration is not modeled or established. Review does not resolve the conflict.'
      : 'These simplified browser checks do not establish real-world safety or complete workflow execution.',
}));

export function isCaseId(value: unknown): value is StoryId {
  return typeof value === 'string' && caseDefinitions.some(item => item.id === value);
}

export function getCase(id: string): CaseDefinition {
  return caseDefinitions.find(item => item.id === id) ?? caseDefinitions.find(item => item.id === 'stale')!;
}

export interface ScenarioDraft { caseId: StoryId; approvalAge: string }
export function presetDraft(caseId: StoryId = 'stale'): ScenarioDraft {
  return { caseId, approvalAge: String(getCase(caseId).preset.approvalAge) };
}

export function validateDraft(draft: ScenarioDraft): { request: Request | null; error: string | null } {
  if (!isCaseId(draft.caseId)) return { request: null, error: 'Choose a supported case.' };
  if (!/^\d+$/.test(draft.approvalAge.trim())) return { request: null, error: 'Approval age must be a whole number from 0 to 120.' };
  const age = Number(draft.approvalAge);
  if (!Number.isSafeInteger(age) || age < 0 || age > 120) return { request: null, error: 'Approval age must be a whole number from 0 to 120.' };
  const definition = getCase(draft.caseId);
  if (draft.caseId !== 'stale' && age !== definition.preset.approvalAge) return { request: null, error: 'Approval age can be varied in the approval-expiry case.' };
  return { request: { ...definition.preset, approvalAge: age }, error: null };
}
