import DOMPurify from 'dompurify';

/**
 * XSS 방어 및 입력 검증 유틸리티
 */

// DOMPurify 설정
const PURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'object', 'embed'],
  FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'style'],
};

/**
 * HTML 문자열 새니타이즈 (XSS 방어)
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    // 서버사이드에서는 기본 이스케이프만 수행
    return escapeHtml(dirty);
  }
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG);
}

/**
 * 기본 HTML 이스케이프 (서버사이드 호환)
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  return text.replace(/[&<>"'`=/]/g, (m) => map[m]);
}

/**
 * 주식 심볼 유효성 검증
 * 허용: 영문 대문자, 숫자, 점(.)
 * 길이: 1-10자
 */
export function isValidStockSymbol(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') return false;
  return /^[A-Z0-9.]{1,10}$/i.test(symbol.trim());
}

/**
 * 주식 심볼 새니타이즈
 * 허용되지 않는 문자 제거 후 대문자로 변환
 */
export function sanitizeSymbol(symbol: string): string {
  if (!symbol || typeof symbol !== 'string') return '';
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9.]/g, '');
}

/**
 * URL 유효성 검증 (허용된 프로토콜만)
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * URL 새니타이즈 (위험한 URL은 # 반환)
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '#';

  // javascript:, data:, vbscript: 등 위험한 프로토콜 차단
  const dangerous = /^(javascript|data|vbscript):/i;
  if (dangerous.test(url.trim())) {
    return '#';
  }

  return isValidUrl(url) ? url : '#';
}

/**
 * 이메일 형식 검증
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
}

/**
 * 사용자 입력 새니타이즈 (일반 텍스트)
 */
export function sanitizeUserInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>]/g, '') // HTML 태그 문자 제거
    .slice(0, maxLength);
}

/**
 * 검색 쿼리 새니타이즈
 */
export function sanitizeSearchQuery(query: string, maxLength: number = 100): string {
  if (!query || typeof query !== 'string') return '';
  return query
    .trim()
    .replace(/[<>"'`;]/g, '') // SQL/XSS 위험 문자 제거
    .slice(0, maxLength);
}

/**
 * 안전한 리다이렉트 경로 검증
 */
const ALLOWED_REDIRECT_PATHS = [
  '/main',
  '/login',
  '/register',
  '/dashboard',
  '/watchlist',
  '/discover',
  '/reports',
  '/news-report',
  '/profile',
  '/settings',
];

export function isValidRedirectPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;

  // 절대 경로만 허용 (프로토콜 포함 URL 차단)
  if (path.includes('://') || path.startsWith('//')) {
    return false;
  }

  // 상대 경로만 허용
  if (!path.startsWith('/')) {
    return false;
  }

  // 경로 순회 공격 방지
  const normalizedPath = path.split('?')[0].split('#')[0];
  return ALLOWED_REDIRECT_PATHS.some(
    (allowed) => normalizedPath === allowed || normalizedPath.startsWith(`${allowed}/`)
  );
}

/**
 * 안전한 리다이렉트 URL 반환
 */
export function getSafeRedirectUrl(url: string | null, fallback: string = '/main'): string {
  if (!url) return fallback;
  return isValidRedirectPath(url) ? url : fallback;
}
