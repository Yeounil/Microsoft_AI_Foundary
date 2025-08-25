import React, { useState } from 'react';
import {
  Container,
  Box,
  Paper,
  Tabs,
  Tab,
  ThemeProvider,
  createTheme,
  CssBaseline
} from '@mui/material';
import StockSearch from './components/StockSearch';
import StockChart from './components/StockChart';
import StockAnalysis from './components/StockAnalysis';
import NewsSection from './components/NewsSection';

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
  const [selectedStock, setSelectedStock] = useState<{
    symbol: string;
    market: string;
    companyName?: string;
  } | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const handleStockSelect = (symbol: string, market: string) => {
    setSelectedStock({ symbol, market });
    // 주식이 선택되면 차트 탭으로 이동
    setTabValue(0);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;
