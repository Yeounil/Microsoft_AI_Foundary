"""
Claude Sonnet API를 사용한 뉴스 번역 서비스

기능:
- 영문 기사를 한글로 전문 번역
- 번역된 내용을 Supabase에 저장
- 배치 번역 지원
"""

import os
import json
import logging
import asyncio
from typing import Dict, Optional, List
from datetime import datetime
import httpx
from app.core.config import settings
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


class NewsTranslationService:
    """Claude Sonnet API를 사용한 뉴스 번역 서비스"""

    def __init__(self):
        """Claude API 클라이언트 초기화"""
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.api_url = "https://api.anthropic.com/v1/messages"
        self.model = "claude-sonnet-4-5-20250929"
        self.api_version = "2023-06-01"
        self.supabase = get_supabase()

        if not self.api_key:
            logger.warning("⚠️ ANTHROPIC_API_KEY 환경변수가 설정되지 않음")

    def _load_translation_prompt(self) -> str:
        """news_translation_prompt.txt 파일에서 번역 프롬프트 로드"""
        try:
            # 현재 파일과 같은 디렉토리(app/services)에서 프롬프트 파일 로드
            current_dir = os.path.dirname(__file__)
            prompt_path = os.path.join(current_dir, 'news_translation_prompt.txt')

            if not os.path.exists(prompt_path):
                logger.warning(f"⚠️ 프롬프트 파일을 찾을 수 없음: {prompt_path}")
                return self._get_default_prompt()

            with open(prompt_path, 'r', encoding='utf-8') as f:
                return f.read()

        except Exception as e:
            logger.error(f"❌ 프롬프트 파일 로드 오류: {str(e)}")
            return self._get_default_prompt()

    def _get_default_prompt(self) -> str:
        """기본 번역 프롬프트 (prompt.txt를 찾을 수 없을 때)"""
        return """You are an expert-level financial translator and economic analyst, specializing in translating English financial news into professional, fluent, and accurate Korean.

Here is the English financial news article you need to translate:

<article>
{{ARTICLE}}
</article>

**PRIMARY OBJECTIVE:**
Your translation must achieve the highest possible fidelity to the original source, prioritizing accuracy in terminology and data, while maintaining a formal and objective tone appropriate for a Korean financial news publication.

**CONTENT FILTERING:**
Before translating, identify and EXCLUDE the following non-editorial content:
- Author contact information (email addresses, social media handles, phone numbers)
- Newsletter subscription prompts, calls-to-action, or promotional messages
- Advertisement or promotional content
- Website navigation elements, metadata, or UI elements
- Copyright notices or legal disclaimers
- "Related articles", "Read more", or content recommendation widgets
- Social media sharing buttons or instructions
- Chart/data attribution phrases like "(Chart provided by...)", "(Data from...)", or similar credits
- Embedded links to subscription services or paywalls
- Footer content including "Subscribe to our newsletter" or similar

**CRITICAL**: Only translate the core journalistic content: headline, subheadlines, byline, dateline, body paragraphs, and direct quotes. Remove all promotional and metadata elements.

**TRANSLATION GUIDELINES:**

1. **Terminology Precision:**
   - Translate all financial, economic, and market-specific terms into their precise, industry-standard Korean equivalents
   - Use established Korean financial terminology (e.g., "양적완화" for quantitative easing, "주가수익비율" for P/E ratio)
   - When English terms are commonly used in Korean financial contexts (e.g., "인플레이션"), follow standard Korean convention

2. **Formal & Objective Tone:**
   - Use formal, professional Korean language appropriate for financial journalism (e.g., '...했습니다', '...분석됩니다', '...것으로 나타났습니다')
   - Maintain a neutral, journalistic tone without adding personal opinions or analysis not present in the original
   - Preserve the original's market sentiment and nuanced outlooks

3. **Natural Korean Expression:**
   - Do not translate word-for-word; rephrase sentences to sound natural to native Korean readers
   - For metaphorical or idiomatic expressions (e.g., "zombie companies" → "한계기업", "dead cat bounce" → "일시적 반등", "elephant in the room" → "명백한 문제"), translate the underlying meaning in natural Korean business language
   - When translating direct quotes or statements from individuals, use natural Korean quotation style with proper honorifics and sentence endings
   - Ensure the translation flows smoothly while preserving all original meaning and context
   - Adapt sentence structures to Korean journalistic style

4. **Structural Formatting - MANDATORY:**
   - **Main headline**: Format with markdown header (# 제목) or bold (**제목**)
   - **ALL section headers and subheadlines**: Every distinct section or topic break in the article MUST be formatted in bold markdown (**소제목**)
   - Use clear paragraph breaks between sections
   - Preserve the logical structure and hierarchy of the original article

5. **Acronyms & Organizations:**
   - For first mentions of organizations or key acronyms, provide the full Korean name followed by the acronym in parentheses
   - Example: 연방공개시장위원회(FOMC), 유럽중앙은행(ECB)
   - For subsequent mentions, use the acronym alone if it follows Korean journalistic convention

6. **Data Integrity:**
   - Transcribe all numbers, percentages, dates, and monetary figures with perfect accuracy
   - Format large numbers appropriately for Korean (using '억', '조' where suitable)
   - Maintain exact precision of all quantitative data

7. **Quote Translation:**
   - When translating direct quotes from named individuals, maintain the speaker's tone while using appropriate Korean quotation format
   - Use natural Korean speech patterns: "...라고 말했다", "...고 강조했다", "...고 설명했다"

Translate the article now, ensuring it reads as a professionally written Korean financial news piece that a native Korean speaker would find natural and authoritative.

Output ONLY the translated Korean text without any explanation or preamble."""

    async def translate_article(self, article_text: str) -> Optional[str]:
        """
        Claude Sonnet API를 사용하여 기사 번역

        Args:
            article_text: 번역할 영문 기사

        Returns:
            번역된 한글 기사 또는 None
        """
        if not self.api_key:
            logger.error("❌ ANTHROPIC_API_KEY가 설정되지 않음")
            return None

        try:
            # 프롬프트 로드 및 기사 텍스트 주입
            system_prompt = self._load_translation_prompt()
            system_prompt = system_prompt.replace("{{ARTICLE}}", article_text)

            # Claude API 호출
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    self.api_url,
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": self.api_version,
                        "content-type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "max_tokens": 4096,
                        "messages": [
                            {
                                "role": "user",
                                "content": system_prompt
                            }
                        ]
                    }
                )

            if response.status_code != 200:
                logger.error(f"❌ Claude API 오류 (Status: {response.status_code}): {response.text}")
                return None

            result = response.json()

            # 응답에서 번역 텍스트 추출
            if result.get("content") and len(result["content"]) > 0:
                translated_text = result["content"][0].get("text", "")

                # 토큰 사용량 로깅
                usage = result.get("usage", {})
                logger.info(
                    f"✅ 번역 완료 - "
                    f"Input: {usage.get('input_tokens', 0)}, "
                    f"Output: {usage.get('output_tokens', 0)}"
                )

                return translated_text

            else:
                logger.error("❌ Claude API 응답이 비어있음")
                return None

        except asyncio.TimeoutError:
            logger.error("❌ Claude API 요청 타임아웃 (300초 초과)")
            return None

        except Exception as e:
            logger.error(f"❌ 번역 오류: {str(e)}")
            return None

    async def translate_and_save_news(self, news_id: int) -> bool:
        """
        뉴스를 번역하고 Supabase에 저장

        Args:
            news_id: 번역할 뉴스 ID

        Returns:
            성공 여부
        """
        try:
            # 1. Supabase에서 뉴스 조회
            result = self.supabase.table("news_articles")\
                .select("id, title, description, body, symbol, kr_translate")\
                .eq("id", news_id)\
                .single()\
                .execute()

            if not result.data:
                logger.error(f"❌ 뉴스를 찾을 수 없음: ID {news_id}")
                return False

            news = result.data

            # body가 없으면 건너뛰기
            if not news.get("body"):
                logger.warning(f"⚠️ 뉴스 본문이 없음: ID {news_id}")
                return False

            # 2. 기사 번역
            logger.info(f"🔄 [ID: {news_id}] 번역 중... - {news.get('title', '')[:50]}")

            translated_text = await self.translate_article(news["body"])

            if not translated_text:
                logger.error(f"❌ [ID: {news_id}] 번역 실패")
                return False

            # 3. Supabase에 저장
            update_result = self.supabase.table("news_articles")\
                .update({
                    "kr_translate": translated_text
                })\
                .eq("id", news_id)\
                .execute()

            if update_result.data:
                logger.info(f"✅ [ID: {news_id}] 번역 저장 완료")
                return True
            else:
                logger.error(f"❌ [ID: {news_id}] 번역 저장 실패")
                return False

        except Exception as e:
            logger.error(f"❌ [ID: {news_id}] 오류: {str(e)}")
            return False

    async def translate_batch_news(
        self,
        news_ids: Optional[List[int]] = None,
        limit: Optional[int] = None,
        untranslated_only: bool = False,
        batch_size: int = 3,
        delay: float = 2.0
    ) -> Dict:
        """
        배치로 뉴스 번역

        Args:
            news_ids: 번역할 뉴스 ID 목록 (None이면 DB에서 조회)
            limit: 최대 처리 개수
            untranslated_only: True이면 미번역 뉴스만
            batch_size: 동시 처리 개수
            delay: 배치 간 딜레이

        Returns:
            결과 통계
        """
        # 1. 대상 뉴스 조회
        if news_ids is None:
            query = self.supabase.table("news_articles")\
                .select("id, title, description, body, symbol, kr_translate")\
                .order("published_at", desc=True)

            if untranslated_only:
                query = query.is_("kr_translate", "null")

            if limit:
                query = query.limit(limit)

            result = query.execute()
            news_list = result.data if result.data else []
        else:
            # ID 목록에서 뉴스 조회
            query = self.supabase.table("news_articles")\
                .select("id, title, description, body, symbol, kr_translate")\
                .in_("id", news_ids)

            result = query.execute()
            news_list = result.data if result.data else []

        if not news_list:
            logger.warning("⚠️ 번역할 뉴스가 없습니다")
            return {
                "total": 0,
                "successful": 0,
                "failed": 0,
                "errors": []
            }

        total = len(news_list)
        logger.info(f"📋 {total}개 뉴스 발견\n")

        results = {
            "total": total,
            "successful": 0,
            "failed": 0,
            "errors": []
        }

        # 2. 배치 단위로 번역
        for i in range(0, total, batch_size):
            batch = news_list[i:i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (total + batch_size - 1) // batch_size

            logger.info(f"📦 배치 {batch_num}/{total_batches} 처리 중... ({len(batch)}개)")

            # 동시 번역
            tasks = [self.translate_and_save_news(news["id"]) for news in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            # 결과 집계
            for idx, success in enumerate(batch_results):
                news = batch[idx]
                if isinstance(success, Exception):
                    results["failed"] += 1
                    results["errors"].append(f"ID {news['id']}: {str(success)}")
                    logger.error(f"  ❌ ID {news['id']} - {str(success)[:100]}")
                elif success:
                    results["successful"] += 1
                    logger.info(f"  ✅ ID {news['id']} 번역 완료")
                else:
                    results["failed"] += 1
                    results["errors"].append(f"ID {news['id']}: 번역 실패")

            # 진행률 표시
            progress = min(i + batch_size, total)
            percentage = (progress / total) * 100
            logger.info(f"  📊 진행률: {progress}/{total} ({percentage:.1f}%)\n")

            # 배치 간 딜레이
            if i + batch_size < total:
                await asyncio.sleep(delay)

        return results
