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

interface RegisterPageProps {
  onRegister: (token: string) => void;
  onSwitchToLogin: () => void;
}

export function RegisterPage({ onRegister, onSwitchToLogin }: RegisterPageProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.register(username, email, password);

      if (response.user) {
        setSuccess('회원가입이 완료되었습니다! 로그인 중...');

        // 회원가입 후 자동 로그인
        try {
          const loginResponse = await authService.login(username, password);
          if (loginResponse.access_token) {
            authService.saveToken(loginResponse.access_token);
            onRegister(loginResponse.access_token);
          } else {
            setError('회원가입은 완료되었으나 로그인에 실패했습니다. 로그인 페이지로 이동해주세요.');
          }
        } catch (loginError) {
          setError('회원가입은 완료되었으나 로그인에 실패했습니다. 로그인 페이지로 이동해주세요.');
        }
      } else {
        setError('회원가입에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);

      if (error.response?.status === 400) {
        setError('이미 사용 중인 사용자명 또는 이메일입니다.');
      } else if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
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
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>새로운 계정을 만들어 시작하세요</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4">
              <AlertDescription>{success}</AlertDescription>
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
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="이메일을 입력하세요"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                placeholder="비밀번호를 입력하세요 (최소 6자)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 border-2 border-slate-300 focus:border-primary"
                required
                disabled={loading}
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
                className="h-12 border-2 border-slate-300 focus:border-primary"
                required
                disabled={loading}
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-red-500 text-sm">비밀번호가 일치하지 않습니다</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-secondary h-12"
              size="lg"
              disabled={loading || password !== confirmPassword}
            >
              {loading ? '회원가입 중...' : '회원가입'}
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
