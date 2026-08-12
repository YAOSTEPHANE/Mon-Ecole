export type ParsedDeviceInfo = {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  browser: string;
  os: string;
};

/**
 * Parse basique du User-Agent (sans dépendance externe).
 */
export function parseUserAgent(userAgent: string | null | undefined): ParsedDeviceInfo {
  const ua = (userAgent || '').trim();
  if (!ua) {
    return { deviceType: 'unknown', browser: 'Inconnu', os: 'Inconnu' };
  }

  const lower = ua.toLowerCase();
  let deviceType: ParsedDeviceInfo['deviceType'] = 'desktop';
  if (/bot|crawler|spider|slurp|bingpreview|facebookexternalhit/i.test(ua)) {
    deviceType = 'bot';
  } else if (/ipad|tablet|kindle|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobi|iphone|ipod|android.*mobile|windows phone|opera mini/i.test(ua)) {
    deviceType = 'mobile';
  }

  let browser = 'Autre';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) browser = 'Safari';
  else if (/msie|trident/i.test(ua)) browser = 'Internet Explorer';

  let os = 'Autre';
  if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/mac os x|macintosh/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/cros/i.test(ua)) os = 'Chrome OS';

  void lower;
  return { deviceType, browser, os };
}

export function deviceTypeLabel(type: string | null | undefined): string {
  switch (type) {
    case 'desktop':
      return 'Ordinateur';
    case 'mobile':
      return 'Mobile';
    case 'tablet':
      return 'Tablette';
    case 'bot':
      return 'Bot / crawler';
    default:
      return 'Inconnu';
  }
}
