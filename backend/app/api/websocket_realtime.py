"""
실시간 WebSocket 엔드포인트
FMP WebSocket API를 통한 실시간 주가 데이터 스트리밍
"""

import logging
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status
from typing import List, Dict, Any, Set
from app.services.fmp_websocket_service import get_fmp_websocket_service, FMPWebSocketService

logger = logging.getLogger(__name__)

router = APIRouter()

# 연결된 클라이언트 관리
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.client_subscriptions: Dict[WebSocket, Set[str]] = {}

    async def connect(self, websocket: WebSocket):
        """클라이언트 연결"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.client_subscriptions[websocket] = set()
        logger.info(f"[CONNECT] Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """클라이언트 연결 해제"""
        self.active_connections.remove(websocket)
        if websocket in self.client_subscriptions:
            del self.client_subscriptions[websocket]
        logger.info(f"[DISCONNECT] Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, data: Dict[str, Any]):
        """모든 연결된 클라이언트에게 데이터 전송"""
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception as e:
                logger.error(f"[ERROR] Failed to send data to client: {str(e)}")

    async def send_to_subscriber(self, websocket: WebSocket, data: Dict[str, Any], symbol: str):
        """구독한 심볼의 데이터만 전송"""
        if symbol in self.client_subscriptions.get(websocket, set()):
            try:
                await websocket.send_json(data)
            except Exception as e:
                logger.error(f"[ERROR] Failed to send data to client: {str(e)}")

    def get_client_subscriptions(self, websocket: WebSocket) -> Set[str]:
        """클라이언트의 구독 심볼 조회"""
        return self.client_subscriptions.get(websocket, set())

    def add_subscription(self, websocket: WebSocket, symbols: List[str]):
        """클라이언트의 구독 심볼 추가"""
        if websocket in self.client_subscriptions:
            self.client_subscriptions[websocket].update(s.upper() for s in symbols)

    def remove_subscription(self, websocket: WebSocket, symbols: List[str]):
        """클라이언트의 구독 심볼 제거"""
        if websocket in self.client_subscriptions:
            self.client_subscriptions[websocket].difference_update(s.upper() for s in symbols)


# 연결 관리자 인스턴스
manager = ConnectionManager()

# FMP WebSocket 서비스에서 모든 클라이언트로 데이터 브로드캐스트하는 콜백
async def broadcast_to_clients(data: Dict[str, Any]):
    """
    FMP WebSocket에서 수신한 데이터를 연결된 클라이언트에게 전송
    """
    symbol = data.get("s", "").upper()

    # 파싱된 데이터 형식으로 변환
    parsed_data = {
        "type": "price_update",
        "symbol": symbol,
        "timestamp": data.get("t"),
        "data_type": data.get("type"),  # 'T', 'Q', 'B'
        "last_price": data.get("lp"),
        "last_size": data.get("ls"),
        "ask_price": data.get("ap"),
        "ask_size": data.get("as"),
        "bid_price": data.get("bp"),
        "bid_size": data.get("bs"),
        "cached_at": data.get("cached_at")
    }

    # 각 클라이언트에게 구독한 심볼의 데이터만 전송
    for connection in manager.active_connections:
        await manager.send_to_subscriber(connection, parsed_data, symbol)


# REST API 엔드포인트
@router.get("/health", tags=["websocket"])
async def health_check() -> Dict[str, Any]:
    """
    WebSocket 서비스 상태 확인
    """
    fmp_ws = get_fmp_websocket_service()
    return await fmp_ws.health_check()


@router.get("/status", tags=["websocket"])
async def get_status() -> Dict[str, Any]:
    """
    현재 WebSocket 연결 상태 및 구독 정보 조회
    """
    fmp_ws = get_fmp_websocket_service()

    return {
        "timestamp": json.dumps(dict(), default=str),
        "connection_status": {
            "is_connected": fmp_ws.is_connected,
            "is_running": fmp_ws.is_running,
            "subscribed_symbols": fmp_ws.get_subscribed_symbols(),
            "total_clients": len(manager.active_connections)
        },
        "cached_data": {
            "count": len(fmp_ws.data_cache),
            "symbols": list(fmp_ws.data_cache.keys())[:10]  # 최대 10개만 표시
        }
    }


@router.post("/subscribe", tags=["websocket"])
async def subscribe_symbols(symbols: List[str]) -> Dict[str, Any]:
    """
    심볼 구독 (REST API)

    Args:
        symbols: 구독할 종목 심볼 리스트

    Returns:
        구독 결과
    """
    if not symbols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Symbol list cannot be empty"
        )

    if len(symbols) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 50 symbols per subscription"
        )

    fmp_ws = get_fmp_websocket_service()

    # WebSocket 연결 없으면 먼저 연결
    if not fmp_ws.is_connected:
        logger.info("[SUBSCRIBE] WebSocket not connected. Attempting to connect...")
        if not await fmp_ws.connect():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to connect to FMP WebSocket"
            )

    # 심볼 구독
    success = await fmp_ws.subscribe(symbols)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to subscribe to symbols"
        )

    return {
        "status": "success",
        "message": f"Subscribed to {len(symbols)} symbols",
        "symbols": [s.upper() for s in symbols],
        "subscribed_total": len(fmp_ws.get_subscribed_symbols())
    }


@router.post("/unsubscribe", tags=["websocket"])
async def unsubscribe_symbols(symbols: List[str]) -> Dict[str, Any]:
    """
    심볼 구독 해제 (REST API)

    Args:
        symbols: 구독 해제할 종목 심볼 리스트

    Returns:
        구독 해제 결과
    """
    if not symbols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Symbol list cannot be empty"
        )

    fmp_ws = get_fmp_websocket_service()

    if not fmp_ws.is_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="WebSocket not connected"
        )

    success = await fmp_ws.unsubscribe(symbols)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unsubscribe from symbols"
        )

    return {
        "status": "success",
        "message": f"Unsubscribed from {len(symbols)} symbols",
        "symbols": [s.upper() for s in symbols],
        "subscribed_total": len(fmp_ws.get_subscribed_symbols())
    }


@router.get("/cache/{symbol}", tags=["websocket"])
async def get_cached_price(symbol: str) -> Dict[str, Any]:
    """
    특정 심볼의 캐시된 실시간 데이터 조회

    Args:
        symbol: 종목 심볼

    Returns:
        캐시된 실시간 데이터
    """
    fmp_ws = get_fmp_websocket_service()
    cached = fmp_ws.get_cached_data(symbol)

    if not cached:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No cached data for symbol {symbol.upper()}"
        )

    return {
        "symbol": symbol.upper(),
        "data": FMPWebSocketService.parse_price_data(cached)
    }


@router.get("/cache", tags=["websocket"])
async def get_all_cached_prices(limit: int = 50) -> Dict[str, Any]:
    """
    모든 캐시된 실시간 데이터 조회

    Args:
        limit: 반환할 최대 심볼 개수

    Returns:
        캐시된 모든 데이터
    """
    fmp_ws = get_fmp_websocket_service()
    all_cache = fmp_ws.get_all_cached_data()

    # 제한 적용
    limited_cache = dict(list(all_cache.items())[:limit])

    return {
        "total": len(all_cache),
        "returned": len(limited_cache),
        "limit": limit,
        "data": {
            symbol: FMPWebSocketService.parse_price_data(data)
            for symbol, data in limited_cache.items()
        }
    }


# WebSocket 엔드포인트
@router.websocket("/ws/prices")
async def websocket_endpoint(websocket: WebSocket):
    """
    실시간 주가 WebSocket 엔드포인트

    클라이언트 메시지 포맷:
    {
        "action": "subscribe",
        "symbols": ["AAPL", "MSFT", "TSLA"]
    }

    또는:
    {
        "action": "unsubscribe",
        "symbols": ["AAPL"]
    }

    서버 응답 포맷:
    {
        "type": "price_update",
        "symbol": "AAPL",
        "timestamp": 1234567890,
        "last_price": 150.25,
        "last_size": 1000,
        ...
    }
    """
    await manager.connect(websocket)

    try:
        # FMP WebSocket 서비스 초기화 (첫 연결 시)
        fmp_ws = get_fmp_websocket_service()

        if not fmp_ws.is_connected:
            logger.info("[WS] First client connected. Initializing FMP WebSocket...")
            if not await fmp_ws.connect():
                await websocket.send_json({
                    "type": "error",
                    "message": "Failed to connect to FMP WebSocket"
                })
                await websocket.close(code=1011)  # 1011 = Server Error
                return

        # 콜백 등록 (한 번만)
        if not fmp_ws.callbacks or broadcast_to_clients not in fmp_ws.callbacks:
            fmp_ws.register_callback(broadcast_to_clients)

        # 백그라운드 리스너 시작 (첫 연결 시)
        if not fmp_ws.is_running:
            logger.info("[WS] Starting background listener...")
            asyncio.create_task(fmp_ws.start_listening())

        # 연결 확인 메시지
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to real-time price stream"
        })

        # 클라이언트 메시지 수신
        while True:
            message = await websocket.receive_json()

            action = message.get("action")
            symbols = message.get("symbols", [])

            if action == "subscribe":
                if not symbols:
                    await websocket.send_json({
                        "type": "error",
                        "message": "symbols field is required"
                    })
                    continue

                # FMP에 구독 추가
                await fmp_ws.subscribe(symbols)
                manager.add_subscription(websocket, symbols)

                await websocket.send_json({
                    "type": "subscription",
                    "action": "subscribed",
                    "symbols": [s.upper() for s in symbols],
                    "subscribed_total": len(manager.get_client_subscriptions(websocket))
                })

                logger.info(f"[WS] Client subscribed to: {symbols}")

            elif action == "unsubscribe":
                if not symbols:
                    await websocket.send_json({
                        "type": "error",
                        "message": "symbols field is required"
                    })
                    continue

                # FMP에서 구독 해제
                await fmp_ws.unsubscribe(symbols)
                manager.remove_subscription(websocket, symbols)

                await websocket.send_json({
                    "type": "subscription",
                    "action": "unsubscribed",
                    "symbols": [s.upper() for s in symbols],
                    "subscribed_total": len(manager.get_client_subscriptions(websocket))
                })

                logger.info(f"[WS] Client unsubscribed from: {symbols}")

            elif action == "ping":
                # 연결 유지용 핑
                await websocket.send_json({
                    "type": "pong"
                })

            elif action == "get_subscriptions":
                # 현재 구독 정보 조회
                subs = manager.get_client_subscriptions(websocket)
                await websocket.send_json({
                    "type": "subscriptions",
                    "symbols": list(subs)
                })

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown action: {action}"
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("[WS] Client disconnected")

    except Exception as e:
        logger.error(f"[ERROR] WebSocket error: {str(e)}")
        manager.disconnect(websocket)


# 백그라운드 작업 관리
import asyncio


@router.on_event("startup")
async def startup_event():
    """
    애플리케이션 시작 시 실행
    """
    logger.info("[STARTUP] WebSocket service initialized")


@router.on_event("shutdown")
async def shutdown_event():
    """
    애플리케이션 종료 시 실행
    """
    logger.info("[SHUTDOWN] Disconnecting FMP WebSocket...")

    fmp_ws = get_fmp_websocket_service()
    await fmp_ws.disconnect()

    logger.info("[SHUTDOWN] WebSocket service stopped")
