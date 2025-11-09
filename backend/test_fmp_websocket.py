"""
FMP WebSocket 통합 테스트
실시간 주가 데이터 스트리밍 테스트
"""

import asyncio
import json
import logging
from typing import Dict, Any
from datetime import datetime

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_fmp_websocket_service():
    """
    FMP WebSocket 서비스 직접 테스트
    """
    logger.info("=" * 80)
    logger.info("TEST 1: FMP WebSocket Service Direct Test")
    logger.info("=" * 80)

    from app.services.fmp_websocket_service import get_fmp_websocket_service

    try:
        # 서비스 초기화
        fmp_ws = get_fmp_websocket_service()

        # 1. 연결 테스트
        logger.info("\n[TEST] Connecting to FMP WebSocket...")
        connected = await fmp_ws.connect()

        if not connected:
            logger.error("[FAIL] Failed to connect to FMP WebSocket")
            return

        logger.info("[PASS] Successfully connected to FMP WebSocket")

        # 2. 상태 확인
        status = await fmp_ws.health_check()
        logger.info(f"[STATUS] {json.dumps(status, indent=2)}")

        # 3. 콜백 등록
        received_data = []

        async def test_callback(data: Dict[str, Any]):
            """테스트용 콜백"""
            parsed = FMPWebSocketService.parse_price_data(data)
            logger.info(f"[DATA] {parsed['symbol']}: "
                       f"Price={parsed.get('last_price')}, "
                       f"Ask={parsed.get('ask_price')}, "
                       f"Bid={parsed.get('bid_price')}")
            received_data.append(parsed)

        fmp_ws.register_callback(test_callback)
        logger.info("[OK] Callback registered")

        # 4. 심볼 구독
        test_symbols = ["AAPL", "MSFT", "TSLA"]
        logger.info(f"\n[TEST] Subscribing to symbols: {test_symbols}")
        subscribed = await fmp_ws.subscribe(test_symbols)

        if not subscribed:
            logger.error("[FAIL] Failed to subscribe")
            await fmp_ws.disconnect()
            return

        logger.info("[PASS] Successfully subscribed to symbols")

        # 5. 리스너 시작 (백그라운드 작업)
        logger.info("[TEST] Starting listener (30 seconds)...")
        listener_task = asyncio.create_task(fmp_ws.start_listening())

        # 30초 동안 대기
        await asyncio.sleep(30)

        # 6. 리스너 중지
        logger.info("[TEST] Stopping listener...")
        fmp_ws.is_running = False
        await asyncio.sleep(2)

        # 7. 수신된 데이터 확인
        logger.info(f"\n[RESULT] Received {len(received_data)} data points:")
        for data in received_data[:5]:  # 처음 5개만 출력
            logger.info(f"  - {data}")

        # 8. 캐시 확인
        cached = fmp_ws.get_all_cached_data()
        logger.info(f"\n[CACHE] {len(cached)} symbols cached:")
        for symbol in list(cached.keys())[:10]:
            logger.info(f"  - {symbol}")

        # 9. 구독 해제
        logger.info(f"\n[TEST] Unsubscribing from {test_symbols}...")
        unsubscribed = await fmp_ws.unsubscribe(test_symbols)

        if unsubscribed:
            logger.info("[PASS] Successfully unsubscribed")
        else:
            logger.error("[FAIL] Failed to unsubscribe")

        # 10. 연결 해제
        logger.info("[TEST] Disconnecting...")
        await fmp_ws.disconnect()
        logger.info("[PASS] Successfully disconnected")

    except Exception as e:
        logger.error(f"[ERROR] Test failed: {str(e)}")
        import traceback
        traceback.print_exc()


