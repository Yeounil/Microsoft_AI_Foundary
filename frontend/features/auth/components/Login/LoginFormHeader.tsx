import {
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

/**
 * LoginFormHeader Component
 * 로그인 폼의 헤더
 */
export function LoginFormHeader() {
  return (
    <CardHeader className="space-y-3 text-center px-6 pt-8 pb-6">
      <CardTitle className="text-3xl md:text-4xl font-bold">로그인</CardTitle>
      <CardDescription className="text-base md:text-lg">
        계정에 로그인하여 AI 금융 분석 서비스를 이용하세요
      </CardDescription>
    </CardHeader>
  );
}
