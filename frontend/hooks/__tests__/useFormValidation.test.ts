import { renderHook, act } from "@testing-library/react";
import { useFormValidation, validationRules } from "../useFormValidation";

describe("useFormValidation", () => {
  const rules = {
    email: [
      validationRules.required("이메일을 입력해주세요"),
      validationRules.email("올바른 이메일 형식이 아닙니다"),
    ],
    password: [
      validationRules.required("비밀번호를 입력해주세요"),
      validationRules.minLength(8, "8자 이상 입력해주세요"),
    ],
    confirmPassword: [
      validationRules.required("비밀번호 확인을 입력해주세요"),
      validationRules.match("password", "비밀번호가 일치하지 않습니다"),
    ],
  };

  it("초기 상태가 올바르게 설정됨", () => {
    const { result } = renderHook(() => useFormValidation(rules));

    expect(result.current.isFormValid).toBe(true);
    expect(result.current.validationState.email.isValid).toBe(true);
    expect(result.current.validationState.email.isTouched).toBe(false);
  });

  it("필드 변경 시 유효성 검증이 실행됨", () => {
    const { result } = renderHook(() => useFormValidation(rules));

    act(() => {
      result.current.handleFieldChange("email", "invalid-email");
    });

    expect(result.current.validationState.email.isDirty).toBe(true);
    expect(result.current.validationState.email.errors).toContain(
      "올바른 이메일 형식이 아닙니다"
    );
  });

  it("블러 시 에러가 표시됨", () => {
    const { result } = renderHook(() => useFormValidation(rules));

    act(() => {
      result.current.handleFieldBlur("email", "");
    });

    expect(result.current.validationState.email.showError).toBe(true);
    expect(result.current.validationState.email.errors).toContain(
      "이메일을 입력해주세요"
    );
  });

  it("올바른 이메일 입력 시 유효성 통과", () => {
    const { result } = renderHook(() => useFormValidation(rules));

    act(() => {
      result.current.handleFieldChange("email", "test@example.com");
      result.current.handleFieldBlur("email", "test@example.com");
    });

    expect(result.current.validationState.email.isValid).toBe(true);
    expect(result.current.validationState.email.errors).toHaveLength(0);
  });

  it("비밀번호 최소 길이 검증", () => {
    const { result } = renderHook(() => useFormValidation(rules));

    act(() => {
      result.current.handleFieldChange("password", "short");
      result.current.handleFieldBlur("password", "short");
    });

    expect(result.current.validationState.password.isValid).toBe(false);
    expect(result.current.validationState.password.errors).toContain(
      "8자 이상 입력해주세요"
    );
  });

  it("비밀번호 일치 검증", () => {
    const { result } = renderHook(() => useFormValidation(rules));

    const formData = {
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password456",
    };

    act(() => {
      result.current.handleFieldChange(
        "confirmPassword",
        "password456",
        formData
      );
      result.current.handleFieldBlur(
        "confirmPassword",
        "password456",
        formData
      );
    });

    expect(result.current.validationState.confirmPassword.isValid).toBe(false);
    expect(result.current.validationState.confirmPassword.errors).toContain(
      "비밀번호가 일치하지 않습니다"
    );
  });

  it("전체 폼 유효성 검증", () => {
    const { result } = renderHook(() => useFormValidation(rules));

    const invalidFormData = {
      email: "",
      password: "",
      confirmPassword: "",
    };

    let isValid: boolean;
    act(() => {
      isValid = result.current.validateForm(invalidFormData);
    });

    expect(isValid!).toBe(false);
    expect(result.current.validationState.email.showError).toBe(true);
    expect(result.current.validationState.password.showError).toBe(true);
  });

  it("유효한 폼 데이터 검증 통과", () => {
    const { result } = renderHook(() => useFormValidation(rules));

    const validFormData = {
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
    };

    let isValid: boolean;
    act(() => {
      isValid = result.current.validateForm(validFormData);
    });

    expect(isValid!).toBe(true);
    expect(result.current.isFormValid).toBe(true);
  });

  it("유효성 검증 리셋", () => {
    const { result } = renderHook(() => useFormValidation(rules));

    act(() => {
      result.current.handleFieldChange("email", "invalid");
      result.current.handleFieldBlur("email", "invalid");
    });

    expect(result.current.validationState.email.isDirty).toBe(true);

    act(() => {
      result.current.resetValidation();
    });

    expect(result.current.validationState.email.isDirty).toBe(false);
    expect(result.current.validationState.email.isTouched).toBe(false);
    expect(result.current.validationState.email.showError).toBe(false);
  });

  it("getFieldState 헬퍼 함수 동작", () => {
    const { result } = renderHook(() => useFormValidation(rules));

    const fieldState = result.current.getFieldState("email");
    expect(fieldState.isValid).toBe(true);
    expect(fieldState.isTouched).toBe(false);

    // 존재하지 않는 필드
    const unknownField = result.current.getFieldState("unknown");
    expect(unknownField.isValid).toBe(true);
  });
});

describe("validationRules", () => {
  it("required 규칙", () => {
    const rule = validationRules.required();
    expect(rule.validate("")).toBe(false);
    expect(rule.validate("value")).toBe(true);
    expect(rule.validate("   ")).toBe(false);
  });

  it("email 규칙", () => {
    const rule = validationRules.email();
    expect(rule.validate("test@example.com")).toBe(true);
    expect(rule.validate("invalid-email")).toBe(false);
    expect(rule.validate("")).toBe(true); // 빈 값은 required에서 처리
  });

  it("minLength 규칙", () => {
    const rule = validationRules.minLength(5);
    expect(rule.validate("1234")).toBe(false);
    expect(rule.validate("12345")).toBe(true);
    expect(rule.validate("")).toBe(true);
  });

  it("maxLength 규칙", () => {
    const rule = validationRules.maxLength(5);
    expect(rule.validate("12345")).toBe(true);
    expect(rule.validate("123456")).toBe(false);
  });

  it("pattern 규칙", () => {
    const rule = validationRules.pattern(/^\d+$/, "숫자만 입력");
    expect(rule.validate("123")).toBe(true);
    expect(rule.validate("abc")).toBe(false);
  });

  it("match 규칙", () => {
    const rule = validationRules.match("password");
    const formData = { password: "secret" };
    expect(rule.validate("secret", formData)).toBe(true);
    expect(rule.validate("different", formData)).toBe(false);
  });

  it("password 규칙", () => {
    const rule = validationRules.password();
    expect(rule.validate("weak")).toBe(false);
    expect(rule.validate("Password1")).toBe(true);
    expect(rule.validate("password")).toBe(false); // 숫자 없음
    expect(rule.validate("12345678")).toBe(false); // 문자 없음
  });

  it("username 규칙", () => {
    const rule = validationRules.username();
    expect(rule.validate("홍길동")).toBe(true);
    expect(rule.validate("user123")).toBe(true);
    expect(rule.validate("a")).toBe(false); // 너무 짧음
    expect(rule.validate("user@name")).toBe(false); // 특수문자
  });
});
