"use client";

import { useMediaQuery } from "./useMediaQuery";
import { MEDIA_QUERIES } from "@/constants/breakpoints";

export function useDevice() {
  const isMobile = useMediaQuery(MEDIA_QUERIES.mobile);
  const isTablet = useMediaQuery(MEDIA_QUERIES.tablet);
  const isDesktop = useMediaQuery(MEDIA_QUERIES.desktop);

  return { isMobile, isTablet, isDesktop };
}
