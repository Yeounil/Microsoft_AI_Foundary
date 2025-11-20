import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { LoginFormData } from "../../services/authService";

interface LoginFormFieldsProps {
  formData: LoginFormData;
  isLoading: boolean;
  error: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * LoginFormFields Component
 * 로그인 폼의 입력 필드들
 */
export function LoginFormFields({
  formData,
  isLoading,
  error,
  onChange,
}: LoginFormFieldsProps) {
  return (
    <CardContent className="space-y-6 px-6 pb-8">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm md:text-base text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-3">
        <Label htmlFor="username" className="text-base md:text-lg">사용자명</Label>
        <Input
          id="username"
          type="text"
          placeholder="사용자명을 입력하세요"
          value={formData.username}
          onChange={onChange}
          required
          disabled={isLoading}
          className="h-11 md:h-12 text-base"
        />
      </div>
      <div className="space-y-3">
        <Label htmlFor="password" className="text-base md:text-lg">비밀번호</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={onChange}
          required
          disabled={isLoading}
          className="h-11 md:h-12 text-base"
        />
      </div>
      <Button className="w-full h-11 md:h-12 text-base md:text-lg" type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            로그인 중...
          </>
        ) : (
          "로그인"
        )}
      </Button>
    </CardContent>
  );
}
