#!/usr/bin/env python3
"""
SQLite user_interests 데이터를 Supabase로 마이그레이션하는 스크립트

SQLite 구조: {id, user_id, symbol, market, company_name, priority, created_at, is_active}
Supabase 구조: {id, user_id, interest}

변환 규칙:
- SQLite의 symbol을 Supabase의 interest 필드로 매핑
- 활성 상태인 관심사만 마이그레이션 (is_active = 1)
- user_id는 문자열로 변환 (Supabase auth_users 테이블과 호환)
"""

import sqlite3
import os
import sys
from supabase import create_client, Client
from typing import List, Dict, Any
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class UserInterestMigrator:
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
    
    def extract_sqlite_data(self) -> List[Dict[str, Any]]:
        """SQLite에서 user_interests 데이터 추출"""
        logger.info("SQLite에서 user_interests 데이터 추출 중...")
        
        # 절대 경로로 변경
        if not os.path.exists(self.sqlite_db_path):
            # 현재 디렉토리에서 찾기
            if os.path.exists("finance_ai.db"):
                self.sqlite_db_path = "finance_ai.db"
            else:
                raise FileNotFoundError("SQLite 데이터베이스 파일을 찾을 수 없습니다")
        
        conn = sqlite3.connect(self.sqlite_db_path)
        cursor = conn.cursor()
        
        try:
            # 활성 상태인 관심사만 조회
            cursor.execute("""
                SELECT user_id, symbol, market, company_name, priority, created_at
                FROM user_interests 
                WHERE is_active = 1
                ORDER BY user_id, priority, created_at
            """)
            
            rows = cursor.fetchall()
            logger.info(f"SQLite에서 {len(rows)}개의 활성 관심사 발견")
            
            # 데이터 변환
            interests = []
            for row in rows:
                user_id, symbol, market, company_name, priority, created_at = row
                
                # user_id를 문자열로 변환하고 매핑 (Supabase 호환성)
                # SQLite user_id = 1 (temp_user)을 첫 번째 Supabase 사용자로 매핑
                mapped_user_id = str(user_id) if user_id != 1 else None
                
                interests.append({
                    'user_id': mapped_user_id,
                    'interest': symbol,       # symbol을 interest로 매핑
                    'original_sqlite_user_id': user_id,  # 원본 user_id 보존
                    'original_data': {
                        'market': market,
                        'company_name': company_name,
                        'priority': priority,
                        'created_at': created_at
                    }
                })
            
            return interests
            
        except Exception as e:
            logger.error(f"SQLite 데이터 추출 중 오류: {str(e)}")
            raise
        finally:
            conn.close()
    
    def check_existing_data(self) -> List[Dict[str, Any]]:
        """Supabase에 이미 존재하는 user_interests 데이터 확인"""
        logger.info("Supabase의 기존 user_interests 데이터 확인 중...")
        
        try:
            result = self.supabase.table("user_interests").select("*").execute()
            existing_count = len(result.data) if result.data else 0
            logger.info(f"Supabase에 {existing_count}개의 기존 관심사 발견")
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"기존 데이터 확인 중 오류: {str(e)}")
            return []
    
    def check_auth_users(self) -> List[Dict[str, Any]]:
        """Supabase auth_users 테이블 확인"""
        logger.info("Supabase auth_users 테이블 확인 중...")
        
        try:
            result = self.supabase.table("auth_users").select("*").execute()
            users_count = len(result.data) if result.data else 0
            logger.info(f"Supabase에 {users_count}개의 사용자 발견")
            
            if result.data:
                for user in result.data:
                    logger.info(f"사용자: {user.get('id')} - {user.get('username')}")
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"auth_users 확인 중 오류: {str(e)}")
            return []
    
    def migrate_to_supabase(self, interests: List[Dict[str, Any]], force: bool = False) -> bool:
        """Supabase user_interests 테이블로 데이터 마이그레이션"""
        logger.info("Supabase로 데이터 마이그레이션 시작...")
        
        if not interests:
            logger.warning("마이그레이션할 데이터가 없습니다")
            return True
        
        # 기존 데이터 확인
        existing_data = self.check_existing_data()
        if existing_data and not force:
            logger.warning("Supabase에 이미 user_interests 데이터가 존재합니다")
            logger.warning("기존 데이터를 덮어쓰려면 --force 옵션을 사용하세요")
            return False
        
        # 기존 데이터 삭제 (force 모드)
        if existing_data and force:
            logger.info("기존 데이터 삭제 중...")
            try:
                # 모든 기존 데이터 삭제
                delete_result = self.supabase.table("user_interests").delete().neq("id", 0).execute()
                logger.info(f"{len(existing_data)}개의 기존 레코드 삭제 완료")
            except Exception as e:
                logger.error(f"기존 데이터 삭제 중 오류: {str(e)}")
                return False
        
        # 새 데이터 삽입
        try:
            # Supabase용 데이터 준비 (original_data 제거)
            supabase_data = []
            for interest in interests:
                supabase_data.append({
                    'user_id': interest['user_id'],
                    'interest': interest['interest']
                })
            
            # 배치로 삽입
            batch_size = 100
            total_inserted = 0
            
            for i in range(0, len(supabase_data), batch_size):
                batch = supabase_data[i:i + batch_size]
                result = self.supabase.table("user_interests").insert(batch).execute()
                
                if result.data:
                    inserted_count = len(result.data)
                    total_inserted += inserted_count
                    logger.info(f"배치 {i//batch_size + 1}: {inserted_count}개 레코드 삽입 완료")
                else:
                    logger.error(f"배치 {i//batch_size + 1} 삽입 실패")
                    return False
            
            logger.info(f"총 {total_inserted}개의 관심사 마이그레이션 완료")
            return True
            
        except Exception as e:
            logger.error(f"Supabase 삽입 중 오류: {str(e)}")
            return False
    
    def verify_migration(self) -> bool:
        """마이그레이션 결과 검증"""
        logger.info("마이그레이션 결과 검증 중...")
        
        try:
            # SQLite 원본 데이터 개수
            conn = sqlite3.connect(self.sqlite_db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM user_interests WHERE is_active = 1")
            sqlite_count = cursor.fetchone()[0]
            conn.close()
            
            # Supabase 마이그레이션된 데이터 개수  
            result = self.supabase.table("user_interests").select("id").execute()
            supabase_count = len(result.data) if result.data else 0
            
            logger.info(f"SQLite 원본: {sqlite_count}개")
            logger.info(f"Supabase 마이그레이션: {supabase_count}개")
            
            if sqlite_count == supabase_count:
                logger.info("✅ 마이그레이션 검증 성공!")
                return True
            else:
                logger.error("❌ 마이그레이션 검증 실패: 데이터 개수 불일치")
                return False
                
        except Exception as e:
            logger.error(f"검증 중 오류: {str(e)}")
            return False
    
    def run_migration(self, force: bool = False) -> bool:
        """전체 마이그레이션 실행"""
        try:
            # 0. Supabase auth_users 테이블 확인
            auth_users = self.check_auth_users()
            
            # 1. SQLite에서 데이터 추출
            interests = self.extract_sqlite_data()
            
            if not interests:
                logger.info("마이그레이션할 데이터가 없습니다")
                return True
            
            # auth_users가 없는 경우 경고 메시지
            if not auth_users:
                logger.warning("⚠️  Supabase auth_users 테이블이 비어있습니다.")
                logger.warning("user_interests를 마이그레이션하려면 먼저 사용자 데이터가 필요합니다.")
                logger.warning("SQLite users 테이블에서 auth_users로 사용자 데이터를 마이그레이션해야 합니다.")
                return False
            
            # user_id 매핑 및 처리
            auth_user_ids = [user['id'] for user in auth_users]
            first_user_id = auth_user_ids[0] if auth_user_ids else None
            
            # temp_user (SQLite user_id=1)를 첫 번째 Supabase 사용자로 매핑
            mapped_interests = []
            for interest in interests:
                if interest['user_id'] is None:  # temp_user (original SQLite user_id = 1)
                    if first_user_id:
                        interest['user_id'] = first_user_id
                        logger.info(f"SQLite user_id=1 (temp_user)를 Supabase user {first_user_id}로 매핑")
                    else:
                        logger.error("Supabase에 사용자가 없어 매핑할 수 없습니다")
                        return False
                mapped_interests.append(interest)
            
            # 매핑 후 누락된 사용자 확인
            sqlite_user_ids = list(set([interest['user_id'] for interest in mapped_interests]))
            missing_users = [uid for uid in sqlite_user_ids if uid not in auth_user_ids]
            if missing_users:
                logger.error(f"❌ 다음 user_id들이 auth_users 테이블에 없습니다: {missing_users}")
                logger.error("먼저 해당 사용자들을 auth_users 테이블에 추가해야 합니다.")
                return False
            
            interests = mapped_interests
            
            # 2. Supabase로 마이그레이션
            if not self.migrate_to_supabase(interests, force):
                return False
            
            # 3. 결과 검증
            if not self.verify_migration():
                return False
            
            logger.info("🎉 user_interests 마이그레이션이 성공적으로 완료되었습니다!")
            return True
            
        except Exception as e:
            logger.error(f"마이그레이션 중 오류 발생: {str(e)}")
            return False

def main():
    """메인 실행 함수"""
    force = "--force" in sys.argv or "-f" in sys.argv
    
    if force:
        logger.info("⚠️  Force 모드: 기존 Supabase 데이터를 덮어씁니다")
    
    migrator = UserInterestMigrator()
    
    success = migrator.run_migration(force=force)
    
    if success:
        logger.info("마이그레이션 완료!")
        sys.exit(0)
    else:
        logger.error("마이그레이션 실패!")
        sys.exit(1)

if __name__ == "__main__":
    main()