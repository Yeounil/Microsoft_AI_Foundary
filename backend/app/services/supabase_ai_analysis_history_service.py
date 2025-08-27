import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from app.db.supabase_client import get_supabase

class SupabaseAIAnalysisHistoryService:
    """Supabase용 AI 분석 히스토리 서비스"""
    
    def __init__(self):
        self.supabase = get_supabase()
        self.table_name = "ai_analysis_history"

    async def save_analysis(
        self,
        symbol: str,
        market: str,
        company_name: str,
        analysis_content: str,
        analysis_prompt: str = None,
        referenced_news_sources: List[Dict] = None,
        stock_price: float = None,
        analysis_period: str = "1y",
        analysis_interval: str = "1d",
        user_id: str = None,
        analysis_type: str = "stock_analysis"
    ) -> str:
        """분석 결과 저장"""
        try:
            # 기존 활성 분석들을 비활성화 (최신 것만 활성 유지)
            self.supabase.table(self.table_name).update({
                "is_active": False
            }).eq("symbol", symbol).eq("market", market).eq("is_active", True).execute()
            
            # 새 분석 저장
            data = {
                "symbol": symbol,
                "market": market,
                "company_name": company_name,
                "analysis_content": analysis_content,
                "analysis_prompt": analysis_prompt,
                "referenced_news_count": len(referenced_news_sources) if referenced_news_sources else 0,
                "referenced_news_sources": json.dumps(referenced_news_sources) if referenced_news_sources else None,
                "stock_price_at_analysis": stock_price,
                "analysis_period": analysis_period,
                "analysis_interval": analysis_interval,
                "analysis_type": analysis_type,
                "is_active": True
            }
            
            # user_id 처리 (nullable로 변경 후 사용 가능)
            if user_id:
                data["user_id"] = user_id
            # user_id가 없으면 null로 저장 (nullable 컬럼으로 변경 필요)
            
            result = self.supabase.table(self.table_name).insert(data).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0].get("id")
            else:
                raise Exception("데이터 저장 실패")
                
        except Exception as e:
            print(f"[ERROR] Supabase 분석 저장 오류: {str(e)}")
            raise e

    async def get_latest_analysis(self, symbol: str, market: str = "us") -> Optional[Dict]:
        """최신 분석 결과 조회"""
        try:
            result = self.supabase.table(self.table_name).select("*").eq(
                "symbol", symbol
            ).eq("market", market).eq("is_active", True).order(
                "created_at", desc=True
            ).limit(1).execute()
            
            if result.data and len(result.data) > 0:
                analysis = result.data[0]
                
                # JSON 필드 파싱
                if analysis.get('referenced_news_sources'):
                    try:
                        analysis['referenced_news_sources'] = json.loads(analysis['referenced_news_sources'])
                    except:
                        analysis['referenced_news_sources'] = []
                
                return analysis
            return None
            
        except Exception as e:
            print(f"[ERROR] Supabase 최신 분석 조회 오류: {str(e)}")
            return None

    async def get_historical_analyses(
        self, 
        symbol: str, 
        market: str = "us", 
        days_back: int = 30,
        limit: int = 5
    ) -> List[Dict]:
        """과거 분석 결과들 조회 (최근 30일, 최대 5개)"""
        try:
            cutoff_date = (datetime.now() - timedelta(days=days_back)).isoformat()
            
            result = self.supabase.table(self.table_name).select("*").eq(
                "symbol", symbol
            ).eq("market", market).gte(
                "created_at", cutoff_date
            ).order("created_at", desc=True).limit(limit).execute()
            
            analyses = []
            for analysis in result.data:
                # JSON 필드 파싱
                if analysis.get('referenced_news_sources'):
                    try:
                        analysis['referenced_news_sources'] = json.loads(analysis['referenced_news_sources'])
                    except:
                        analysis['referenced_news_sources'] = []
                
                analyses.append(analysis)
            
            return analyses
            
        except Exception as e:
            print(f"[ERROR] Supabase 과거 분석 조회 오류: {str(e)}")
            return []

    async def search_similar_analyses(
        self, 
        symbol: str, 
        market: str = "us",
        days_back: int = 90
    ) -> List[Dict]:
        """유사한 분석들 검색 (같은 종목, 최근 90일)"""
        return await self.get_historical_analyses(symbol, market, days_back, limit=10)

    async def get_analysis_summary_for_ai(
        self, 
        symbol: str, 
        market: str = "us"
    ) -> Optional[str]:
        """AI 분석에 사용할 과거 분석 요약"""
        try:
            historical_analyses = await self.get_historical_analyses(symbol, market, 30, 3)
            
            if not historical_analyses:
                return None
            
            summary_parts = []
            for i, analysis in enumerate(historical_analyses, 1):
                created_date = analysis['created_at'][:10] if analysis['created_at'] else 'N/A'  # YYYY-MM-DD 형식
                price = analysis.get('stock_price_at_analysis')
                news_count = analysis.get('referenced_news_count', 0)
                
                # 분석 결과의 핵심 부분만 추출 (첫 500자)
                analysis_text = analysis.get('analysis_content', '')
                analysis_snippet = analysis_text[:500] + "..." if len(analysis_text) > 500 else analysis_text
                
                summary_parts.append(f"""
분석 #{i} ({created_date}):
- 당시 주가: ${price if price else 'N/A'}
- 참조 뉴스: {news_count}개
- 핵심 분석: {analysis_snippet}
""")
            
            return "\n".join(summary_parts)
            
        except Exception as e:
            print(f"[ERROR] Supabase AI 요약 생성 오류: {str(e)}")
            return None

    async def cleanup_old_analyses(self, days_to_keep: int = 180):
        """오래된 분석 데이터 정리 (6개월 이상)"""
        try:
            cutoff_date = (datetime.now() - timedelta(days=days_to_keep)).isoformat()
            
            result = self.supabase.table(self.table_name).delete().lt(
                "created_at", cutoff_date
            ).eq("is_active", False).execute()
            
            deleted_count = len(result.data) if result.data else 0
            return deleted_count
            
        except Exception as e:
            print(f"[ERROR] Supabase 오래된 데이터 정리 오류: {str(e)}")
            return 0