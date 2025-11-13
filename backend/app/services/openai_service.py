"""
OpenAI GPT-5 서비스
뉴스 AI Score 평가 및 임베딩 생성
"""

import os
import json
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)


class OpenAIService:
    """
    OpenAI GPT-5 서비스

    주요 기능:
    1. 뉴스 AI Score 평가 (주가 영향도 0~1, 긍정/부정 방향)
    2. 임베딩 생성 (Pinecone Vector DB용)

    GPT-5 특징:
    - 최대 400,000 토큰 컨텍스트 (272k input + 128k output)
    - 할루시네이션 45% 감소 (GPT-4o 대비)
    - 향상된 추론 능력
    - 비용: $1.25/M input, $10/M output
    """

    def __init__(self):
        """OpenAI 클라이언트 초기화"""
        self.client = None
        self.model_name = "gpt-5"
        self.embedding_model = "text-embedding-ada-002"  # 1536차원
        self._initialize_client()

    def _initialize_client(self):
        """OpenAI 클라이언트 초기화"""
        try:
            if not settings.openai_api_key:
                logger.warning("⚠️ OpenAI API 키가 설정되지 않음")
                self.client = None
                return

            self.client = OpenAI(api_key=settings.openai_api_key)

            logger.info("✅ GPT-5 OpenAI 클라이언트 초기화 완료")
            logger.info(f"   모델: {self.model_name}")
            logger.info(f"   컨텍스트: 400K tokens")
            logger.info(f"   할루시네이션: 45% 감소")

        except Exception as e:
            logger.error(f"❌ OpenAI 클라이언트 초기화 실패: {str(e)}")
            self.client = None

    # ============================================================================
    # 핵심 기능 1: 뉴스 AI Score 평가 (주가 영향도)
    # ============================================================================

    async def evaluate_news_stock_impact(
        self,
        news_article: Dict,
        symbol: Optional[str] = None
    ) -> Dict:
        """
        뉴스가 주가에 미치는 영향을 AI로 평가

        Args:
            news_article: 뉴스 기사 정보
                - title: 제목
                - description: 요약
                - content/body: 본문 (선택)
                - symbol: 관련 종목 (선택)
                - published_at: 발행일
            symbol: 특정 종목 지정 (선택)

        Returns:
            {
                "ai_score": 0.0~1.0,  # 주가 영향도
                "impact_direction": "positive|negative|neutral",
                "confidence": 0.0~1.0,
                "reasoning": "평가 근거",
                "key_factors": ["요인1", "요인2"],
                "time_horizon": "short|medium|long",  # 영향 기간
                "volatility_impact": "low|medium|high"  # 변동성 영향
            }
        """
        try:
            if not self.client:
                logger.warning("[AI_SCORE] OpenAI 클라이언트 없음")
                return self._fallback_ai_score()

            # 뉴스 정보 추출
            title = news_article.get('title', '')
            description = news_article.get('description', '')
            body = news_article.get('body') or news_article.get('content', '')
            article_symbol = symbol or news_article.get('symbol', '')
            published_at = news_article.get('published_at', '')

            # 본문이 너무 길면 잘라내기 (토큰 절약)
            if body and len(body) > 2000:
                body = body[:2000] + "..."

            # 프롬프트 구성
            prompt = self._build_ai_score_prompt(
                title=title,
                description=description,
                body=body,
                symbol=article_symbol,
                published_at=published_at
            )

            logger.info(f"[AI_SCORE] 뉴스 평가 요청 - 제목: {title[:50]}...")
            logger.debug(f"[AI_SCORE] 프롬프트 길이: {len(prompt)} 문자")

            # GPT-5 호출 (temperature는 1.0 고정 - GPT-5는 기본값만 지원)
            response = await self._call_gpt5(
                system_prompt="""당신은 금융 뉴스 분석 전문가입니다.

뉴스가 주가에 미치는 영향을 객관적으로 평가하세요:
- AI Score: 0.0 (영향 없음) ~ 1.0 (매우 큰 영향)
- 긍정/부정/중립 방향 판단
- 근거를 명확히 제시
- 추측하지 말고 뉴스 내용만 분석

GPT-5 강점 활용:
- 45% 낮은 할루시네이션 → 정확한 평가
- 향상된 추론 → 복잡한 시장 영향 분석""",
                user_prompt=prompt,
                temperature=1.0,  # GPT-5는 temperature=1.0만 지원
                max_tokens=500
            )

            if not response:
                logger.error("[AI_SCORE] GPT-5 응답 없음")
                return self._fallback_ai_score()

            # 결과 파싱
            result = self._parse_ai_score_result(response)

            logger.info(f"[AI_SCORE] 평가 완료 - Score: {result['ai_score']:.3f}, Direction: {result['impact_direction']}")

            return result

        except Exception as e:
            logger.error(f"[AI_SCORE] 평가 오류: {str(e)}")
            return self._fallback_ai_score()

    def _build_ai_score_prompt(
        self,
        title: str,
        description: str,
        body: str,
        symbol: str,
        published_at: str
    ) -> str:
        """AI Score 평가 프롬프트 구성"""

        # 종목 정보 포함
        symbol_context = f"관련 종목: {symbol}" if symbol else "종목: 특정되지 않음"

        # 발행 시간 정보
        time_context = f"발행 시간: {published_at}" if published_at else ""

        return f"""다음 금융 뉴스가 주가에 미치는 영향을 평가해주세요:

{symbol_context}
{time_context}

# 뉴스 제목
{title}

# 뉴스 요약
{description}

# 뉴스 본문
{body if body else '(본문 없음)'}

---

위 뉴스를 분석하여 **주가에 미치는 영향도**를 평가하고, 아래 JSON 형식으로 응답하세요:

{{
    "ai_score": <0.0~1.0 사이의 숫자>,
    "positive_score": <0.0~1.0 사이의 숫자>,
    "impact_direction": "positive|negative|neutral",
    "confidence": <0.0~1.0 사이의 신뢰도>,
    "reasoning": "평가 근거 (2-3문장)",
    "key_factors": [
        "영향 요인 1",
        "영향 요인 2",
        "영향 요인 3"
    ],
    "time_horizon": "short|medium|long",
    "volatility_impact": "low|medium|high"
}}

**AI Score 기준** (주가에 미치는 영향의 크기):
- 0.0~0.2: 영향 거의 없음 (일반적인 뉴스, 루틴 발표)
- 0.2~0.4: 약간의 영향 (작은 계약, 인사 변경 등)
- 0.4~0.6: 중간 영향 (분기 실적, 제품 출시 등)
- 0.6~0.8: 큰 영향 (대규모 인수합병, 규제 변화)
- 0.8~1.0: 매우 큰 영향 (CEO 교체, 대형 스캔들, 시장 충격)

**Positive Score 기준** (주가에 미치는 영향의 방향):
- 0.8~1.0: 매우 긍정적 (주가 급등 가능성)
- 0.6~0.8: 긍정적 (주가 상승 예상)
- 0.4~0.6: 중립/보통 (방향성 불확실)
- 0.2~0.4: 부정적 (주가 하락 예상)
- 0.0~0.2: 매우 부정적 (주가 급락 가능성)

**Impact Direction**:
- positive: 주가 상승 요인 (positive_score를 0.6 이상으로 설정)
- negative: 주가 하락 요인 (positive_score를 0.4 이하로 설정)
- neutral: 방향성 불명확 (positive_score를 0.4~0.6으로 설정)

**Time Horizon**:
- short: 단기 (당일~1주)
- medium: 중기 (1주~1개월)
- long: 장기 (1개월 이상)

**Volatility Impact**:
- low: 변동성 낮음
- medium: 중간 변동성
- high: 높은 변동성 예상

**중요**:
1. ai_score는 영향의 '크기', positive_score는 영향의 '방향'을 나타냅니다
2. 뉴스 내용만 분석하고, 추측하지 마세요
3. positive_score와 impact_direction이 일치하도록 설정하세요
"""

    def _parse_ai_score_result(self, response: str) -> Dict:
        """AI Score 결과 파싱"""
        try:
            # JSON 추출
            json_str = self._extract_json(response)
            parsed = json.loads(json_str)

            # 필수 필드 검증 및 정규화
            ai_score = float(parsed.get('ai_score', 0.5))
            ai_score = max(0.0, min(1.0, ai_score))  # 0~1 범위 제한

            # positive_score 추출 및 검증
            positive_score = float(parsed.get('positive_score', 0.5))
            positive_score = max(0.0, min(1.0, positive_score))  # 0~1 범위 제한

            confidence = float(parsed.get('confidence', 0.5))
            confidence = max(0.0, min(1.0, confidence))

            # 방향 검증
            impact_direction = parsed.get('impact_direction', 'neutral').lower()
            if impact_direction not in ['positive', 'negative', 'neutral']:
                impact_direction = 'neutral'

            # positive_score와 impact_direction 일치성 검증
            # impact_direction이 있지만 positive_score가 맞지 않으면 조정
            if impact_direction == 'positive' and positive_score < 0.6:
                logger.warning(f"[PARSE] positive 방향이지만 positive_score가 낮음 ({positive_score}), 0.7로 조정")
                positive_score = 0.7
            elif impact_direction == 'negative' and positive_score > 0.4:
                logger.warning(f"[PARSE] negative 방향이지만 positive_score가 높음 ({positive_score}), 0.3으로 조정")
                positive_score = 0.3
            elif impact_direction == 'neutral' and (positive_score < 0.4 or positive_score > 0.6):
                logger.warning(f"[PARSE] neutral 방향이지만 positive_score가 범위 밖 ({positive_score}), 0.5로 조정")
                positive_score = 0.5

            # 시간 범위 검증
            time_horizon = parsed.get('time_horizon', 'medium').lower()
            if time_horizon not in ['short', 'medium', 'long']:
                time_horizon = 'medium'

            # 변동성 검증
            volatility_impact = parsed.get('volatility_impact', 'medium').lower()
            if volatility_impact not in ['low', 'medium', 'high']:
                volatility_impact = 'medium'

            result = {
                'ai_score': round(ai_score, 3),
                'positive_score': round(positive_score, 3),
                'impact_direction': impact_direction,
                'confidence': round(confidence, 3),
                'reasoning': parsed.get('reasoning', 'AI 분석 완료'),
                'key_factors': parsed.get('key_factors', []),
                'time_horizon': time_horizon,
                'volatility_impact': volatility_impact,
                'evaluated_at': datetime.now().isoformat()
            }

            # 사용자에게 보여줄 분석 텍스트 생성
            result['analyzed_text'] = self._generate_analyzed_text(result)

            return result

        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.warning(f"[PARSE] AI Score 파싱 실패: {str(e)}")
            return self._fallback_ai_score()

    def _fallback_ai_score(self) -> Dict:
        """AI Score 폴백 (기본값)"""
        fallback = {
            'ai_score': 0.5,
            'positive_score': 0.5,  # 중립
            'impact_direction': 'neutral',
            'confidence': 0.3,
            'reasoning': 'AI 평가를 수행할 수 없음 (기본값)',
            'key_factors': ['평가 불가'],
            'time_horizon': 'medium',
            'volatility_impact': 'low',
            'evaluated_at': datetime.now().isoformat()
        }
        fallback['analyzed_text'] = self._generate_analyzed_text(fallback)
        return fallback

    def _generate_analyzed_text(self, evaluation_result: Dict) -> str:
        """
        사용자에게 보여줄 분석 텍스트 생성

        Args:
            evaluation_result: AI 평가 결과

        Returns:
            간단한 분석 근거 텍스트
        """
        try:
            ai_score = evaluation_result.get('ai_score', 0.5)
            positive_score = evaluation_result.get('positive_score', 0.5)
            impact_direction = evaluation_result.get('impact_direction', 'neutral')
            reasoning = evaluation_result.get('reasoning', '')
            key_factors = evaluation_result.get('key_factors', [])
            time_horizon = evaluation_result.get('time_horizon', 'medium')
            volatility_impact = evaluation_result.get('volatility_impact', 'medium')
            confidence = evaluation_result.get('confidence', 0.5)

            # 영향 크기 텍스트
            if ai_score >= 0.8:
                impact_size_text = "매우 큰 영향"
            elif ai_score >= 0.6:
                impact_size_text = "큰 영향"
            elif ai_score >= 0.4:
                impact_size_text = "중간 영향"
            elif ai_score >= 0.2:
                impact_size_text = "약한 영향"
            else:
                impact_size_text = "미미한 영향"

            # 방향 텍스트
            if positive_score >= 0.8:
                direction_text = "매우 긍정적"
                direction_emoji = "📈📈"
            elif positive_score >= 0.6:
                direction_text = "긍정적"
                direction_emoji = "📈"
            elif positive_score >= 0.4:
                direction_text = "중립적"
                direction_emoji = "➡️"
            elif positive_score >= 0.2:
                direction_text = "부정적"
                direction_emoji = "📉"
            else:
                direction_text = "매우 부정적"
                direction_emoji = "📉📉"

            # 시간 범위 텍스트
            time_text_map = {
                'short': '단기적',
                'medium': '중기적',
                'long': '장기적'
            }
            time_text = time_text_map.get(time_horizon, '중기적')

            # 변동성 텍스트
            volatility_text_map = {
                'low': '낮은 변동성',
                'medium': '중간 변동성',
                'high': '높은 변동성'
            }
            volatility_text = volatility_text_map.get(volatility_impact, '중간 변동성')

            # 분석 텍스트 구성
            lines = []

            # 1. 메인 평가
            lines.append(f"{direction_emoji} {direction_text}으로 {impact_size_text}이 예상됩니다.")

            # 2. 근거
            if reasoning and reasoning != 'AI 분석 완료':
                lines.append(f"\n📋 분석 근거: {reasoning}")

            # 3. 주요 요인
            if key_factors and key_factors != ['평가 불가']:
                lines.append(f"\n🔍 주요 요인:")
                for factor in key_factors[:3]:  # 최대 3개만
                    lines.append(f"  • {factor}")

            # 4. 추가 정보
            lines.append(f"\n⏱️ 영향 기간: {time_text} ({time_horizon})")
            lines.append(f"📊 예상 변동성: {volatility_text}")
            lines.append(f"💯 신뢰도: {int(confidence * 100)}%")

            # 5. 점수 요약
            lines.append(f"\n📈 영향 크기: {ai_score:.2f}/1.00")
            lines.append(f"💚 긍정 지수: {positive_score:.2f}/1.00")

            analyzed_text = "\n".join(lines)

            return analyzed_text

        except Exception as e:
            logger.error(f"[TEXT_GEN] 분석 텍스트 생성 오류: {str(e)}")
            return "AI 분석 결과를 생성할 수 없습니다."


    # ============================================================================
    # 핵심 기능 2: 임베딩 생성
    # ============================================================================

    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        텍스트를 1536차원 벡터로 변환

        Args:
            text: 임베딩할 텍스트

        Returns:
            1536차원 벡터 또는 None
        """
        try:
            if not self.client:
                logger.warning("[EMBEDDING] OpenAI 클라이언트 없음")
                return None

            if not text or len(text.strip()) == 0:
                logger.warning("[EMBEDDING] 텍스트 비어있음")
                return None

            response = self.client.embeddings.create(
                model=self.embedding_model,
                input=text.strip(),
                encoding_format="float"
            )

            embedding = response.data[0].embedding
            logger.debug(f"[EMBEDDING] 생성 완료: {len(embedding)}차원")

            return embedding

        except Exception as e:
            logger.error(f"[EMBEDDING] 생성 실패: {str(e)}")
            return None

    # ============================================================================
    # 유틸리티 함수
    # ============================================================================

    async def _call_gpt5(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> Optional[str]:
        """GPT-5 API 호출 (Responses API 사용)"""
        try:
            if not self.client:
                return None

            # GPT-5는 Responses API 사용
            # instructions는 developer 역할, input은 user 역할
            response = self.client.responses.create(
                model=self.model_name,
                instructions=system_prompt,
                input=user_prompt
            )

            # output_text 속성으로 텍스트 응답 가져오기
            content = response.output_text
            logger.info(f"[GPT5] API 응답 수신 완료 (길이: {len(content) if content else 0})")

            return content

        except Exception as e:
            logger.error(f"[GPT5] API 호출 실패: {str(e)}")
            import traceback
            logger.error(f"[GPT5] 상세 오류:\n{traceback.format_exc()}")
            return None


    def _extract_json(self, text: str) -> str:
        """텍스트에서 JSON 추출"""
        # ```json ... ``` 형식
        if '```json' in text:
            json_start = text.find('```json') + 7
            json_end = text.find('```', json_start)
            return text[json_start:json_end].strip()

        # { ... } 형식
        elif '{' in text and '}' in text:
            json_start = text.find('{')
            json_end = text.rfind('}') + 1
            return text[json_start:json_end]

        return text
