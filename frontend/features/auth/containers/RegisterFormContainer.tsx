"use client";

import { Card } from "@/components/ui/card";
import { useRegisterForm } from "../hooks/useRegisterForm";
import { RegisterFormHeader } from "../components/Register/RegisterFormHeader";
import { RegisterFormFields } from "../components/Register/RegisterFormFields";
import { RegisterFormFooter } from "../components/Register/RegisterFormFooter";

/**
 * RegisterFormContainer
 * 회원가입 폼의 모든 로직과 상태를 관리하는 Container 컴포넌트입니다.
 */
export function RegisterFormContainer() {
  const { formData, isLoading, displayError, handleSubmit, handleChange } =
    useRegisterForm();

  return (
    <Card className="w-full max-w-md">
      <RegisterFormHeader />
      <form onSubmit={handleSubmit}>
        <RegisterFormFields
          formData={formData}
          isLoading={isLoading}
          displayError={displayError}
          onChange={handleChange}
        />
      </form>
      <RegisterFormFooter />
    </Card>
  );
}
