import {
  formatDate,
  formatDateTime,
  formatShortDate,
  formatShortDateTime,
  formatRelativeTime,
  formatNewsDate,
  formatISO,
  formatNumericDate,
  formatTime,
} from '../date-utils';

describe('date-utils', () => {
  // 테스트용 고정 날짜 (2024년 11월 19일 14:30:00)
  const testDate = new Date('2024-11-19T14:30:00');
  const testISOString = '2024-11-19T14:30:00';

  describe('formatDate', () => {
    it('Date 객체를 기본 형식으로 포맷해야 함', () => {
      expect(formatDate(testDate)).toBe('2024년 11월 19일');
    });

    it('ISO 문자열을 기본 형식으로 포맷해야 함', () => {
      expect(formatDate(testISOString)).toBe('2024년 11월 19일');
    });

    it('커스텀 포맷을 지원해야 함', () => {
      expect(formatDate(testDate, 'yyyy/MM/dd')).toBe('2024/11/19');
    });

    it('null을 빈 문자열로 반환해야 함', () => {
      expect(formatDate(null)).toBe('');
    });

    it('undefined를 빈 문자열로 반환해야 함', () => {
      expect(formatDate(undefined)).toBe('');
    });

    it('유효하지 않은 날짜를 빈 문자열로 반환해야 함', () => {
      expect(formatDate('invalid-date')).toBe('');
    });
  });

  describe('formatDateTime', () => {
    it('날짜와 시간을 포맷해야 함', () => {
      expect(formatDateTime(testDate)).toBe('2024년 11월 19일 14:30');
    });

    it('ISO 문자열을 날짜와 시간으로 포맷해야 함', () => {
      expect(formatDateTime(testISOString)).toBe('2024년 11월 19일 14:30');
    });
  });

  describe('formatShortDate', () => {
    it('짧은 날짜 형식으로 포맷해야 함', () => {
      expect(formatShortDate(testDate)).toBe('11월 19일');
    });
  });

  describe('formatShortDateTime', () => {
    it('짧은 날짜와 시간 형식으로 포맷해야 함', () => {
      expect(formatShortDateTime(testDate)).toBe('11월 19일 14:30');
    });
  });

  describe('formatRelativeTime', () => {
    it('null을 빈 문자열로 반환해야 함', () => {
      expect(formatRelativeTime(null)).toBe('');
    });

    it('undefined를 빈 문자열로 반환해야 함', () => {
      expect(formatRelativeTime(undefined)).toBe('');
    });

    it('유효하지 않은 날짜를 빈 문자열로 반환해야 함', () => {
      expect(formatRelativeTime('invalid-date')).toBe('');
    });

    it('상대적 시간 문자열을 반환해야 함', () => {
      const result = formatRelativeTime(testDate);
      // 상대 시간은 '전' 또는 '후'를 포함해야 함
      expect(result).toMatch(/전|후/);
    });
  });

  describe('formatNewsDate', () => {
    it('뉴스용 날짜 형식으로 포맷해야 함', () => {
      expect(formatNewsDate(testDate)).toBe('11월 19일 14:30');
    });
  });

  describe('formatISO', () => {
    it('ISO 형식으로 변환해야 함', () => {
      const result = formatISO(testDate);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('null을 빈 문자열로 반환해야 함', () => {
      expect(formatISO(null)).toBe('');
    });
  });

  describe('formatNumericDate', () => {
    it('숫자 형식의 날짜로 포맷해야 함', () => {
      expect(formatNumericDate(testDate)).toBe('2024-11-19');
    });
  });

  describe('formatTime', () => {
    it('시간만 포맷해야 함', () => {
      expect(formatTime(testDate)).toBe('14:30');
    });
  });
});
