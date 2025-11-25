"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { User, LogOut, Menu, X, TrendingUp, Moon, Sun, Bell, Settings, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth-store";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

// 모바일 네비게이션 제거
// interface NavItem {
//   label: string;
//   href: string;
// }

// const navItems: NavItem[] = [
//   { label: "홈", href: "/main" },
//   { label: "관심", href: "/watchlist" },
//   { label: "발견", href: "/discover" },
// ];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background transition-all",
        isScrolled && "shadow-sm"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link
              href="/main"
              className="flex items-center gap-2 cursor-pointer"
            >
              <TrendingUp className="h-6 w-6 text-primary" color="green" />
              <span className="text-xl font-bold sm:inline text-green-600">
                Green Wire
              </span>
            </Link>

            {/* Desktop Navigation - Hidden (using bottom nav and sidebar instead) */}
            {/* <nav className="hidden">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary cursor-pointer px-3 py-2 rounded-md min-h-[44px] flex items-center",
                    pathname === item.href
                      ? "text-foreground bg-primary/10"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav> */}
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-4">
            {/* Search Bar - Show on tablet and up */}
            <div className="hidden md:flex items-center">
              <SearchAutocomplete
                placeholder="종목명 및 코드 검색"
                className="w-[200px] lg:w-[300px] xl:w-[400px]"
                defaultFilter="stock"
                showFilters={false}
              />
            </div>

            {/* Theme Toggle - Hide on mobile */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>

            {/* Notification Bell - Show when authenticated */}
            {isAuthenticated && <NotificationBell />}

            {/* User Menu - Hide on mobile */}
            {isAuthenticated ? (
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="min-h-11 min-w-11 p-2">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user?.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer">
                      내 보고서
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/subscriptions")} className="cursor-pointer">
                      내 구독 종목
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
                      설정
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/login")}
                >
                  로그인
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push("/register")}
                  className="hidden sm:inline-flex"
                >
                  회원가입
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              className="md:hidden min-h-11 min-w-11 p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Full Screen Overlay Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-background md:hidden animate-fade-in">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <span className="text-lg font-bold text-green-600">Green Wire</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-muted min-h-11 min-w-11"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Mobile Search */}
              <div className="p-4 border-b">
                <SearchAutocomplete
                  placeholder="종목명 및 코드 검색"
                  className="w-full"
                  defaultFilter="stock"
                  showFilters={false}
                />
              </div>

              {/* 메뉴 항목들 */}
              <div className="flex-1 overflow-y-auto">
                {/* 사용자 정보 (로그인한 경우) */}
                {isAuthenticated && user && (
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 메뉴 옵션들 */}
                <div className="p-4 space-y-2">
                  {isAuthenticated && (
                    <>
                      {/* 프로필 */}
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          router.push("/profile");
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-muted min-h-12 text-left"
                      >
                        <User className="h-5 w-5" />
                        <span>내 보고서</span>
                      </button>

                      {/* 내 구독 종목 */}
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          router.push("/subscriptions");
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-muted min-h-12 text-left"
                      >
                        <Mail className="h-5 w-5" />
                        <span>내 구독 종목</span>
                      </button>

                      {/* 설정 */}
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          router.push("/settings");
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-muted min-h-12 text-left"
                      >
                        <Settings className="h-5 w-5" />
                        <span>설정</span>
                      </button>
                    </>
                  )}

                  {/* 다크모드 토글 */}
                  <button
                    onClick={() => {
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-muted min-h-12 text-left"
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )}
                    <span>{theme === 'dark' ? '라이트 모드' : '다크 모드'}</span>
                  </button>

                  {/* 로그인/로그아웃 */}
                  {isAuthenticated ? (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 min-h-12 text-left"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>로그아웃</span>
                    </button>
                  ) : (
                    <div className="space-y-2 pt-2 border-t">
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          router.push("/login");
                        }}
                        className="flex items-center justify-center w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg min-h-12"
                      >
                        로그인
                      </button>
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          router.push("/register");
                        }}
                        className="flex items-center justify-center w-full px-4 py-3 border border-primary text-primary rounded-lg min-h-12"
                      >
                        회원가입
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
