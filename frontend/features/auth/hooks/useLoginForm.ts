import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { LoginFormData } from "../services/authService";

/**
 * 로그인 폼 로직을 관리하는 커스텀 Hook
 */
export function useLoginForm() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState<LoginFormData>({
    username: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login({
        username: formData.username,
        password: formData.password,
      });
      router.push("/main");
    } catch (err) {
      // Error is handled by the store
      console.error("Login failed:", err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  return {
    formData,
    isLoading,
    error,
    handleSubmit,
    handleChange,
  };
}
