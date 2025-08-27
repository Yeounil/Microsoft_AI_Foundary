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
                model_name = settings.azure_openai_deployment or "gpt-4"
                response = self.client.chat.completions.create(
                    model=model_name,  # Azure에서는 deployment name
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
                model_name = settings.azure_openai_deployment or "gpt-4"
                response = self.client.chat.completions.create(
                    model=model_name,
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
    
    async def analyze_stock_with_news(self, symbol: str, news_articles: list, historical_analysis: str = None) -> str:
        """뉴스 데이터와 과거 분석을 기반으로 한 종목 심층 분석"""
        try:
            if not news_articles:
                return "분석할 뉴스가 없습니다."
            
            # 뉴스 데이터 준비 (10개로 증가)
            recent_news = sorted(news_articles, key=lambda x: x.get('published_at', ''), reverse=True)[:10]
            
            news_summary = "\n\n".join([
                f"[{article.get('published_at', '')[:10]}] {article.get('source', '')}:\n"
                f"제목: {article.get('title', '')}\n"
                f"내용: {article.get('description', '')[:200]}..."
                for article in recent_news
            ])
            
            # 과거 분석 정보 포함 여부에 따른 프롬프트 구성
            historical_section = ""
            if historical_analysis:
                historical_section = f"""
            
            **과거 분석 참고 자료:**
            {historical_analysis}
            
            ⚠️ **중요 지침:** 위 과거 분석 데이터는 참고 자료입니다. 다음 사항을 준수하세요:
            - 과거 분석의 내용을 비판적으로 검토하고 새로운 정보와 비교 분석하세요
            - 과거 예측이 틀렸다면 그 이유를 분석하고 개선점을 제시하세요
            - 시장 상황 변화를 반영하여 기존 분석을 업데이트하세요
            - 과거 분석에만 의존하지 말고 최신 뉴스와 균형있게 판단하세요
            """

            prompt = f"""
            {symbol} 종목에 대한 최신 뉴스와 과거 분석을 바탕으로 종합적인 투자 분석을 수행해주세요.

            **분석 대상:** {symbol}
            **뉴스 분석 기간:** 최근 7일
            **분석 뉴스 수:** {len(recent_news)}개

            **관련 최신 뉴스:**
            {news_summary}
            
            {historical_section}

            다음 항목에 따라 상세한 분석을 제공해주세요:

            ## 1. 뉴스 기반 핵심 이슈 분석
            - 가장 중요한 뉴스와 그 영향
            - 긍정적/부정적 요인 분석
            - 과거 분석 대비 변화된 점

            ## 2. 기업 펀더멘털 분석
            - 뉴스에서 나타난 재무상태 변화
            - 사업 전략 및 성장 동력
            - 과거 예측의 정확성 검토

            ## 3. 시장 환경 및 경쟁력
            - 업계 트렌드와 기업의 위치
            - 경쟁사 대비 강점/약점
            - 이전 분석 이후 경쟁 환경 변화

            ## 4. 주가 영향 요인 분석
            - 단기적 주가 모멘텀 요인
            - 중장기적 가치 평가 요소
            - 과거 분석의 주가 예측 검토

            ## 5. 투자 의견 (과거 분석과의 비교)
            - 투자 등급 (매수/보유/매도)
            - 목표 주가 범위 (근거와 함께)
            - 이전 투자 의견 대비 변화 사유
            - 투자 시 주의사항

            ## 6. 리스크 요인
            - 주요 위험 요소
            - 새로 발견된 리스크
            - 모니터링 포인트

            ## 7. 분석 정확성 향상
            - 과거 분석의 성공/실패 요인
            - 개선된 분석 방법론
            - 향후 모니터링 강화 포인트

            **중요:** 이 분석은 투자 의사결정의 참고자료이며, 실제 투자 시에는 추가적인 분석과 전문가 상담이 필요합니다.
            """

            system_message = "당신은 20년 경력의 전문 증권 애널리스트입니다. 뉴스 기반 종목 분석에 특화되어 있으며, 과거 분석 결과를 비판적으로 검토하고 새로운 정보와 결합하여 더 정확한 투자 인사이트를 제공합니다. 과거 데이터에 맹목적으로 의존하지 않고, 항상 최신 정보를 우선시하며 균형 잡힌 분석을 수행합니다."

            if self.is_azure:
                model_name = settings.azure_openai_deployment or "gpt-4"
                response = self.client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=3000,
                    temperature=0.6
                )
            else:
                response = self.client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=3000,
                    temperature=0.6
                )
            
            return response.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"뉴스 기반 주식 분석 생성 오류: {str(e)}")
    
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