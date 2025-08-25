import yfinance as yf
import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime, timedelta

class StockService:
    
    @staticmethod
    def get_stock_data(symbol: str, period: str = "1y") -> Dict:
        """주식 데이터 가져오기"""
        try:
            # yfinance를 사용해 주식 데이터 가져오기
            stock = yf.Ticker(symbol)
            
            # 기본 정보
            info = stock.info
            
            # 주가 데이터
            hist = stock.history(period=period)
            
            # 데이터프레임을 딕셔너리로 변환
            price_data = []
            for date, row in hist.iterrows():
                price_data.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "open": round(row["Open"], 2),
                    "high": round(row["High"], 2),
                    "low": round(row["Low"], 2),
                    "close": round(row["Close"], 2),
                    "volume": int(row["Volume"])
                })
            
            return {
                "symbol": symbol,
                "company_name": info.get("longName", symbol),
                "current_price": round(info.get("currentPrice", 0), 2),
                "previous_close": round(info.get("previousClose", 0), 2),
                "market_cap": info.get("marketCap", 0),
                "pe_ratio": info.get("trailingPE", 0),
                "price_data": price_data,
                "currency": info.get("currency", "USD")
            }
            
        except Exception as e:
            raise Exception(f"Error fetching stock data: {str(e)}")
    
    @staticmethod
    def get_korean_stock_data(symbol: str, period: str = "1y") -> Dict:
        """한국 주식 데이터 가져오기"""
        try:
            # 한국 주식의 경우 .KS 또는 .KQ 접미사 추가
            if not symbol.endswith(('.KS', '.KQ')):
                # 기본적으로 KOSPI(.KS)로 설정
                kr_symbol = f"{symbol}.KS"
            else:
                kr_symbol = symbol
            
            stock = yf.Ticker(kr_symbol)
            info = stock.info
            hist = stock.history(period=period)
            
            price_data = []
            for date, row in hist.iterrows():
                price_data.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "open": round(row["Open"], 0),
                    "high": round(row["High"], 0),
                    "low": round(row["Low"], 0),
                    "close": round(row["Close"], 0),
                    "volume": int(row["Volume"])
                })
            
            return {
                "symbol": kr_symbol,
                "company_name": info.get("longName", kr_symbol),
                "current_price": round(info.get("currentPrice", 0), 0),
                "previous_close": round(info.get("previousClose", 0), 0),
                "market_cap": info.get("marketCap", 0),
                "pe_ratio": info.get("trailingPE", 0),
                "price_data": price_data,
                "currency": "KRW"
            }
            
        except Exception as e:
            raise Exception(f"Error fetching Korean stock data: {str(e)}")
    
    @staticmethod
    def search_stocks(query: str) -> List[Dict]:
        """주식 검색"""
        try:
            # yfinance의 Ticker 정보를 사용해 검색
            # 실제로는 더 고도화된 검색 API를 사용하는 것이 좋음
            common_stocks = {
                "AAPL": "Apple Inc.",
                "GOOGL": "Alphabet Inc.",
                "MSFT": "Microsoft Corporation",
                "TSLA": "Tesla, Inc.",
                "AMZN": "Amazon.com Inc.",
                "005930.KS": "삼성전자",
                "000660.KS": "SK하이닉스",
                "051910.KS": "LG화학",
                "035420.KS": "NAVER",
                "035720.KS": "카카오"
            }
            
            results = []
            query_lower = query.lower()
            
            for symbol, name in common_stocks.items():
                if query_lower in symbol.lower() or query_lower in name.lower():
                    results.append({
                        "symbol": symbol,
                        "name": name
                    })
            
            return results[:10]  # 최대 10개 결과 반환
            
        except Exception as e:
            raise Exception(f"Error searching stocks: {str(e)}")