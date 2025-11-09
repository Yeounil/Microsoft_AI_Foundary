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

        supabase = get_supabase()

        # 1단계: 기존 데이터 확인 및 삭제
        print("[1/4] Clearing old data from stock_indicators...")

        existing = supabase.table("stock_indicators").select("count", count="exact").execute()
        existing_count = existing.count if hasattr(existing, 'count') else 0

        if existing_count > 0:
            print(f"      Found {existing_count} existing records - deleting...")
            supabase.table("stock_indicators").delete().neq('id', -1).execute()
            print(f"      Deletion complete!")
        else:
            print(f"      Table is already empty")

        print()

        # 2단계: FMP API로부터 새로운 주식 지표 수집
        print("[2/4] Collecting stock indicators from FMP API...")
        print("      This may take 2-3 minutes...")
        print()

        fmp_service = FMPStockDataService()

        # force_refresh=True로 설정하여 신선한 데이터 가져오기
        result = await fmp_service.collect_all_stock_indicators(force_refresh=True)

        print(f"      Collection Complete!")
        print(f"      - Total symbols attempted: {result.get('total_symbols')}")
        print(f"      - Successful: {result.get('successful')}")
        print(f"      - Failed: {result.get('failed')}")
        print(f"      - Elapsed time: {result.get('elapsed_seconds'):.1f}s")

        if result.get('errors'):
            print(f"      - Errors: {', '.join(result.get('errors')[:5])}")

        print()

        # 3단계: 실제 저장된 데이터 확인
        print("[3/4] Verifying saved data...")

        saved = supabase.table("stock_indicators").select("*").execute()
        total_records = len(saved.data) if saved.data else 0

        print(f"      Total records in database: {total_records}")

        if total_records == 0:
            print()
            print("      WARNING: No records were saved to database!")
            print("      This might indicate a database connectivity issue.")
            print()

        # 4단계: 데이터 품질 검증
        print("[4/4] Data Quality Validation...")

        if total_records > 0:
            # NULL과 EMPTY 개수 세기
            null_count = 0
            empty_count = 0
            valid_count = 0
            sample = None

            for record in saved.data:
                if not sample:
                    sample = record

                for field, value in record.items():
                    if value is None:
                        null_count += 1
                    elif isinstance(value, str) and (value.strip() == '' or value.lower() == 'empty'):
                        empty_count += 1

            # 각 레코드의 평균 유효 필드 수
            total_fields = total_records * len(saved.data[0]) if saved.data else 0
            valid_count = total_fields - null_count - empty_count

            print(f"      Total fields scanned: {total_fields}")
            print(f"      - NULL fields: {null_count} ({null_count/total_fields*100:.1f}%)")
            print(f"      - EMPTY fields: {empty_count} ({empty_count/total_fields*100:.1f}%)")
            print(f"      - VALID fields: {valid_count} ({valid_count/total_fields*100:.1f}%)")
            print()

            if sample:
                print(f"      Sample Record ({sample.get('symbol')}):")
                critical_fields = ['symbol', 'company_name', 'current_price', 'pe_ratio', 'market_cap', 'sector', 'industry']
                for field in critical_fields:
                    value = sample.get(field)
                    if value is not None and str(value).lower() != 'empty':
                        if isinstance(value, (int, float)):
                            print(f"        {field}: {value:,.2f}" if isinstance(value, float) else f"        {field}: {value:,}")
                        else:
                            print(f"        {field}: {value}")
                    else:
                        status = "NULL" if value is None else "EMPTY"
                        print(f"        {field}: {status} [WARNING]")

        print()
        print("=" * 80)
        print("[SUCCESS] Stock indicators refresh complete!")
        print("=" * 80)
        print()
        print("Next steps:")
        print("  1. Verify data quality with Supabase console")
        print("  2. Run embedding: python scripts/embed_stock_data.py --all --indicators-only")
        print("  3. Check results: curl http://localhost:8000/api/v2/embeddings/embeddings/index/stats")
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
