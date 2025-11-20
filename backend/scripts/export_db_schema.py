#!/usr/bin/env python3
"""
Supabase 데이터베이스의 전체 스키마를 SQL 형식으로 내보내는 스크립트

사용법:
    python scripts/export_db_schema.py

출력:
    backend/supabase_schema.sql 파일에 전체 스키마 저장
"""

import sys
import os
from datetime import datetime

# 경로 설정
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def generate_sql_queries():
    """
    Supabase SQL Editor에서 실행할 쿼리를 생성하여 출력
    사용자가 결과를 복사해서 supabase_schema.sql에 저장
    """

    queries = """-- ================================================================================
-- Supabase 스키마 내보내기 통합 쿼리
-- ================================================================================
-- 생성 일시: {timestamp}
--
-- 사용법:
-- 1. 이 전체 쿼리를 Supabase SQL Editor에 복사
-- 2. 실행하여 결과 확인
-- 3. 결과를 backend/supabase_schema.sql에 저장
-- ================================================================================

-- ================================================================================
-- 각 테이블의 CREATE TABLE 문 생성
-- ================================================================================

DO $$
DECLARE
    table_record RECORD;
    column_record RECORD;
    constraint_record RECORD;
    create_statement TEXT;
    column_definitions TEXT[];
    constraint_definitions TEXT[];
BEGIN
    -- 모든 테이블 순회
    FOR table_record IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        -- 초기화
        column_definitions := ARRAY[]::TEXT[];
        constraint_definitions := ARRAY[]::TEXT[];

        RAISE NOTICE '';
        RAISE NOTICE '-- ========================================';
        RAISE NOTICE '-- Table: %', table_record.table_name;
        RAISE NOTICE '-- ========================================';

        -- 컬럼 정의 생성
        FOR column_record IN
            SELECT
                column_name,
                CASE
                    WHEN data_type = 'character varying' THEN
                        CASE WHEN character_maximum_length IS NOT NULL
                            THEN 'character varying(' || character_maximum_length || ')'
                            ELSE 'character varying'
                        END
                    WHEN data_type = 'numeric' THEN
                        CASE WHEN numeric_precision IS NOT NULL
                            THEN 'numeric(' || numeric_precision ||
                                 CASE WHEN numeric_scale IS NOT NULL
                                    THEN ', ' || numeric_scale
                                    ELSE ''
                                 END || ')'
                            ELSE 'numeric'
                        END
                    WHEN data_type = 'timestamp with time zone' THEN 'timestamp with time zone'
                    WHEN data_type = 'timestamp without time zone' THEN 'timestamp without time zone'
                    WHEN data_type = 'double precision' THEN 'double precision'
                    ELSE data_type
                END as formatted_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
                AND table_name = table_record.table_name
            ORDER BY ordinal_position
        LOOP
            column_definitions := array_append(
                column_definitions,
                '  ' || column_record.column_name || ' ' || column_record.formatted_type ||
                CASE WHEN column_record.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                CASE WHEN column_record.column_default IS NOT NULL
                    THEN ' DEFAULT ' || column_record.column_default
                    ELSE ''
                END
            );
        END LOOP;

        -- PRIMARY KEY
        FOR constraint_record IN
            SELECT STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = 'public'
                AND tc.table_name = table_record.table_name
            GROUP BY tc.constraint_name
        LOOP
            constraint_definitions := array_append(
                constraint_definitions,
                '  CONSTRAINT ' || table_record.table_name || '_pkey PRIMARY KEY (' || constraint_record.columns || ')'
            );
        END LOOP;

        -- UNIQUE
        FOR constraint_record IN
            SELECT
                tc.constraint_name,
                STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'UNIQUE'
                AND tc.table_schema = 'public'
                AND tc.table_name = table_record.table_name
            GROUP BY tc.constraint_name
        LOOP
            constraint_definitions := array_append(
                constraint_definitions,
                '  CONSTRAINT ' || constraint_record.constraint_name || ' UNIQUE (' || constraint_record.columns || ')'
            );
        END LOOP;

        -- FOREIGN KEY
        FOR constraint_record IN
            SELECT
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name as foreign_table,
                ccu.column_name as foreign_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
                AND tc.table_name = table_record.table_name
        LOOP
            constraint_definitions := array_append(
                constraint_definitions,
                '  CONSTRAINT ' || constraint_record.constraint_name ||
                ' FOREIGN KEY (' || constraint_record.column_name || ')' ||
                ' REFERENCES public.' || constraint_record.foreign_table ||
                '(' || constraint_record.foreign_column || ')'
            );
        END LOOP;

        -- CREATE TABLE 문 생성
        create_statement := 'CREATE TABLE public.' || table_record.table_name || ' (' || chr(10) ||
                           array_to_string(column_definitions, ',' || chr(10));

        IF array_length(constraint_definitions, 1) > 0 THEN
            create_statement := create_statement || ',' || chr(10) ||
                               array_to_string(constraint_definitions, ',' || chr(10));
        END IF;

        create_statement := create_statement || chr(10) || ');';

        RAISE NOTICE '%', create_statement;
        RAISE NOTICE '';
    END LOOP;

    RAISE NOTICE '-- ================================================================================';
    RAISE NOTICE '-- 스키마 내보내기 완료';
    RAISE NOTICE '-- ================================================================================';
END $$;
""".format(timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    output_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'export_schema_query.sql'
    )

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(queries)

    print("=" * 80)
    print("Supabase Schema Export Query Generated")
    print("=" * 80)
    print(f"\nQuery file location: {output_file}")
    print("\nNext steps:")
    print("1. Open Supabase Dashboard")
    print("2. Go to SQL Editor")
    print("3. Copy and paste the query from the file above")
    print("4. Execute the query")
    print("5. Copy the output from Messages tab")
    print("6. Save it to backend/supabase_schema.sql")
    print("\nTip: CREATE TABLE statements will appear in Messages tab")
    print("=" * 80)


def main():
    """메인 함수"""
    print("\n" + "=" * 80)
    print("Supabase Schema Export Script")
    print("=" * 80)

    generate_sql_queries()

if __name__ == '__main__':
    main()
