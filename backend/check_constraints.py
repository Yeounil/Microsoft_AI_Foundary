"""
email_subscriptions 테이블의 제약 조건 확인 스크립트
"""
import asyncio
from app.db.supabase_client import get_supabase

async def check_constraints():
    supabase = get_supabase()

    # PostgreSQL에서 제약 조건 조회
    query = """
    SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        tc.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
        AND tc.table_name = 'email_subscriptions'
    ORDER BY tc.constraint_type, kcu.ordinal_position;
    """

    try:
        result = supabase.rpc('exec_sql', {'query': query}).execute()
        print("=== email_subscriptions 테이블 제약 조건 ===")
        print(result.data)
    except Exception as e:
        print(f"Error: {e}")
        print("\n대체 방법: Supabase 대시보드에서 확인")
        print("1. Supabase 대시보드 로그인")
        print("2. Table Editor > email_subscriptions 선택")
        print("3. Indexes & Constraints 탭 확인")

if __name__ == "__main__":
    asyncio.run(check_constraints())
