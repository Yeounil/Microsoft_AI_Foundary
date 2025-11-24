/**
 * 마크다운 문법과 HTML 태그를 제거하고 평문으로 변환합니다.
 */
export function stripMarkdown(text: string): string {
  if (!text) return "";

  return (
    text
      // HTML 태그 제거 (예: <translation>, <div> 등)
      .replace(/<[^>]*>/g, "")
      // 볼드 (**text** or __text__)
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      // 이탤릭 (*text* or _text_)
      .replace(/(\*|_)(.*?)\1/g, "$2")
      // 헤딩 (# text)
      .replace(/^#+\s+/gm, "")
      // 링크 [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // 이미지 ![alt](url)
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      // 코드 블록 (```code```)
      .replace(/```[\s\S]*?```/g, "")
      // 인라인 코드 (`code`)
      .replace(/`([^`]+)`/g, "$1")
      // 리스트 (-, *, +)
      .replace(/^[\s]*[-*+]\s+/gm, "")
      // 번호 리스트 (1. text)
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // 인용 (> text)
      .replace(/^>\s+/gm, "")
      // 수평선 (---, ___, ***)
      .replace(/^[\s]*[-_*]{3,}[\s]*$/gm, "")
      // 여러 줄바꿈을 하나로
      .replace(/\n{2,}/g, "\n")
      // 앞뒤 공백 제거
      .trim()
  );
}
