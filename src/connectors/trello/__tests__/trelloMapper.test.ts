import { describe, expect, it } from 'vitest';
import { formatCommentTextWithAttachments, mapRawComment, mapRawMember } from '../trelloMapper';

describe('trelloMapper', () => {
  it('maps raw Trello member with avatar suffix and fallback initials', () => {
    const member = mapRawMember({
      id: 'm1',
      fullName: 'Jane Doe',
      username: 'janedoe',
      avatarUrl: 'https://trello-members.s3.amazonaws.com/abc',
    });
    expect(member.avatarUrl).toBe('https://trello-members.s3.amazonaws.com/abc/50.png');
    expect(member.initials).toBe('JA');
  });

  it('formats and parses comment text with embedded attachments', () => {
    const formatted = formatCommentTextWithAttachments('Please check this', [
      {
        id: 'a1',
        name: 'mockup.png',
        url: 'https://example.com/mockup.png',
        isImage: true,
      },
    ]);
    expect(formatted).toBe('Please check this\n\n[📎 mockup.png](https://example.com/mockup.png)');

    const mapped = mapRawComment({
      id: 'c1',
      date: '2026-11-20T10:00:00.000Z',
      data: { text: formatted },
    });
    expect(mapped.text).toBe('Please check this');
    expect(mapped.attachments).toHaveLength(1);
    expect(mapped.attachments?.[0].name).toBe('mockup.png');
    expect(mapped.attachments?.[0].isImage).toBe(true);
  });
});
