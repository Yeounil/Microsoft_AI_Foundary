/**
 * Fuzzy Search 유틸리티
 * 퍼지 매칭을 통한 검색 기능을 제공합니다.
 */

/**
 * Levenshtein 거리 계산
 * 두 문자열 간의 편집 거리를 계산합니다.
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // 빈 문자열 처리
  if (m === 0) return n;
  if (n === 0) return m;

  // DP 테이블 생성
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // 초기화
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // DP 계산
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // 삭제
        dp[i][j - 1] + 1, // 삽입
        dp[i - 1][j - 1] + cost // 교체
      );
    }
  }

  return dp[m][n];
}

/**
 * 유사도 점수 계산 (0-1)
 */
export function similarityScore(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}

/**
 * 부분 문자열 매칭 점수
 */
export function substringScore(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // 정확히 일치
  if (lowerText === lowerQuery) return 1;

  // 시작 부분 일치
  if (lowerText.startsWith(lowerQuery)) return 0.9;

  // 포함
  if (lowerText.includes(lowerQuery)) {
    const index = lowerText.indexOf(lowerQuery);
    // 단어 경계에서 시작하면 더 높은 점수
    if (index === 0 || /\s/.test(text[index - 1])) {
      return 0.8;
    }
    return 0.7;
  }

  return 0;
}

export interface FuzzySearchOptions {
  threshold?: number; // 최소 유사도 임계값 (0-1)
  keys?: string[]; // 검색할 객체 키
  limit?: number; // 최대 결과 수
  caseSensitive?: boolean; // 대소문자 구분
}

export interface FuzzySearchResult<T> {
  item: T;
  score: number;
  matches: { key: string; value: string; score: number }[];
}

/**
 * 퍼지 검색 수행
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  options: FuzzySearchOptions = {}
): FuzzySearchResult<T>[] {
  const {
    threshold = 0.3,
    keys = [],
    limit = 10,
    caseSensitive = false,
  } = options;

  if (!query.trim()) return [];

  const normalizedQuery = caseSensitive ? query : query.toLowerCase();
  const results: FuzzySearchResult<T>[] = [];

  for (const item of items) {
    const matches: { key: string; value: string; score: number }[] = [];
    let maxScore = 0;

    if (keys.length === 0) {
      // 문자열 배열인 경우
      const value = String(item);
      const normalizedValue = caseSensitive ? value : value.toLowerCase();
      const score = calculateScore(normalizedValue, normalizedQuery);

      if (score >= threshold) {
        matches.push({ key: "", value, score });
        maxScore = score;
      }
    } else {
      // 객체 배열인 경우
      for (const key of keys) {
        const value = getNestedValue(item, key);
        if (value === undefined) continue;

        const strValue = String(value);
        const normalizedValue = caseSensitive ? strValue : strValue.toLowerCase();
        const score = calculateScore(normalizedValue, normalizedQuery);

        if (score >= threshold) {
          matches.push({ key, value: strValue, score });
          if (score > maxScore) maxScore = score;
        }
      }
    }

    if (matches.length > 0) {
      results.push({ item, score: maxScore, matches });
    }
  }

  // 점수 내림차순 정렬
  results.sort((a, b) => b.score - a.score);

  // 제한 적용
  return results.slice(0, limit);
}

/**
 * 복합 점수 계산
 */
function calculateScore(text: string, query: string): number {
  // 부분 문자열 점수
  const substring = substringScore(text, query);
  if (substring > 0) return substring;

  // 퍼지 매칭 점수
  const similarity = similarityScore(text, query);

  // 짧은 문자열에서의 타이포 허용
  if (query.length <= 3 && similarity >= 0.6) {
    return similarity * 0.6;
  }

  return similarity * 0.5;
}

/**
 * 중첩된 객체 값 가져오기
 */
function getNestedValue(obj: unknown, key: string): unknown {
  const keys = key.split(".");
  let value: unknown = obj;

  for (const k of keys) {
    if (value === null || value === undefined) return undefined;
    value = (value as Record<string, unknown>)[k];
  }

  return value;
}

/**
 * 간단한 퍼지 필터
 * 배열에서 쿼리와 일치하는 항목을 필터링합니다.
 */
export function fuzzyFilter<T extends string>(
  items: T[],
  query: string,
  threshold = 0.3
): T[] {
  if (!query.trim()) return items;

  const results = fuzzySearch(items, query, { threshold, limit: items.length });
  return results.map((r) => r.item);
}

/**
 * 토큰 기반 퍼지 매칭
 * 쿼리를 토큰으로 분리하여 각각 매칭합니다.
 */
export function tokenFuzzySearch<T>(
  items: T[],
  query: string,
  options: FuzzySearchOptions & { tokenize?: boolean } = {}
): FuzzySearchResult<T>[] {
  const { tokenize = true, ...searchOptions } = options;

  if (!tokenize || !query.includes(" ")) {
    return fuzzySearch(items, query, searchOptions);
  }

  const tokens = query.split(/\s+/).filter((t) => t.length > 0);
  const allResults = new Map<T, FuzzySearchResult<T>>();

  for (const token of tokens) {
    const results = fuzzySearch(items, token, {
      ...searchOptions,
      limit: items.length,
    });

    for (const result of results) {
      const existing = allResults.get(result.item);
      if (existing) {
        existing.score += result.score;
        existing.matches.push(...result.matches);
      } else {
        allResults.set(result.item, { ...result });
      }
    }
  }

  // 토큰 수로 점수 정규화
  const normalizedResults = Array.from(allResults.values()).map((r) => ({
    ...r,
    score: r.score / tokens.length,
  }));

  // 정렬 및 제한
  normalizedResults.sort((a, b) => b.score - a.score);
  return normalizedResults.slice(0, searchOptions.limit || 10);
}
