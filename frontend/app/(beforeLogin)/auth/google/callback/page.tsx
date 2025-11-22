"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import apiClient from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // URL에서 인가 코드 추출
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const errorParam = searchParams.get("error");

      // 에러가 있는 경우
      if (errorParam) {
        console.error("구글 로그인 에러:", errorParam);
        setError("구글 로그인이 취소되었습니다.");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
        return;
      }

      // 인가 코드가 없는 경우
      if (!code) {
        console.error("인가 코드가 없습니다");
        setError("잘못된 접근입니다.");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
        return;
      }

      try {
        // 백엔드에 인가 코드 전송하여 JWT 토큰 획득
        await apiClient.socialLogin("google", code, state || undefined);

        // 사용자 정보 조회
        await fetchUser();

        // 메인 페이지로 리다이렉트
        router.push("/main");
      } catch (error: any) {
        console.error("구글 로그인 처리 실패:", error);

        // 상세 에러 정보 추출
        let errorMessage = "로그인 처리 중 오류가 발생했습니다.";

        if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        }

        setError(errorMessage);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, router, fetchUser]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center space-y-4">
          {error ? (
            <>
              <div className="rounded-full bg-destructive/10 p-3">
                <svg
                  className="h-6 w-6 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold">로그인 실패</h2>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  잠시 후 로그인 페이지로 이동합니다...
                </p>
              </div>
            </>
          ) : (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <h2 className="text-lg font-semibold">구글 로그인 중...</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  잠시만 기다려주세요
                </p>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
