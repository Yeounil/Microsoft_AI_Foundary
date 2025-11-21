"use client";

import { forwardRef, InputHTMLAttributes, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldValidation, ValidationState } from "@/hooks/useFormValidation";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  fieldName: string;
  validation?: FieldValidation;
  hint?: string;
  showSuccessIcon?: boolean;
  showAllErrors?: boolean;
  enableShake?: boolean;
  onFieldBlur?: (fieldName: string, value: string) => void;
}

/**
 * FormInput Component
 * 실시간 유효성 검증 피드백을 제공하는 입력 컴포넌트
 */
export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      fieldName,
      validation,
      hint,
      showSuccessIcon = true,
      showAllErrors = false,
      enableShake = true,
      onFieldBlur,
      className,
      ...props
    },
    ref
  ) => {
    const [shouldShake, setShouldShake] = useState(false);
    const showError = validation?.showError && !validation.isValid;
    const showSuccess =
      showSuccessIcon &&
      validation?.isDirty &&
      validation?.isValid &&
      validation?.isTouched;

    // Trigger shake animation when error appears
    useEffect(() => {
      if (showError && enableShake && validation?.isTouched) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShouldShake(true);
        const timer = setTimeout(() => setShouldShake(false), 500);
        return () => clearTimeout(timer);
      }
    }, [showError, enableShake, validation?.isTouched]);

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (onFieldBlur) {
        onFieldBlur(fieldName, e.target.value);
      }
      props.onBlur?.(e);
    };

    return (
      <div className="space-y-2">
        <Label
          htmlFor={fieldName}
          className={cn(
            "transition-colors duration-200",
            showError && "text-destructive"
          )}
        >
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </Label>

        <div className={cn("relative", shouldShake && "animate-shake")}>
          <Input
            ref={ref}
            id={fieldName}
            name={fieldName}
            className={cn(
              "pr-10 transition-all duration-200",
              showError &&
                "border-destructive focus-visible:ring-destructive/50 animate-error-pulse",
              showSuccess &&
                "border-green-500 focus-visible:ring-green-500/50",
              className
            )}
            aria-invalid={showError}
            aria-describedby={
              showError
                ? `${fieldName}-error`
                : hint
                ? `${fieldName}-hint`
                : undefined
            }
            {...props}
            onBlur={handleBlur}
          />

          {/* Validation Icon */}
          {validation?.isDirty && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {showError ? (
                <X className="h-4 w-4 text-destructive animate-scale-in" />
              ) : showSuccess ? (
                <Check className="h-4 w-4 text-green-500 animate-scale-in" />
              ) : null}
            </div>
          )}
        </div>

        {/* Error Messages */}
        {showError && validation.errors.length > 0 && (
          <div
            id={`${fieldName}-error`}
            className="space-y-1 animate-slide-down overflow-hidden"
            role="alert"
          >
            {showAllErrors ? (
              // Show all errors
              validation.errors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-start gap-1.5 text-xs text-destructive"
                >
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ))
            ) : (
              // Show only first error
              <div className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{validation.errors[0]}</span>
              </div>
            )}
          </div>
        )}

        {/* Hint Text */}
        {hint && !showError && (
          <p
            id={`${fieldName}-hint`}
            className="text-xs text-muted-foreground animate-fade-in"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

/**
 * FormErrorSummary Component
 * 폼 제출 시 모든 에러를 요약해서 보여주는 컴포넌트
 */
interface FormErrorSummaryProps {
  validationState: ValidationState;
  fieldLabels?: Record<string, string>;
  title?: string;
  onFieldClick?: (fieldName: string) => void;
}

export function FormErrorSummary({
  validationState,
  fieldLabels = {},
  title = "입력 정보를 확인해주세요",
  onFieldClick,
}: FormErrorSummaryProps) {
  const errors = Object.entries(validationState)
    .filter(([, field]) => !field.isValid && field.showError && field.errors.length > 0)
    .map(([fieldName, field]) => ({
      fieldName,
      label: fieldLabels[fieldName] || fieldName,
      errors: field.errors,
    }));

  if (errors.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 animate-slide-down"
      role="alert"
      aria-labelledby="form-error-summary-title"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <h3
          id="form-error-summary-title"
          className="font-medium text-sm text-destructive"
        >
          {title}
        </h3>
      </div>
      <ul className="space-y-2">
        {errors.map(({ fieldName, label, errors: fieldErrors }) => (
          <li key={fieldName} className="text-xs">
            <button
              type="button"
              onClick={() => onFieldClick?.(fieldName)}
              className={cn(
                "text-left w-full",
                onFieldClick && "hover:underline cursor-pointer focus:outline-none focus:underline"
              )}
            >
              <span className="font-medium text-foreground">{label}:</span>
              <span className="text-destructive ml-1.5">{fieldErrors[0]}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground mt-3">
        {errors.length}개의 필드에 오류가 있습니다
      </p>
    </div>
  );
}

interface PasswordStrengthProps {
  password: string;
}

/**
 * PasswordStrength Component
 * 비밀번호 강도를 시각적으로 표시합니다.
 */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  const getStrength = (pass: string): { level: number; text: string; color: string } => {
    if (!pass) return { level: 0, text: "", color: "bg-muted" };

    let strength = 0;

    // Length check
    if (pass.length >= 8) strength += 1;
    if (pass.length >= 12) strength += 1;

    // Character variety
    if (/[a-z]/.test(pass)) strength += 1;
    if (/[A-Z]/.test(pass)) strength += 1;
    if (/[0-9]/.test(pass)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(pass)) strength += 1;

    if (strength <= 2) return { level: 1, text: "약함", color: "bg-red-500" };
    if (strength <= 4) return { level: 2, text: "보통", color: "bg-yellow-500" };
    if (strength <= 5) return { level: 3, text: "강함", color: "bg-green-500" };
    return { level: 4, text: "매우 강함", color: "bg-green-600" };
  };

  const { level, text, color } = getStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-1.5 animate-fade-in">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i <= level ? color : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        비밀번호 강도: <span className="font-medium">{text}</span>
      </p>
    </div>
  );
}
