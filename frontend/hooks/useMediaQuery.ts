"use client";

import { useState, useEffect, useCallback } from "react";

export function useMediaQuery(query: string): boolean {
  const getMatches = useCallback((query: string): boolean => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  }, []);

  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    const media = window.matchMedia(query);

    const handleChange = () => {
      setMatches(media.matches);
    };

    // 초기값 설정 (SSR 대응)
    handleChange();

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}
