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
        """레포트 생성 프롬프트 구성 (셀링 포인트 반영 버전)"""

        # 뉴스 데이터 요약 생성 (기존과 동일)
        news_summaries = []
        for i, article in enumerate(news_articles[:20], 1):
            title = article.get('title', '')
            body = article.get('body', '')[:2000]
            analyzed_text = article.get('ai_analyzed_text', '')
            published_at = article.get('published_at', '')
            positive_score = article.get('positive_score')
            source = article.get('source', '')

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

        # === [변경 핵심] 프롬프트 강화 ===
        return f"""당신은 월스트리트의 최상위 헤지펀드에서 일하는 'Senior AI Market Analyst'입니다.
당신의 임무는 {company_name}({symbol})에 대한 {len(news_articles)}개의 뉴스 데이터에서 **'단순 노이즈'와 '진짜 정보'를 구분**하고, 대중이 보지 못하는 **'행간의 의미(Hidden Nuance)'**를 파악하여 투자자에게 보고하는 것입니다.

단순한 사실 나열은 금지합니다. 투자자가 이 보고서를 읽고 "내가 몰랐던 인사이트를 얻었다"고 느끼게 하십시오.

# 분석 대상 뉴스
{news_text}

# 작성 지침 (Strict Rules)
1. **노이즈 필터링:** 같은 내용의 반복 기사나 영양가 없는 기사는 과감히 무시하거나 '노이즈'로 규정하십시오.
2. **낚시성 판별:** 제목이 자극적이나 본문은 별거 없다면, 이를 명확히 지적하십시오 (예: "헤드라인은 긍정적이나 본문 팩트는 부실함").
3. **심리 분석:** 경영진의 발언이나 기사의 어조에서 '자신감' 또는 '불안감'을 감지하여 분석하십시오.
4. **역발상(Contrarian):** 뉴스가 지나치게 긍정적이라면 '과열/고점'의 가능성을, 지나치게 부정적이라면 '과매도'의 기회를 언급하십시오.

# 출력 형식 (JSON Schema)

반드시 아래 포맷을 유지하되, 각 필드의 **내용(Value)**은 위 지침에 따라 날카롭게 작성하십시오.

```json
{{
  "title": "{company_name} 심층 분석: 뉴스 이면의 진실",
  "analysisPeriod": "최근 7일",
  "sentimentDistribution": {{
    "positive": 실제_긍정_뉴스_개수,
    "neutral": 실제_중립_뉴스_개수,
    "negative": 실제_부정_뉴스_개수
  }},
  "executiveSummary": {{
    "overview": "전체 뉴스 중 '영양가 있는 정보'가 무엇인지, 노이즈(반복/광고성)는 얼마나 있었는지 명시하며 요약. (예: '20건의 뉴스 중 유의미한 팩트는 3건입니다...')",
    "keyFindings": [
      "단순 사실보다는 뉴스가 시사하는 '숨겨진 의미' 1",
      "제목과 본문의 괴리(낚시성 여부) 또는 경영진의 숨겨진 의도 분석",
      "시장의 통념과 다른 AI만의 독자적인 발견 사항"
    ]
  }},
  "marketReaction": {{
    "overview": "대중(개인 투자자)의 심리 상태 분석. 현재 시장이 뉴스에 대해 '이성적'인지 '과열/공포' 상태인지 진단",
    "positiveFactors": [
      "단순 호재가 아닌, 펀더멘털을 실제로 강화시키는 '진짜 호재' 요인"
    ],
    "neutralFactors": [
      "소문만 무성하고 실체는 아직 불분명한 재료들"
    ],
    "negativeFactors": [
      "단순 악재가 아닌, 구조적인 위험 요인"
    ]
  }},
  "priceImpact": {{
    "overview": "뉴스 재료의 '강도(Intensity)' 분석. 이 재료가 주가를 얼마나, 언제까지 움직일 힘이 있는지 서술",
    "expectedChange": {{
      "shortTerm": "뉴스 반응에 따른 단기적 변동성 예측 (과열 시 조정 가능성 등)",
      "mediumTerm": "재료가 소멸된 후의 중기적 방향성",
      "longTerm": "기업 가치에 미치는 장기적 영향"
    }},
    "relatedSectors": [
      {{"sector": "영향받는 섹터/테마", "impact": "나비효과로 인해 함께 움직일 수 있는 연관 분야 분석"}}
    ],
    "investmentPoint": "이 시점에서 투자자가 취해야 할 행동 요령. (예: '뉴스에 사지 말고 조정 시 매수하라' 등 구체적 조언)"
  }},
  "competitorAnalysis": {{
    "overview": "이 뉴스가 경쟁사에게는 기회인가 위기인가? 제로섬 게임 관점의 분석",
    "competitors": [
      {{
        "name": "경쟁사명",
        "analysis": [
          "경쟁사 관련 파급 효과 (예: 'A사의 악재로 인한 반사이익 가능성')"
        ]
      }}
    ],
    "marketOutlook": "시장 전체의 판도가 어떻게 바뀌고 있는지에 대한 통찰"
  }},
  "riskFactors": {{
    "overview": "숫자와 팩트 뒤에 숨겨진 '잠재적 지뢰' 발굴",
    "technical": [
      "뉴스에 드러난 기술적 한계나 결함 가능성"
    ],
    "regulatory": [
      "정부 규제나 법적 분쟁의 소지 (행간에 숨은 리스크)"
    ],
    "market": [
      "거시경제적 상황과 맞물려 발생할 수 있는 시장 리스크"
    ],
    "mitigation": "리스크 발생 시 투자자의 대응 시나리오"
  }},
  "investmentRecommendation": {{
    "recommendation": "BUY|HOLD|SELL (단순 추종이 아닌, 역발상 관점 포함)",
    "targetPrices": {{
      "shortTerm": "뉴스 모멘텀을 반영한 단기 목표",
      "mediumTerm": "중기",
      "longTerm": "장기"
    }},
    "reasons": [
      "추천 의견에 대한 논리적 근거 1 (군중 심리 역이용 등)",
      "근거 2 (데이터 기반)",
      "근거 3"
    ],
    "monitoringPoints": [
      "앞으로 뉴스에서 '어떤 키워드'가 나오면 도망쳐야(또는 사야) 하는지 트리거 제시",
      "투자자가 속지 말아야 할 가짜 신호들"
    ],
    "riskWarning": "투자자가 가장 주의해야 할 '인지 편향'에 대한 경고"
  }},
  "conclusion": {{
    "summary": [
      "보고서의 핵심 3줄 요약 (가장 중요한 인사이트 순)"
    ],
    "finalOpinion": "AI 애널리스트로서의 최종 직관적 조언 (한 문장으로 강력하게)",
    "longTermPerspective": "이 이슈가 1년 뒤에는 어떻게 기억될 것인가?"
  }}
}}
```"""

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
