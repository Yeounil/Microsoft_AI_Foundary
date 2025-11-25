#!/usr/bin/env python3
"""
뉴스 기사 제목 한글 번역 스크립트
OpenAI GPT-4o-mini를 사용하여 영문 제목을 한글로 번역

사용 방법:
    python translate_titles.py --all                    # 모든 미번역 제목 번역
    python translate_titles.py --limit 100              # 최대 100개만 번역
    python translate_titles.py --symbols AAPL GOOGL     # 특정 종목만
    python translate_titles.py --batch-size 50          # 배치 크기 조정 (기본값: 50)
    python translate_titles.py --dry-run                # 실제 번역 없이 테스트
"""

import asyncio
import sys
import argparse
from datetime import datetime
import logging
from typing import List, Dict, Optional
import os

# 경로 설정
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.supabase_client import get_supabase
from app.core.config import settings
from openai import AsyncOpenAI

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('translate_titles.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# OpenAI 클라이언트 초기화
client = AsyncOpenAI(api_key=settings.openai_api_key)

# 제목 번역용 프롬프트 (prompt.txt 기반 간소화 버전)
TITLE_TRANSLATION_PROMPT = """You are an expert financial translator specializing in translating English financial news headlines into professional, fluent Korean.

**OBJECTIVE:**
Translate the following English financial news headline into natural, professional Korean that would be suitable for a Korean financial news publication.

**TRANSLATION GUIDELINES:**

1. **Terminology Precision:**
   - Use precise, industry-standard Korean financial terminology
   - Follow established Korean financial conventions (e.g., "양적완화" for QE, "주가수익비율" for P/E ratio)
   - When English terms are commonly used in Korean financial contexts, follow standard practice

2. **Natural Korean Expression:**
   - Do not translate word-for-word; create a natural Korean headline
   - For metaphorical expressions, translate the underlying meaning in natural Korean business language
   - Ensure the translation flows smoothly while preserving all original meaning

3. **Professional Tone:**
   - Use formal, professional Korean language appropriate for financial journalism
   - Maintain a neutral, journalistic tone
   - Preserve the original's market sentiment

4. **Brevity:**
   - Keep the translation concise and punchy like a headline should be
   - Avoid unnecessary words while maintaining clarity

**FORMATTING:**
- Output ONLY the translated Korean headline
- Do NOT include any explanations, notes, or metadata
- Do NOT use quotation marks or tags

Headline to translate:
{title}

Korean translation:"""


async def translate_title(title: str) -> Optional[str]:
    """단일 제목을 한글로 번역

    Args:
        title: 영문 제목

    Returns:
        한글 번역 또는 None (실패 시)
    """
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": TITLE_TRANSLATION_PROMPT.format(title=title)
                }
            ],
            temperature=0.3,
            max_tokens=200
        )

        kr_title = response.choices[0].message.content.strip()
        return kr_title

    except Exception as e:
        logger.error(f"번역 실패: {str(e)}")
        return None


async def translate_batch(articles: List[Dict], batch_size: int = 50) -> Dict[int, str]:
    """배치 단위로 제목들을 병렬 번역

    Args:
        articles: 번역할 기사 목록
        batch_size: 동시 처리할 배치 크기

    Returns:
        {article_id: kr_title} 딕셔너리
    """
    translations = {}

    # 배치 단위로 처리
    for i in range(0, len(articles), batch_size):
        batch = articles[i:i + batch_size]
        logger.info(f"배치 처리 중: {i+1}~{min(i+batch_size, len(articles))}/{len(articles)}")

        # 병렬 번역
        tasks = [translate_title(article['title']) for article in batch]
        results = await asyncio.gather(*tasks)

        # 결과 저장
        for article, kr_title in zip(batch, results):
            if kr_title:
                translations[article['id']] = kr_title
                logger.debug(f"[{article['id']}] {article['title'][:50]}... → {kr_title[:50]}...")

        # API Rate Limit 방지를 위한 짧은 대기
        if i + batch_size < len(articles):
            await asyncio.sleep(1)

    return translations


async def update_kr_titles(translations: Dict[int, str], dry_run: bool = False) -> int:
    """번역된 제목을 DB에 저장

    Args:
        translations: {article_id: kr_title} 딕셔너리
        dry_run: True이면 실제 저장 안함

    Returns:
        저장된 개수
    """
    if dry_run:
        logger.info(f"[DRY RUN] {len(translations)}개 제목 번역 완료 (DB 저장 생략)")
        return len(translations)

    try:
        supabase = get_supabase()
        updated_count = 0

        for article_id, kr_title in translations.items():
            try:
                supabase.table("news_articles").update({
                    "kr_title": kr_title
                }).eq("id", article_id).execute()

                updated_count += 1

                if updated_count % 100 == 0:
                    logger.info(f"저장 진행: {updated_count}/{len(translations)}")

            except Exception as e:
                logger.error(f"ID {article_id} 저장 실패: {str(e)}")
                continue

        return updated_count

    except Exception as e:
        logger.error(f"DB 업데이트 중 오류: {str(e)}")
        return 0


