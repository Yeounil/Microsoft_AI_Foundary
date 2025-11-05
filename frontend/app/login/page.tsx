"use client";

import { useRouter } from 'next/navigation';
import { LoginPage } from '@/components/LoginPage';

export default function Login() {
  const router = useRouter();

  const handleLogin = (accessToken: string) => {
    router.push('/main');
  };

  const handleSwitchToRegister = () => {
    router.push('/register');
  };

  return (
    <LoginPage
      onLogin={handleLogin}
      onSwitchToRegister={handleSwitchToRegister}
    />
  );
}
