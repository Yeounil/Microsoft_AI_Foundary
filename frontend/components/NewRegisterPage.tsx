"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';

interface RegisterPageProps {
  onRegister: (username: string) => void;
  onSwitchToLogin: () => void;
}

export function NewRegisterPage({ onRegister, onSwitchToLogin }: RegisterPageProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && password === confirmPassword) {
      onRegister(username);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary/90 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="inline-flex items-center justify-center gap-3 bg-primary px-6 py-3 rounded-full mb-6 mx-auto">
            <TrendingUp className="w-8 h-8 text-secondary" />
            <span className="text-secondary text-xl font-semibold">I NEED RED</span>
          </div>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>새로운 계정을 만들어 시작하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">사용자명</Label>
              <Input
                id="username"
                type="text"
                placeholder="사용자명을 입력하세요"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="이메일을 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12"
                required
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-red-500 text-sm">비밀번호가 일치하지 않습니다</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-secondary h-12"
              size="lg"
              disabled={password !== confirmPassword}
            >
              회원가입
            </Button>

            <div className="text-center pt-4">
              <p className="text-muted-foreground text-sm">
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-primary hover:underline font-medium"
                >
                  로그인
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
