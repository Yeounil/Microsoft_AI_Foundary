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
  CircularProgress
} from '@mui/material';
import StockSearch from './components/StockSearch';
import StockChart from './components/StockChart';
import StockAnalysis from './components/StockAnalysis';
import NewsSection from './components/NewsSection';
import RecommendedNews from './components/RecommendedNews';
import Login from './components/Login';
import Register from './components/Register';
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
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function App() {
  // 인증 상태 관리
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showRegister, setShowRegister] = useState<boolean>(false);

  // 기존 상태들
  const [selectedStock, setSelectedStock] = useState<{
    symbol: string;
    market: string;
    companyName?: string;
  } | null>(null);
  const [tabValue, setTabValue] = useState(0);

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
    checkAuthStatus(); // 사용자 정보 로드
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setSelectedStock(null);
    setTabValue(0);
  };

  const handleRegisterSuccess = () => {
    setShowRegister(false);
  };

  const handleStockSelect = (symbol: string, market: string) => {
    setSelectedStock({ symbol, market });
    setTabValue(0);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
      
      {/* 상단 네비게이션 바 */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🚀 AI 금융 분석 플랫폼
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.username}님 환영합니다
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            로그아웃
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <StockSearch onStockSelect={handleStockSelect} />
        
        <Paper sx={{ mt: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            centered
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="차트" />
            <Tab label="AI 분석" />
            <Tab label="뉴스" />
            <Tab label="추천 뉴스" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {selectedStock ? (
              <StockChart 
                symbol={selectedStock.symbol} 
                market={selectedStock.market} 
              />
            ) : (
              <Box textAlign="center" py={8}>
                <div>주식을 선택하여 차트를 확인하세요</div>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {selectedStock ? (
              <StockAnalysis 
                symbol={selectedStock.symbol}
                market={selectedStock.market}
                companyName={selectedStock.companyName || selectedStock.symbol}
              />
            ) : (
              <Box textAlign="center" py={8}>
                <div>주식을 선택하여 AI 분석을 받아보세요</div>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <NewsSection 
              selectedSymbol={selectedStock?.symbol}
              selectedMarket={selectedStock?.market}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <RecommendedNews />
          </TabPanel>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;
