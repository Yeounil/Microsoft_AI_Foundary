"use client";

import { Card } from "@/components/ui/card";
import { useLoginForm } from "../hooks/useLoginForm";
import { LoginFormHeader } from "../components/Login/LoginFormHeader";
import { LoginFormFields } from "../components/Login/LoginFormFields";
import { LoginFormFooter } from "../components/Login/LoginFormFooter";

/**
 * LoginFormContainer
 * 로그인 폼의 모든 로직과 상태를 관리하는 Container 컴포넌트입니다.
 */
export function LoginFormContainer() {
  const { formData, isLoading, error, handleSubmit, handleChange } =
    useLoginForm();

  return (
    <Card className="w-full max-w-md">
      <LoginFormHeader />
      <form onSubmit={handleSubmit}>
        <LoginFormFields
          formData={formData}
          isLoading={isLoading}
          error={error}
          onChange={handleChange}
        />
      </form>
      <LoginFormFooter />
    </Card>
  );
}
