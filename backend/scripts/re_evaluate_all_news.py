#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
전체 뉴스 AI Score 재평가 스크립트

기존 데이터가 이상하거나 AI Score를 다시 매기고 싶을 때 사용

사용법:
    python scripts/re_evaluate_all_news.py [옵션]

옵션:
    --all                  모든 뉴스 재평가 (기존 점수 무시)
    --unevaluated          미평가 뉴스만 평가
    --symbol AAPL          특정 종목만 재평가
    --limit 100            최대 처리 개수 (기본: 무제한)
    --batch-size 5         동시 처리 개수 (기본: 5)
    --delay 1.0            배치 간 딜레이 초 (기본: 1.0)
    --dry-run              실제 업데이트 없이 테스트만

예시:
    # 모든 뉴스 재평가 (주의: 시간 오래 걸림)
    python scripts/re_evaluate_all_news.py --all

    # 미평가 뉴스만 평가
    python scripts/re_evaluate_all_news.py --unevaluated --limit 50

    # AAPL 뉴스만 재평가
    python scripts/re_evaluate_all_news.py --symbol AAPL

    # 테스트 실행 (DB 업데이트 안함)
    python scripts/re_evaluate_all_news.py --limit 10 --dry-run
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

from app.services.news_ai_score_service import NewsAIScoreService
from app.services.openai_service import OpenAIService
from app.db.supabase_client import get_supabase


class NewsReEvaluator:
    """뉴스 재평가 실행기"""

    def __init__(self, dry_run: bool = False):
        self.ai_score_service = NewsAIScoreService()
        self.openai_service = OpenAIService()
        self.supabase = get_supabase()
        self.dry_run = dry_run

        if dry_run:
            print("🔵 DRY RUN 모드: 실제 DB 업데이트는 하지 않습니다\n")

    async def re_evaluate_all_news(
        self,
        symbol: Optional[str] = None,
        limit: Optional[int] = None,
        batch_size: int = 5,
        delay: float = 1.0,
        unevaluated_only: bool = False
    ):
        """
        전체 뉴스 재평가

        Args:
            symbol: 특정 종목만 (None이면 전체)
            limit: 최대 처리 개수 (None이면 무제한)
            batch_size: 동시 처리 개수
            delay: 배치 간 딜레이
            unevaluated_only: True이면 미평가 뉴스만
        """
        print("=" * 80)
        print("🔄 뉴스 AI Score 재평가 시작")
        print("=" * 80)
        print(f"📅 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🎯 대상: {'미평가 뉴스만' if unevaluated_only else '모든 뉴스'}")
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
            unevaluated_only=unevaluated_only
        )

        if not news_list:
            print("⚠️  처리할 뉴스가 없습니다.")
            return

        total = len(news_list)
        print(f"✅ {total}개 뉴스 발견\n")

        # 2단계: 사용자 확인
        if not self.dry_run and total > 50:
            confirm = input(f"⚠️  {total}개 뉴스를 재평가하시겠습니까? (yes/no): ")
            if confirm.lower() not in ['yes', 'y']:
                print("❌ 취소되었습니다.")
                return

        # 3단계: 재평가 실행
        print(f"\n🚀 [2/3] AI Score 재평가 시작... (총 {total}개)")
        print(f"{'='*80}\n")

        results = {
            "total": total,
            "successful": 0,
            "failed": 0,
            "errors": []
        }

        # 배치 단위로 처리
        for i in range(0, total, batch_size):
            batch = news_list[i:i+batch_size]
            batch_num = i // batch_size + 1
            total_batches = (total + batch_size - 1) // batch_size

            print(f"📦 배치 {batch_num}/{total_batches} 처리 중...")

            # 배치 평가
            batch_results = await self._evaluate_batch(batch)

            # 결과 집계
            for idx, result in enumerate(batch_results):
                news = batch[idx]
                news_id = news['id']
                title = news.get('title', 'N/A')[:60]

                if isinstance(result, Exception):
                    results["failed"] += 1
                    results["errors"].append(f"ID {news_id}: {str(result)}")
                    print(f"  ❌ [{news_id}] {title}... - 오류: {str(result)[:50]}")

                elif result.get("status") == "success":
                    results["successful"] += 1
                    ai_score = result.get("ai_score", 0)
                    positive_score = result.get("positive_score", 0)
                    direction = result.get("impact_direction", "neutral")
                    reasoning = result.get("reasoning", "")

                    # 방향 이모지
                    direction_emoji = "📈" if direction == "positive" else "📉" if direction == "negative" else "➡️"

                    print(f"  ✅ [{news_id}] {title}... - AI: {ai_score:.3f}, Pos: {positive_score:.3f} {direction_emoji} ({direction})")

                    # 간단한 근거 표시 (첫 100자만)
                    if reasoning:
                        reasoning_preview = reasoning[:100] + "..." if len(reasoning) > 100 else reasoning
                        print(f"     💡 근거: {reasoning_preview}")

                else:
                    results["failed"] += 1
                    reason = result.get("reason", "Unknown error")
                    results["errors"].append(f"ID {news_id}: {reason}")
                    print(f"  ❌ [{news_id}] {title}... - 실패: {reason}")

            # 진행률 표시
            progress = min(i + batch_size, total)
            percentage = (progress / total) * 100
            print(f"  📊 진행률: {progress}/{total} ({percentage:.1f}%)\n")

            # 배치 간 딜레이
            if i + batch_size < total:
                await asyncio.sleep(delay)

        # 4단계: 결과 요약
        print(f"\n{'='*80}")
        print("📊 [3/3] 재평가 완료")
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
        unevaluated_only: bool
    ) -> List[Dict]:
        """대상 뉴스 조회 (최신 뉴스부터 내림차순)"""
        try:
            # 최신 뉴스부터 먼저 분석하도록 published_at 기준 내림차순 정렬
            query = self.supabase.table("news_articles")\
                .select("id, title, description, body, symbol, published_at, ai_score, analyzed_at, ai_analyzed_text, positive_score")\
                .order("published_at", desc=True)

            # 미평가만 (ai_score, analyzed_at, ai_analyzed_text, positive_score 중 하나라도 NULL인 경우)
            if unevaluated_only:
                # Supabase의 or 조건 사용: 4개 필드 중 하나라도 NULL이면 선택
                query = query.or_("ai_score.is.null,analyzed_at.is.null,ai_analyzed_text.is.null,positive_score.is.null")

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

    async def _evaluate_batch(self, news_batch: List[Dict]) -> List:
        """배치 평가"""
        if self.dry_run:
            # DRY RUN: 실제 평가는 하지만 DB 업데이트는 안함
            tasks = [
                self._evaluate_single_dry_run(news)
                for news in news_batch
            ]
        else:
            # 실제 평가 및 업데이트
            tasks = [
                self.ai_score_service.evaluate_and_update_news_score(
                    news_id=news['id'],
                    news_article=news
                )
                for news in news_batch
            ]

        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results

    async def _evaluate_single_dry_run(self, news: Dict) -> Dict:
        """DRY RUN용 단일 평가 (DB 업데이트 없음)"""
        try:
            # AI 평가만 수행
            evaluation_result = await self.openai_service.evaluate_news_stock_impact(
                news_article=news,
                symbol=news.get('symbol')
            )

            return {
                "status": "success",
                "news_id": news['id'],
                "ai_score": evaluation_result.get('ai_score', 0.5),
                "positive_score": evaluation_result.get('positive_score', 0.5),
                "impact_direction": evaluation_result.get('impact_direction', 'neutral'),
                "reasoning": evaluation_result.get('reasoning', ''),
                "updated": False  # DRY RUN이므로 업데이트 안됨
            }

        except Exception as e:
            return {
                "status": "error",
                "news_id": news['id'],
                "reason": str(e)
            }


