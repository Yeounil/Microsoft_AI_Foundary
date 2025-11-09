"""
FMP (Financial Modeling Prep) WebSocket 실시간 데이터 서비스
실시간 주가, 호가, 거래 데이터를 WebSocket으로 수신
"""

import asyncio
import logging
import json
from typing import Dict, List, Optional, Callable, Set
from datetime import datetime
import websockets
from websockets.client import WebSocketClientProtocol
from app.core.config import settings

logger = logging.getLogger(__name__)


class FMPWebSocketService:
    """
    FMP WebSocket API를 통한 실시간 주가 데이터 수신
    - 단일 또는 복수 심볼 구독
    - 자동 재연결
    - 데이터 캐싱
    - 콜백 기반 데이터 전달
    """

    # FMP WebSocket 엔드포인트
    WS_URL = "wss://websockets.financialmodelingprep.com"

    def __init__(self):
        """FMP WebSocket 서비스 초기화"""
        self.api_key = settings.fmp_api_key if hasattr(settings, 'fmp_api_key') else None

        if not self.api_key:
            logger.warning("[WARN] FMP API Key not configured. WebSocket will not connect.")

        self.ws: Optional[WebSocketClientProtocol] = None
        self.is_connected = False
        self.is_running = False
        self.subscribed_symbols: Set[str] = set()

        # 데이터 캐시 (가장 최신 데이터)
        self.data_cache: Dict[str, Dict] = {}

        # 콜백 함수들
        self.callbacks: List[Callable] = []

        # 재연결 설정
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.reconnect_delay = 2  # 초

        logger.info("[INIT] FMP WebSocket Service initialized")

    async def connect(self) -> bool:
        """
        FMP WebSocket에 연결

        Returns:
            연결 성공 여부
        """
        if not self.api_key:
            logger.error("[ERROR] Cannot connect: FMP API Key is not configured")
            return False

        try:
            logger.info(f"[CONNECT] Connecting to FMP WebSocket: {self.WS_URL}")

            self.ws = await websockets.connect(self.WS_URL)
            self.is_connected = True
            self.reconnect_attempts = 0

            logger.info("[OK] FMP WebSocket connected successfully")

            # 로그인
            login_success = await self._login()
            if not login_success:
                await self.disconnect()
                return False

            return True

        except Exception as e:
            logger.error(f"[ERROR] Failed to connect to FMP WebSocket: {str(e)}")
            self.is_connected = False
            return False

    async def _login(self) -> bool:
        """
        WebSocket에 로그인

        Returns:
            로그인 성공 여부
        """
        try:
            login_message = {
                "event": "login",
                "data": {
                    "apiKey": self.api_key
                }
            }

            logger.info("[AUTH] Sending login message...")
            await self.ws.send(json.dumps(login_message))

            # 로그인 응답 대기 (타임아웃 10초)
            try:
                response = await asyncio.wait_for(
                    self.ws.recv(),
                    timeout=10.0
                )
                response_data = json.loads(response)

                logger.info(f"[AUTH] Login response: {response_data}")

                # 성공 응답 확인 (status: 200, success, Authenticated 등)
                status_code = response_data.get("status")
                event_type = response_data.get("event")
                message = response_data.get("message", "").lower()

                # status가 200 또는 "success", 또는 "Authenticated" 메시지 포함시 성공
                if (status_code == 200 or
                    status_code == "success" or
                    "authenticated" in message or
                    "success" in message or
                    event_type == "login"):
                    logger.info("[OK] Login successful")
                    return True
                else:
                    logger.error(f"[ERROR] Login failed: {response_data}")
                    return False

            except asyncio.TimeoutError:
                logger.warning("[WARN] Login response timeout - proceeding anyway")
                return True

        except Exception as e:
            logger.error(f"[ERROR] Login failed: {str(e)}")
            return False

    async def subscribe(self, symbols: List[str]) -> bool:
        """
        심볼 구독

        Args:
            symbols: 구독할 종목 심볼 리스트 (예: ["AAPL", "MSFT"])

        Returns:
            구독 성공 여부
        """
        if not self.is_connected or not self.ws:
            logger.error("[ERROR] WebSocket not connected. Cannot subscribe.")
            return False

        try:
            # 심볼 정규화 (대문자)
            normalized_symbols = [s.upper() for s in symbols]

            logger.info(f"[SUBSCRIBE] Subscribing to symbols: {normalized_symbols}")

            subscribe_message = {
                "event": "subscribe",
                "data": {
                    "ticker": normalized_symbols if len(normalized_symbols) > 1 else normalized_symbols[0]
                }
            }

            await self.ws.send(json.dumps(subscribe_message))

            # 구독 목록 업데이트
            self.subscribed_symbols.update(normalized_symbols)

            logger.info(f"[OK] Subscribed to {len(normalized_symbols)} symbols")
            return True

        except Exception as e:
            logger.error(f"[ERROR] Failed to subscribe: {str(e)}")
            return False

    async def unsubscribe(self, symbols: List[str]) -> bool:
        """
        심볼 구독 해제

        Args:
            symbols: 구독 해제할 종목 심볼 리스트

        Returns:
            구독 해제 성공 여부
        """
        if not self.is_connected or not self.ws:
            logger.error("[ERROR] WebSocket not connected. Cannot unsubscribe.")
            return False

        try:
            normalized_symbols = [s.upper() for s in symbols]

            logger.info(f"[UNSUBSCRIBE] Unsubscribing from symbols: {normalized_symbols}")

            unsubscribe_message = {
                "event": "unsubscribe",
                "data": {
                    "ticker": normalized_symbols
                }
            }

            await self.ws.send(json.dumps(unsubscribe_message))

            # 구독 목록 제거
            self.subscribed_symbols.difference_update(normalized_symbols)

            logger.info(f"[OK] Unsubscribed from {len(normalized_symbols)} symbols")
            return True

        except Exception as e:
            logger.error(f"[ERROR] Failed to unsubscribe: {str(e)}")
            return False

    async def start_listening(self):
        """
        WebSocket 메시지 수신 시작 (백그라운드 작업)
        """
        self.is_running = True

        try:
            logger.info("[START] Starting WebSocket listener...")

            while self.is_running:
                try:
                    if not self.is_connected or not self.ws:
                        logger.warning("[WARN] WebSocket connection lost. Attempting to reconnect...")
                        await self._reconnect()
                        continue

                    # 메시지 수신 (타임아웃 30초)
                    message = await asyncio.wait_for(
                        self.ws.recv(),
                        timeout=30.0
                    )

                    # 메시지 처리
                    await self._handle_message(message)

                except asyncio.TimeoutError:
                    logger.debug("[DEBUG] No message received (timeout)")
                    continue

                except websockets.exceptions.ConnectionClosed:
                    logger.warning("[WARN] WebSocket connection closed")
                    self.is_connected = False
                    if self.is_running:
                        await self._reconnect()

                except Exception as e:
                    logger.error(f"[ERROR] Error receiving message: {str(e)}")
                    if self.is_running:
                        await asyncio.sleep(1)

        except Exception as e:
            logger.error(f"[ERROR] Listener error: {str(e)}")
        finally:
            self.is_running = False
            logger.info("[STOP] WebSocket listener stopped")

    async def _handle_message(self, message: str):
        """
        수신한 메시지 처리

        Args:
            message: JSON 형식의 메시지
        """
        try:
            data = json.loads(message)

            # 메시지 타입별 처리
            if isinstance(data, dict):
                if "s" in data:
                    # 실시간 가격 데이터
                    symbol = data.get("s", "").upper()

                    # 캐시에 저장
                    self.data_cache[symbol] = {
                        **data,
                        "cached_at": datetime.now().isoformat()
                    }

                    # 콜백 실행
                    await self._trigger_callbacks(data)

                elif "event" in data:
                    # 이벤트 메시지 (로그인 응답 등)
                    logger.info(f"[EVENT] {data.get('event')}: {data}")

            elif isinstance(data, list):
                # 배치 데이터
                for item in data:
                    if isinstance(item, dict) and "s" in item:
                        symbol = item.get("s", "").upper()
                        self.data_cache[symbol] = {
                            **item,
                            "cached_at": datetime.now().isoformat()
                        }
                        await self._trigger_callbacks(item)

        except json.JSONDecodeError as e:
            logger.warning(f"[WARN] Failed to decode message: {str(e)}")
        except Exception as e:
            logger.error(f"[ERROR] Error handling message: {str(e)}")

    async def _trigger_callbacks(self, data: Dict):
        """
        등록된 콜백 함수 실행

        Args:
            data: 실시간 데이터
        """
        for callback in self.callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(data)
                else:
                    callback(data)
            except Exception as e:
                logger.error(f"[ERROR] Callback error: {str(e)}")

    async def _reconnect(self):
        """
        자동 재연결
        """
        if self.reconnect_attempts >= self.max_reconnect_attempts:
            logger.error("[ERROR] Max reconnection attempts reached. Giving up.")
            self.is_running = False
            return

        self.reconnect_attempts += 1
        wait_time = self.reconnect_delay * (2 ** (self.reconnect_attempts - 1))  # 지수 백오프

        logger.info(f"[RECONNECT] Attempt {self.reconnect_attempts}/{self.max_reconnect_attempts} "
                   f"(waiting {wait_time}s)...")

        await asyncio.sleep(wait_time)

        if await self.connect():
            # 이전 구독 항목 다시 구독
            if self.subscribed_symbols:
                logger.info(f"[RECONNECT] Re-subscribing to {len(self.subscribed_symbols)} symbols...")
                await self.subscribe(list(self.subscribed_symbols))
        else:
            # 재귀적으로 재연결 시도
            if self.is_running:
                await self._reconnect()

    async def disconnect(self):
        """
        WebSocket 연결 해제
        """
        logger.info("[DISCONNECT] Disconnecting from FMP WebSocket...")

        self.is_running = False
        self.is_connected = False

        try:
            if self.ws:
                await self.ws.close()
                logger.info("[OK] WebSocket closed")
        except Exception as e:
            logger.error(f"[ERROR] Error closing WebSocket: {str(e)}")

    def register_callback(self, callback: Callable):
        """
        데이터 수신 콜백 등록

        Args:
            callback: 실시간 데이터를 수신할 콜백 함수
                     함수 시그니처: async def callback(data: Dict) 또는 def callback(data: Dict)
        """
        self.callbacks.append(callback)
        logger.info(f"[CALLBACK] Registered callback: {callback.__name__}")

    def unregister_callback(self, callback: Callable):
        """
        콜백 등록 해제

        Args:
            callback: 제거할 콜백 함수
        """
        if callback in self.callbacks:
            self.callbacks.remove(callback)
            logger.info(f"[CALLBACK] Unregistered callback: {callback.__name__}")

    def get_cached_data(self, symbol: str) -> Optional[Dict]:
        """
        캐시된 데이터 조회

        Args:
            symbol: 종목 심볼

        Returns:
            캐시된 실시간 데이터 또는 None
        """
        return self.data_cache.get(symbol.upper())

    def get_all_cached_data(self) -> Dict[str, Dict]:
        """
        모든 캐시된 데이터 조회

        Returns:
            심볼별 캐시된 데이터 딕셔너리
        """
        return self.data_cache.copy()

    @staticmethod
    def parse_price_data(data: Dict) -> Dict:
        """
        실시간 데이터 파싱

        Args:
            data: FMP WebSocket 응답 데이터

        Returns:
            파싱된 데이터
        """
        return {
            "symbol": data.get("s", "").upper(),
            "timestamp": data.get("t"),
            "type": data.get("type"),  # 'T'(거래), 'Q'(호가), 'B'(취소)

            # 거래 데이터
            "last_price": data.get("lp"),
            "last_size": data.get("ls"),

            # 호가 데이터
            "ask_price": data.get("ap"),
            "ask_size": data.get("as"),
            "bid_price": data.get("bp"),
            "bid_size": data.get("bs"),

            # 메타데이터
            "cached_at": data.get("cached_at")
        }

    def get_subscribed_symbols(self) -> List[str]:
        """
        구독 중인 심볼 조회

        Returns:
            구독 중인 심볼 리스트
        """
        return sorted(list(self.subscribed_symbols))

    async def health_check(self) -> Dict:
        """
        서비스 상태 확인

        Returns:
            상태 정보
        """
        return {
            "status": "connected" if self.is_connected else "disconnected",
            "is_running": self.is_running,
            "api_configured": self.api_key is not None,
            "subscribed_symbols": self.get_subscribed_symbols(),
            "cached_symbols": list(self.data_cache.keys()),
            "callbacks_registered": len(self.callbacks),
            "reconnect_attempts": self.reconnect_attempts
        }


# 싱글톤 인스턴스
_fmp_ws_service: Optional[FMPWebSocketService] = None


def get_fmp_websocket_service() -> FMPWebSocketService:
    """
    FMP WebSocket 서비스의 싱글톤 인스턴스 반환
    """
    global _fmp_ws_service
    if _fmp_ws_service is None:
        _fmp_ws_service = FMPWebSocketService()
    return _fmp_ws_service
