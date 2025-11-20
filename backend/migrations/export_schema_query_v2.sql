-- ================================================================================
-- Supabase 스키마 내보내기 쿼리 (SELECT 버전)
-- ================================================================================
-- 이 쿼리는 Results 탭에 CREATE TABLE 문을 직접 반환합니다
-- ================================================================================

WITH table_schemas AS (
    SELECT
        t.table_name,
        t.ordinal_position as table_order,
        -- 컬럼 정의
        (
            SELECT
                E'CREATE TABLE public.' || t.table_name || E' (\n' ||
                STRING_AGG(
                    '  ' || c.column_name || ' ' ||
                    CASE
                        WHEN c.data_type = 'character varying' THEN
                            CASE WHEN c.character_maximum_length IS NOT NULL
                                THEN 'character varying(' || c.character_maximum_length || ')'
                                ELSE 'character varying'
                            END
                        WHEN c.data_type = 'numeric' THEN
                            CASE WHEN c.numeric_precision IS NOT NULL
                                THEN 'numeric(' || c.numeric_precision ||
                                     CASE WHEN c.numeric_scale IS NOT NULL
                                        THEN ', ' || c.numeric_scale
                                        ELSE ''
                                     END || ')'
                                ELSE 'numeric'
                            END
                        WHEN c.data_type = 'timestamp with time zone' THEN 'timestamp with time zone'
                        WHEN c.data_type = 'timestamp without time zone' THEN 'timestamp without time zone'
                        WHEN c.data_type = 'double precision' THEN 'double precision'
                        ELSE c.data_type
                    END ||
                    CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                    CASE WHEN c.column_default IS NOT NULL
                        THEN ' DEFAULT ' || c.column_default
                        ELSE ''
                    END,
                    E',\n'
                    ORDER BY c.ordinal_position
                ) ||
                -- PRIMARY KEY 추가
                COALESCE(
                    E',\n  CONSTRAINT ' || t.table_name || '_pkey PRIMARY KEY (' ||
                    (
                        SELECT STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position)
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu
                            ON tc.constraint_name = kcu.constraint_name
                        WHERE tc.constraint_type = 'PRIMARY KEY'
                            AND tc.table_schema = 'public'
                            AND tc.table_name = t.table_name
                    ) || ')',
                    ''
                ) ||
                -- UNIQUE 제약조건 추가
                COALESCE(
                    (
                        SELECT E',\n' || STRING_AGG(
                            '  CONSTRAINT ' || tc.constraint_name || ' UNIQUE (' ||
                            (
                                SELECT STRING_AGG(kcu2.column_name, ', ' ORDER BY kcu2.ordinal_position)
                                FROM information_schema.key_column_usage kcu2
                                WHERE kcu2.constraint_name = tc.constraint_name
                            ) || ')',
                            E',\n'
                        )
                        FROM information_schema.table_constraints tc
                        WHERE tc.constraint_type = 'UNIQUE'
                            AND tc.table_schema = 'public'
                            AND tc.table_name = t.table_name
                    ),
                    ''
                ) ||
                -- FOREIGN KEY 제약조건 추가
                COALESCE(
                    (
                        SELECT E',\n' || STRING_AGG(
                            '  CONSTRAINT ' || tc.constraint_name ||
                            ' FOREIGN KEY (' || kcu.column_name || ')' ||
                            ' REFERENCES public.' || ccu.table_name ||
                            '(' || ccu.column_name || ')',
                            E',\n'
                        )
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu
                            ON tc.constraint_name = kcu.constraint_name
                        JOIN information_schema.constraint_column_usage ccu
                            ON tc.constraint_name = ccu.constraint_name
                        WHERE tc.constraint_type = 'FOREIGN KEY'
                            AND tc.table_schema = 'public'
                            AND tc.table_name = t.table_name
                    ),
                    ''
                ) ||
                E'\n);'
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
                AND c.table_name = t.table_name
        ) as create_statement
    FROM (
        SELECT
            table_name,
            ROW_NUMBER() OVER (ORDER BY table_name) as ordinal_position
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
    ) t
)
SELECT
    table_order as "순서",
    table_name as "테이블명",
    create_statement as "CREATE TABLE 문"
FROM table_schemas
ORDER BY table_order;
