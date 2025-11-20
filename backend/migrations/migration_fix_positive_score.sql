-- Migration: Fix typo in column name from 'postive_score' to 'positive_score'
-- Date: 2025-11-14
-- Description: Rename the incorrectly spelled 'postive_score' column to 'positive_score' in the news_articles table

-- Step 1: Check if the old column exists before renaming
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'news_articles'
        AND column_name = 'postive_score'
    ) THEN
        -- Step 2: Rename the column
        ALTER TABLE public.news_articles
        RENAME COLUMN postive_score TO positive_score;

        RAISE NOTICE 'Successfully renamed column from postive_score to positive_score';
    ELSE
        RAISE NOTICE 'Column postive_score does not exist, checking if positive_score already exists';

        -- Step 3: If postive_score doesn't exist, check if positive_score exists
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'news_articles'
            AND column_name = 'positive_score'
        ) THEN
            -- Step 4: If neither exists, create the positive_score column
            ALTER TABLE public.news_articles
            ADD COLUMN positive_score double precision DEFAULT 0.5;

            RAISE NOTICE 'Created new column positive_score';
        ELSE
            RAISE NOTICE 'Column positive_score already exists, no action needed';
        END IF;
    END IF;
END $$;

-- Step 5: Verify the change
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'news_articles'
AND column_name IN ('positive_score', 'postive_score')
ORDER BY column_name;

-- Step 6: Optional - Check data integrity (count non-null values)
SELECT
    COUNT(*) as total_records,
    COUNT(positive_score) as records_with_positive_score,
    AVG(positive_score) as avg_positive_score,
    MIN(positive_score) as min_positive_score,
    MAX(positive_score) as max_positive_score
FROM public.news_articles;
