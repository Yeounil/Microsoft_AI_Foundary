import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-bold">AI Finance Analysis</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI 기술을 활용한 금융 데이터 분석 및 실시간 시장 정보 제공 플랫폼
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-3">빠른 링크</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  회사 소개
                </Link>
              </li>
              <li>
                <Link href="/features" className="text-muted-foreground hover:text-primary transition-colors">
                  주요 기능
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
                  요금제
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  문의하기
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-3">법적 고지</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  개인정보처리방침
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="text-muted-foreground hover:text-primary transition-colors">
                  투자 유의사항
                </Link>
              </li>
              <li>
                <Link href="/risk" className="text-muted-foreground hover:text-primary transition-colors">
                  리스크 고지
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-3">고객 지원</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="text-muted-foreground hover:text-primary transition-colors">
                  도움말
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-primary transition-colors">
                  자주 묻는 질문
                </Link>
              </li>
              <li>
                <Link href="/api-docs" className="text-muted-foreground hover:text-primary transition-colors">
                  API 문서
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@aifinance.com"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  support@aifinance.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © 2024 AI Finance Analysis. All rights reserved.
            </p>

            {/* Investment Warning */}
            <p className="text-xs text-muted-foreground text-center md:text-right max-w-md">
              투자 유의사항: 본 서비스는 투자 참고 자료이며, 투자 결정에 대한 책임은 투자자 본인에게 있습니다.
              과거 수익률이 미래 수익을 보장하지 않습니다.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}