async def main():
    """메인 함수"""
    # 환경변수 확인
    required_env_vars = ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_KEY']
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]

    if missing_vars:
        print(f"❌ 오류: 필수 환경변수가 설정되지 않았습니다: {', '.join(missing_vars)}")
        print(f"   .env 파일 경로: {env_path}")
        print(f"   .env 파일 존재 여부: {os.path.exists(env_path)}")
        sys.exit(1)

    print(f"✅ 환경변수 로드 완료 (.env 파일: {env_path})\n")

    parser = argparse.ArgumentParser(
        description="뉴스 AI Score 재평가 스크립트",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  # 모든 뉴스 재평가
  python scripts/re_evaluate_all_news.py --all

  # 미평가 뉴스만 평가 (최대 50개)
  python scripts/re_evaluate_all_news.py --unevaluated --limit 50

  # AAPL 뉴스만 재평가
  python scripts/re_evaluate_all_news.py --symbol AAPL

  # 테스트 실행
  python scripts/re_evaluate_all_news.py --limit 10 --dry-run
        """
    )

    parser.add_argument(
        '--all',
        action='store_true',
        help='모든 뉴스 재평가 (기존 점수 무시)'
    )

    parser.add_argument(
        '--unevaluated',
        action='store_true',
        help='미평가 뉴스만 평가'
    )

    parser.add_argument(
        '--symbol',
        type=str,
        help='특정 종목만 재평가 (예: AAPL)'
    )

    parser.add_argument(
        '--limit',
        type=int,
        help='최대 처리 개수'
    )

    parser.add_argument(
        '--batch-size',
        type=int,
        default=5,
        help='동시 처리 개수 (기본: 5)'
    )

    parser.add_argument(
        '--delay',
        type=float,
        default=1.0,
        help='배치 간 딜레이 초 (기본: 1.0)'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='실제 업데이트 없이 테스트만'
    )

    args = parser.parse_args()

    # 옵션 검증
    if not args.all and not args.unevaluated and not args.symbol and not args.limit:
        print("⚠️  옵션을 지정해야 합니다:")
        print("   --all: 모든 뉴스 재평가")
        print("   --unevaluated: 미평가 뉴스만")
        print("   --symbol AAPL: 특정 종목만")
        print("   --limit 100: 개수 제한")
        print("\n자세한 사용법: python scripts/re_evaluate_all_news.py --help")
        sys.exit(1)

    # 재평가 실행
    evaluator = NewsReEvaluator(dry_run=args.dry_run)

    await evaluator.re_evaluate_all_news(
        symbol=args.symbol,
        limit=args.limit,
        batch_size=args.batch_size,
        delay=args.delay,
        unevaluated_only=args.unevaluated or False
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