async def get_articles_to_translate(
    symbols: Optional[List[str]] = None,
    limit: Optional[int] = None
) -> List[Dict]:
    """번역이 필요한 기사들을 가져옴

    Args:
        symbols: 특정 종목만 (None이면 전체)
        limit: 최대 개수 (None이면 무제한)

    Returns:
        기사 목록 [{id, title, symbol}, ...]
    """
    try:
        supabase = get_supabase()

        # kr_title이 NULL인 기사만 조회
        query = supabase.table("news_articles").select("id, title, symbol, published_at").is_("kr_title", "null")

        # 종목 필터
        if symbols:
            query = query.in_("symbol", symbols)

        # 최신순 정렬 (published_at 기준, NULL은 마지막으로)
        query = query.order("published_at", desc=True, nullsfirst=False)

        # 개수 제한
        if limit:
            query = query.limit(limit)

        result = query.execute()

        return result.data if result.data else []

    except Exception as e:
        logger.error(f"기사 조회 중 오류: {str(e)}")
        return []


async def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description='뉴스 기사 제목 한글 번역 스크립트',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python translate_titles.py --all                    # 모든 미번역 제목 번역
  python translate_titles.py --limit 100              # 최대 100개만 번역
  python translate_titles.py --symbols AAPL GOOGL     # 특정 종목만
  python translate_titles.py --batch-size 50          # 배치 크기 조정
  python translate_titles.py --dry-run                # 실제 번역 없이 테스트
        """
    )

    # 옵션
    parser.add_argument(
        '--all',
        action='store_true',
        help='모든 미번역 제목 번역'
    )

    parser.add_argument(
        '--limit',
        type=int,
        help='번역할 최대 개수'
    )

    parser.add_argument(
        '--symbols',
        nargs='+',
        help='특정 종목만 번역 (예: AAPL GOOGL MSFT)'
    )

    parser.add_argument(
        '--batch-size',
        type=int,
        default=50,
        help='동시 처리할 배치 크기 (기본값: 50)'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='실제 저장 없이 테스트만 수행'
    )

    args = parser.parse_args()

    # OpenAI API 키 확인
    if not settings.openai_api_key:
        logger.error("OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.")
        sys.exit(1)

    # limit 결정
    limit = None if args.all else args.limit

    if not args.all and not limit:
        logger.error("--all 또는 --limit 중 하나를 지정해야 합니다.")
        parser.print_help()
        sys.exit(1)

    logger.info("=" * 80)
    logger.info("뉴스 기사 제목 한글 번역 시작")
    logger.info("=" * 80)

    if args.dry_run:
        logger.warning("DRY RUN 모드: 실제 DB 저장은 수행하지 않습니다")

    try:
        start_time = datetime.now()

        # 번역할 기사 조회
        logger.info("번역 대상 기사 조회 중...")
        articles = await get_articles_to_translate(
            symbols=args.symbols,
            limit=limit
        )

        if not articles:
            logger.info("번역할 기사가 없습니다.")
            return

        logger.info(f"번역 대상: {len(articles)}개")
        if args.symbols:
            logger.info(f"대상 종목: {', '.join(args.symbols)}")
        logger.info(f"배치 크기: {args.batch_size}")
        logger.info("=" * 80)

        # 배치 번역
        logger.info("제목 번역 시작...")
        translations = await translate_batch(articles, batch_size=args.batch_size)

        logger.info(f"번역 완료: {len(translations)}/{len(articles)}")

        # DB 업데이트
        logger.info("DB 저장 중...")
        updated_count = await update_kr_titles(translations, dry_run=args.dry_run)

        elapsed_time = (datetime.now() - start_time).total_seconds()

        # 결과 출력
        logger.info("\n" + "=" * 80)
        logger.info("번역 결과")
        logger.info("=" * 80)
        logger.info(f"대상 기사: {len(articles)}개")
        logger.info(f"번역 성공: {len(translations)}개")
        logger.info(f"번역 실패: {len(articles) - len(translations)}개")
        logger.info(f"DB 저장: {updated_count}개")
        logger.info(f"소요 시간: {elapsed_time:.2f}초")
        logger.info(f"평균 속도: {len(articles)/elapsed_time:.2f}개/초")
        logger.info("=" * 80 + "\n")

        logger.info("번역 완료")

    except KeyboardInterrupt:
        logger.warning("사용자에 의해 중단되었습니다")
        sys.exit(130)
    except Exception as e:
        logger.error(f"오류 발생: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
