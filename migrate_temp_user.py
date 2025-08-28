#!/usr/bin/env python3
"""
SQLite의 temp_user를 Supabase auth_users에 추가하는 스크립트
"""

import sqlite3
import os
import sys
from supabase import create_client, Client
from typing import Dict, Any, Optional
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TempUserMigrator:
    def __init__(self):
        # Supabase 설정
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL과 SUPABASE_KEY 환경변수가 필요합니다")
            
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        # SQLite 파일 경로 찾기
        if os.path.exists("finance_ai.db"):
            self.sqlite_db_path = "finance_ai.db"
        elif os.path.exists("backend/finance_ai.db"):
            self.sqlite_db_path = "backend/finance_ai.db"
        else:
            raise FileNotFoundError("finance_ai.db 파일을 찾을 수 없습니다")
    
    def get_temp_user_from_sqlite(self) -> Optional[Dict[str, Any]]:
        """SQLite에서 temp_user 정보 조회"""
        logger.info("SQLite에서 temp_user 정보 조회 중...")
        
        conn = sqlite3.connect(self.sqlite_db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("SELECT id, username, email, hashed_password, is_active, created_at, updated_at FROM users WHERE id = 1")
            row = cursor.fetchone()
            
            if row:
                user_id, username, email, hashed_password, is_active, created_at, updated_at = row
                logger.info(f"SQLite에서 사용자 발견: {username} ({email})")
                return {
                    'id': str(user_id),  # UUID 대신 문자열 형태로
                    'username': username,
                    'email': email,
                    'hashed_password': hashed_password
                }
            return None
            
        except Exception as e:
            logger.error(f"SQLite 조회 중 오류: {str(e)}")
            return None
        finally:
            conn.close()
    
    def create_temp_user_in_supabase(self, user_data: Dict[str, Any]) -> bool:
        """Supabase auth_users에 temp_user 추가"""
        logger.info(f"Supabase에 사용자 '{user_data['username']}' 추가 중...")
        
        try:
            # 기존 사용자 체크
            existing = self.supabase.table("auth_users").select("*").eq("username", user_data['username']).execute()
            if existing.data:
                logger.warning(f"사용자 '{user_data['username']}'가 이미 존재합니다.")
                return True
            
            # 새 사용자 추가 (id 필드 제거 - Supabase가 자동 생성)
            insert_data = {
                'username': user_data['username'],
                'email': user_data['email'],  
                'hashed_password': user_data['hashed_password']
            }
            
            result = self.supabase.table("auth_users").insert(insert_data).execute()
            
            if result.data and len(result.data) > 0:
                new_user = result.data[0]
                logger.info(f"✅ 사용자 생성 완료: {new_user['username']} (ID: {new_user['id']})")
                return True
            else:
                logger.error("사용자 생성 실패")
                return False
                
        except Exception as e:
            logger.error(f"Supabase 사용자 생성 중 오류: {str(e)}")
            return False
    
    def run_migration(self) -> bool:
        """temp_user 마이그레이션 실행"""
        try:
            # SQLite에서 temp_user 조회
            temp_user = self.get_temp_user_from_sqlite()
            
            if not temp_user:
                logger.error("SQLite에서 temp_user(id=1)를 찾을 수 없습니다.")
                return False
            
            # Supabase에 추가
            success = self.create_temp_user_in_supabase(temp_user)
            
            if success:
                logger.info("🎉 temp_user 마이그레이션이 완료되었습니다!")
                logger.info("이제 user_interests 마이그레이션을 다시 실행할 수 있습니다.")
            
            return success
            
        except Exception as e:
            logger.error(f"마이그레이션 중 오류: {str(e)}")
            return False

def main():
    """메인 함수"""
    migrator = TempUserMigrator()
    success = migrator.run_migration()
    
    if success:
        logger.info("temp_user 마이그레이션 완료!")
        sys.exit(0)
    else:
        logger.error("temp_user 마이그레이션 실패!")
        sys.exit(1)

if __name__ == "__main__":
    main()