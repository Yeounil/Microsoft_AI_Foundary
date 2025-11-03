'use client';

import logo from '@/assets/myLogo.png';
import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Paper,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import StockSearch from '@/components/StockSearch';
import StockChart from '@/components/StockChart';
import StockAnalysis from '@/components/StockAnalysis';
import NewsSection from '@/components/NewsSection';
import RecommendedNews from '@/components/RecommendedNews';
import Login from '@/components/Login';
import Register from '@/components/Register';
import { LandingPage } from '@/components/LandingPage';
import { authService, UserProfile } from '@/services/authService';
import Image from 'next/image';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function MainApp() {
  // 인증 상태 관리
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showRegister, setShowRegister] = useState<boolean>(false);

  // 뷰 모드 및 선택된 주식 상태
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard'>('landing');
  const [selectedStock, setSelectedStock] = useState<{
    symbol: string;
    market: string;
    companyName?: string;
  } | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Alert 상태
  const [alertOpen, setAlertOpen] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error'>('success');

  // 앱 시작 시 토큰 확인
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const token = authService.getToken();
      if (token) {
        const isValid = await authService.verifyToken();
        if (isValid) {
          const userInfo = await authService.getCurrentUser();
          setUser(userInfo);
          setIsAuthenticated(true);
        } else {
          authService.logout();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      authService.logout();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = useCallback((token: string) => {
    authService.saveToken(token);
    setIsAuthenticated(true);
    checkAuthStatus();
  }, [checkAuthStatus]);

  const handleLogout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setSelectedStock(null);
    setViewMode('landing');
    setTabValue(0);
  }, []);

  const handleRegisterSuccess = useCallback(() => {
    setShowRegister(false);
  }, []);

  const handleStockSelect = useCallback((symbol: string, market: string, companyName?: string) => {
    setSelectedStock({ symbol, market, companyName });
    setTabValue(0);
    setViewMode('dashboard');
  }, []);

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  const handleGoHome = useCallback(() => {
    setSelectedStock(null);
    setViewMode('landing');
  }, []);

  const handleAlert = useCallback((message: string, severity: 'success' | 'error') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
    // 3초 후 자동 닫기
    const timer = setTimeout(() => {
      setAlertOpen(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleAlertClose = useCallback(() => {
    setAlertOpen(false);
  }, []);

  const handleNewsButtonClick = useCallback(() => {
    if (viewMode === 'landing') {
      // 메인 화면에 있으면 뉴스 섹션으로 스크롤
      setTimeout(() => {
        const newsSection = document.querySelector('[data-news-section]');
        if (newsSection) {
          newsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      // 메인 화면이 아니면 메인 화면으로 이동
      setSelectedStock(null);
      setViewMode('landing');
      // 메인 화면 로드 후 뉴스 섹션으로 스크롤
      setTimeout(() => {
        const newsSection = document.querySelector('[data-news-section]');
        if (newsSection) {
          newsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    }
  }, [viewMode]);

  // 로딩 중
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // 로그인되지 않은 상태
  if (!isAuthenticated) {
    return (
      <>
        {showRegister ? (
          <Register
            onRegisterSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setShowRegister(false)}
          />
        ) : (
          <Login
            onLogin={handleLogin}
            onSwitchToRegister={() => setShowRegister(true)}
          />
        )}
      </>
    );
  }

  // 로그인된 상태 - 메인 앱
  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ height: '80px', py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* 로고 영역 */}
          <Box
            onClick={handleGoHome}
            sx={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexShrink: 0,
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'scale(1.02)',
              }
            }}
          >
            <Box
              sx={{
                bgcolor: '#FEE500',
                p: 1,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(254, 229, 0, 0.3)'
              }}
            >
              <Image
                src={logo}
                alt="I NEED RED Logo"
                width={32}
                height={32}
                style={{
                  display: 'block'
                }}
              />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: '#1E293B',
                  fontSize: '1.1rem',
                  letterSpacing: '-0.02em'
                }}
              >
                I NEED RED
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#64748B',
                  fontSize: '0.7rem',
                  display: 'block',
                  mt: -0.5
                }}
              >
                {user?.username}님 환영합니다
              </Typography>
            </Box>
          </Box>

          {/* 중앙 검색 영역 */}
          <Box sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mx: 3
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              width: '100%',
              maxWidth: '600px'
            }}>
              <Box sx={{ flex: 1 }}>
                <StockSearch onStockSelect={handleStockSelect} onAlert={handleAlert} />
              </Box>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleNewsButtonClick}
                size="medium"
                sx={{
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  borderWidth: 1.5,
                  '&:hover': {
                    borderWidth: 1.5
                  }
                }}
              >
                관심 뉴스
              </Button>
            </Box>
          </Box>

          {/* 사용자 정보 영역 */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 1,
            flexShrink: 0
          }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleLogout}
              sx={{
                whiteSpace: 'nowrap',
                borderWidth: 1.5,
                '&:hover': {
                  borderWidth: 1.5,
                  bgcolor: '#FEF3F3'
                }
              }}
            >
              로그아웃
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          minHeight: 'calc(100vh - 80px)',
          background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
          pb: 4
        }}
      >
        {viewMode === 'landing' && (
          <>
            <LandingPage onGetStarted={() => setViewMode('dashboard')} />
            <Container maxWidth="lg" sx={{ py: 4 }} data-news-section>
              <RecommendedNews />
            </Container>
          </>
        )}
        {viewMode === 'dashboard' && selectedStock && (
          <Container maxWidth="lg" sx={{ pt: 3, pb: 4 }}>
            <Paper
              elevation={0}
              sx={{
                overflow: 'hidden',
                mb: 3
              }}
            >
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                centered
                sx={{
                  '& .MuiTabs-flexContainer': {
                    gap: 1
                  }
                }}
              >
                <Tab label="차트" />
                <Tab label="AI 분석" />
                <Tab label="뉴스" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <StockChart
                  symbol={selectedStock.symbol}
                  market={selectedStock.market}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <StockAnalysis
                  symbol={selectedStock.symbol}
                  market={selectedStock.market}
                  companyName={selectedStock.companyName || selectedStock.symbol}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <NewsSection
                  selectedSymbol={selectedStock?.symbol}
                  selectedMarket={selectedStock?.market}
                />
              </TabPanel>
            </Paper>
          </Container>
        )}
      </Box>

      {/* 관심 종목 알림 */}
      <Snackbar
        open={alertOpen}
        autoHideDuration={3000}
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 10 }}
      >
        <Alert
          onClose={handleAlertClose}
          severity={alertSeverity}
          sx={{
            width: '100%',
            borderRadius: 2,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
            '& .MuiAlert-icon': {
              fontSize: '1.5rem'
            }
          }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
