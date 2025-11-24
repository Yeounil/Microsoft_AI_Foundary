"""
이메일 발송 서비스
- Resend API를 사용한 이메일 발송
- 이메일 템플릿 렌더링 (Jinja2)
- 이메일 발송 이력 관리
"""
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
import resend
from jinja2 import Template
import base64
import httpx

from app.db.supabase_client import get_supabase
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """이메일 발송 및 관리 서비스"""

    def __init__(self):
        self.supabase = get_supabase()
        # Resend API 키 설정
        if hasattr(settings, 'resend_api_key') and settings.resend_api_key:
            resend.api_key = settings.resend_api_key
        else:
            logger.warning("[EMAIL] Resend API key not configured")

    async def send_report_email(
        self,
        to: str,
        subject: str,
        report_data: Dict[str, Any],
        subscription_id: Optional[str] = None,
        attachment_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """리포트 이메일 발송"""
        try:
            logger.info(f"[EMAIL] Sending report email to {to}")

            # 이메일 HTML 생성
            html_content = self._render_report_template(report_data)

            # 이메일 발송 데이터
            # Resend 샌드박스 이메일 사용 (테스트용)
            email_data = {
                'from': 'AI Investment Analysis <onboarding@resend.dev>',
                'to': to,
                'subject': subject,
                'html': html_content
            }

            # PDF 첨부 파일이 있을 경우
            if attachment_url:
                try:
                    logger.info(f"[EMAIL] Downloading PDF from {attachment_url}")

                    # URL에서 PDF 다운로드
                    async with httpx.AsyncClient() as client:
                        pdf_response = await client.get(attachment_url)
                        pdf_response.raise_for_status()
                        pdf_content = pdf_response.content

                    # Base64 인코딩
                    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')

                    # 첨부 파일 추가
                    email_data['attachments'] = [
                        {
                            'filename': f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                            'content': pdf_base64
                        }
                    ]

                    logger.info(f"[EMAIL] PDF attached successfully, size: {len(pdf_content)} bytes")

                except Exception as pdf_error:
                    logger.error(f"[EMAIL] Failed to attach PDF: {str(pdf_error)}")
                    # PDF 첨부 실패해도 이메일은 발송

            # 이메일 발송
            response = resend.Emails.send(email_data)

            # Resend 응답 로깅
            logger.info(f"[EMAIL] Resend response: {response}")

            # 발송 이력 저장
            history_record = {
                'subscription_id': subscription_id,
                'recipient_email': to,
                'subject': subject,
                'status': 'sent',
                'sent_at': datetime.now().isoformat()
            }

            self.supabase.table('email_history').insert(history_record).execute()

            logger.info(f"[EMAIL] Email sent successfully to {to}, email_id: {response.get('id')}")

            return {
                'status': 'success',
                'email_id': response.get('id'),
                'recipient': to,
                'sent_at': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"[EMAIL] Error sending email to {to}: {str(e)}")

            # 실패 이력 저장
            try:
                error_record = {
                    'subscription_id': subscription_id,
                    'recipient_email': to,
                    'subject': subject,
                    'status': 'failed',
                    'error_message': str(e),
                    'retry_count': 0
                }
                self.supabase.table('email_history').insert(error_record).execute()
            except:
                pass

            return {
                'status': 'error',
                'error': str(e)
            }

    async def send_subscription_confirmation_email(
        self,
        to: str,
        subscription_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """구독 확인 이메일 발송"""
        try:
            logger.info(f"[EMAIL] Sending subscription confirmation to {to}")

            html_content = self._render_subscription_confirmation_template(subscription_data)

            # Resend 샌드박스 이메일 사용 (테스트용)
            email_data = {
                'from': 'AI Investment Analysis <onboarding@resend.dev>',
                'to': to,
                'subject': 'Subscription Confirmation - AI Investment Reports',
                'html': html_content
            }

            response = resend.Emails.send(email_data)

            logger.info(f"[EMAIL] Confirmation email sent to {to}")

            return {
                'status': 'success',
                'email_id': response.get('id')
            }

        except Exception as e:
            logger.error(f"[EMAIL] Error sending confirmation email: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }

    async def send_test_email(
        self,
        to: str,
        subscription_id: str
    ) -> Dict[str, Any]:
        """테스트 이메일 발송"""
        try:
            logger.info(f"[EMAIL] Sending test email to {to}")

            # 샘플 리포트 데이터
            sample_report = {
                'symbol': 'TEST',
                'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'executive_summary': 'This is a test email from AI Investment Analysis platform.',
                'positive_count': 10,
                'neutral_count': 5,
                'negative_count': 3,
                'web_report_url': 'https://yourdomain.com/reports/test'
            }

            result = await self.send_report_email(
                to=to,
                subject='Test Email - AI Investment Analysis',
                report_data=sample_report,
                subscription_id=subscription_id
            )

            return result

        except Exception as e:
            logger.error(f"[EMAIL] Error sending test email: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }

    def _render_report_template(self, report_data: Dict[str, Any]) -> str:
        """리포트 이메일 템플릿 렌더링"""
        template_html = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
        }
        .header {
            background: #1a1a2e;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .content {
            padding: 20px;
            background: #f4f4f4;
        }
        .section {
            background: white;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 5px;
        }
        .sentiment {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
        }
        .sentiment-item {
            text-align: center;
        }
        .positive { color: #10b981; }
        .negative { color: #ef4444; }
        .neutral { color: #6b7280; }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background: #0f3460;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ symbol }} AI Analysis Report</h1>
        <p>{{ generated_at }}</p>
    </div>

    <div class="content">
        <div class="section">
            <h2>Executive Summary</h2>
            <p>{{ executive_summary }}</p>
        </div>

        <div class="section">
            <h3>Sentiment Analysis</h3>
            <div class="sentiment">
                <div class="sentiment-item">
                    <div class="positive" style="font-size: 24px; font-weight: bold;">{{ positive_count }}</div>
                    <div>Positive</div>
                </div>
                <div class="sentiment-item">
                    <div class="neutral" style="font-size: 24px; font-weight: bold;">{{ neutral_count }}</div>
                    <div>Neutral</div>
                </div>
                <div class="sentiment-item">
                    <div class="negative" style="font-size: 24px; font-weight: bold;">{{ negative_count }}</div>
                    <div>Negative</div>
                </div>
            </div>
        </div>

        <div style="text-align: center;">
            <a href="{{ web_report_url }}" class="button">View Full Report</a>
        </div>
    </div>

    <div class="footer">
        <p>This is an automated email from AI Investment Analysis platform.</p>
        <p>To manage your subscription, visit your account settings.</p>
        <p style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 5px; color: #856404;">
            📬 <strong>Important:</strong> If you don't see our emails in your inbox, please check your spam/junk folder
            and mark this email as "Not Spam" to ensure future reports arrive in your inbox.
        </p>
    </div>
</body>
</html>
        """

        template = Template(template_html)
        return template.render(**report_data)

    def _render_subscription_confirmation_template(self, subscription_data: Dict[str, Any]) -> str:
        """구독 확인 이메일 템플릿 렌더링"""
        template_html = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
        }
        .header {
            background: #0f3460;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .content {
            padding: 30px;
        }
        .info-box {
            background: #f4f4f4;
            padding: 15px;
            border-left: 4px solid #0f3460;
            margin: 15px 0;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Subscription Confirmed!</h1>
    </div>

    <div class="content">
        <p>Thank you for subscribing to AI Investment Analysis reports.</p>

        <div class="info-box">
            <h3>Your Subscription Details:</h3>
            <ul>
                <li><strong>Frequency:</strong> {{ frequency }}</li>
                <li><strong>Symbols:</strong> {{ symbols }}</li>
                <li><strong>Next Report:</strong> {{ next_send_at }}</li>
            </ul>
        </div>

        <p>You will receive your reports at the scheduled time. You can manage or cancel your subscription anytime from your account settings.</p>
    </div>

    <div class="footer">
        <p>AI Investment Analysis Platform</p>
    </div>
</body>
</html>
        """

        template = Template(template_html)
        return template.render(**subscription_data)

    async def get_email_history(
        self,
        subscription_id: Optional[str] = None,
        recipient_email: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """이메일 발송 이력 조회"""
        try:
            query = self.supabase.table('email_history').select('*')

            if subscription_id:
                query = query.eq('subscription_id', subscription_id)

            if recipient_email:
                query = query.eq('recipient_email', recipient_email)

            result = query.order('created_at', desc=True).limit(limit).execute()

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"[EMAIL] Error fetching email history: {str(e)}")
            return []

    async def retry_failed_emails(self, max_retries: int = 3) -> Dict[str, Any]:
        """실패한 이메일 재발송"""
        try:
            logger.info("[EMAIL] Retrying failed emails")

            # 실패한 이메일 조회 (재시도 횟수가 max_retries 미만인 것만)
            result = self.supabase.table('email_history')\
                .select('*')\
                .eq('status', 'failed')\
                .lt('retry_count', max_retries)\
                .execute()

            failed_emails = result.data if result.data else []
            retry_count = 0

            for email in failed_emails:
                try:
                    # 재발송 로직
                    # (실제로는 원본 데이터를 다시 가져와서 발송해야 함)

                    # 재시도 횟수 업데이트
                    self.supabase.table('email_history')\
                        .update({
                            'retry_count': email.get('retry_count', 0) + 1,
                            'status': 'pending'
                        })\
                        .eq('id', email['id'])\
                        .execute()

                    retry_count += 1

                except Exception as e:
                    logger.warning(f"[EMAIL] Failed to retry email {email.get('id')}: {str(e)}")

            logger.info(f"[EMAIL] Retried {retry_count} failed emails")

            return {
                'status': 'success',
                'retry_count': retry_count
            }

        except Exception as e:
            logger.error(f"[EMAIL] Error retrying failed emails: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }
