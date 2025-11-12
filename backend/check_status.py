#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import io

# Windows 환경에서 UTF-8 인코딩 설정
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.db.supabase_client import get_supabase

supabase = get_supabase()

# 전체 뉴스 개수
total = supabase.table('news_articles').select('id').execute()
total_count = len(total.data) if total.data else 0

# 번역된 뉴스
translated = supabase.table('news_articles').select('id').not_.is_('kr_translate', 'null').execute()
translated_count = len(translated.data) if translated.data else 0

# 미번역 뉴스
untranslated = supabase.table('news_articles').select('id').is_('kr_translate', 'null').execute()
untranslated_count = len(untranslated.data) if untranslated.data else 0

# 미평가 뉴스 (analyzed_at + ai_analyzed_text 모두 NULL)
unevaluated = supabase.table('news_articles').select('id').is_('analyzed_at', 'null').is_('ai_analyzed_text', 'null').execute()
unevaluated_count = len(unevaluated.data) if unevaluated.data else 0

print("=" * 80)
print("뉴스 상태 조회")
print("=" * 80)
print(f"전체 뉴스:      {total_count}개")
print(f"번역된 뉴스:    {translated_count}개")
print(f"미번역 뉴스:    {untranslated_count}개 ({(untranslated_count/total_count*100 if total_count > 0 else 0):.1f}%)")
print(f"미평가 뉴스:    {unevaluated_count}개 ({(unevaluated_count/total_count*100 if total_count > 0 else 0):.1f}%)")
print("=" * 80)

# 미번역 뉴스 샘플
print("\n미번역 뉴스 샘플 (최대 5개):")
if untranslated.data:
    for i, news in enumerate(untranslated.data[:5], 1):
        detail = supabase.table('news_articles').select('id, title, body').eq('id', news['id']).single().execute()
        if detail.data:
            title = detail.data.get('title', 'N/A')[:60]
            body_len = len(detail.data.get('body', ''))
            print(f"  {i}. ID: {news['id']}, Title: {title}..., Body: {body_len}자")
else:
    print("  없음")

# 미평가 뉴스 샘플
print("\n미평가 뉴스 샘플 (최대 5개):")
if unevaluated.data:
    for i, news in enumerate(unevaluated.data[:5], 1):
        detail = supabase.table('news_articles').select('id, title, ai_score, analyzed_at').eq('id', news['id']).single().execute()
        if detail.data:
            title = detail.data.get('title', 'N/A')[:60]
            ai_score = detail.data.get('ai_score', 'NULL')
            analyzed_at = detail.data.get('analyzed_at', 'NULL')
            print(f"  {i}. ID: {news['id']}, Title: {title}..., AI Score: {ai_score}, Analyzed: {analyzed_at}")
else:
    print("  없음")
