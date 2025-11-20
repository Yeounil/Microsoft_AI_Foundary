"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, User, LogOut, Menu, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth-store";
import { NotificationDropdown } from "./NotificationDropdown";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: "홈", href: "/main" },
  { label: "관심", href: "/watchlist" },
  { label: "발견", href: "/discover" },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

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
              <span className="text-xl font-bold hidden sm:inline text-green-600">
                Green Wire
              </span>
            </Link>

            {/* Desktop Navigation - Hidden (using bottom nav and sidebar instead) */}
            <nav className="hidden">
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
            </nav>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-4">
            {/* Search Bar - Show on tablet and up */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex items-center"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="종목명 및 코드 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[200px] lg:w-[300px] xl:w-[400px] pl-9"
                />
              </div>
            </form>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notification Dropdown */}
            {isAuthenticated && <NotificationDropdown />}

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="min-h-[44px] min-w-[44px] p-2">
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
                    프로필
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
            ) : (
              <div className="flex items-center gap-2">
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
              className="md:hidden min-h-[44px] min-w-[44px] p-2"
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
                  className="p-2 rounded-full hover:bg-muted min-h-[44px] min-w-[44px]"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="종목명 및 코드 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 h-12"
                    inputMode="search"
                    autoComplete="off"
                  />
                </div>
              </form>

              {/* Navigation Items */}
              <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-4 text-lg font-medium rounded-lg transition-colors min-h-[56px]",
                      pathname === item.href
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* User Info */}
              {isAuthenticated && user && (
                <div className="p-4 border-t">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 w-full px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 min-h-[48px]"
                  >
                    <LogOut className="h-5 w-5" />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
