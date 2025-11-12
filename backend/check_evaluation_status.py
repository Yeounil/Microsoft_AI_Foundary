#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import io

# Windows 환경에서 UTF-8 인코딩 설정
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.db.supabase_client import get_supabase

supabase = get_supabase()

print("=" * 80)
print("뉴스 AI Score 평가 상태 확인")
print("=" * 80)

# 1. 전체 뉴스
all_news = supabase.table('news_articles').select('id').execute()
total = len(all_news.data) if all_news.data else 0
print(f"\n1. 전체 뉴스: {total}개")

# 2. ai_analyzed_text가 NULL인 뉴스
unevaluated_text = supabase.table('news_articles')\
    .select('id, title, ai_analyzed_text, analyzed_at, ai_score, postive_score')\
    .is_('ai_analyzed_text', 'null')\
    .execute()
unevaluated_text_count = len(unevaluated_text.data) if unevaluated_text.data else 0
print(f"2. ai_analyzed_text = NULL: {unevaluated_text_count}개 ⚠️")

# 3. positive_score가 NULL인 뉴스
unevaluated_pos = supabase.table('news_articles')\
    .select('id, title, postive_score, ai_analyzed_text, analyzed_at, ai_score')\
    .is_('postive_score', 'null')\
    .execute()
unevaluated_pos_count = len(unevaluated_pos.data) if unevaluated_pos.data else 0
print(f"3. postive_score = NULL: {unevaluated_pos_count}개 ⚠️")

# 4. analyzed_at이 NULL인 뉴스
unevaluated_at = supabase.table('news_articles')\
    .select('id, title, analyzed_at, ai_analyzed_text, ai_score, postive_score')\
    .is_('analyzed_at', 'null')\
    .execute()
unevaluated_at_count = len(unevaluated_at.data) if unevaluated_at.data else 0
print(f"4. analyzed_at = NULL: {unevaluated_at_count}개 ⚠️")

# 5. 세 필드 모두 NULL인 뉴스 (완전히 미평가)
fully_unevaluated = supabase.table('news_articles')\
    .select('id, title, analyzed_at, ai_analyzed_text, postive_score, ai_score')\
    .is_('analyzed_at', 'null')\
    .is_('ai_analyzed_text', 'null')\
    .is_('postive_score', 'null')\
    .execute()
fully_unevaluated_count = len(fully_unevaluated.data) if fully_unevaluated.data else 0
print(f"5. 세 필드 모두 NULL (완전히 미평가): {fully_unevaluated_count}개 ⚠️")

print("\n" + "=" * 80)
print("미평가 뉴스 샘플 (ai_analyzed_text = NULL인 항목, 최대 5개)")
print("=" * 80)

if unevaluated_text.data:
    for i, news in enumerate(unevaluated_text.data[:5], 1):
        news_id = news.get('id')
        title = news.get('title', 'N/A')[:50]
        ai_analyzed = "NULL" if news.get('ai_analyzed_text') is None else "O"
        analyzed_at = "NULL" if news.get('analyzed_at') is None else "O"
        ai_score = news.get('ai_score')
        pos_score = news.get('postive_score')

        print(f"\n{i}. ID: {news_id}")
        print(f"   Title: {title}...")
        print(f"   ai_analyzed_text: {ai_analyzed}")
        print(f"   analyzed_at: {analyzed_at}")
        print(f"   ai_score: {ai_score}")
        print(f"   postive_score: {pos_score}")
else:
    print("없음")

print("\n" + "=" * 80)
