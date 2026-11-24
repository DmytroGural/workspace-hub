import { describe, expect, it } from 'vitest';
import { stripMarkdownToPlainText } from '../markdownUtils';

describe('stripMarkdownToPlainText', () => {
  it('removes bold, italic, links, headings, and collapses whitespace', () => {
    expect(stripMarkdownToPlainText('**Manage Projects To Perfection**')).toBe(
      'Manage Projects To Perfection',
    );
    expect(
      stripMarkdownToPlainText('# Sprint Plan\n\nCheck [docs](https://example.com) & `API` _now_.'),
    ).toBe('Sprint Plan Check docs & API now.');
  });

  it('handles lists, checklists, and strikethrough cleanly', () => {
    expect(stripMarkdownToPlainText('- [x] Done item\n- ~~Old~~ item\n1. Next step')).toBe(
      'Done item Old item Next step',
    );
  });
});