async def test_websocket_api():
    """
    FastAPI WebSocket API 테스트
    """
    logger.info("\n" + "=" * 80)
    logger.info("TEST 2: FastAPI WebSocket API Test")
    logger.info("=" * 80)

    from fastapi.testclient import TestClient
    from app.main import app

    try:
        client = TestClient(app)

        # 1. 헬스 체크
        logger.info("\n[TEST] Health check...")
        response = client.get("/api/v2/realtime/health")
        logger.info(f"[RESPONSE] {response.json()}")

        # 2. 상태 확인
        logger.info("\n[TEST] Get status...")
        response = client.get("/api/v2/realtime/status")
        logger.info(f"[RESPONSE] {response.json()}")

        # 3. REST API를 통한 구독
        logger.info("\n[TEST] Subscribe via REST API...")
        response = client.post(
            "/api/v2/realtime/subscribe",
            json=["AAPL", "MSFT"]
        )

        if response.status_code == 200:
            logger.info(f"[PASS] {response.json()}")
        else:
            logger.error(f"[FAIL] {response.status_code}: {response.json()}")

        # 4. 캐시 확인
        logger.info("\n[TEST] Get cached data...")
        response = client.get("/api/v2/realtime/cache")
        cached = response.json()
        logger.info(f"[RESPONSE] {cached['total']} symbols cached, "
                   f"{cached['returned']} returned")

        # 5. 특정 심볼 캐시 조회
        if cached['returned'] > 0:
            symbols = list(cached['data'].keys())
            test_symbol = symbols[0]
            logger.info(f"\n[TEST] Get cache for {test_symbol}...")
            response = client.get(f"/api/v2/realtime/cache/{test_symbol}")
            if response.status_code == 200:
                logger.info(f"[PASS] {response.json()['data']}")
            else:
                logger.error(f"[FAIL] {response.status_code}")

        # 6. 구독 해제
        logger.info("\n[TEST] Unsubscribe via REST API...")
        response = client.post(
            "/api/v2/realtime/unsubscribe",
            json=["AAPL", "MSFT"]
        )

        if response.status_code == 200:
            logger.info(f"[PASS] {response.json()}")
        else:
            logger.error(f"[FAIL] {response.status_code}: {response.json()}")

    except Exception as e:
        logger.error(f"[ERROR] Test failed: {str(e)}")
        import traceback
        traceback.print_exc()


async def test_websocket_client():
    """
    WebSocket 클라이언트 시뮬레이션 테스트
    """
    logger.info("\n" + "=" * 80)
    logger.info("TEST 3: WebSocket Client Simulation Test")
    logger.info("=" * 80)

    try:
        import websockets
        from app.main import app
        from fastapi.testclient import TestClient

        # Uvicorn 서버 필요 (로컬 테스트에서는 TestClient 사용)
        # 실제 테스트는 다음 스크립트로 수행:
        # uvicorn app.main:app --reload
        # python -m pytest test_fmp_websocket.py::test_websocket_client

        logger.info("[INFO] WebSocket client test requires running server")
        logger.info("[INFO] Run the following commands in separate terminals:")
        logger.info("  Terminal 1: uvicorn app.main:app --reload")
        logger.info("  Terminal 2: python test_fmp_websocket_client.py")

    except Exception as e:
        logger.error(f"[ERROR] Test failed: {str(e)}")


async def test_configuration():
    """
    설정 확인 테스트
    """
    logger.info("\n" + "=" * 80)
    logger.info("TEST 4: Configuration Test")
    logger.info("=" * 80)

    try:
        from app.core.config import settings

        logger.info("\n[CONFIG] Checking API keys...")

        configs = {
            "FMP API Key": bool(settings.fmp_api_key),
            "OpenAI API Key": bool(settings.openai_api_key),
            "Supabase URL": bool(settings.supabase_url),
            "Supabase Key": bool(settings.supabase_key),
            "Pinecone API Key": bool(settings.pinecone_api_key),
        }

        for key, configured in configs.items():
            status = "✅ Configured" if configured else "⚠️ Missing"
            logger.info(f"  {key}: {status}")

        if not settings.fmp_api_key:
            logger.error("[WARN] FMP API Key is required for WebSocket service!")

    except Exception as e:
        logger.error(f"[ERROR] Test failed: {str(e)}")


async def main():
    """
    모든 테스트 실행
    """
    logger.info("\n")
    logger.info("╔" + "=" * 78 + "╗")
    logger.info("║" + "FMP WebSocket Service Integration Tests".center(78) + "║")
    logger.info("╚" + "=" * 78 + "╝")

    # 설정 확인
    await test_configuration()

    # 서비스 직접 테스트 (FMP API 키가 필요함)
    try:
        await test_fmp_websocket_service()
    except Exception as e:
        logger.error(f"[SKIP] Service test skipped: {str(e)}")

    # REST API 테스트
    await test_websocket_api()

    # WebSocket 클라이언트 테스트 정보
    await test_websocket_client()

    logger.info("\n")
    logger.info("╔" + "=" * 78 + "╗")
    logger.info("║" + "All Tests Completed".center(78) + "║")
    logger.info("╚" + "=" * 78 + "╝")


if __name__ == "__main__":
    # 필요한 import 추가
    try:
        from app.services.fmp_websocket_service import FMPWebSocketService
    except ImportError:
        logger.error("Failed to import FMPWebSocketService. Make sure all dependencies are installed.")
        exit(1)

    # 비동기 테스트 실행
    asyncio.run(main())
