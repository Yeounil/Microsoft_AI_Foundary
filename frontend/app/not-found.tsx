import Link from 'next/link';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        {/* 404 아이콘 */}
        <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center">
          <span className="text-4xl font-bold text-muted-foreground">404</span>
        </div>

        {/* 메시지 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
          <p className="text-muted-foreground">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href="/main">
              <Home className="h-4 w-4 mr-2" />
              홈으로
            </Link>
          </Button>
          <Button asChild>
            <Link href="/main">
              <ArrowLeft className="h-4 w-4 mr-2" />
              이전 페이지
            </Link>
          </Button>
        </div>

        {/* 검색 제안 */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-3">
            찾으시는 종목이 있으신가요?
          </p>
          <Button asChild variant="secondary" size="sm">
            <Link href="/main">
              <Search className="h-4 w-4 mr-2" />
              종목 검색하기
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
