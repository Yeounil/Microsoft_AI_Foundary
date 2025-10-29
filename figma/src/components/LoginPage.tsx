import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { TrendingUp } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string) => void;
  onSwitchToRegister: () => void;
}

export function LoginPage({ onLogin, onSwitchToRegister }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username);
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
          <CardTitle className="text-2xl">로그인</CardTitle>
          <CardDescription>AI 금융 분석 플랫폼에 오신 것을 환영합니다</CardDescription>
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

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-secondary h-12"
              size="lg"
            >
              로그인
            </Button>

            <div className="text-center pt-4">
              <p className="text-muted-foreground text-sm">
                계정이 없으신가요?{' '}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-primary hover:underline font-medium"
                >
                  가입하기
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
