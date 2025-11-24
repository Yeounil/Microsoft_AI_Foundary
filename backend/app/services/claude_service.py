"""
Claude API 서비스
Anthropic Claude 4.5 Sonnet을 사용한 뉴스 레포트 생성
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime
import json
from app.core.config import settings

logger = logging.getLogger(__name__)


class ClaudeService:
    """
    Claude API 서비스

    주요 기능:
    1. 뉴스 레포트 생성 (종합 분석)
    2. Claude 4.5 Sonnet 사용
    """

    def __init__(self):
        """Claude 클라이언트 초기화"""
        self.client = None
        self.model_name = "claude-sonnet-4-20250514"
        self._initialize_client()

    def _initialize_client(self):
        """Claude 클라이언트 초기화"""
        try:
            # config.py에서 API 키 가져오기
            api_key = settings.anthropic_api_key
            if not api_key:
                logger.warning("⚠️ Claude API 키가 설정되지 않음 (.env 파일 확인)")
                self.client = None
                return

            # anthropic 라이브러리 import (비동기 클라이언트 사용)
            try:
                from anthropic import AsyncAnthropic
                self.client = AsyncAnthropic(api_key=api_key)
                logger.info("✅ Claude 4.5 Sonnet 비동기 클라이언트 초기화 완료")
            except ImportError:
                logger.error("❌ anthropic 라이브러리가 설치되지 않음. pip install anthropic 실행 필요")
                self.client = None

        except Exception as e:
            logger.error(f"❌ Claude 클라이언트 초기화 실패: {str(e)}")
            import traceback
            logger.error(f"[CLAUDE] 상세 오류:\n{traceback.format_exc()}")
            self.client = None

    async def generate_news_report(
        self,
        symbol: str,
        news_articles: List[Dict],
        company_name: Optional[str] = None
    ) -> Dict:
        """
        뉴스 레포트 생성

        Args:
            symbol: 종목 심볼 (예: AAPL)
            news_articles: 뉴스 기사 리스트 (body, ai_analyzed_text 포함)
            company_name: 회사명 (선택)

        Returns:
            레포트 데이터 딕셔너리
        """
        try:
            if not self.client:
                logger.warning("[CLAUDE] Claude 클라이언트 없음")
                return self._fallback_report(symbol, len(news_articles))

            # 회사명 결정
            if not company_name:
                company_name = self._get_company_name(symbol)

            # 프롬프트 구성
            prompt = self._build_report_prompt(
                symbol=symbol,
                company_name=company_name,
                news_articles=news_articles
            )

            logger.info(f"[CLAUDE] 레포트 생성 요청 - {symbol} ({len(news_articles)}개 뉴스)")

            # Claude API 호출
            response = await self._call_claude(prompt)

            if not response:
                logger.error("[CLAUDE] Claude 응답 없음")
                return self._fallback_report(symbol, len(news_articles))

            # 결과 파싱
            report = self._parse_report_result(response, symbol, company_name, len(news_articles))

            logger.info(f"[CLAUDE] ✅ 레포트 생성 완료 - {symbol}")

            return report

        except Exception as e:
            logger.error(f"[CLAUDE] 레포트 생성 오류: {str(e)}")
            return self._fallback_report(symbol, len(news_articles))

    def _build_report_prompt(
        self,
        symbol: str,
        company_name: str,
        news_articles: List[Dict]
    ) -> str:
        """레포트 생성 프롬프트 구성"""

        # 뉴스 데이터 요약
        news_summaries = []
        for i, article in enumerate(news_articles[:20], 1):
            title = article.get('title', '')
            body = article.get('body', '')[:2000]  # 본문은 2000자까지
            analyzed_text = article.get('ai_analyzed_text', '')
            published_at = article.get('published_at', '')
            positive_score = article.get('positive_score')
            source = article.get('source', '')

            # positive_score 표시
            if positive_score is not None:
                sentiment = "긍정" if positive_score >= 0.6 else "부정" if positive_score <= 0.4 else "중립"
                score_text = f"감정 점수: {positive_score:.2f} ({sentiment})"
            else:
                score_text = "감정 점수: N/A"

            news_summaries.append(f"""
=== 뉴스 #{i} ===
제목: {title}
출처: {source}
발행일: {published_at}
{score_text}

본문:
{body}

{f"AI 분석: {analyzed_text}" if analyzed_text else ""}
---""")

        news_text = "\n".join(news_summaries)

        return f"""당신은 전문 금융 애널리스트입니다. {company_name}({symbol})에 대한 최신 뉴스 {len(news_articles)}개를 분석하여 투자자를 위한 종합 레포트를 작성하세요.

# 분석 대상 뉴스
{news_text}

# 작성 지침

위 뉴스들을 꼼꼼히 읽고 분석하여 아래 JSON 형식으로 종합 레포트를 작성하세요.

