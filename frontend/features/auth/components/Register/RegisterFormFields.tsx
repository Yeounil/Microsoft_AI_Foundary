import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { RegisterFormData } from "../../services/authService";
import { FormInput, PasswordStrength } from "@/shared/components/FormInput";
import { ValidationState } from "@/hooks/useFormValidation";

interface RegisterFormFieldsProps {
  formData: RegisterFormData;
  isLoading: boolean;
  displayError: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (fieldName: string, value: string) => void;
  validationState: ValidationState;
  isFormValid: boolean;
}

/**
 * RegisterFormFields Component
 * 회원가입 폼의 입력 필드들 (실시간 유효성 검증 포함)
 */
export function RegisterFormFields({
  formData,
  isLoading,
  displayError,
  onChange,
  onBlur,
  validationState,
  isFormValid,
}: RegisterFormFieldsProps) {
  return (
    <CardContent className="space-y-4">
      {displayError && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive animate-fade-in">
          {displayError}
        </div>
      )}

      <FormInput
        label="사용자명"
        fieldName="username"
        type="text"
        placeholder="홍길동"
        value={formData.username}
        onChange={onChange}
        onFieldBlur={onBlur}
        validation={validationState.username}
        hint="2-20자의 한글, 영문, 숫자만 가능합니다"
        required
        disabled={isLoading}
      />

      <FormInput
        label="이메일"
        fieldName="email"
        type="email"
        placeholder="example@email.com"
        value={formData.email}
        onChange={onChange}
        onFieldBlur={onBlur}
        validation={validationState.email}
        required
        disabled={isLoading}
      />

      <div className="space-y-2">
        <FormInput
          label="비밀번호"
          fieldName="password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={onChange}
          onFieldBlur={onBlur}
          validation={validationState.password}
          hint="8자 이상, 영문과 숫자를 포함해야 합니다"
          required
          disabled={isLoading}
        />
        <PasswordStrength password={formData.password} />
      </div>

      <FormInput
        label="비밀번호 확인"
        fieldName="confirmPassword"
        type="password"
        placeholder="••••••••"
        value={formData.confirmPassword}
        onChange={onChange}
        onFieldBlur={onBlur}
        validation={validationState.confirmPassword}
        required
        disabled={isLoading}
      />

      <Button
        className="w-full"
        size="lg"
        type="submit"
        disabled={isLoading || !isFormValid}
      >
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
