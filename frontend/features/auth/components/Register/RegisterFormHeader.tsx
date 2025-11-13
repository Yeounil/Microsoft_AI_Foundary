import {
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

/**
 * RegisterFormHeader Component
 * 회원가입 폼의 헤더
 */
export function RegisterFormHeader() {
  return (
    <CardHeader className="space-y-2 text-center">
      <CardTitle className="text-2xl font-bold">회원가입</CardTitle>
      <CardDescription>
        새 계정을 만들어 AI 금융 분석을 시작하세요
      </CardDescription>
    </CardHeader>
  );
}
