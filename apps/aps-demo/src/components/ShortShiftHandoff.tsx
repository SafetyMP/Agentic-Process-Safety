import { useEffect, useRef, useState } from 'react';
import { fieldUpdates, requisition, type UpdateId } from '../domain/audience.ts';
import type { ComparisonRun } from '../domain/comparison.ts';

export function ShortShiftHandoff({ run, update, disposition, evidence, owner, deadline }: {
  run: ComparisonRun; update: UpdateId; disposition: string; evidence: string; owner: string; deadline: string;
}) {
  const [status, setStatus] = useState<'idle' | 'copying' | 'copied' | 'manual'>('idle');
  const fallback = useRef<HTMLTextAreaElement>(null);
  const text = [
    'APS shift handoff · proposal for discussion',
    'Proposed disposition: ' + disposition,
    'Action owner: ' + owner,
    'Deadline: ' + deadline,
    'Evidence supporting the disposition: ' + evidence,
    '',
    'Fictional requisition: ' + requisition,
    'Purchasing update: ' + fieldUpdates[update].title,
    fieldUpdates[update].record,
    '',
    'Modeled comparison ' + run.id + ' · Lane C held the release at ' + run.request.approvalAge +
      ' logical seconds. Finance approval had expired. No order was placed in lane C.',
    'This proposal grants no purchasing authority.',
  ].join('\n');

  useEffect(() => {
    if (status === 'manual') {
      fallback.current?.focus();
      fallback.current?.select();
    }
  }, [status]);

  async function copy() {
    if (!navigator.clipboard?.writeText) {
      setStatus('manual');
      return;
    }
    setStatus('copying');
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('manual');
    }
  }

  return <div>
    <button type="button" onClick={copy} disabled={status === 'copying'}>Copy handoff</button>
    <p role="status">{status === 'copied' ? 'Handoff copied.' : status === 'manual' ? 'Select and copy the handoff below.' : ''}</p>
    {status === 'manual' && <label>Handoff text<textarea readOnly rows={6} ref={fallback} value={text}/></label>}
  </div>;
}
