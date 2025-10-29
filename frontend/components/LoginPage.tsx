import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { Alert, AlertDescription } from './ui/alert';
import Image from 'next/image';
import myLogo from '@/assets/myLogo.png';

interface LoginPageProps {
  onLogin: (token: string) => void;
  onSwitchToRegister: () => void;
}

export function LoginPage({ onLogin, onSwitchToRegister }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError('사용자명과 비밀번호를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.login(username, password);

      if (response.access_token) {
        authService.saveToken(response.access_token);
        onLogin(response.access_token);
      } else {
        setError('로그인에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Login error:', error);

      if (error.response?.status === 401) {
        setError('잘못된 사용자명 또는 비밀번호입니다.');
      } else if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary/90 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-6">
            <Image
              src={myLogo}
              alt="I NEED RED Logo"
              width={200}
              height={80}
              priority
              className="object-contain"
            />
          </div>
          <CardTitle className="text-2xl">로그인</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">사용자명</Label>
              <Input
                id="username"
                type="text"
                placeholder="사용자명을 입력하세요"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 border-2 border-slate-300 focus:border-primary"
                required
                disabled={loading}
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
                className="h-12 border-2 border-slate-300 focus:border-primary"
                required
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-secondary h-12"
              size="lg"
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
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
