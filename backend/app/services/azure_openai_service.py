import os
import json
import logging
from typing import List, Dict, Optional
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

class AzureOpenAIService:
    """OpenAI 서비스 (GPT-5 사용)"""

    def __init__(self):
        self.client = None
        self.model_name = "gpt-5"
        self._initialize_client()

    def _initialize_client(self):
        """OpenAI 클라이언트 초기화 (GPT-5 사용)"""
        try:
            # GPT-5를 사용하기 위해 OpenAI API 키 필수
            if settings.openai_api_key:
                self.client = OpenAI(api_key=settings.openai_api_key)
                self.model_name = "gpt-5"
                logger.info("GPT-5 OpenAI 클라이언트 초기화 완료")
            else:
                logger.warning("OpenAI API 설정이 없음. AI 기능을 사용할 수 없습니다.")
                return

        except Exception as e:
            logger.error(f"OpenAI 클라이언트 초기화 실패: {str(e)}")
            self.client = None
    
    async def analyze_news_relevance(
        self, 
        news_article: Dict, 
        user_interests: List[str],
        user_context: Optional[Dict] = None
    ) -> Dict:
        """뉴스와 사용자 관심사의 관련성 분석"""
        try:
            if not self.client:
                return self._fallback_analysis(news_article, user_interests)
            
            # 프롬프트 구성
            prompt = self._build_relevance_prompt(news_article, user_interests, user_context)
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a financial news analyst specializing in personalized content recommendation."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.3
            )
            
            result = response.choices[0].message.content
            return self._parse_relevance_result(result)
            
        except Exception as e:
            logger.error(f"뉴스 관련성 분석 오류: {str(e)}")
            return self._fallback_analysis(news_article, user_interests)
    
    async def generate_personalized_summary(
        self, 
        news_articles: List[Dict], 
        user_interests: List[str]
    ) -> Dict:
        """개인화된 뉴스 요약 생성"""
        try:
            if not self.client or not news_articles:
                return {"summary": "뉴스 요약을 생성할 수 없습니다.", "highlights": []}
            
            # 상위 5개 뉴스만 분석
            top_articles = news_articles[:5]
            
            prompt = self._build_summary_prompt(top_articles, user_interests)
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a financial analyst creating personalized news summaries for investors."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.5
            )
            
            result = response.choices[0].message.content
            return self._parse_summary_result(result)
            
        except Exception as e:
            logger.error(f"개인화 요약 생성 오류: {str(e)}")
            return {"summary": "요약 생성 중 오류가 발생했습니다.", "highlights": []}
    
    async def analyze_market_sentiment(
        self, 
        news_articles: List[Dict], 
        symbol: str
    ) -> Dict:
        """특정 종목에 대한 시장 감정 분석"""
        try:
            if not self.client or not news_articles:
                return {"sentiment": "neutral", "score": 0.0, "reasoning": "분석할 뉴스가 없습니다."}
            
            prompt = self._build_sentiment_prompt(news_articles, symbol)
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a financial sentiment analyst. Analyze news sentiment for stock investments."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.2
            )
            
            result = response.choices[0].message.content
            return self._parse_sentiment_result(result)
            
        except Exception as e:
            logger.error(f"시장 감정 분석 오류: {str(e)}")
            return {"sentiment": "neutral", "score": 0.0, "reasoning": "분석 중 오류 발생"}
    
    async def recommend_news_categories(
        self, 
        user_interaction_history: List[Dict],
        current_interests: List[str]
    ) -> List[str]:
        """사용자 상호작용 기록을 바탕으로 뉴스 카테고리 추천"""
        try:
            if not self.client:
                return self._fallback_categories(current_interests)
            
            prompt = self._build_category_prompt(user_interaction_history, current_interests)
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a recommendation system analyst specializing in financial news categorization."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150,
                temperature=0.4
            )
            
            result = response.choices[0].message.content
            return self._parse_category_result(result)
            
        except Exception as e:
            logger.error(f"카테고리 추천 오류: {str(e)}")
            return self._fallback_categories(current_interests)
    
    def _build_relevance_prompt(
        self, 
        news_article: Dict, 
        user_interests: List[str], 
        user_context: Optional[Dict] = None
    ) -> str:
        """관련성 분석 프롬프트 구성"""
        title = news_article.get('title', '')
        description = news_article.get('description', '')
        symbol = news_article.get('symbol', '')
        
        context_info = ""
        if user_context:
            context_info = f"User trading experience: {user_context.get('experience_level', 'intermediate')}, "
            context_info += f"Risk tolerance: {user_context.get('risk_tolerance', 'moderate')}"
        
        return f"""
Analyze the relevance of this financial news to the user's interests:

News Title: {title}
News Description: {description}
Related Symbol: {symbol}

User Interests: {', '.join(user_interests)}
{context_info}

Please provide analysis in JSON format:
{{
    "relevance_score": <0.0 to 1.0>,
    "reasoning": "<brief explanation>",
    "key_topics": ["<topic1>", "<topic2>"],
    "impact_level": "<low/medium/high>",
    "recommendation": "<why this is relevant to user>"
}}
"""
    
    def _build_summary_prompt(self, news_articles: List[Dict], user_interests: List[str]) -> str:
        """요약 생성 프롬프트 구성"""
        articles_text = ""
        for i, article in enumerate(news_articles, 1):
            articles_text += f"{i}. {article.get('title', '')} - {article.get('description', '')[:100]}\n"
        
        return f"""
Create a personalized financial news summary for a user interested in: {', '.join(user_interests)}

Recent News Articles:
{articles_text}

Please provide a summary in JSON format:
{{
    "summary": "<2-3 sentence overview focusing on user's interests>",
    "highlights": ["<key point 1>", "<key point 2>", "<key point 3>"],
    "market_outlook": "<brief market outlook based on the news>",
    "actionable_insights": ["<insight 1>", "<insight 2>"]
}}
"""
    
    def _build_sentiment_prompt(self, news_articles: List[Dict], symbol: str) -> str:
        """감정 분석 프롬프트 구성"""
        articles_text = ""
        for article in news_articles:
            articles_text += f"- {article.get('title', '')} | {article.get('description', '')[:150]}\n"
        
        return f"""
Analyze the overall market sentiment for {symbol} based on these news articles:

{articles_text}

Provide sentiment analysis in JSON format:
{{
    "sentiment": "<positive/negative/neutral>",
    "score": <-1.0 to 1.0>,
    "confidence": <0.0 to 1.0>,
    "reasoning": "<brief explanation of the sentiment>",
    "key_factors": ["<factor1>", "<factor2>"]
}}
"""
    
    def _build_category_prompt(
        self, 
        user_interaction_history: List[Dict], 
        current_interests: List[str]
    ) -> str:
        """카테고리 추천 프롬프트 구성"""
        interactions_text = ""
        for interaction in user_interaction_history[-10:]:  # 최근 10개만
            interactions_text += f"- {interaction.get('action', '')} on {interaction.get('category', '')} news\n"
        
        return f"""
Based on user's interaction history and current interests, recommend 3-5 news categories:

Current Interests: {', '.join(current_interests)}

Recent Interactions:
{interactions_text}

Available Categories: earnings, mergers, analyst_ratings, market_trends, technology, regulation, economic_indicators, company_news

Respond with JSON array: ["category1", "category2", "category3"]
"""
    
    def _parse_relevance_result(self, result: str) -> Dict:
        """관련성 분석 결과 파싱"""
        try:
            # JSON 파싱 시도
            if '{' in result and '}' in result:
                json_start = result.find('{')
                json_end = result.rfind('}') + 1
                json_str = result[json_start:json_end]
                return json.loads(json_str)
        except:
            pass
        
        # 기본값 반환
        return {
            "relevance_score": 0.5,
            "reasoning": "AI 분석 결과를 파싱할 수 없음",
            "key_topics": ["general"],
            "impact_level": "medium",
            "recommendation": "일반적인 관련성"
        }
    
    def _parse_summary_result(self, result: str) -> Dict:
        """요약 결과 파싱"""
        try:
            if '{' in result and '}' in result:
                json_start = result.find('{')
                json_end = result.rfind('}') + 1
                json_str = result[json_start:json_end]
                return json.loads(json_str)
        except:
            pass
        
        return {
            "summary": "요약을 생성할 수 없습니다.",
            "highlights": ["분석 중 오류 발생"],
            "market_outlook": "중립적",
            "actionable_insights": ["추가 정보 필요"]
        }
    
    def _parse_sentiment_result(self, result: str) -> Dict:
        """감정 분석 결과 파싱"""
        try:
            if '{' in result and '}' in result:
                json_start = result.find('{')
                json_end = result.rfind('}') + 1
                json_str = result[json_start:json_end]
                return json.loads(json_str)
        except:
            pass
        
        return {
            "sentiment": "neutral",
            "score": 0.0,
            "confidence": 0.5,
            "reasoning": "분석 결과 파싱 실패",
            "key_factors": ["분석 오류"]
        }
    
    def _parse_category_result(self, result: str) -> List[str]:
        """카테고리 추천 결과 파싱"""
        try:
            if '[' in result and ']' in result:
                json_start = result.find('[')
                json_end = result.rfind(']') + 1
                json_str = result[json_start:json_end]
                return json.loads(json_str)
        except:
            pass
        
        return ["earnings", "market_trends", "company_news"]
    
    def _fallback_analysis(self, news_article: Dict, user_interests: List[str]) -> Dict:
        """AI 분석 실패 시 폴백 분석"""
        title = news_article.get('title', '').lower()
        description = news_article.get('description', '').lower()
        
        # 간단한 키워드 매칭
        relevance_score = 0.0
        matched_interests = []
        
        for interest in user_interests:
            if interest.lower() in title or interest.lower() in description:
                relevance_score += 0.3
                matched_interests.append(interest)
        
        relevance_score = min(1.0, relevance_score)
        
        return {
            "relevance_score": relevance_score,
            "reasoning": f"키워드 매칭 기반 분석: {', '.join(matched_interests) if matched_interests else '직접적인 매치 없음'}",
            "key_topics": matched_interests or ["general"],
            "impact_level": "medium" if relevance_score > 0.5 else "low",
            "recommendation": "기본 관련성 분석"
        }
    
    def _fallback_categories(self, current_interests: List[str]) -> List[str]:
        """카테고리 추천 폴백"""
        base_categories = ["earnings", "market_trends", "company_news"]
        
        # 현재 관심사가 기술주면 기술 카테고리 추가
        tech_symbols = ["AAPL", "GOOGL", "MSFT", "NVDA", "META"]
        if any(symbol in current_interests for symbol in tech_symbols):
            base_categories.append("technology")
        
        return base_categories[:4]
    
    async def generate_stock_specific_summary(
        self, 
        news_articles: List[Dict], 
        symbol: str
    ) -> Dict:
        """특정 종목에 대한 AI 요약 생성"""
        try:
            # 회사 정보 매핑
            company_info = {
                'AAPL': {'name': 'Apple Inc.', 'sector': '기술', 'description': 'iPhone, Mac 등을 제조하는 글로벌 기술 회사'},
                'GOOGL': {'name': 'Alphabet Inc.', 'sector': '기술', 'description': 'Google 검색, 클라우드, AI 서비스 제공업체'},
                'MSFT': {'name': 'Microsoft Corporation', 'sector': '기술', 'description': 'Windows, Office, Azure 클라우드 서비스 제공업체'},
                'NVDA': {'name': 'NVIDIA Corporation', 'sector': '반도체', 'description': 'GPU, AI 칩 전문 반도체 회사'},
                'TSLA': {'name': 'Tesla Inc.', 'sector': '자동차', 'description': '전기차 및 에너지 저장 솔루션 제조업체'},
                'AMZN': {'name': 'Amazon.com Inc.', 'sector': 'e커머스/클라우드', 'description': '글로벌 전자상거래 및 AWS 클라우드 서비스 제공업체'},
                'META': {'name': 'Meta Platforms Inc.', 'sector': 'SNS/메타버스', 'description': 'Facebook, Instagram 등 소셜미디어 플랫폼 운영업체'},
            }
            
            company = company_info.get(symbol.upper(), {
                'name': symbol, 
                'sector': '일반', 
                'description': f'{symbol} 관련 기업'
            })
            
            # 뉴스 제목들을 문자열로 결합
            news_titles = []
            news_summaries = []
            
            for i, article in enumerate(news_articles[:5]):
                news_titles.append(f"{i+1}. {article.get('title', 'N/A')}")
                summary = article.get('description', '')[:100]
                if summary:
                    news_summaries.append(f"{i+1}. {summary}...")
            
            news_context = "\\n".join(news_titles)
            summary_context = "\\n".join(news_summaries) if news_summaries else news_context
            
            prompt = f"""
다음은 {company['name']} ({symbol}) 관련 최신 뉴스입니다.

회사 정보:
- 회사명: {company['name']}
- 섹터: {company['sector']}
- 설명: {company['description']}

최신 뉴스 제목들:
{news_context}

뉴스 요약:
{summary_context}

위 뉴스들을 바탕으로 {symbol} 종목에 대한 전문적인 분석을 다음 JSON 형식으로 작성해주세요:

{{
    "summary": "해당 종목의 현재 상황을 2-3문장으로 요약",
    "highlights": [
        "주요 이슈 1",
        "주요 이슈 2", 
        "주요 이슈 3"
    ],
    "market_outlook": "긍정적|중립적|부정적 중 하나",
    "stock_impact": "상승|보합|하락 중 하나",
    "actionable_insights": [
        "투자자를 위한 실용적인 조언 1",
        "투자자를 위한 실용적인 조언 2"
    ],
    "risk_factors": [
        "주의해야 할 리스크 요소 1",
        "주의해야 할 리스크 요소 2"
    ],
    "key_metrics": [
        "주목해야 할 지표나 이벤트 1",
        "주목해야 할 지표나 이벤트 2"
    ]
}}

응답은 반드시 유효한 JSON 형식이어야 하며, 한국어로 작성해주세요.
"""

            # OpenAI API 호출
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "당신은 금융 분석 전문가입니다. 뉴스를 바탕으로 종목별 전문적인 분석을 제공합니다."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.3
            )
            
            result_text = response.choices[0].message.content.strip()
            
            # JSON 파싱
            try:
                # JSON 블록 추출
                if '```json' in result_text:
                    json_start = result_text.find('```json') + 7
                    json_end = result_text.find('```', json_start)
                    json_str = result_text[json_start:json_end].strip()
                elif '{' in result_text and '}' in result_text:
                    json_start = result_text.find('{')
                    json_end = result_text.rfind('}') + 1
                    json_str = result_text[json_start:json_end]
                else:
                    json_str = result_text
                
                parsed_summary = json.loads(json_str)
                
                # 필수 필드 검증 및 기본값 설정
                required_fields = {
                    'summary': f'{symbol} 관련 최신 뉴스 분석 결과입니다.',
                    'highlights': [f'{symbol} 주요 이슈들'],
                    'market_outlook': '중립적',
                    'stock_impact': '보합',
                    'actionable_insights': ['상세한 분석을 위해 추가 정보를 확인해보세요.'],
                    'risk_factors': ['시장 변동성에 주의하세요.'],
                    'key_metrics': ['주요 재무 지표를 모니터링하세요.']
                }
                
                for field, default_value in required_fields.items():
                    if field not in parsed_summary or not parsed_summary[field]:
                        parsed_summary[field] = default_value
                
                logger.info(f"{symbol} AI 종목별 요약 생성 성공")
                return parsed_summary
                
            except json.JSONDecodeError as json_error:
                logger.warning(f"JSON 파싱 실패 ({symbol}): {str(json_error)}")
                return self._fallback_stock_summary(symbol, news_articles)
                
        except Exception as e:
            logger.error(f"{symbol} AI 종목별 요약 생성 오류: {str(e)}")
            return self._fallback_stock_summary(symbol, news_articles)
    
    def _fallback_stock_summary(self, symbol: str, news_articles: List[Dict]) -> Dict:
        """종목별 요약 생성 실패 시 폴백"""
        # 간단한 키워드 분석
        all_text = " ".join([
            article.get('title', '') + " " + article.get('description', '') 
            for article in news_articles[:3]
        ]).lower()
        
        # 긍정/부정 키워드 분석
        positive_keywords = ['up', 'rise', 'gain', 'growth', 'strong', 'beat', 'exceed', 'positive', '상승', '성장', '호조']
        negative_keywords = ['down', 'fall', 'drop', 'loss', 'weak', 'miss', 'decline', 'negative', '하락', '감소', '부진']
        
        positive_count = sum(1 for keyword in positive_keywords if keyword in all_text)
        negative_count = sum(1 for keyword in negative_keywords if keyword in all_text)
        
        if positive_count > negative_count:
            outlook = "긍정적"
            impact = "상승"
        elif negative_count > positive_count:
            outlook = "부정적" 
            impact = "하락"
        else:
            outlook = "중립적"
            impact = "보합"
        
        # 주요 이슈 추출 (제목에서)
        highlights = []
        for article in news_articles[:3]:
            title = article.get('title', '')
            if title and len(title) > 10:
                highlights.append(title[:50] + "..." if len(title) > 50 else title)
        
        if not highlights:
            highlights = [f"{symbol} 관련 최신 동향"]
        
        return {
            "summary": f"{symbol}에 대한 최근 뉴스들을 분석한 결과, {outlook.lower()} 흐름을 보이고 있습니다.",
            "highlights": highlights,
            "market_outlook": outlook,
            "stock_impact": impact,
            "actionable_insights": [
                "최신 뉴스와 시장 동향을 지속적으로 모니터링하세요.",
                f"{symbol} 관련 공식 발표나 실적 정보를 확인해보세요."
            ],
            "risk_factors": [
                "시장 전반의 변동성에 주의하세요.",
                "개별 종목의 펀더멘털을 면밀히 검토하세요."
            ],
            "key_metrics": [
                "주요 재무 지표 변화 추이",
                "업계 전반의 성장률 비교"
            ]
        }