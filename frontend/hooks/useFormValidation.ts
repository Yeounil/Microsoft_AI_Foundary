"use client";

import { useState, useCallback, useMemo } from "react";

export interface ValidationRule {
  validate: (value: string, formData?: Record<string, string>) => boolean;
  message: string;
}

export interface FieldValidation {
  isValid: boolean;
  isTouched: boolean;
  isDirty: boolean;
  errors: string[];
  showError: boolean;
}

export interface ValidationState {
  [fieldName: string]: FieldValidation;
}

interface UseFormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showErrorsAfterBlur?: boolean;
}

// 기본 유효성 검증 규칙들
export const validationRules = {
  required: (message = "필수 입력 항목입니다"): ValidationRule => ({
    validate: (value) => value.trim().length > 0,
    message,
  }),

  email: (message = "올바른 이메일 형식이 아닙니다"): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    message,
  }),

  minLength: (
    length: number,
    message = `최소 ${length}자 이상 입력해주세요`
  ): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return value.length >= length;
    },
    message,
  }),

  maxLength: (
    length: number,
    message = `최대 ${length}자까지 입력 가능합니다`
  ): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return value.length <= length;
    },
    message,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return regex.test(value);
    },
    message,
  }),

  match: (
    fieldName: string,
    message = "값이 일치하지 않습니다"
  ): ValidationRule => ({
    validate: (value, formData) => {
      if (!value || !formData) return true;
      return value === formData[fieldName];
    },
    message,
  }),

  password: (message = "비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다"): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(value);
    },
    message,
  }),

  username: (message = "사용자명은 2-20자의 한글, 영문, 숫자만 가능합니다"): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return /^[가-힣a-zA-Z0-9]{2,20}$/.test(value);
    },
    message,
  }),
};

/**
 * Form Validation Hook
 * 실시간 폼 유효성 검증을 제공합니다.
 */
export function useFormValidation(
  rules: Record<string, ValidationRule[]>,
  options: UseFormValidationOptions = {}
) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    showErrorsAfterBlur = true,
  } = options;

  const [validationState, setValidationState] = useState<ValidationState>(() => {
    const initial: ValidationState = {};
    Object.keys(rules).forEach((fieldName) => {
      initial[fieldName] = {
        isValid: true,
        isTouched: false,
        isDirty: false,
        errors: [],
        showError: false,
      };
    });
    return initial;
  });

  // 단일 필드 유효성 검증
  const validateField = useCallback(
    (
      fieldName: string,
      value: string,
      formData?: Record<string, string>
    ): string[] => {
      const fieldRules = rules[fieldName];
      if (!fieldRules) return [];

      const errors: string[] = [];
      fieldRules.forEach((rule) => {
        if (!rule.validate(value, formData)) {
          errors.push(rule.message);
        }
      });

      return errors;
    },
    [rules]
  );

  // 필드 변경 핸들러
  const handleFieldChange = useCallback(
    (fieldName: string, value: string, formData?: Record<string, string>) => {
      if (!validateOnChange) return;

      const errors = validateField(fieldName, value, formData);
      const isValid = errors.length === 0;

      setValidationState((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          isValid,
          isDirty: true,
          errors,
          showError: showErrorsAfterBlur ? prev[fieldName]?.isTouched : true,
        },
      }));
    },
    [validateField, validateOnChange, showErrorsAfterBlur]
  );

  // 필드 블러 핸들러
  const handleFieldBlur = useCallback(
    (fieldName: string, value: string, formData?: Record<string, string>) => {
      const errors = validateOnBlur
        ? validateField(fieldName, value, formData)
        : validationState[fieldName]?.errors || [];
      const isValid = errors.length === 0;

      setValidationState((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          isValid,
          isTouched: true,
          errors,
          showError: true,
        },
      }));
    },
    [validateField, validateOnBlur, validationState]
  );

  // 전체 폼 유효성 검증
  const validateForm = useCallback(
    (formData: Record<string, string>): boolean => {
      const newState: ValidationState = {};
      let isFormValid = true;

      Object.keys(rules).forEach((fieldName) => {
        const errors = validateField(fieldName, formData[fieldName] || "", formData);
        const isValid = errors.length === 0;

        if (!isValid) {
          isFormValid = false;
        }

        newState[fieldName] = {
          isValid,
          isTouched: true,
          isDirty: true,
          errors,
          showError: true,
        };
      });

      setValidationState(newState);
      return isFormValid;
    },
    [rules, validateField]
  );

  // 폼 초기화
  const resetValidation = useCallback(() => {
    const initial: ValidationState = {};
    Object.keys(rules).forEach((fieldName) => {
      initial[fieldName] = {
        isValid: true,
        isTouched: false,
        isDirty: false,
        errors: [],
        showError: false,
      };
    });
    setValidationState(initial);
  }, [rules]);

  // 전체 폼 유효성 여부
  const isFormValid = useMemo(() => {
    return Object.values(validationState).every((field) => field.isValid);
  }, [validationState]);

  // 에러가 있는 필드 중 첫 번째 필드명
  const firstErrorField = useMemo(() => {
    const entry = Object.entries(validationState).find(
      ([, field]) => !field.isValid && field.showError
    );
    return entry ? entry[0] : null;
  }, [validationState]);

  return {
    validationState,
    handleFieldChange,
    handleFieldBlur,
    validateForm,
    resetValidation,
    isFormValid,
    firstErrorField,
    getFieldState: (fieldName: string) =>
      validationState[fieldName] || {
        isValid: true,
        isTouched: false,
        isDirty: false,
        errors: [],
        showError: false,
      },
  };
}
