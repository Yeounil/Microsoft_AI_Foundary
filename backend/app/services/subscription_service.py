"""
이메일 구독 관리 서비스
- 사용자 구독 CRUD
- 발송 스케줄 계산
- 구독 통계 제공
"""
import logging
from datetime import datetime, timedelta, time
from typing import Dict, Any, Optional, List
import pytz

from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


class SubscriptionService:
    """이메일 구독 관리 서비스"""

    def __init__(self):
        self.supabase = get_supabase()
        self.table_name = "email_subscriptions"

    async def create_subscription(
        self,
        user_id: str,
        email: str,
        frequency: str,  # 'daily', 'weekly', 'monthly'
        symbols: List[str],
        report_types: List[str],
        send_time: str = "09:00:00",
        timezone: str = "Asia/Seoul"
    ) -> Dict[str, Any]:
        """새 구독 생성"""
        try:
            logger.info(f"[SUBSCRIPTION] Creating subscription for user {user_id}")

            # 구독 제한 확인 (무료 사용자: 1개)
            existing_count = await self._count_user_subscriptions(user_id)

            if existing_count >= 5:  # 제한 설정 (필요시 조정)
                return {
                    'status': 'error',
                    'error': 'Subscription limit exceeded. Maximum 5 subscriptions allowed.'
                }

            # 다음 발송 시각 계산
            next_send_at = self._calculate_next_send_time(frequency, send_time, timezone)

            subscription_data = {
                'user_id': user_id,
                'email': email,
                'frequency': frequency,
                'symbols': symbols,
                'report_types': report_types,
                'send_time': send_time,
                'timezone': timezone,
                'is_active': True,
                'next_send_at': next_send_at.isoformat()
            }

            result = self.supabase.table(self.table_name).insert(subscription_data).execute()

            if result.data and len(result.data) > 0:
                subscription = result.data[0]
                logger.info(f"[SUBSCRIPTION] Created subscription ID: {subscription['id']}")

                return {
                    'status': 'success',
                    'subscription': subscription
                }
            else:
                return {
                    'status': 'error',
                    'error': 'Failed to create subscription'
                }

        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            logger.error(f"[SUBSCRIPTION] Error creating subscription: {str(e)}")
            logger.error(f"[SUBSCRIPTION] Full error: {error_detail}")

            # Supabase 에러 상세 정보 추출
            error_message = str(e)
            if hasattr(e, 'message'):
                error_message = e.message
            elif hasattr(e, 'details'):
                error_message = e.details

            return {
                'status': 'error',
                'error': error_message
            }

    async def get_user_subscriptions(
        self,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """사용자 구독 목록 조회"""
        try:
            result = self.supabase.table(self.table_name)\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .execute()

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"[SUBSCRIPTION] Error fetching subscriptions: {str(e)}")
            return []

    async def get_subscription(
        self,
        subscription_id: str
    ) -> Optional[Dict[str, Any]]:
        """특정 구독 조회"""
        try:
            result = self.supabase.table(self.table_name)\
                .select('*')\
                .eq('id', subscription_id)\
                .execute()

            return result.data[0] if result.data else None

        except Exception as e:
            logger.error(f"[SUBSCRIPTION] Error fetching subscription: {str(e)}")
            return None

    async def update_subscription(
        self,
        subscription_id: str,
        user_id: str,
        update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """구독 정보 업데이트"""
        try:
            logger.info(f"[SUBSCRIPTION] Updating subscription {subscription_id}")

            # 권한 확인 (사용자 본인의 구독인지)
            existing = await self.get_subscription(subscription_id)
            if not existing or existing.get('user_id') != user_id:
                return {
                    'status': 'error',
                    'error': 'Subscription not found or access denied'
                }

            # 발송 시각이 변경되었으면 next_send_at 재계산
            if 'frequency' in update_data or 'send_time' in update_data:
                frequency = update_data.get('frequency', existing.get('frequency'))
                send_time = update_data.get('send_time', existing.get('send_time'))
                timezone = update_data.get('timezone', existing.get('timezone', 'Asia/Seoul'))

                next_send_at = self._calculate_next_send_time(frequency, send_time, timezone)
                update_data['next_send_at'] = next_send_at.isoformat()

            result = self.supabase.table(self.table_name)\
                .update(update_data)\
                .eq('id', subscription_id)\
                .eq('user_id', user_id)\
                .execute()

            if result.data and len(result.data) > 0:
                logger.info(f"[SUBSCRIPTION] Updated subscription {subscription_id}")
                return {
                    'status': 'success',
                    'subscription': result.data[0]
                }
            else:
                return {
                    'status': 'error',
                    'error': 'Failed to update subscription'
                }

        except Exception as e:
            logger.error(f"[SUBSCRIPTION] Error updating subscription: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }

    async def delete_subscription(
        self,
        subscription_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """구독 삭제"""
        try:
            logger.info(f"[SUBSCRIPTION] Deleting subscription {subscription_id}")

            result = self.supabase.table(self.table_name)\
                .delete()\
                .eq('id', subscription_id)\
                .eq('user_id', user_id)\
                .execute()

            if result.data and len(result.data) > 0:
                logger.info(f"[SUBSCRIPTION] Deleted subscription {subscription_id}")
                return {
                    'status': 'success',
                    'message': 'Subscription deleted successfully'
                }
            else:
                return {
                    'status': 'error',
                    'error': 'Subscription not found or already deleted'
                }

        except Exception as e:
            logger.error(f"[SUBSCRIPTION] Error deleting subscription: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }

    async def toggle_subscription_status(
        self,
        subscription_id: str,
        user_id: str,
        is_active: bool
    ) -> Dict[str, Any]:
        """구독 활성화/비활성화"""
        try:
            logger.info(f"[SUBSCRIPTION] Toggling subscription {subscription_id} to {'active' if is_active else 'inactive'}")

            result = self.supabase.table(self.table_name)\
                .update({'is_active': is_active})\
                .eq('id', subscription_id)\
                .eq('user_id', user_id)\
                .execute()

            if result.data and len(result.data) > 0:
                return {
                    'status': 'success',
                    'subscription': result.data[0]
                }
            else:
                return {
                    'status': 'error',
                    'error': 'Failed to update subscription status'
                }

        except Exception as e:
            logger.error(f"[SUBSCRIPTION] Error toggling subscription: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }

    async def get_pending_subscriptions(
        self,
        frequency: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """발송 대기 중인 구독 조회 (스케줄러용)"""
        try:
            now = datetime.now(pytz.UTC)

            query = self.supabase.table(self.table_name)\
                .select('*')\
                .eq('is_active', True)\
                .lte('next_send_at', now.isoformat())

            if frequency:
                query = query.eq('frequency', frequency)

            result = query.execute()

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"[SUBSCRIPTION] Error fetching pending subscriptions: {str(e)}")
            return []

    async def update_next_send_time(
        self,
        subscription_id: str
    ) -> bool:
        """다음 발송 시각 업데이트"""
        try:
            subscription = await self.get_subscription(subscription_id)
            if not subscription:
                return False

            frequency = subscription.get('frequency')
            send_time = subscription.get('send_time', '09:00:00')
            timezone = subscription.get('timezone', 'Asia/Seoul')

            next_send_at = self._calculate_next_send_time(frequency, send_time, timezone)

            self.supabase.table(self.table_name)\
                .update({'next_send_at': next_send_at.isoformat()})\
                .eq('id', subscription_id)\
                .execute()

            logger.info(f"[SUBSCRIPTION] Updated next send time for {subscription_id}")
            return True

        except Exception as e:
            logger.error(f"[SUBSCRIPTION] Error updating next send time: {str(e)}")
            return False

    async def get_subscription_statistics(
        self,
        user_id: str
    ) -> Dict[str, Any]:
        """사용자 구독 통계"""
        try:
            subscriptions = await self.get_user_subscriptions(user_id)

            active_count = sum(1 for s in subscriptions if s.get('is_active'))
            inactive_count = len(subscriptions) - active_count

            frequency_stats = {}
            for s in subscriptions:
                freq = s.get('frequency', 'unknown')
                frequency_stats[freq] = frequency_stats.get(freq, 0) + 1

            return {
                'total_subscriptions': len(subscriptions),
                'active_subscriptions': active_count,
                'inactive_subscriptions': inactive_count,
                'frequency_breakdown': frequency_stats
            }

        except Exception as e:
            logger.error(f"[SUBSCRIPTION] Error fetching statistics: {str(e)}")
            return {}

    async def _count_user_subscriptions(self, user_id: str) -> int:
        """사용자 구독 개수 조회"""
        try:
            result = self.supabase.table(self.table_name)\
                .select('id', count='exact')\
                .eq('user_id', user_id)\
                .execute()

            return result.count if hasattr(result, 'count') else len(result.data)

        except Exception as e:
            logger.error(f"[SUBSCRIPTION] Error counting subscriptions: {str(e)}")
            return 0

    def _calculate_next_send_time(
        self,
        frequency: str,
        send_time: str,
        timezone_str: str
    ) -> datetime:
        """다음 발송 시각 계산"""
        try:
            tz = pytz.timezone(timezone_str)
            now = datetime.now(tz)

            # send_time 파싱 (HH:MM:SS)
            hour, minute, second = map(int, send_time.split(':'))
            target_time = time(hour, minute, second)

            # 오늘 발송 시각
            today_send = now.replace(hour=hour, minute=minute, second=second, microsecond=0)

            if frequency == 'daily':
                # 오늘 발송 시각이 지났으면 내일
                if now > today_send:
                    next_send = today_send + timedelta(days=1)
                else:
                    next_send = today_send

            elif frequency == 'weekly':
                # 다음 주 같은 요일
                days_ahead = 7 - now.weekday()
                next_send = today_send + timedelta(days=days_ahead)

                if now > today_send:
                    next_send += timedelta(days=7)

            elif frequency == 'monthly':
                # 다음 달 같은 날
                if now.month == 12:
                    next_send = today_send.replace(year=now.year + 1, month=1)
                else:
                    next_send = today_send.replace(month=now.month + 1)

                if now > today_send:
                    if next_send.month == 12:
                        next_send = next_send.replace(year=next_send.year + 1, month=1)
                    else:
                        next_send = next_send.replace(month=next_send.month + 1)

            else:
                # 기본값: 1일 후
                next_send = today_send + timedelta(days=1)

            # UTC로 변환
            return next_send.astimezone(pytz.UTC)

        except Exception as e:
            logger.error(f"[SUBSCRIPTION] Error calculating next send time: {str(e)}")
            # 에러 시 기본값: 24시간 후
            return datetime.now(pytz.UTC) + timedelta(days=1)
