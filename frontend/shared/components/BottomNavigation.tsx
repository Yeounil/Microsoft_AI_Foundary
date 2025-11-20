'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, Star, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: '증권',
    href: '/main',
    icon: <TrendingUp className="h-5 w-5" />
  },
  {
    label: '관심',
    href: '/watchlist',
    icon: <Star className="h-5 w-5" />
  },
  {
    label: '발견',
    href: '/discover',
    icon: <Compass className="h-5 w-5" />
  },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  // 현재 경로가 navItems 중 하나와 일치하는지 확인
  const isActive = (href: string) => {
    if (href === '/main') {
      return pathname === '/main' || pathname?.startsWith('/dashboard');
    }
    return pathname === href || pathname?.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t md:hidden safe-area-inset-bottom">
      <div className="flex items-center justify-around h-[60px] pb-safe">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center w-full h-full gap-1 transition-colors active:scale-95 min-h-[48px] min-w-[48px] touch-manipulation',
              isActive(item.href)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {item.icon}
            <span className="text-[11px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
