import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import {
  RegisterFormData,
  validateRegisterForm,
} from "../services/authService";

/**
 * 회원가입 폼 로직을 관리하는 커스텀 Hook
 */
export function useRegisterForm() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState<RegisterFormData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError("");

    // Validate form
    const error = validateRegisterForm(formData);
    if (error) {
      setValidationError(error);
      return;
    }

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      router.push("/main");
    } catch (err) {
      // Error is handled by the store
      console.error("Registration failed:", err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const displayError = error || validationError;

  return {
    formData,
    isLoading,
    displayError,
    handleSubmit,
    handleChange,
  };
}
