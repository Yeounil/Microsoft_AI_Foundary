#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
뉴스 배치 번역 스크립트

Claude Sonnet API를 사용하여 뉴스 기사를 한글로 번역하고 Supabase에 저장합니다.

사용법:
    python scripts/translate_all_news.py [옵션]

옵션:
    --all                  모든 뉴스 번역 (기존 번역 무시)
    --untranslated         미번역 뉴스만 번역
    --symbol AAPL          특정 종목만 번역
    --limit 100            최대 처리 개수 (기본: 무제한)
    --batch-size 3         동시 처리 개수 (기본: 3)
    --delay 2.0            배치 간 딜레이 초 (기본: 2.0)
    --dry-run              실제 업데이트 없이 테스트만

예시:
    # 미번역 뉴스만 번역
    python scripts/translate_all_news.py --untranslated --limit 50

    # 모든 뉴스 번역 (기존 번역 덮어쓰기)
    python scripts/translate_all_news.py --all --limit 100

    # AAPL 종목만 번역
    python scripts/translate_all_news.py --symbol AAPL

    # 테스트 실행 (5개만, DB 업데이트 안함)
    python scripts/translate_all_news.py --limit 5 --dry-run
"""

import sys
import os

# Windows 환경에서 UTF-8 인코딩 설정
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import asyncio
import argparse
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv

# 프로젝트 루트 경로 계산
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# 환경변수 로드 (.env 파일)
env_path = os.path.join(project_root, '.env')
load_dotenv(dotenv_path=env_path)

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, project_root)

from app.services.news_translation_service import NewsTranslationService
from app.db.supabase_client import get_supabase


class NewsTranslator:
    """뉴스 번역 실행기"""

    def __init__(self, dry_run: bool = False):
        self.translation_service = NewsTranslationService()
        self.supabase = get_supabase()
        self.dry_run = dry_run

        if dry_run:
            print("🔵 DRY RUN 모드: 실제 DB 업데이트는 하지 않습니다\n")

    async def translate_all_news(
        self,
        symbol: Optional[str] = None,
        limit: Optional[int] = None,
        batch_size: int = 3,
        delay: float = 2.0,
        untranslated_only: bool = False,
        all_news: bool = False
    ):
        """
        전체 뉴스 번역

        Args:
            symbol: 특정 종목만 (None이면 전체)
            limit: 최대 처리 개수 (None이면 무제한)
            batch_size: 동시 처리 개수
            delay: 배치 간 딜레이
            untranslated_only: True이면 미번역 뉴스만
            all_news: True이면 모든 뉴스 (기존 번역 무시)
        """
        print("=" * 80)
        print("🔄 뉴스 번역 시작")
        print("=" * 80)
        print(f"📅 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🎯 대상: {'모든 뉴스' if all_news else '미번역 뉴스만' if untranslated_only else '전체 뉴스'}")
        if symbol:
            print(f"🏷️  종목: {symbol}")
        if limit:
            print(f"📊 제한: 최대 {limit}개")
        print(f"📑 정렬: 최신 뉴스부터 (published_at 내림차순)")
        print(f"⚙️  배치 크기: {batch_size}개 동시 처리")
        print(f"⏱️  딜레이: {delay}초")
        print("=" * 80)
        print()

        # 1단계: 대상 뉴스 조회
        print("📋 [1/3] 대상 뉴스 조회 중...")
        news_list = await self._fetch_target_news(
            symbol=symbol,
            limit=limit,
            untranslated_only=untranslated_only,
            all_news=all_news
        )

        if not news_list:
            print("⚠️  처리할 뉴스가 없습니다.")
            return

        total = len(news_list)
        print(f"✅ {total}개 뉴스 발견\n")

        # 2단계: 사용자 확인
        if not self.dry_run and total > 50:
            confirm = input(f"⚠️  {total}개 뉴스를 번역하시겠습니까? (yes/no): ")
            if confirm.lower() not in ['yes', 'y']:
                print("❌ 취소되었습니다.")
                return

        # 3단계: 번역 실행
        print(f"\n🚀 [2/3] 뉴스 번역 시작... (총 {total}개)")
        print(f"{'='*80}\n")

        results = {
            "total": total,
            "successful": 0,
            "failed": 0,
            "errors": []
        }

        # 배치 단위로 처리
        for i in range(0, total, batch_size):
            batch = news_list[i:i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (total + batch_size - 1) // batch_size

            print(f"📦 배치 {batch_num}/{total_batches} 처리 중...")

            # 배치 번역
            batch_results = await self._translate_batch(batch)

            # 결과 집계
            for idx, result in enumerate(batch_results):
                news = batch[idx]
                news_id = news['id']
                title = news.get('title', 'N/A')[:60]

                if isinstance(result, Exception):
                    results["failed"] += 1
                    results["errors"].append(f"ID {news_id}: {str(result)}")
                    print(f"  ❌ [{news_id}] {title}... - 오류: {str(result)[:50]}")

                elif result:
                    results["successful"] += 1
                    print(f"  ✅ [{news_id}] {title}... - 번역 완료")

                else:
                    results["failed"] += 1
                    results["errors"].append(f"ID {news_id}: 번역 실패")
                    print(f"  ❌ [{news_id}] {title}... - 번역 실패")

            # 진행률 표시
            progress = min(i + batch_size, total)
            percentage = (progress / total) * 100
            print(f"  📊 진행률: {progress}/{total} ({percentage:.1f}%)\n")

            # 배치 간 딜레이
            if i + batch_size < total:
                await asyncio.sleep(delay)

        # 4단계: 결과 요약
        print(f"\n{'='*80}")
        print("📊 [3/3] 번역 완료")
        print(f"{'='*80}")
        print(f"✅ 성공: {results['successful']}개")
        print(f"❌ 실패: {results['failed']}개")
        print(f"📈 성공률: {(results['successful']/total*100):.1f}%")

        if results['errors']:
            print(f"\n⚠️  오류 발생 ({len(results['errors'])}건):")
            for error in results['errors'][:10]:  # 최대 10개만
                print(f"  - {error}")
            if len(results['errors']) > 10:
                print(f"  ... 외 {len(results['errors']) - 10}건")

        print(f"\n📅 완료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*80}\n")

    async def _fetch_target_news(
        self,
        symbol: Optional[str],
        limit: Optional[int],
        untranslated_only: bool,
        all_news: bool
    ) -> List[Dict]:
        """대상 뉴스 조회 (최신 뉴스부터 내림차순)"""
        try:
            # 최신 뉴스부터 먼저 번역하도록 published_at 기준 내림차순 정렬
            query = self.supabase.table("news_articles")\
                .select("id, title, description, body, symbol, published_at, kr_translate, ai_score")\
                .order("published_at", desc=True)

            # 미번역만
            if untranslated_only and not all_news:
                query = query.is_("kr_translate", "null")

            # 종목 필터
            if symbol:
                query = query.eq("symbol", symbol.upper())

            # 제한
            if limit:
                query = query.limit(limit)

            result = query.execute()

            return result.data if result.data else []

        except Exception as e:
            print(f"❌ 뉴스 조회 오류: {str(e)}")
            return []

    async def _translate_batch(self, news_batch: List[Dict]) -> List:
        """배치 번역"""
        if self.dry_run:
            # DRY RUN: 번역을 수행하지만 DB 업데이트는 안함
            tasks = [
                self._translate_single_dry_run(news)
                for news in news_batch
            ]
        else:
            # 실제 번역 및 저장
            tasks = [
                self.translation_service.translate_and_save_news(news['id'])
                for news in news_batch
            ]

        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results

    async def _translate_single_dry_run(self, news: Dict) -> bool:
        """DRY RUN용 단일 번역 (DB 업데이트 없음)"""
        try:
            # 번역만 수행 (DB 저장 없음)
            translated = await self.translation_service.translate_article(news.get('body', ''))
            return translated is not None
        except Exception as e:
            print(f"    오류: {str(e)}")
            return False


async def main():
    """메인 함수"""
    # 환경변수 확인
    required_env_vars = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_KEY']
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]

    if missing_vars:
        print(f"❌ 오류: 필수 환경변수가 설정되지 않았습니다: {', '.join(missing_vars)}")
        print(f"   .env 파일 경로: {env_path}")
        print(f"   .env 파일 존재 여부: {os.path.exists(env_path)}")
        sys.exit(1)

    print(f"✅ 환경변수 로드 완료 (.env 파일: {env_path})\n")

    parser = argparse.ArgumentParser(
        description="뉴스 번역 스크립트",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  # 미번역 뉴스만 번역 (최대 50개)
  python scripts/translate_all_news.py --untranslated --limit 50

  # 모든 뉴스 번역
  python scripts/translate_all_news.py --all --limit 100

  # AAPL 종목만 번역
  python scripts/translate_all_news.py --symbol AAPL

  # 테스트 실행
  python scripts/translate_all_news.py --limit 5 --dry-run
        """
    )

    parser.add_argument(
        '--all',
        action='store_true',
        help='모든 뉴스 번역 (기존 번역 무시)'
    )

    parser.add_argument(
        '--untranslated',
        action='store_true',
        help='미번역 뉴스만 번역'
    )

    parser.add_argument(
        '--symbol',
        type=str,
        help='특정 종목만 번역 (예: AAPL)'
    )

    parser.add_argument(
        '--limit',
        type=int,
        help='최대 처리 개수'
    )

    parser.add_argument(
        '--batch-size',
        type=int,
        default=3,
        help='동시 처리 개수 (기본: 3)'
    )

    parser.add_argument(
        '--delay',
        type=float,
        default=2.0,
        help='배치 간 딜레이 초 (기본: 2.0)'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='실제 업데이트 없이 테스트만'
    )

    args = parser.parse_args()

    # 옵션 검증
    if not args.all and not args.untranslated and not args.symbol and not args.limit:
        print("⚠️  옵션을 지정해야 합니다:")
        print("   --all: 모든 뉴스 번역")
        print("   --untranslated: 미번역 뉴스만")
        print("   --symbol AAPL: 특정 종목만")
        print("   --limit 100: 개수 제한")
        print("\n자세한 사용법: python scripts/translate_all_news.py --help")
        sys.exit(1)

    # 번역 실행
    translator = NewsTranslator(dry_run=args.dry_run)

    await translator.translate_all_news(
        symbol=args.symbol,
        limit=args.limit,
        batch_size=args.batch_size,
        delay=args.delay,
        untranslated_only=args.untranslated or False,
        all_news=args.all or False
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  사용자에 의해 중단되었습니다.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
