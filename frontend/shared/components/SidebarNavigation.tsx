'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, Star, Compass, Home, Settings, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const mainNavItems: NavItem[] = [
  {
    label: '홈',
    href: '/main',
    icon: <Home className="h-5 w-5" />
  },
  {
    label: '관심종목',
    href: '/watchlist',
    icon: <Star className="h-5 w-5" />
  },
  {
    label: '발견',
    href: '/discover',
    icon: <Compass className="h-5 w-5" />
  },
];

const bottomNavItems: NavItem[] = [
  {
    label: '설정',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />
  },
  {
    label: '도움말',
    href: '/help',
    icon: <HelpCircle className="h-5 w-5" />
  },
];

export default function SidebarNavigation() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();

  const isActive = (href: string) => {
    if (href === '/main') {
      return pathname === '/main' || pathname?.startsWith('/dashboard');
    }
    return pathname === href || pathname?.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b">
        <Link href="/main" className="flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-green-600" />
          <span className="text-xl font-bold text-green-600">Green Wire</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors min-h-[44px]',
              isActive(item.href)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t space-y-1">
        {bottomNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors min-h-[44px]',
              isActive(item.href)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        {/* User Info */}
        {isAuthenticated && user && (
          <div className="mt-4 px-4 py-3 bg-muted rounded-lg">
            <p className="text-sm font-medium truncate">{user.username}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
      </div>
    </div>
  );
}