**반드시 지켜야 할 사항:**
1. 실제 뉴스 내용을 근거로 구체적으로 작성
2. 뉴스에 없는 내용은 추측하지 말 것
3. 각 섹션마다 뉴스 내용을 인용하며 설명
4. 숫자와 퍼센트는 뉴스에 명시된 경우에만 사용
5. JSON 형식 엄수 (주석 없이 순수 JSON만)

# 출력 형식

```json
{{
  "title": "{company_name} 뉴스 종합 분석 레포트",
  "analysisPeriod": "최근 7일",
  "sentimentDistribution": {{
    "positive": 실제_긍정_뉴스_개수,
    "neutral": 실제_중립_뉴스_개수,
    "negative": 실제_부정_뉴스_개수
  }},
  "executiveSummary": {{
    "overview": "제공된 뉴스의 전반적인 내용을 2-3문장으로 요약. 주요 이벤트, 발표, 시장 반응 중심으로 작성",
    "keyFindings": [
      "뉴스에서 발견한 핵심 사항 1 (구체적 사실 기반)",
      "뉴스에서 발견한 핵심 사항 2",
      "뉴스에서 발견한 핵심 사항 3",
      "뉴스에서 발견한 핵심 사항 4"
    ]
  }},
  "marketReaction": {{
    "overview": "뉴스에 나타난 시장 반응을 3-4문장으로 분석. 주가 변동, 애널리스트 의견, 투자자 심리 등",
    "positiveFactors": [
      "뉴스에서 확인된 긍정적 요인 1 (실제 뉴스 내용 기반)",
      "긍정적 요인 2",
      "긍정적 요인 3"
    ],
    "neutralFactors": [
      "뉴스에서 확인된 중립적 사항 1",
      "중립적 사항 2"
    ],
    "negativeFactors": [
      "뉴스에서 확인된 부정적 요인 1",
      "부정적 요인 2"
    ]
  }},
  "priceImpact": {{
    "overview": "뉴스 내용이 주가에 미칠 영향을 분석 (2-3문장)",
    "expectedChange": {{
      "shortTerm": "단기 전망 (예: '긍정적' 또는 '중립적' 등 뉴스 기반 판단)",
      "mediumTerm": "중기 전망",
      "longTerm": "장기 전망"
    }},
    "relatedSectors": [
      {{"sector": "관련 섹터명", "impact": "뉴스 기반 영향 분석"}}
    ],
    "investmentPoint": "뉴스에서 도출한 핵심 투자 포인트 (3-4문장)"
  }},
  "competitorAnalysis": {{
    "overview": "뉴스에 언급된 경쟁사 또는 업계 동향 분석 (2-3문장)",
    "competitors": [
      {{
        "name": "뉴스에 언급된 경쟁사명",
        "analysis": [
          "해당 경쟁사 관련 뉴스 내용 1",
          "관련 내용 2"
        ]
      }}
    ],
    "marketOutlook": "뉴스 기반 시장 전망 (3-4문장)"
  }},
  "riskFactors": {{
    "overview": "뉴스에서 확인된 리스크 요인 개요 (2-3문장)",
    "technical": [
      "뉴스에서 확인된 기술적 리스크 1",
      "기술적 리스크 2"
    ],
    "regulatory": [
      "뉴스에서 확인된 규제 관련 리스크 1",
      "규제 리스크 2"
    ],
    "market": [
      "뉴스에서 확인된 시장 리스크 1",
      "시장 리스크 2"
    ],
    "mitigation": "리스크 대응 방안 제시 (3-4문장)"
  }},
  "investmentRecommendation": {{
    "recommendation": "BUY|HOLD|SELL 중 하나 (뉴스 분석 결과 기반)",
    "targetPrices": {{
      "shortTerm": "뉴스 기반 단기 목표가 전망",
      "mediumTerm": "중기 목표가 전망",
      "longTerm": "장기 목표가 전망"
    }},
    "reasons": [
      "투자 의견의 근거 1 (뉴스 내용 기반)",
      "근거 2",
      "근거 3",
      "근거 4"
    ],
    "monitoringPoints": [
      "투자자가 주시해야 할 포인트 1 (뉴스 기반)",
      "모니터링 포인트 2",
      "모니터링 포인트 3"
    ],
    "riskWarning": "투자 시 유의사항 (2-3문장)"
  }},
  "conclusion": {{
    "summary": [
      "레포트 핵심 요약 1",
      "핵심 요약 2",
      "핵심 요약 3"
    ],
    "finalOpinion": "최종 투자 의견 및 전망 (3-4문장, 뉴스 분석 종합)",
    "longTermPerspective": "장기적 관점의 전망 (2-3문장)"
  }}
}}
```

