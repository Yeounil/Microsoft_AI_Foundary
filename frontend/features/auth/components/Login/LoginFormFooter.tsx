import Link from "next/link";
import { CardFooter } from "@/components/ui/card";

/**
 * LoginFormFooter Component
 * 로그인 폼의 푸터 (회원가입 링크)
 */
export function LoginFormFooter() {
  return (
    <CardFooter className="flex flex-col gap-4 text-center text-base md:text-lg px-6 pb-8">
      <p className="text-muted-foreground">
        계정이 없으신가요?{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          가입하기
        </Link>
      </p>
    </CardFooter>
  );
}
