import { describe, expect, it } from 'vitest';
import { getVideoMeetingUrls, isLikelyVideoMeetingUrl } from './messagingVideo.util';

describe('messagingVideo.util', () => {
  it('detects Jitsi meeting urls', () => {
    expect(isLikelyVideoMeetingUrl('https://meet.jit.si/ecole-abcd1234-visio')).toBe(true);
    expect(isLikelyVideoMeetingUrl('https://visio.example.com/ecole-abcd1234-visio')).toBe(true);
    expect(isLikelyVideoMeetingUrl('https://example.com/files/doc.pdf')).toBe(false);
  });

  it('extracts video urls from message content and attachments', () => {
    const content = 'Rejoignez la visioconférence :\nhttps://meet.jit.si/ecole-abcd1234-visio';
    const attachments = ['https://example.com/photo.png'];
    expect(getVideoMeetingUrls(content, attachments)).toEqual(['https://meet.jit.si/ecole-abcd1234-visio']);
  });
});
