import { useState } from 'react';
import type { QuoteAttempt } from '../domain/audience.ts';
import type { ComparisonRun } from '../domain/comparison.ts';
import { defaultWorkspace } from '../domain/workspaceLink.ts';

export function useBearingsSelection(initial = defaultWorkspace) {
  const [selection, setSelection] = useState(initial);
  return {
    ...selection, setSelection,
    setRun: (run: ComparisonRun) => setSelection(previous => ({ ...previous, run })),
    setQuoteAttempt: (quoteAttempt: QuoteAttempt) => setSelection(previous => ({ ...previous, quoteAttempt })),
    setAvailable: (available: number | null) => setSelection(previous => ({ ...previous, available })),
    setTrial: (trial: number) => setSelection(previous => ({ ...previous, trial })),
  };
}
