import { fireEvent, screen } from '@testing-library/react';

// A role query is synchronous and reads a stable DOM. Share repeated style reads
// inside that query only; never cache controls, accessible names or cross-step data.
export function withFreshStyleCache<T>(lookup: () => T): T {
  const original = window.getComputedStyle;
  const styles = new WeakMap<Element, Map<string | null | undefined, CSSStyleDeclaration>>();
  window.getComputedStyle = (element, pseudoElement) => {
    let variants = styles.get(element);
    if (!variants) { variants = new Map(); styles.set(element, variants); }
    let style = variants.get(pseudoElement);
    if (!style) {
      style = original.call(window, element, pseudoElement);
      variants.set(pseudoElement, style);
    }
    return style;
  };
  try { return lookup(); }
  finally { window.getComputedStyle = original; }
}

export function stepToBoundary() {
  for (let step = 0; step < 100; step++) {
    const button = withFreshStyleCache(() => screen.getByRole('button', { name: 'Step one transition' })) as HTMLButtonElement;
    if (button.disabled) return;
    fireEvent.click(button);
  }
  throw new Error('No workflow boundary reached in 100 UI steps');
}
