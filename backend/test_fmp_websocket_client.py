"""
FMP WebSocket API 클라이언트 예제
실행 방법:
1. 백엔드 서버 시작: uvicorn app.main:app --reload
2. 이 스크립트 실행: python test_fmp_websocket_client.py
"""

import asyncio
import json
import logging
import websockets
from typing import Dict, Any
from datetime import datetime

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class WebSocketClient:
    """
    백엔드 WebSocket API 클라이언트
    """

    def __init__(self, url: str = "ws://localhost:8000/api/v2/realtime/ws/prices"):
        self.url = url
        self.websocket = None
        self.is_connected = False

    async def connect(self) -> bool:
        """
        WebSocket 연결
        """
        try:
            logger.info(f"[CONNECT] Connecting to {self.url}...")
            self.websocket = await websockets.connect(self.url)
            self.is_connected = True

            logger.info("[OK] Connected to WebSocket server")

            # 첫 메시지 수신 (연결 확인)
            message = await self.websocket.recv()
            response = json.loads(message)
            logger.info(f"[SERVER] {response.get('message', response)}")

            return True

        except Exception as e:
            logger.error(f"[ERROR] Failed to connect: {str(e)}")
            return False

    async def subscribe(self, symbols: list):
        """
        심볼 구독
        """
        if not self.is_connected:
            logger.error("[ERROR] WebSocket not connected")
            return

        try:
            message = {
                "action": "subscribe",
                "symbols": symbols
            }

            logger.info(f"[SUBSCRIBE] {symbols}")
            await self.websocket.send(json.dumps(message))

            # 구독 확인 메시지 수신
            response = await self.websocket.recv()
            response_data = json.loads(response)
            logger.info(f"[SERVER] {response_data}")

        except Exception as e:
            logger.error(f"[ERROR] Subscription failed: {str(e)}")

    async def unsubscribe(self, symbols: list):
        """
        심볼 구독 해제
        """
        if not self.is_connected:
            logger.error("[ERROR] WebSocket not connected")
            return

        try:
            message = {
                "action": "unsubscribe",
                "symbols": symbols
            }

            logger.info(f"[UNSUBSCRIBE] {symbols}")
            await self.websocket.send(json.dumps(message))

            # 구독 해제 확인 메시지 수신
            response = await self.websocket.recv()
            response_data = json.loads(response)
            logger.info(f"[SERVER] {response_data}")

        except Exception as e:
            logger.error(f"[ERROR] Unsubscribe failed: {str(e)}")

    async def get_subscriptions(self):
        """
        현재 구독 심볼 조회
        """
        if not self.is_connected:
            logger.error("[ERROR] WebSocket not connected")
            return

        try:
            message = {
                "action": "get_subscriptions"
            }

            await self.websocket.send(json.dumps(message))

            # 구독 정보 수신
            response = await self.websocket.recv()
            response_data = json.loads(response)
            logger.info(f"[SUBSCRIPTIONS] {response_data.get('symbols', [])}")

        except Exception as e:
            logger.error(f"[ERROR] Get subscriptions failed: {str(e)}")

    async def ping(self):
        """
        연결 유지용 핑 전송
        """
        if not self.is_connected:
            logger.error("[ERROR] WebSocket not connected")
            return

        try:
            message = {
                "action": "ping"
            }

            await self.websocket.send(json.dumps(message))

            # Pong 응답 수신
            response = await self.websocket.recv()
            response_data = json.loads(response)

            if response_data.get("type") == "pong":
                logger.debug("[PING] Pong received")

        except Exception as e:
            logger.error(f"[ERROR] Ping failed: {str(e)}")

    async def listen(self, duration: int = 60):
        """
        실시간 데이터 수신 (지정된 시간 동안)

        Args:
            duration: 수신 시간 (초)
        """
        if not self.is_connected:
            logger.error("[ERROR] WebSocket not connected")
            return

        try:
            logger.info(f"[LISTEN] Listening for {duration} seconds...")

            start_time = datetime.now()
            data_count = 0

            while (datetime.now() - start_time).seconds < duration:
                try:
                    # 타임아웃 설정
                    message = await asyncio.wait_for(
                        self.websocket.recv(),
                        timeout=5.0
                    )

                    response = json.loads(message)

                    if response.get("type") == "price_update":
                        # 가격 업데이트 데이터
                        data_count += 1
                        symbol = response.get("symbol", "N/A")
                        last_price = response.get("last_price", 0)
                        ask_price = response.get("ask_price", 0)
                        bid_price = response.get("bid_price", 0)

                        logger.info(f"[DATA] {symbol}: "
                                   f"Price={last_price}, "
                                   f"Ask={ask_price}, "
                                   f"Bid={bid_price}")

                    elif response.get("type") == "pong":
                        # Ping 응답
                        pass

                    else:
                        # 기타 메시지
                        logger.info(f"[MESSAGE] {response}")

                except asyncio.TimeoutError:
                    # 타임아웃 - 핑 전송으로 연결 유지
                    await self.ping()

                except Exception as e:
                    logger.error(f"[ERROR] Error receiving message: {str(e)}")

            logger.info(f"[DONE] Received {data_count} price updates in {duration}s")

        except Exception as e:
            logger.error(f"[ERROR] Listen failed: {str(e)}")

    async def disconnect(self):
        """
        WebSocket 연결 해제
        """
        if self.websocket:
            await self.websocket.close()
            self.is_connected = False
            logger.info("[DISCONNECT] WebSocket closed")


