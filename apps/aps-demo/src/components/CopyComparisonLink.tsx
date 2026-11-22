import { useEffect, useRef, useState } from 'react';

export function CopyComparisonLink({ permalink }: { permalink: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'manual'>('idle');
  const field = useRef<HTMLInputElement>(null);
  const url = window.location.href.split('#')[0] + permalink;
  useEffect(() => {
    if (status === 'manual') {
      field.current?.focus();
      field.current?.select();
    }
  }, [status]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch {
      setStatus('manual');
    }
  }
  return <div className="comparison-share">
    <button type="button" onClick={copy}>Copy comparison link</button>
    <span role="status">{status === 'copied' ? 'Link copied' : status === 'manual' ? 'Select and copy the link below.' : ''}</span>
    {status === 'manual' && <input ref={field} readOnly value={url} aria-label="Comparison link"/>}
  </div>;
}
