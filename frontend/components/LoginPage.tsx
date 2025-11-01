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
        authService.saveToken(response.access_token, response.refresh_token);
        onLogin(response.access_token);
      } else {
        setError('로그인에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Login error:', error);

      // 네트워크 에러 또는 서버 응답이 없는 경우
      if (!error.response) {
        setError('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
      }
      // HTTP 상태 코드별 에러 처리
      else if (error.response.status === 401) {
        setError('잘못된 사용자명 또는 비밀번호입니다.');
      } else if (error.response.status === 404) {
        setError('로그인 서비스를 찾을 수 없습니다. 관리자에게 문의하세요.');
      } else if (error.response.status === 422) {
        setError('입력 정보가 올바르지 않습니다.');
      } else if (error.response.status >= 500) {
        setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
      // 백엔드에서 제공하는 상세 메시지
      else if (error.response.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          setError(error.response.data.detail);
        } else {
          setError('로그인 중 오류가 발생했습니다.');
        }
      }
      // 기타 에러
      else {
        setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-[400px] shadow-lg border-0">
        <CardHeader className="text-center pb-4 pt-8 px-8">
          <div className="flex justify-center mb-6">
            <Image
              src={myLogo}
              alt="I NEED RED Logo"
              width={200}
              height={60}
              priority
              className="object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-semibold text-[#333333]">로그인</CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#333333] font-normal">사용자명</Label>
              <Input
                id="username"
                type="text"
                placeholder="사용자명을 입력하세요"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 rounded border border-[#E0E0E0] focus:border-[#333333] focus-visible:ring-0 focus-visible:ring-offset-0"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#333333] font-normal">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded border border-[#E0E0E0] focus:border-[#333333] focus-visible:ring-0 focus-visible:ring-offset-0"
                required
                disabled={loading}
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-secondary h-11 rounded-lg font-semibold text-base shadow-none"
                disabled={loading}
              >
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            </div>

            <div className="text-center pt-4">
              <p className="text-[#666666] text-sm">
                계정이 없으신가요?{' '}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-secondary hover:underline font-medium"
                  disabled={loading}
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
