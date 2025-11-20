/**
 * Lighthouse Configuration
 * Core Web Vitals 및 성능 측정 설정
 */
module.exports = {
  extends: 'lighthouse:default',
  settings: {
    // 모바일 에뮬레이션 설정
    formFactor: 'mobile',
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
    },
    screenEmulation: {
      mobile: true,
      width: 412,
      height: 823,
      deviceScaleFactor: 1.75,
      disabled: false,
    },

    // 성능 측정 대기 시간
    maxWaitForFcp: 15 * 1000,
    maxWaitForLoad: 35 * 1000,

    // 스킵할 감사
    skipAudits: [
      'uses-http2', // 로컬 개발에서는 HTTP/2 사용하지 않음
      'is-on-https', // 로컬 개발에서는 HTTPS 사용하지 않음
    ],

    // 추가 감사
    onlyCategories: [
      'performance',
      'accessibility',
      'best-practices',
      'seo',
    ],
  },

  // 통과 기준 설정
  assertions: {
    // Core Web Vitals
    'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
    'first-input-delay': ['warn', { maxNumericValue: 100 }],
    'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
    'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
    'time-to-first-byte': ['warn', { maxNumericValue: 600 }],

    // Performance
    'speed-index': ['warn', { maxNumericValue: 3400 }],
    'total-blocking-time': ['warn', { maxNumericValue: 200 }],

    // Best Practices
    'uses-responsive-images': 'warn',
    'uses-optimized-images': 'warn',
    'uses-text-compression': 'warn',

    // Accessibility
    'button-name': 'error',
    'document-title': 'error',
    'html-has-lang': 'error',
    'link-name': 'warn',
  },
};
