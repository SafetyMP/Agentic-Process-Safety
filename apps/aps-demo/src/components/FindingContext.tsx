import { hazards, routeLink } from '../data.ts';
import { findingExercise } from '../domain/reviewMappings.ts';

/** Carries navigation context only; it never changes the request or creates evidence. */
export function FindingContext({ params, story }: { params?: URLSearchParams; story: string }) {
  const id = params?.get('hazard');
  if (!id) return null;
  const hazard = hazards.find(item => item.id === id);
  if (!hazard) return <section className="notice" aria-label="Originating finding"><p>The originating finding is unavailable. No replacement mapping is assumed.</p><a href={routeLink('hazop')}>Return to the hazard register →</a></section>;
  const mapping = findingExercise(hazard.id);
  const applies = mapping.stories.some(item => item.id === story);
  return <section className="notice" aria-label="Originating finding"><strong>{hazard.node} · {hazard.deviation.replaceAll('_', ' ')}</strong><p>{hazard.id}</p><p>{applies ? `${mapping.coverage} illustration mapping. ${mapping.explanation}` : 'The current request differs from this finding’s mapped illustration. The finding is retained for navigation; this request does not establish its coverage.'}</p><a href={routeLink('hazop', 'hazard', hazard.id)}>Return to originating finding →</a></section>;
}
