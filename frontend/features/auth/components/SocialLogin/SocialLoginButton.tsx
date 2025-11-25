"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SocialLoginButtonProps {
  provider: "kakao" | "google" | "naver";
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const providerConfig = {
  kakao: {
    name: "카카오",
    bgColor: "bg-[#FEE500] dark:bg-[#FEE500]/90",
    hoverColor: "hover:bg-[#FDD835] dark:hover:bg-[#FEE500]",
    textColor: "text-[#000000] dark:text-[#000000]",
    borderClass: "dark:border dark:border-[#FEE500]/30",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 0C4.029 0 0 3.354 0 7.5c0 2.745 1.839 5.151 4.575 6.465-.189.688-.72 2.625-.825 3.024 0 0-.054.45.24.615.294.165.645-.03.645-.03 1.065-.93 3.135-2.775 3.135-2.775C8.49 14.91 9.24 15 9 15c4.971 0 9-3.354 9-7.5S13.971 0 9 0z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  google: {
    name: "Google",
    bgColor: "bg-white dark:bg-zinc-800",
    hoverColor: "hover:bg-gray-50 dark:hover:bg-zinc-700",
    textColor: "text-gray-700 dark:text-gray-200",
    borderClass: "border border-gray-300 dark:border-zinc-600",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
          fill="#4285F4"
        />
        <path
          d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z"
          fill="#34A853"
        />
        <path
          d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z"
          fill="#FBBC05"
        />
        <path
          d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
  naver: {
    name: "네이버",
    bgColor: "bg-[#03C75A] dark:bg-[#03C75A]/90",
    hoverColor: "hover:bg-[#02B350] dark:hover:bg-[#03C75A]",
    textColor: "text-white",
    borderClass: "dark:border dark:border-[#03C75A]/30",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12.3 9.9L5.7 0H0v18h5.7V8.1L12.3 18H18V0h-5.7v9.9z"
          fill="currentColor"
        />
      </svg>
    ),
  },
};

export function SocialLoginButton({
  provider,
  onClick,
  isLoading = false,
  disabled = false,
}: SocialLoginButtonProps) {
  const config = providerConfig[provider];

  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full ${config.bgColor} ${config.hoverColor} ${config.textColor} ${config.borderClass}`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <span className="mr-2">{config.icon}</span>
      )}
      {config.name}로 계속하기
    </Button>
  );
}