**주의사항:**
- 반드시 순수 JSON 형식으로만 응답하세요
- 주석이나 설명을 JSON 밖에 작성하지 마세요
- 뉴스에 없는 내용은 "뉴스에서 확인되지 않음" 또는 해당 배열을 비워두세요
- 모든 분석은 제공된 뉴스 내용을 근거로 하세요"""

    async def _call_claude(self, prompt: str, max_tokens: int = 4096) -> Optional[str]:
        """Claude API 호출 (비동기)"""
        try:
            if not self.client:
                logger.error("[CLAUDE] 클라이언트가 초기화되지 않음")
                return None

            logger.info(f"[CLAUDE] API 호출 시작 (모델: {self.model_name}, max_tokens: {max_tokens})")

            # 비동기 API 호출
            response = await self.client.messages.create(
                model=self.model_name,
                max_tokens=max_tokens,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            # 응답 텍스트 추출
            content = response.content[0].text if response.content else None

            logger.info(f"[CLAUDE] ✅ API 응답 수신 완료 (길이: {len(content) if content else 0})")

            return content

        except Exception as e:
            logger.error(f"[CLAUDE] ❌ API 호출 실패: {str(e)}")
            import traceback
            logger.error(f"[CLAUDE] 상세 오류:\n{traceback.format_exc()}")
            return None

    def _parse_report_result(
        self,
        response: str,
        symbol: str,
        company_name: str,
        analyzed_count: int
    ) -> Dict:
        """레포트 결과 파싱"""
        try:
            # JSON 추출
            json_str = self._extract_json(response)
            report = json.loads(json_str)

            # 필수 필드 추가
            report["symbol"] = symbol
            report["companyName"] = company_name
            report["analyzedCount"] = analyzed_count
            report["generatedAt"] = datetime.now().strftime("%Y년 %m월 %d일 %H:%M")

            return report

        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.warning(f"[PARSE] 레포트 파싱 실패: {str(e)}")
            return self._fallback_report(symbol, analyzed_count)

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

    def _get_company_name(self, symbol: str) -> str:
        """심볼에서 회사명 추출"""
        company_names = {
            "AAPL": "Apple Inc.",
            "GOOGL": "Alphabet Inc.",
            "GOOG": "Alphabet Inc.",
            "MSFT": "Microsoft Corporation",
            "TSLA": "Tesla Inc.",
            "NVDA": "NVIDIA Corporation",
            "AMZN": "Amazon.com Inc.",
            "META": "Meta Platforms Inc.",
            "NFLX": "Netflix Inc.",
            "JPM": "JPMorgan Chase",
            "JNJ": "Johnson & Johnson",
            "WMT": "Walmart Inc.",
        }
        return company_names.get(symbol, symbol)

    def _fallback_report(self, symbol: str, analyzed_count: int) -> Dict:
        """폴백 레포트 (기본값)"""
        company_name = self._get_company_name(symbol)

        return {
            "symbol": symbol,
            "companyName": company_name,
            "title": f"{company_name} 뉴스 종합 분석 레포트",
            "generatedAt": datetime.now().strftime("%Y년 %m월 %d일 %H:%M"),
            "analysisPeriod": "최근 7일",
            "analyzedCount": analyzed_count,
            "sentimentDistribution": {
                "positive": int(analyzed_count * 0.6),
                "neutral": int(analyzed_count * 0.3),
                "negative": int(analyzed_count * 0.1)
            },
            "executiveSummary": {
                "overview": "AI 분석을 수행할 수 없습니다. Claude API 연결을 확인해주세요.",
                "keyFindings": [
                    "분석 불가",
                    "API 연결 필요",
                    "기본값 표시 중",
                    "설정 확인 필요"
                ]
            },
            "marketReaction": {
                "overview": "시장 반응 분석을 수행할 수 없습니다.",
                "positiveFactors": ["분석 불가"],
                "neutralFactors": ["분석 불가"],
                "negativeFactors": ["분석 불가"]
            },
            "priceImpact": {
                "overview": "주가 영향 분석을 수행할 수 없습니다.",
                "expectedChange": {
                    "shortTerm": "분석 불가",
                    "mediumTerm": "분석 불가",
                    "longTerm": "분석 불가"
                },
                "relatedSectors": [],
                "investmentPoint": "분석 불가"
            },
            "competitorAnalysis": {
                "overview": "경쟁사 분석을 수행할 수 없습니다.",
                "competitors": [],
                "marketOutlook": "분석 불가"
            },
            "riskFactors": {
                "overview": "리스크 분석을 수행할 수 없습니다.",
                "technical": ["분석 불가"],
                "regulatory": ["분석 불가"],
                "market": ["분석 불가"],
                "mitigation": "분석 불가"
            },
            "investmentRecommendation": {
                "recommendation": "HOLD",
                "targetPrices": {
                    "shortTerm": "분석 불가",
                    "mediumTerm": "분석 불가",
                    "longTerm": "분석 불가"
                },
                "reasons": ["분석 불가"],
                "monitoringPoints": ["분석 불가"],
                "riskWarning": "AI 분석을 수행할 수 없어 투자 권고를 제공할 수 없습니다."
            },
            "conclusion": {
                "summary": ["분석 불가"],
                "finalOpinion": "AI 분석을 수행할 수 없습니다.",
                "longTermPerspective": "분석 불가"
            }
        }
