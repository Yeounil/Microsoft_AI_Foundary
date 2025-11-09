"""
수치 데이터를 자연어 문장으로 변환하는 서비스
금융 데이터를 Embedding 전처리로 활용
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


class TextificationService:
    """수치 데이터를 맥락이 있는 자연어로 변환"""

    def __init__(self):
        self.supabase = get_supabase()

    @staticmethod
    def textify_stock_indicators(symbol: str, indicators: Dict) -> str:
        """
        주식 지표를 자연어 문장으로 변환

        Args:
            symbol: 종목 코드 (예: AAPL)
            indicators: stock_indicators 테이블의 데이터

        Returns:
            자연어로 변환된 회사 정보 문장
        """
        try:
            # NULL 안전성: None 값을 기본값으로 변환
            company_name = indicators.get("company_name") or symbol
            current_price = indicators.get("current_price") or 0
            market_cap = indicators.get("market_cap") or 0
            profit_margin = indicators.get("profit_margin") or 0
            sector = indicators.get("sector") or "Unknown"
            industry = indicators.get("industry") or "Unknown"
            fifty_two_week_high = indicators.get("fifty_two_week_high") or 0
            fifty_two_week_low = indicators.get("fifty_two_week_low") or 0
            previous_close = indicators.get("previous_close") or 0
            last_updated = indicators.get("last_updated") or datetime.now().isoformat()

            # 가격 변동 계산
            price_change = current_price - previous_close if previous_close and current_price else 0
            price_change_percent = (price_change / previous_close * 100) if previous_close and current_price else 0

            # 시가총액 포맷팅
            market_cap_str = TextificationService._format_market_cap(market_cap)

            # 52주 가격 범위 평가
            price_position = TextificationService._assess_price_position(
                current_price, fifty_two_week_low, fifty_two_week_high
            )

            # 종합 텍스트 생성
            price_str = f"${current_price:.2f}" if current_price else "price data unavailable"
            prev_close_str = f"${previous_close:.2f}" if previous_close else "previous close data unavailable"
            high_str = f"${fifty_two_week_high:.2f}" if fifty_two_week_high else "52-week high unavailable"
            low_str = f"${fifty_two_week_low:.2f}" if fifty_two_week_low else "52-week low unavailable"

            text = (
                f"As of {TextificationService._format_date(last_updated)}, "
                f"{company_name} ({symbol}) operates in the {sector} sector ({industry} industry). "
                f"The stock is currently trading at {price_str}, "
                f"representing a {'+' if price_change > 0 else ''}{price_change_percent:.2f}% change from the previous close of {prev_close_str}. "
                f"The company has a market capitalization of {market_cap_str}. "
                f"Over the past 52 weeks, the stock has traded between {low_str} (low) "
                f"and {high_str} (high), with the current price {price_position}. "
                f"The company maintains a net profit margin of {profit_margin:.2%}, reflecting {'strong' if profit_margin and profit_margin > 0.15 else 'moderate' if profit_margin and profit_margin > 0.05 else 'low'} profitability."
            )

            return text

        except Exception as e:
            logger.error(f"Error textifying stock indicators for {symbol}: {str(e)}")
            return f"Stock data for {symbol} is currently unavailable."

    @staticmethod
    def textify_price_movement(symbol: str, current_price: float, previous_close: float,
                               fifty_two_week_high: float, fifty_two_week_low: float,
                               volume: int = None) -> str:
        """
        주가 움직임을 자연어로 변환

        Args:
            symbol: 종목 코드
            current_price: 현재 가격
            previous_close: 전일 종가
            fifty_two_week_high: 52주 최고가
            fifty_two_week_low: 52주 최저가
            volume: 거래량

        Returns:
            주가 움직임을 설명하는 자연어 문장
        """
        try:
            price_change = current_price - previous_close
            price_change_percent = (price_change / previous_close * 100) if previous_close else 0

            direction = "up" if price_change > 0 else "down" if price_change < 0 else "unchanged"
            direction_symbol = "↑" if price_change > 0 else "↓" if price_change < 0 else "→"

            # 현재 가격이 52주 범위에서 어디에 위치하는지
            price_position_percent = (
                ((current_price - fifty_two_week_low) / (fifty_two_week_high - fifty_two_week_low) * 100)
                if (fifty_two_week_high - fifty_two_week_low) > 0 else 50
            )

            momentum_description = (
                "strong upward" if abs(price_change_percent) > 5 else "moderate" if abs(price_change_percent) > 2
                else "slight" if abs(price_change_percent) > 0 else "neutral"
            )

            volume_str = (
                f" with trading volume of {volume:,} shares" if volume else ""
            )

            text = (
                f"{symbol} stock movement: The price moved {direction_symbol} by ${abs(price_change):.2f} "
                f"({price_change_percent:+.2f}%) to ${current_price:.2f}. "
                f"This represents a {momentum_description} {direction} movement. "
                f"The stock is currently trading at the {price_position_percent:.0f}th percentile of its 52-week range "
                f"(between ${fifty_two_week_low:.2f} and ${fifty_two_week_high:.2f}){volume_str}. "
                f"{'The stock is near its highs, suggesting strong upward momentum.' if price_position_percent > 80 else 'The stock is near its lows, suggesting potential recovery opportunity.' if price_position_percent < 20 else 'The stock is trading in the middle of its 52-week range, showing relative stability.'}"
            )

            return text

        except Exception as e:
            logger.error(f"Error textifying price movement for {symbol}: {str(e)}")
            return f"Price movement data for {symbol} is currently unavailable."

    @staticmethod
    def textify_financial_health(symbol: str, ratios: Dict) -> str:
        """
        재무 건강도를 자연어로 변환

        Args:
            symbol: 종목 코드
            ratios: 재무 지표 딕셔너리

        Returns:
            재무 건강도를 설명하는 자연어 문장
        """
        try:
            current_ratio = ratios.get("current_ratio", 0)
            quick_ratio = ratios.get("quick_ratio", 0)
            profit_margin = ratios.get("profit_margin", 0)

            # 유동성 평가
            liquidity = (
                "excellent" if current_ratio > 2 else "good" if current_ratio > 1.5
                else "adequate" if current_ratio > 1 else "concerning"
            )

            # 이익성 평가
            profitability = (
                "excellent" if profit_margin > 0.2 else "strong" if profit_margin > 0.15
                else "moderate" if profit_margin > 0.05 else "weak"
            )

            text = (
                f"Financial health assessment for {symbol}: "
                f"The company demonstrates {liquidity} liquidity with a current ratio of {current_ratio:.2f}, "
                f"meaning it has ${current_ratio:.2f} in current assets for every dollar of current liabilities. "
                f"The quick ratio of {quick_ratio:.2f} further confirms {'strong' if quick_ratio > 1 else 'weak'} short-term solvency. "
                f"With a net profit margin of {profit_margin:.2%}, the company shows {profitability} profitability."
            )

            return text

        except Exception as e:
            logger.error(f"Error textifying financial ratios for {symbol}: {str(e)}")
            return f"Financial health data for {symbol} is currently unavailable."

    # ===== Helper Methods =====

    @staticmethod
    def _format_market_cap(market_cap: float) -> str:
        """시가총액을 읽기 쉬운 형식으로 변환"""
        if market_cap == 0:
            return "undisclosed"
        if market_cap >= 1e12:
            return f"${market_cap / 1e12:.1f} trillion"
        elif market_cap >= 1e9:
            return f"${market_cap / 1e9:.1f} billion"
        elif market_cap >= 1e6:
            return f"${market_cap / 1e6:.1f} million"
        else:
            return f"${market_cap:,.0f}"

    @staticmethod
    def _assess_valuation(pe_ratio: float) -> str:
        """P/E 비율을 평가 단계로 변환"""
        if pe_ratio == 0:
            return "not available for assessment"
        elif pe_ratio < 10:
            return "potentially undervalued"
        elif pe_ratio < 15:
            return "reasonably valued"
        elif pe_ratio < 25:
            return "fairly valued"
        elif pe_ratio < 35:
            return "growth-oriented valuation"
        else:
            return "premium valuation"

    @staticmethod
    def _assess_price_position(current: float, low_52w: float, high_52w: float) -> str:
        """52주 범위 내 현재 가격의 위치를 평가"""
        # NULL 안전성: None을 0으로 변환
        current = current or 0
        low_52w = low_52w or 0
        high_52w = high_52w or 0

        if (high_52w - low_52w) == 0:
            return "unable to determine"

        position_percent = ((current - low_52w) / (high_52w - low_52w)) * 100

        if position_percent > 80:
            return "near its 52-week high, suggesting strong upward momentum"
        elif position_percent > 60:
            return "in the upper range of its 52-week trading band"
        elif position_percent > 40:
            return "in the middle range of its 52-week trading band"
        elif position_percent > 20:
            return "in the lower range of its 52-week trading band"
        else:
            return "near its 52-week low, potentially indicating a recovery opportunity"

    @staticmethod
    def _assess_financial_health(roe: float, roa: float, debt_to_equity: float,
                                  profit_margin: float) -> str:
        """재무 건강도를 종합적으로 평가"""
        # NULL 안전성: None을 0으로 변환
        roe = roe or 0
        roa = roa or 0
        debt_to_equity = debt_to_equity or 0
        profit_margin = profit_margin or 0

        score = 0

        # ROE 평가 (0.15 이상 excellent)
        if roe >= 0.20:
            score += 3
        elif roe >= 0.15:
            score += 2
        elif roe >= 0.10:
            score += 1

        # ROA 평가
        if roa >= 0.10:
            score += 2
        elif roa >= 0.05:
            score += 1

        # 부채 평가 (낮을수록 좋음)
        if debt_to_equity <= 0.5:
            score += 2
        elif debt_to_equity <= 1.5:
            score += 1

        # 이익 마진 평가
        if profit_margin >= 0.20:
            score += 2
        elif profit_margin >= 0.10:
            score += 1

        if score >= 8:
            return "strong financial health and operational efficiency"
        elif score >= 5:
            return "moderate financial health with room for improvement"
        else:
            return "weak financial health requiring careful monitoring"

    @staticmethod
    def _format_date(date_str: str) -> str:
        """ISO 형식 날짜를 읽기 쉬운 형식으로 변환"""
        try:
            if isinstance(date_str, str):
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00')).replace(tzinfo=None)
            else:
                date_obj = date_str

            return date_obj.strftime("%B %d, %Y")
        except Exception:
            return "the latest update"
