"use client";

import { Card } from "@/components/ui/card";
import { useLoginForm } from "../hooks/useLoginForm";
import { LoginFormHeader } from "../components/Login/LoginFormHeader";
import { LoginFormFields } from "../components/Login/LoginFormFields";
import { LoginFormFooter } from "../components/Login/LoginFormFooter";
import { SocialLoginSection } from "../components/SocialLogin/SocialLoginSection";

/**
 * LoginFormContainer
 * 로그인 폼의 모든 로직과 상태를 관리하는 Container 컴포넌트입니다.
 */
export function LoginFormContainer() {
  const { formData, isLoading, error, handleSubmit, handleChange } =
    useLoginForm();

  return (
    <Card className="w-full max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
      <LoginFormHeader />
      <div className="p-6 pt-0 space-y-6">
        <form onSubmit={handleSubmit}>
          <LoginFormFields
            formData={formData}
            isLoading={isLoading}
            error={error}
            onChange={handleChange}
          />
        </form>
        <SocialLoginSection />
      </div>
      <LoginFormFooter />
    </Card>
  );
}
