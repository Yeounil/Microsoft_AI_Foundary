import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { RegisterFormData } from "../../services/authService";

interface RegisterFormFieldsProps {
  formData: RegisterFormData;
  isLoading: boolean;
  displayError: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * RegisterFormFields Component
 * 회원가입 폼의 입력 필드들
 */
export function RegisterFormFields({
  formData,
  isLoading,
  displayError,
  onChange,
}: RegisterFormFieldsProps) {
  return (
    <CardContent className="space-y-4">
      {displayError && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {displayError}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="username">사용자명</Label>
        <Input
          id="username"
          type="text"
          placeholder="홍길동"
          value={formData.username}
          onChange={onChange}
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          placeholder="example@email.com"
          value={formData.email}
          onChange={onChange}
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={onChange}
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">비밀번호 확인</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={onChange}
          required
          disabled={isLoading}
        />
      </div>
      <Button className="w-full" size="lg" type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            가입 중...
          </>
        ) : (
          "회원가입"
        )}
      </Button>
    </CardContent>
  );
}
