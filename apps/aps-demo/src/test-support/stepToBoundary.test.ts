// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { stepToBoundary, withFreshStyleCache } from './stepToBoundary.ts';

const name = 'Step one transition';
const query = () => screen.getByRole('button', { name });
function observed(lookup: () => HTMLElement) {
  try { return { element: lookup() }; }
  catch (error) { return { error: (error as Error).message }; }
}
// Exact original helper, retained as a comparison witness (not the optimized path).
function originalStepToBoundary() {
  for (let step = 0; step < 100; step++) {
    const button = screen.getByRole('button', { name: 'Step one transition' }) as HTMLButtonElement;
    if (button.disabled) return;
    fireEvent.click(button);
  }
  throw new Error('No workflow boundary reached in 100 UI steps');
}
afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren(); });

describe('fresh synchronous role-lookup style cache equivalence', () => {
  it.each([
    ['native', '<button>Step one transition</button>'],
    ['explicit role', '<div role="button">Step one transition</div>'],
    ['input value', '<input type="button" value="Step one transition">'],
    ['aria label', '<button aria-label="Step one transition">Other text</button>'],
    ['label reference', '<span id="label">Step one transition</span><button aria-labelledby="label">Other text</button>'],
    ['missing', '<button>Other action</button>'],
    ['duplicate native', '<button>Step one transition</button><button>Step one transition</button>'],
    ['duplicate outside controls', '<section aria-label="Controls"><button>Step one transition</button></section><aside><div role="button" aria-label="Step one transition"></div></aside>'],
    ['hidden attribute', '<button hidden>Step one transition</button>'],
    ['aria hidden ancestor', '<section aria-hidden="true"><button>Step one transition</button></section>'],
    ['display none ancestor', '<section style="display:none"><button>Step one transition</button></section>'],
    ['visibility hidden', '<button style="visibility:hidden">Step one transition</button>'],
    ['hidden duplicate excluded', '<button hidden>Step one transition</button><button>Step one transition</button>'],
    ['name overridden', '<button aria-label="Other action">Step one transition</button>'],
    ['wrong explicit role', '<button role="link">Step one transition</button>'],
  ])('preserves original result/error for %s', (_label, html) => {
    document.body.innerHTML = html;
    const original = window.getComputedStyle;
    expect(observed(() => withFreshStyleCache(query))).toEqual(observed(query));
    expect(window.getComputedStyle).toBe(original);
  });

  it('recomputes names and visibility after every lookup', () => {
    document.body.innerHTML = '<style>.off {display:none}</style><span id="label">Step one transition</span><button aria-labelledby="label"></button>';
    const button = document.querySelector('button')!;
    const label = document.querySelector('#label')!;
    for (const mutate of [() => {}, () => { label.textContent = 'Changed'; }, () => { label.textContent = name; button.className = 'off'; }, () => { button.className = ''; }]) {
      mutate();
      expect(observed(() => withFreshStyleCache(query))).toEqual(observed(query));
    }
  });

  it('does not reuse a detached control after a replacement or removal', () => {
    for (const advance of [originalStepToBoundary, stepToBoundary]) {
      document.body.innerHTML = '<button>Step one transition</button>';
      const first = document.querySelector('button')!;
      const terminal = document.createElement('button'); terminal.textContent = name; terminal.disabled = true;
      let clicks = 0;
      first.addEventListener('click', () => { clicks++; first.replaceWith(terminal); });
      advance();
      expect(clicks).toBe(1); expect(first.isConnected).toBe(false); expect(query()).toBe(terminal);
      terminal.disabled = false; terminal.addEventListener('click', () => terminal.remove());
      expect(advance).toThrow(/Unable to find an accessible element with the role "button"/);
    }
  });

  it('detects a newly introduced duplicate before issuing another click', () => {
    for (const advance of [originalStepToBoundary, stepToBoundary]) {
      document.body.innerHTML = '<button>Step one transition</button>';
      let clicks = 0;
      document.querySelector('button')!.addEventListener('click', () => { clicks++; const duplicate = document.createElement('button'); duplicate.textContent = name; document.body.append(duplicate); });
      expect(advance).toThrow(/Found multiple elements with the role "button"/);
      expect(clicks).toBe(1);
    }
  });

  it('stops on the same disabled boundary and retains the 100-click guard', () => {
    for (const advance of [originalStepToBoundary, stepToBoundary]) {
      document.body.innerHTML = '<button disabled>Step one transition</button>';
      let clicks = 0;
      const button = document.querySelector('button')!; button.addEventListener('click', () => { clicks++; });
      advance(); expect(clicks).toBe(0);
      button.disabled = false;
      expect(advance).toThrow('No workflow boundary reached in 100 UI steps'); expect(clicks).toBe(100);
    }
  });

  it('shares repeated style reads only inside one lookup and restores on errors', () => {
    document.body.innerHTML = '<button>Step one transition</button>';
    const button = document.querySelector('button')!;
    const original = window.getComputedStyle;
    let calls = 0;
    const read: typeof window.getComputedStyle = (element, pseudoElement) => { calls++; return original.call(window, element, pseudoElement); };
    window.getComputedStyle = read;
    try {
      withFreshStyleCache(() => { expect(window.getComputedStyle(button)).toBe(window.getComputedStyle(button)); window.getComputedStyle(button, null); });
      expect(window.getComputedStyle).toBe(read); expect(calls).toBe(2);
      withFreshStyleCache(() => window.getComputedStyle(button)); expect(calls).toBe(3);
      expect(() => withFreshStyleCache(() => { throw new Error('Lookup failed'); })).toThrow('Lookup failed');
      expect(window.getComputedStyle).toBe(read);
    } finally { window.getComputedStyle = original; }
  });
});
