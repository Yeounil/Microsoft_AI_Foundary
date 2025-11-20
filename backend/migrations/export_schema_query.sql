-- ================================================================================
-- Supabase 스키마 내보내기 통합 쿼리
-- ================================================================================
-- 생성 일시: 2025-11-20 23:49:57
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
