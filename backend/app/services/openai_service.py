from openai import OpenAI, AzureOpenAI
from typing import Dict, Optional
from app.core.config import settings

class OpenAIService:
    
    def __init__(self):
        if settings.azure_openai_endpoint and settings.azure_openai_key:
            # Azure OpenAI 사용
            self.client = AzureOpenAI(
                azure_endpoint=settings.azure_openai_endpoint,
                api_key=settings.azure_openai_key,
                api_version=settings.azure_openai_version
            )
            self.is_azure = True
        else:
            # 일반 OpenAI 사용
            self.client = OpenAI(api_key=settings.openai_api_key)
            self.is_azure = False
    
    async def analyze_stock(self, symbol: str, stock_data: Dict, news_context: Optional[str] = None) -> str:
        """주식 분석 생성"""
        try:
            # 주식 데이터에서 핵심 정보 추출
            current_price = stock_data.get("current_price", 0)
            previous_close = stock_data.get("previous_close", 0)
            change_percent = ((current_price - previous_close) / previous_close * 100) if previous_close > 0 else 0
            
            company_name = stock_data.get("company_name", symbol)
            pe_ratio = stock_data.get("pe_ratio", "N/A")
            market_cap = stock_data.get("market_cap", "N/A")
            
            # 최근 가격 데이터 (최대 7일)
            recent_prices = stock_data.get("price_data", [])[-7:]
            
            prompt = f"""
            다음 주식에 대한 전문적인 투자 분석 보고서를 작성해주세요:

            **기업 정보:**
            - 기업명: {company_name}
            - 심볼: {symbol}
            - 현재가: {current_price}
            - 전일 대비: {change_percent:.2f}%
            - PER: {pe_ratio}
            - 시가총액: {market_cap}

            **최근 주가 동향:**
            {self._format_price_data(recent_prices)}

            {f"**관련 뉴스 정보:**\n{news_context}\n" if news_context else ""}

            다음 항목들을 포함하여 분석해주세요:
            1. 현재 주가 상황 분석
            2. 기술적 분석 (차트 패턴, 지지/저항선 등)
            3. 펀더멘털 분석 (재무상태, 성장성 등)
            4. 시장 환경 및 업계 동향
            5. 투자 의견 및 목표가 제시
            6. 리스크 요인

            분석은 객관적이고 균형 잡힌 시각으로 작성해주시고, 투자 결정의 참고 자료임을 명시해주세요.
            """

            if self.is_azure:
                response = self.client.chat.completions.create(
                    model="gpt-4",  # Azure에서는 deployment name
                    messages=[
                        {"role": "system", "content": "당신은 전문적인 금융 분석가입니다. 객관적이고 정확한 투자 분석을 제공합니다."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=2000,
                    temperature=0.7
                )
            else:
                response = self.client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "당신은 전문적인 금융 분석가입니다. 객관적이고 정확한 투자 분석을 제공합니다."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=2000,
                    temperature=0.7
                )
            
            return response.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"OpenAI 분석 생성 오류: {str(e)}")
    
    async def summarize_news(self, news_articles: list) -> str:
        """뉴스 요약 생성"""
        try:
            if not news_articles:
                return "분석할 뉴스가 없습니다."
            
            # 뉴스 기사들을 하나의 텍스트로 결합
            news_text = "\n\n".join([
                f"제목: {article.get('title', '')}\n내용: {article.get('description', '')}"
                for article in news_articles[:5]  # 최대 5개 기사만 사용
            ])
            
            prompt = f"""
            다음 금융/경제 뉴스들을 분석하고 요약해주세요:

            {news_text}

            다음 형식으로 요약해주세요:
            1. **주요 이슈 요약**: 핵심 내용 3-5줄 요약
            2. **시장 영향**: 주식시장이나 특정 섹터에 미칠 영향
            3. **투자자 관점**: 투자자들이 알아야 할 핵심 포인트
            4. **주의사항**: 위험 요소나 불확실성

            객관적이고 균형 잡힌 관점으로 작성해주세요.
            """

            if self.is_azure:
                response = self.client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "당신은 전문적인 금융 뉴스 분석가입니다."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=1500,
                    temperature=0.5
                )
            else:
                response = self.client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "당신은 전문적인 금융 뉴스 분석가입니다."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=1500,
                    temperature=0.5
                )
            
            return response.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"뉴스 요약 생성 오류: {str(e)}")
    
    def _format_price_data(self, price_data: list) -> str:
        """가격 데이터를 텍스트로 포맷팅"""
        if not price_data:
            return "가격 데이터가 없습니다."
        
        formatted = []
        for data in price_data:
            date = data.get("date", "")
            close = data.get("close", 0)
            volume = data.get("volume", 0)
            formatted.append(f"- {date}: 종가 {close}, 거래량 {volume:,}")
        
        return "\n".join(formatted)