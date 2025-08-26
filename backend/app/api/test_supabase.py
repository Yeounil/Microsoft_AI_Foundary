from fastapi import APIRouter, HTTPException
from app.db.supabase_client import get_supabase
from app.core.config import settings
import json

router = APIRouter()

@router.get("/connection")
async def test_supabase_connection():
    """Supabase 연결 테스트"""
    try:
        # 환경 변수 확인
        config_info = {
            "supabase_url_set": bool(settings.supabase_url),
            "supabase_key_set": bool(settings.supabase_key),
            "supabase_url": settings.supabase_url[:50] + "..." if settings.supabase_url else None,
            "supabase_key": settings.supabase_key[:20] + "..." if settings.supabase_key else None
        }
        
        if not settings.supabase_url or not settings.supabase_key:
            return {
                "status": "error",
                "message": "Supabase 환경 변수가 설정되지 않았습니다",
                "config": config_info
            }
        
        # Supabase 클라이언트 생성 테스트
        supabase = get_supabase()
        
        # 간단한 쿼리 테스트 (존재하지 않는 테이블이라도 연결은 확인 가능)
        try:
            result = supabase.table("test_connection").select("*").limit(1).execute()
            connection_status = "connected"
            connection_message = "Supabase 연결 성공!"
        except Exception as query_error:
            # 연결은 되었지만 테이블이 없거나 권한 문제
            if "relation" in str(query_error).lower() or "does not exist" in str(query_error).lower():
                connection_status = "connected_no_tables"
                connection_message = "Supabase 연결 성공! (테이블 생성 필요)"
            elif "permission" in str(query_error).lower() or "denied" in str(query_error).lower():
                connection_status = "connected_permission_issue"
                connection_message = "Supabase 연결 성공! (권한 확인 필요)"
            else:
                connection_status = "connection_error"
                connection_message = f"연결 오류: {str(query_error)}"
        
        return {
            "status": connection_status,
            "message": connection_message,
            "config": config_info,
            "timestamp": "2024-01-01T00:00:00Z"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Supabase 연결 실패: {str(e)}",
            "config": config_info if 'config_info' in locals() else {},
            "error_type": type(e).__name__
        }

@router.get("/tables")
async def check_supabase_tables():
    """Supabase 테이블 존재 확인"""
    try:
        supabase = get_supabase()
        
        # 확인할 테이블 목록
        required_tables = [
            "auth_users",
            "user_profiles", 
            "user_interests",
            "news_history",
            "search_history",
            "ai_analysis_history",
            "user_favorites"
        ]
        
        table_status = {}
        
        for table in required_tables:
            try:
                result = supabase.table(table).select("*").limit(1).execute()
                table_status[table] = {
                    "exists": True,
                    "accessible": True,
                    "message": "OK"
                }
            except Exception as e:
                error_msg = str(e).lower()
                if "relation" in error_msg or "does not exist" in error_msg:
                    table_status[table] = {
                        "exists": False,
                        "accessible": False,
                        "message": "테이블이 존재하지 않습니다"
                    }
                elif "permission" in error_msg or "denied" in error_msg:
                    table_status[table] = {
                        "exists": True,
                        "accessible": False,
                        "message": "권한이 없습니다"
                    }
                else:
                    table_status[table] = {
                        "exists": "unknown",
                        "accessible": False,
                        "message": f"오류: {str(e)}"
                    }
        
        # 요약 정보
        total_tables = len(required_tables)
        existing_tables = sum(1 for status in table_status.values() if status["exists"] == True)
        accessible_tables = sum(1 for status in table_status.values() if status["accessible"] == True)
        
        return {
            "status": "success",
            "summary": {
                "total_required": total_tables,
                "existing": existing_tables,
                "accessible": accessible_tables,
                "missing": total_tables - existing_tables if existing_tables != "unknown" else "unknown"
            },
            "tables": table_status,
            "recommendation": "supabase_schema.sql 파일을 실행하여 테이블을 생성하세요" if existing_tables < total_tables else "모든 테이블이 준비되었습니다!"
        }
        
    except Exception as e:
        return {
            "status": "error", 
            "message": f"테이블 확인 실패: {str(e)}",
            "error_type": type(e).__name__
        }

@router.post("/create-test-user")
async def create_test_user():
    """테스트 사용자 생성 (연결 테스트용)"""
    try:
        supabase = get_supabase()
        
        test_user_data = {
            "username": "test_user",
            "email": "test@example.com",
            "hashed_password": "test_password_hash"
        }
        
        result = supabase.table("auth_users").insert(test_user_data).execute()
        
        if result.data and len(result.data) > 0:
            return {
                "status": "success",
                "message": "테스트 사용자 생성 성공!",
                "user": result.data[0]
            }
        else:
            return {
                "status": "error",
                "message": "사용자 생성 실패",
                "result": str(result)
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"테스트 사용자 생성 실패: {str(e)}",
            "error_type": type(e).__name__,
            "suggestion": "auth_users 테이블이 존재하는지 확인하세요"
        }