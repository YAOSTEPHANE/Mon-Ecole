const JITSI_URL_PATTERN =
  /^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/i;

export function extractUrlsFromMessage(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s]+/g);
  if (!matches) return [];
  return matches.map((url) => url.replace(/[.,;:!?)]+$/, ''));
}

export function isLikelyVideoMeetingUrl(url: string): boolean {
  if (!JITSI_URL_PATTERN.test(url)) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('meet.jit.si/') ||
    lower.includes('/ecole-') ||
    lower.includes('jitsi') ||
    lower.includes('/visio')
  );
}

export function getVideoMeetingUrls(content: string, attachmentUrls?: string[]): string[] {
  const fromContent = extractUrlsFromMessage(content).filter(isLikelyVideoMeetingUrl);
  const fromAttachments = (attachmentUrls ?? []).filter(isLikelyVideoMeetingUrl);
  return [...new Set([...fromAttachments, ...fromContent])];
}
