"""
이메일 구독 관리 API
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from app.services.subscription_service import SubscriptionService
from app.services.email_service import EmailService
from app.core.auth_supabase import get_current_user_or_create_temp as get_current_user

router = APIRouter()


class CreateSubscriptionRequest(BaseModel):
    email: EmailStr
    frequency: str  # 'daily', 'weekly', 'monthly'
    symbols: List[str]
    report_types: List[str]  # ['news', 'technical', 'comprehensive']
    send_time: str = "09:00:00"
    timezone: str = "Asia/Seoul"


class UpdateSubscriptionRequest(BaseModel):
    email: Optional[EmailStr] = None
    frequency: Optional[str] = None
    symbols: Optional[List[str]] = None
    report_types: Optional[List[str]] = None
    send_time: Optional[str] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None


@router.post("/")
async def create_subscription(
    request: CreateSubscriptionRequest,
    current_user: dict = Depends(get_current_user)
):
    """새 이메일 구독 생성"""
    try:
        # 입력 검증
        if request.frequency not in ['daily', 'weekly', 'monthly']:
            raise HTTPException(
                status_code=400,
                detail="Invalid frequency. Must be 'daily', 'weekly', or 'monthly'"
            )

        if not request.symbols or len(request.symbols) == 0:
            raise HTTPException(status_code=400, detail="At least one symbol is required")

        if not request.report_types or len(request.report_types) == 0:
            raise HTTPException(status_code=400, detail="At least one report type is required")

        subscription_service = SubscriptionService()

        result = await subscription_service.create_subscription(
            user_id=current_user["user_id"],
            email=request.email,
            frequency=request.frequency,
            symbols=request.symbols,
            report_types=request.report_types,
            send_time=request.send_time,
            timezone=request.timezone
        )

        if result.get('status') == 'error':
            raise HTTPException(status_code=400, detail=result.get('error'))

        # 구독 확인 이메일 발송
        try:
            email_service = EmailService()
            subscription_data = {
                'frequency': request.frequency,
                'symbols': ', '.join(request.symbols),
                'next_send_at': result['subscription'].get('next_send_at', 'TBD')
            }
            await email_service.send_subscription_confirmation_email(
                to=request.email,
                subscription_data=subscription_data
            )
        except Exception as e:
            # 이메일 전송 실패는 무시 (구독 자체는 성공)
            pass

        return {
            "message": "Subscription created successfully",
            "subscription": result.get('subscription')
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"구독 생성 오류: {str(e)}")


@router.get("/")
async def get_subscriptions(
    current_user: dict = Depends(get_current_user)
):
    """사용자 구독 목록 조회"""
    try:
        subscription_service = SubscriptionService()

        subscriptions = await subscription_service.get_user_subscriptions(
            user_id=current_user["user_id"]
        )

        # 프론트엔드가 배열을 기대하므로 직접 배열 반환
        return subscriptions

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"구독 목록 조회 오류: {str(e)}")


@router.get("/{subscription_id}")
async def get_subscription(
    subscription_id: str,
    current_user: dict = Depends(get_current_user)
):
    """특정 구독 정보 조회"""
    try:
        subscription_service = SubscriptionService()

        subscription = await subscription_service.get_subscription(subscription_id)

        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        # 권한 확인
        if subscription.get('user_id') != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        return {
            "subscription": subscription
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"구독 조회 오류: {str(e)}")


@router.put("/{subscription_id}")
async def update_subscription(
    subscription_id: str,
    request: UpdateSubscriptionRequest,
    current_user: dict = Depends(get_current_user)
):
    """구독 정보 업데이트"""
    try:
        subscription_service = SubscriptionService()

        # 업데이트할 데이터만 추출
        update_data = request.dict(exclude_unset=True)

        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")

        # frequency 검증
        if 'frequency' in update_data and update_data['frequency'] not in ['daily', 'weekly', 'monthly']:
            raise HTTPException(
                status_code=400,
                detail="Invalid frequency. Must be 'daily', 'weekly', or 'monthly'"
            )

        result = await subscription_service.update_subscription(
            subscription_id=subscription_id,
            user_id=current_user["user_id"],
            update_data=update_data
        )

        if result.get('status') == 'error':
            raise HTTPException(status_code=400, detail=result.get('error'))

        return {
            "message": "Subscription updated successfully",
            "subscription": result.get('subscription')
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"구독 업데이트 오류: {str(e)}")


@router.delete("/{subscription_id}")
async def delete_subscription(
    subscription_id: str,
    current_user: dict = Depends(get_current_user)
):
    """구독 삭제"""
    try:
        subscription_service = SubscriptionService()

        result = await subscription_service.delete_subscription(
            subscription_id=subscription_id,
            user_id=current_user["user_id"]
        )

        if result.get('status') == 'error':
            raise HTTPException(status_code=400, detail=result.get('error'))

        return {
            "message": "Subscription deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"구독 삭제 오류: {str(e)}")


@router.post("/{subscription_id}/toggle")
async def toggle_subscription_status(
    subscription_id: str,
    current_user: dict = Depends(get_current_user)
):
    """구독 활성화/비활성화 토글"""
    try:
        subscription_service = SubscriptionService()

        # 현재 구독 정보 조회
        subscription = await subscription_service.get_subscription(subscription_id)

        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        # 권한 확인
        if subscription.get('user_id') != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # 현재 상태의 반대로 토글
        new_status = not subscription.get('is_active', True)

        result = await subscription_service.toggle_subscription_status(
            subscription_id=subscription_id,
            user_id=current_user["user_id"],
            is_active=new_status
        )

        if result.get('status') == 'error':
            raise HTTPException(status_code=400, detail=result.get('error'))

        # 프론트엔드가 Subscription 객체를 기대하므로 직접 반환
        return result.get('subscription')

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"구독 상태 변경 오류: {str(e)}")


@router.post("/{subscription_id}/test-email")
async def send_test_email(
    subscription_id: str,
    current_user: dict = Depends(get_current_user)
):
    """테스트 이메일 발송"""
    try:
        subscription_service = SubscriptionService()
        email_service = EmailService()

        # 구독 정보 조회
        subscription = await subscription_service.get_subscription(subscription_id)

        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        # 권한 확인
        if subscription.get('user_id') != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # 테스트 이메일 발송
        result = await email_service.send_test_email(
            to=subscription.get('email'),
            subscription_id=subscription_id
        )

        if result.get('status') == 'error':
            error_msg = result.get('error', '알 수 없는 오류')

            # Resend 도메인 인증 에러 처리
            if 'domain is not verified' in error_msg:
                raise HTTPException(
                    status_code=503,
                    detail="이메일 서비스가 아직 설정되지 않았습니다. Resend에서 도메인 인증을 완료해주세요."
                )

            raise HTTPException(
                status_code=500,
                detail=f"이메일 발송 실패: {error_msg}"
            )

        return {
            "message": "Test email sent successfully",
            "recipient": subscription.get('email'),
            "sent_at": result.get('sent_at')
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"테스트 이메일 발송 오류: {str(e)}")


@router.get("/statistics/summary")
async def get_subscription_statistics(
    current_user: dict = Depends(get_current_user)
):
    """구독 통계 조회"""
    try:
        subscription_service = SubscriptionService()

        stats = await subscription_service.get_subscription_statistics(
            user_id=current_user["user_id"]
        )

        return {
            "user_id": current_user["user_id"],
            "statistics": stats,
            "generated_at": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"구독 통계 조회 오류: {str(e)}")


@router.get("/email-history/{subscription_id}")
async def get_subscription_email_history(
    subscription_id: str,
    limit: int = Query(50, description="조회할 이메일 이력 개수"),
    current_user: dict = Depends(get_current_user)
):
    """구독별 이메일 발송 이력 조회"""
    try:
        subscription_service = SubscriptionService()
        email_service = EmailService()

        # 구독 정보 조회 및 권한 확인
        subscription = await subscription_service.get_subscription(subscription_id)

        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")

        if subscription.get('user_id') != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # 이메일 이력 조회
        history = await email_service.get_email_history(
            subscription_id=subscription_id,
            limit=limit
        )

        return {
            "subscription_id": subscription_id,
            "total_count": len(history),
            "history": history
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이메일 이력 조회 오류: {str(e)}")
