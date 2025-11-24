"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImageProps, "onLoadingComplete"> {
  fallbackSrc?: string;
  showSkeleton?: boolean;
}

/**
 * OptimizedImage Component
 * Next.js Image 컴포넌트 래퍼로 lazy loading과 에러 핸들링을 제공합니다.
 */
export function OptimizedImage({
  src,
  alt,
  fallbackSrc = "/placeholder.png",
  showSkeleton = true,
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {showSkeleton && isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <Image
        src={error ? fallbackSrc : src}
        alt={alt}
        loading="lazy"
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
        {...props}
      />
    </div>
  );
}
