"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface HighlightTextProps {
  text: string;
  query: string;
  highlightClassName?: string;
  className?: string;
  caseSensitive?: boolean;
}

/**
 * HighlightText Component
 * 검색어를 하이라이트하여 표시합니다.
 */
export function HighlightText({
  text,
  query,
  highlightClassName = "bg-yellow-200 dark:bg-yellow-800 font-medium",
  className = "",
  caseSensitive = false,
}: HighlightTextProps) {
  const parts = useMemo(() => {
    if (!query.trim()) {
      return [{ text, highlight: false }];
    }

    const flags = caseSensitive ? "g" : "gi";
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, flags);
    const splitText = text.split(regex);

    return splitText
      .filter((part) => part !== "")
      .map((part) => ({
        text: part,
        highlight: caseSensitive
          ? part === query
          : part.toLowerCase() === query.toLowerCase(),
      }));
  }, [text, query, caseSensitive]);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.highlight ? (
          <mark
            key={index}
            className={cn("rounded-sm px-0.5", highlightClassName)}
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  );
}

/**
 * 검색어 하이라이트 유틸리티 함수
 */
export function highlightMatches(
  text: string,
  query: string,
  options: {
    caseSensitive?: boolean;
    highlightClass?: string;
  } = {}
): string {
  const { caseSensitive = false, highlightClass = "highlight" } = options;

  if (!query.trim()) return text;

  const flags = caseSensitive ? "g" : "gi";
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, flags);

  return text.replace(
    regex,
    `<mark class="${highlightClass}">$1</mark>`
  );
}

interface MultiHighlightTextProps {
  text: string;
  queries: string[];
  colors?: string[];
  className?: string;
}

/**
 * MultiHighlightText Component
 * 여러 검색어를 다른 색상으로 하이라이트합니다.
 */
export function MultiHighlightText({
  text,
  queries,
  colors = [
    "bg-yellow-200 dark:bg-yellow-800",
    "bg-green-200 dark:bg-green-800",
    "bg-blue-200 dark:bg-blue-800",
    "bg-pink-200 dark:bg-pink-800",
  ],
  className = "",
}: MultiHighlightTextProps) {
  const highlighted = useMemo(() => {
    const validQueries = queries.filter((q) => q.trim());
    if (validQueries.length === 0) {
      return [{ text, colorIndex: -1 }];
    }

    // 모든 매치 위치 찾기
    interface Match {
      start: number;
      end: number;
      colorIndex: number;
    }

    const matches: Match[] = [];

    validQueries.forEach((query, colorIndex) => {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedQuery, "gi");
      let match;

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          colorIndex,
        });
      }
    });

    // 시작 위치로 정렬
    matches.sort((a, b) => a.start - b.start);

    // 결과 생성
    const result: Array<{ text: string; colorIndex: number }> = [];
    let lastEnd = 0;

    matches.forEach((match) => {
      if (match.start > lastEnd) {
        result.push({
          text: text.slice(lastEnd, match.start),
          colorIndex: -1,
        });
      }

      if (match.start >= lastEnd) {
        result.push({
          text: text.slice(match.start, match.end),
          colorIndex: match.colorIndex % colors.length,
        });
        lastEnd = match.end;
      }
    });

    if (lastEnd < text.length) {
      result.push({
        text: text.slice(lastEnd),
        colorIndex: -1,
      });
    }

    return result;
  }, [text, queries, colors.length]);

  return (
    <span className={className}>
      {highlighted.map((part, index) =>
        part.colorIndex >= 0 ? (
          <mark
            key={index}
            className={cn("rounded-sm px-0.5", colors[part.colorIndex])}
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  );
}