async def test_scenario_1():
    """
    테스트 시나리오 1: 기본 구독 및 수신
    """
    logger.info("\n" + "=" * 80)
    logger.info("TEST SCENARIO 1: Basic Subscription and Receiving")
    logger.info("=" * 80)

    client = WebSocketClient()

    try:
        # 1. 연결
        if not await client.connect():
            return

        # 2. 심볼 구독
        symbols = ["AAPL", "MSFT", "TSLA"]
        await client.subscribe(symbols)

        # 3. 구독 정보 확인
        await client.get_subscriptions()

        # 4. 데이터 수신 (30초)
        await client.listen(duration=30)

        # 5. 구독 해제
        await client.unsubscribe(symbols)

        # 6. 연결 해제
        await client.disconnect()

    except Exception as e:
        logger.error(f"[ERROR] Scenario 1 failed: {str(e)}")
        await client.disconnect()


async def test_scenario_2():
    """
    테스트 시나리오 2: 동적 구독 변경
    """
    logger.info("\n" + "=" * 80)
    logger.info("TEST SCENARIO 2: Dynamic Subscription Changes")
    logger.info("=" * 80)

    client = WebSocketClient()

    try:
        # 1. 연결
        if not await client.connect():
            return

        # 2. 첫 번째 심볼 구독
        symbols_1 = ["AAPL", "MSFT"]
        await client.subscribe(symbols_1)
        await client.listen(duration=10)

        # 3. 첫 번째 심볼 중 일부 구독 해제
        await client.unsubscribe(["AAPL"])
        await client.listen(duration=10)

        # 4. 새로운 심볼 추가 구독
        await client.subscribe(["GOOGL", "AMZN"])
        await client.listen(duration=10)

        # 5. 전체 구독 해제
        await client.unsubscribe(["MSFT", "GOOGL", "AMZN"])

        # 6. 연결 해제
        await client.disconnect()

    except Exception as e:
        logger.error(f"[ERROR] Scenario 2 failed: {str(e)}")
        await client.disconnect()


async def test_scenario_3():
    """
    테스트 시나리오 3: 장시간 수신 및 재연결
    """
    logger.info("\n" + "=" * 80)
    logger.info("TEST SCENARIO 3: Long-Term Receiving and Reconnection")
    logger.info("=" * 80)

    client = WebSocketClient()

    try:
        # 1. 연결
        if not await client.connect():
            return

        # 2. 많은 심볼 구독
        symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX"]
        await client.subscribe(symbols)

        # 3. 장시간 데이터 수신 (120초)
        await client.listen(duration=120)

        # 4. 연결 해제
        await client.unsubscribe(symbols)
        await client.disconnect()

    except Exception as e:
        logger.error(f"[ERROR] Scenario 3 failed: {str(e)}")
        await client.disconnect()


async def test_performance():
    """
    성능 테스트: 여러 클라이언트 동시 연결
    """
    logger.info("\n" + "=" * 80)
    logger.info("PERFORMANCE TEST: Multiple Concurrent Clients")
    logger.info("=" * 80)

    async def client_task(client_id: int, symbols: list, duration: int):
        """개별 클라이언트 작업"""
        client = WebSocketClient()

        try:
            if not await client.connect():
                return

            await client.subscribe(symbols)
            await client.listen(duration=duration)
            await client.disconnect()

        except Exception as e:
            logger.error(f"[ERROR] Client {client_id} failed: {str(e)}")
            await client.disconnect()

    try:
        # 3개의 클라이언트 동시 실행
        tasks = [
            client_task(1, ["AAPL", "MSFT"], 30),
            client_task(2, ["GOOGL", "AMZN"], 30),
            client_task(3, ["TSLA", "NVDA"], 30),
        ]

        await asyncio.gather(*tasks)

        logger.info("[RESULT] All clients completed successfully")

    except Exception as e:
        logger.error(f"[ERROR] Performance test failed: {str(e)}")


async def main():
    """
    메인 함수
    """
    logger.info("\n")
    logger.info("╔" + "=" * 78 + "╗")
    logger.info("║" + "FMP WebSocket Client Test".center(78) + "║")
    logger.info("╚" + "=" * 78 + "╝")

    logger.info("\n[INFO] Make sure backend server is running:")
    logger.info("       uvicorn app.main:app --reload")

    # 사용자 선택
    print("\nSelect test scenario:")
    print("1. Basic Subscription and Receiving")
    print("2. Dynamic Subscription Changes")
    print("3. Long-Term Receiving and Reconnection")
    print("4. Performance Test (Multiple Clients)")
    print("5. All Scenarios")

    choice = input("\nEnter choice (1-5): ").strip()

    try:
        if choice == "1":
            await test_scenario_1()
        elif choice == "2":
            await test_scenario_2()
        elif choice == "3":
            await test_scenario_3()
        elif choice == "4":
            await test_performance()
        elif choice == "5":
            await test_scenario_1()
            await test_scenario_2()
            await test_scenario_3()
            await test_performance()
        else:
            logger.error("Invalid choice")

    except KeyboardInterrupt:
        logger.info("\n[INFO] Test interrupted by user")

    except Exception as e:
        logger.error(f"[ERROR] Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

    logger.info("\n[DONE] Test completed")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\nTest interrupted")
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
