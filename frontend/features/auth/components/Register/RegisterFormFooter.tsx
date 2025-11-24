import Link from "next/link";
import { CardFooter } from "@/components/ui/card";

/**
 * RegisterFormFooter Component
 * 회원가입 폼의 푸터 (로그인 링크)
 */
export function RegisterFormFooter() {
  return (
    <CardFooter className="flex flex-col gap-4 text-center text-sm">
      <p className="text-muted-foreground">
        이미 계정이 있으신가요?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          로그인
        </Link>
      </p>
    </CardFooter>
  );
}
