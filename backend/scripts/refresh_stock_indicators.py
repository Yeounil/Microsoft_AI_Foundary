#!/usr/bin/env python3
"""
주식 지표(stock_indicators) 테이블을 FMP API로부터 최신 데이터로 완전히 새로 고침
모든 기존 데이터를 제거하고 새로운 데이터로 채우는 스크립트
"""

import asyncio
import logging
import sys
from datetime import datetime

# 부모 디렉토리를 경로에 추가
sys.path.insert(0, str(__file__).rsplit('\\', 1)[0].rsplit('\\', 1)[0])

from app.services.fmp_stock_data_service import FMPStockDataService
from app.db.supabase_client import get_supabase

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def main():
    """메인 함수"""
    try:
        print("=" * 80)
        print("[REFRESH] Stock Indicators Table Complete Refresh Starting")
        print("=" * 80)
        print()

        # 1단계: 기존 데이터 확인
        supabase = get_supabase()
        print("[1/3] Checking existing stock_indicators data...")

        existing = supabase.table("stock_indicators").select("count", count="exact").execute()
        existing_count = existing.count if hasattr(existing, 'count') else 0

        if existing_count > 0:
            print(f"      Found {existing_count} existing records")
            print("      Note: New data will overwrite existing records (UPSERT)")
            print()
        else:
            print(f"      Empty table - ready for new data")
            print()

        # 2단계: FMP API로부터 새로운 주식 지표 수집
        print("[2/3] Collecting stock indicators from FMP API...")
        print("      This may take 1-2 minutes...")
        print()

        fmp_service = FMPStockDataService()

        # force_refresh=True로 설정하여 이미 있는 데이터도 새로 가져오기
        result = await fmp_service.collect_all_stock_indicators(force_refresh=True)

        print(f"      Collection Complete!")
        print(f"      - Total symbols: {result.get('total_symbols')}")
        print(f"      - Successful: {result.get('successful')}")
        print(f"      - Failed: {result.get('failed')}")
        print(f"      - Elapsed time: {result.get('elapsed_seconds'):.1f}s")

        if result.get('errors'):
            print(f"      - Errors: {result.get('errors')[:3]}")
        print()

        # 3단계: 데이터 품질 검증
        print("[3/3] Validating data quality...")

        # NULL 값 개수 확인
        indicators = supabase.table("stock_indicators").select("*").execute()
        total_records = len(indicators.data) if indicators.data else 0

        print(f"      Saved symbols: {total_records}")

        if total_records > 0:
            # 몇 가지 레코드 샘플 확인
            sample = indicators.data[0]
            null_fields = {k: v for k, v in sample.items() if v is None}
            non_null_fields = {k: v for k, v in sample.items() if v is not None}

            print(f"      First record ({sample.get('symbol')}):")
            print(f"      - Fields with data: {len(non_null_fields)}")
            print(f"      - NULL fields: {len(null_fields)}")

            if null_fields:
                print(f"      - NULL field names: {list(null_fields.keys())}")

            # 주요 필드 확인
            critical_fields = ['symbol', 'company_name', 'current_price', 'pe_ratio', 'market_cap', 'sector']
            print()
            print("      Key Field Examples:")
            for field in critical_fields:
                value = sample.get(field)
                if value is not None:
                    if isinstance(value, (int, float)):
                        print(f"        {field}: {value:,.2f}" if isinstance(value, float) else f"        {field}: {value:,}")
                    else:
                        print(f"        {field}: {value}")
                else:
                    print(f"        {field}: NULL [WARNING]")

        print()
        print("=" * 80)
        print("[SUCCESS] Stock indicators refresh complete!")
        print("=" * 80)
        print()
        print("Next steps:")
        print("  1. Re-run embedding: python scripts/embed_stock_data.py --all")
        print("  2. Check results: curl http://localhost:8000/api/v2/embeddings/embeddings/index/stats")
        print()

    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        print()
        print("=" * 80)
        print(f"[ERROR] {str(e)}")
        print("=" * 80)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
