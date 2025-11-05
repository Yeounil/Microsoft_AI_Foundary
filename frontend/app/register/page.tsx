"use client";

import { useRouter } from 'next/navigation';
import { RegisterPage } from '@/components/RegisterPage';

export default function Register() {
  const router = useRouter();

  const handleRegister = (accessToken: string) => {
    router.push('/main');
  };

  const handleSwitchToLogin = () => {
    router.push('/login');
  };

  return (
    <RegisterPage
      onRegister={handleRegister}
      onSwitchToLogin={handleSwitchToLogin}
    />
  );
}
