"use client";

import { Card } from "@/components/ui/card";
import { useRegisterForm } from "../hooks/useRegisterForm";
import { RegisterFormHeader } from "../components/Register/RegisterFormHeader";
import { RegisterFormFields } from "../components/Register/RegisterFormFields";
import { RegisterFormFooter } from "../components/Register/RegisterFormFooter";
import { SocialLoginSection } from "../components/SocialLogin/SocialLoginSection";

/**
 * RegisterFormContainer
 * 회원가입 폼의 모든 로직과 상태를 관리하는 Container 컴포넌트입니다.
 */
export function RegisterFormContainer() {
  const {
    formData,
    isLoading,
    displayError,
    handleSubmit,
    handleChange,
    handleBlur,
    validationState,
    isFormValid,
  } = useRegisterForm();

  return (
    <Card className="w-full max-w-md">
      <RegisterFormHeader />
      <div className="p-6 pt-0 space-y-6">
        <form onSubmit={handleSubmit}>
          <RegisterFormFields
            formData={formData}
            isLoading={isLoading}
            displayError={displayError}
            onChange={handleChange}
            onBlur={handleBlur}
            validationState={validationState}
            isFormValid={isFormValid}
          />
        </form>
        <SocialLoginSection />
      </div>
      <RegisterFormFooter />
    </Card>
  );
}
