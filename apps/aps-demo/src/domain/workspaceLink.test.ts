import { describe, expect, it } from 'vitest';
import { quoteAttempts } from './audience.ts';
import { defaultWorkspace, readWorkspace, timingRuns, workspaceLink } from './workspaceLink.ts';

describe('IT workspace bookmarks', () => {
  it('round-trips each selected model run, quotation, stock record and frozen comparison', () => {
    for (const run of timingRuns) {
      for (const quoteAttempt of quoteAttempts) {
        for (const available of [null, 0, 24]) {
          for (const trial of [14, 15]) {
            const selection = { run, quoteAttempt, available, trial };
            const query = workspaceLink(selection).split('?')[1];
            expect(readWorkspace(query)).toEqual(selection);
          }
        }
      }
    }
  });

  it('restores supported fields while defaulting missing or invalid values', () => {
    expect(readWorkspace('')).toEqual(defaultWorkspace);
    expect(workspaceLink(readWorkspace('age=999&quote=14%3A05&stock=-1&trial=14&extra=ignored')))
      .toBe('#/overview?age=60&quote=14%3A05&stock=unknown&trial=14');
    expect(workspaceLink(readWorkspace('stock=0&trial=unknown&age=59')))
      .toBe('#/overview?age=59&quote=13%3A55&stock=0&trial=15');
  });
});
