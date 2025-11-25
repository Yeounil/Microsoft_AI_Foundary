"""
Server-Sent Events (SSE) 기반 실시간 알림 시스템
레포트 생성 완료 등의 이벤트를 클라이언트에게 실시간으로 전달
"""

from fastapi import APIRouter, Depends, Request, HTTPException, status, Cookie, Query
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import verify_token
from app.services.supabase_user_service import SupabaseUserService
from typing import Dict, Any, Set
import asyncio
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# 사용자별 연결된 클라이언트 관리
class NotificationManager:
    def __init__(self):
        # user_id -> set of asyncio.Queue
        self.connections: Dict[str, Set[asyncio.Queue]] = {}

    async def connect(self, user_id: str) -> asyncio.Queue:
        """새 클라이언트 연결"""
        if user_id not in self.connections:
            self.connections[user_id] = set()

        queue = asyncio.Queue()
        self.connections[user_id].add(queue)
        logger.info(f"[SSE] User {user_id} connected. Total connections: {len(self.connections[user_id])}")
        return queue

    def disconnect(self, user_id: str, queue: asyncio.Queue):
        """클라이언트 연결 해제"""
        if user_id in self.connections:
            self.connections[user_id].discard(queue)
            if not self.connections[user_id]:
                del self.connections[user_id]
            logger.info(f"[SSE] User {user_id} disconnected")

    async def send_notification(self, user_id: str, notification: Dict[str, Any]):
        """특정 사용자에게 알림 전송"""
        if user_id not in self.connections:
            logger.info(f"[SSE] No active connections for user {user_id}")
            return

        # 해당 사용자의 모든 연결에 알림 전송
        for queue in self.connections[user_id]:
            try:
                await queue.put(notification)
                logger.info(f"[SSE] Notification sent to user {user_id}: {notification.get('type')}")
            except Exception as e:
                logger.error(f"[SSE] Failed to send notification: {str(e)}")

# 전역 알림 관리자
notification_manager = NotificationManager()


async def event_generator(request: Request, user_id: str):
    """
    SSE 이벤트 생성기
    클라이언트에게 실시간으로 이벤트를 스트리밍
    """
    queue = await notification_manager.connect(user_id)

    try:
        # 연결 확인 메시지
        yield f"data: {json.dumps({'type': 'connected', 'message': 'SSE connection established'})}\n\n"

        while True:
            # 클라이언트 연결 종료 확인
            if await request.is_disconnected():
                logger.info(f"[SSE] Client disconnected: {user_id}")
                break

            try:
                # 새 알림 대기 (30초 타임아웃)
                notification = await asyncio.wait_for(queue.get(), timeout=30.0)

                # SSE 형식으로 전송
                yield f"data: {json.dumps(notification)}\n\n"

            except asyncio.TimeoutError:
                # Keep-alive: 주기적으로 heartbeat 전송
                yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"

    except asyncio.CancelledError:
        logger.info(f"[SSE] Connection cancelled: {user_id}")
    except Exception as e:
        logger.error(f"[SSE] Error in event generator: {str(e)}")
    finally:
        notification_manager.disconnect(user_id, queue)


async def get_current_user_from_token(
    request: Request,
    token: str = Query(None, description="Access token"),
) -> Dict[str, Any]:
    """Query parameter 또는 쿠키에서 JWT 토큰으로 현재 사용자 정보 추출 (SSE용)"""
    # 1. Query parameter에서 토큰 확인 (우선)
    access_token = token

    # 2. 쿠키에서 토큰 확인 (fallback)
    if not access_token:
        access_token = request.cookies.get("access_token")

    if not access_token:
        logger.error("[SSE AUTH] No access_token provided (query or cookie)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - no access_token provided",
        )

    try:
        username = verify_token(access_token)
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    user_service = SupabaseUserService()
    user = await user_service.get_user_by_username(username=username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


@router.get("/stream")
async def notification_stream(
    request: Request,
    token: str = Query(None, description="Access token"),
):
    """
    SSE 알림 스트림 엔드포인트

    클라이언트는 이 엔드포인트에 연결하여 실시간 알림을 받습니다.

    인증: Query parameter 또는 HttpOnly 쿠키로 access_token 전달

    사용법 (프론트엔드):
    ```javascript
    // 쿠키 기반 인증 (권장)
    const eventSource = new EventSource(
        `/api/v1/notifications/stream`,
        { withCredentials: true }
    );

    // 또는 토큰 기반 인증 (하위 호환)
    const token = localStorage.getItem('access_token');
    const eventSource = new EventSource(
        `/api/v1/notifications/stream?token=${token}`
    );

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Notification:', data);
    };
    ```

    알림 형식:
    {
        "type": "report_completed",
        "report_id": 123,
        "symbol": "AAPL",
        "message": "레포트 생성이 완료되었습니다"
    }
    """
    # 쿠키 또는 쿼리 파라미터에서 인증 수행
    current_user = await get_current_user_from_token(request, token)
    user_id = current_user["id"]

    return StreamingResponse(
        event_generator(request, user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Nginx buffering 비활성화
        }
    )


async def notify_report_completed(user_id: str, report_id: int, symbol: str):
    """
    레포트 생성 완료 알림 전송

    Args:
        user_id: 사용자 ID
        report_id: 생성된 레포트 ID
        symbol: 종목 심볼
    """
    notification = {
        "type": "report_completed",
        "report_id": report_id,
        "symbol": symbol,
        "message": f"{symbol} 레포트 생성이 완료되었습니다",
        "timestamp": asyncio.get_event_loop().time()
    }

    await notification_manager.send_notification(user_id, notification)


async def notify_report_failed(user_id: str, symbol: str, error: str):
    """
    레포트 생성 실패 알림 전송

    Args:
        user_id: 사용자 ID
        symbol: 종목 심볼
        error: 에러 메시지
    """
    notification = {
        "type": "report_failed",
        "symbol": symbol,
        "error": error,
        "message": f"{symbol} 레포트 생성에 실패했습니다",
        "timestamp": asyncio.get_event_loop().time()
    }

    await notification_manager.send_notification(user_id, notification)
