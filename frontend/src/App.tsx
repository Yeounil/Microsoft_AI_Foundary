import logo from './assets/myLogo.png';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Paper,
  Tabs,
  Tab,
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import StockSearch from './components/StockSearch';
import StockChart from './components/StockChart';
import StockAnalysis from './components/StockAnalysis';
import NewsSection from './components/NewsSection';
import RecommendedNews from './components/RecommendedNews';
import Login from './components/Login';
import Register from './components/Register';
import LandingPage from './components/LandingPage';
import { authService, UserProfile } from './services/authService';

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

const theme = createTheme({
  palette: {
    primary: {
      main: '#FEE500', // Kakao Yellow
    },
    secondary: {
      main: '#3C1E1E', // Kakao Brown
    },
    background: {
      default: '#FFFFFF', // White background
    },
    text: {
      primary: '#333333',
      secondary: '#555555',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 1.0)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          color: '#333333',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        containedPrimary: {
          color: '#3C1E1E',
          '&:hover': {
            backgroundColor: '#FEE500',
            opacity: 0.9,
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});

function App() {
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
    authService.setupAxiosInterceptors();
  }, []);

  const checkAuthStatus = async () => {
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
  };

  const handleLogin = (token: string) => {
    authService.saveToken(token);
    setIsAuthenticated(true);
    checkAuthStatus();
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setSelectedStock(null);
    setViewMode('landing');
    setTabValue(0);
  };

  const handleRegisterSuccess = () => {
    setShowRegister(false);
  };

  const handleStockSelect = (symbol: string, market: string, companyName?: string) => {
    setSelectedStock({ symbol, market, companyName });
    setTabValue(0);
    setViewMode('dashboard');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleGoHome = () => {
    setSelectedStock(null);
    setViewMode('landing');
  };

  const handleAlert = (message: string, severity: 'success' | 'error') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
    // 3초 후 자동 닫기
    setTimeout(() => {
      setAlertOpen(false);
    }, 3000);
  };

  const handleAlertClose = () => {
    setAlertOpen(false);
  };

  const handleNewsButtonClick = () => {
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
  };

  // 로딩 중
  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  // 로그인되지 않은 상태
  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
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
      </ThemeProvider>
    );
  }

  // 로그인된 상태 - 메인 앱
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      <AppBar position="sticky">
        <Toolbar sx={{ height: '80px', py: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* 로고 영역 */}
          <Box 
            onClick={handleGoHome} 
            sx={{ 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              flexShrink: 0,
              width: '185px'
            }}
          >
            <img src={logo} alt="I NEED RED Logo" style={{ height: '45px', width: 'auto' }} />
          </Box>
          
          {/* 중앙 검색 영역 */}
          <Box sx={{ 
            flex: 1,
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            mx: 3,
            mt: 3
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
                variant="contained"
                onClick={handleNewsButtonClick}
                size="medium"
                sx={{
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  mt: -2,
                  backgroundColor: '#FFCA28', // A shade between light yellow and yellow
                  color: '#3C1E1E', // Dark text for contrast
                  '&:hover': {
                    backgroundColor: '#FFC107', // Darker shade on hover
                  },
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
            flexShrink: 0,
            minWidth: '200px'
          }}>
            <Typography variant="body2" sx={{ mr: 1, whiteSpace: 'nowrap' }}>
              {user?.username}님, 환영합니다!
            </Typography>
            <Button variant="outlined" color="secondary" onClick={handleLogout} sx={{ whiteSpace: 'nowrap' }}>
              로그아웃
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <main>
        {viewMode === 'landing' && (
          <>
            <LandingPage />
            <Container maxWidth="lg" sx={{ py: 4 }} data-news-section>
              <RecommendedNews onStockSelect={handleStockSelect} />
            </Container>
          </>
        )}
        {viewMode === 'dashboard' && selectedStock && (
          <Container maxWidth="lg" sx={{ py: 0 }}>
            <Paper>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                centered
                indicatorColor="secondary"
                textColor="secondary"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
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
      </main>

      {/* 관심 종목 알림 */}
      <Snackbar 
        open={alertOpen} 
        autoHideDuration={3000} 
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 10 }}
      >
        <Alert onClose={handleAlertClose} severity={alertSeverity} sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>
      
    </ThemeProvider>
  );
}

export default App;;;