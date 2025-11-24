"""
PDF 생성 서비스 (Playwright 기반)
- 뉴스 리포트, 주식 분석, 종합 리포트 PDF 생성
- Playwright를 사용한 HTML to PDF 변환
- Supabase Storage에 PDF 업로드
- PDF 생성 이력 관리
"""
import sys
import asyncio
import logging
import tempfile
import subprocess
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from pathlib import Path
from jinja2 import Template

from app.db.supabase_client import get_supabase
from app.core.config import settings

logger = logging.getLogger(__name__)


class PDFService:
    """PDF 생성 및 관리 서비스 (Playwright 기반)"""

    def __init__(self):
        self.supabase = get_supabase()
        self.storage_bucket = "pdfs"  # Supabase Storage 버킷 이름

    async def generate_news_report_pdf(
        self,
        user_id: str,
        symbol: str,
        news_data: List[Dict[str, Any]],
        analysis_summary: Optional[str] = None
    ) -> Dict[str, Any]:
        """뉴스 리포트 PDF 생성"""
        try:
            logger.info(f"[PDF] Generating news report PDF for {symbol} using Playwright")

            # HTML 생성
            html_content = self._render_news_report_html(
                symbol=symbol,
                news_data=news_data,
                analysis_summary=analysis_summary
            )

            # Playwright로 PDF 생성
            start_time = datetime.now()
            pdf_bytes = await self._html_to_pdf(html_content)
            generation_time = (datetime.now() - start_time).total_seconds() * 1000

            if not pdf_bytes:
                raise Exception("Failed to generate PDF from HTML")

            # PDF 파일 정보
            file_size_kb = len(pdf_bytes) // 1024

            # Supabase Storage에 업로드
            file_name = f"news_report_{symbol}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            file_path = f"{user_id}/{file_name}"

            upload_result = await self._upload_to_storage(file_path, pdf_bytes)

            if not upload_result.get('success'):
                raise Exception(f"Storage upload failed: {upload_result.get('error')}")

            file_url = upload_result.get('url')

            # PDF 생성 이력 저장 (실패해도 무시)
            try:
                history_record = {
                    'user_id': user_id,
                    'report_type': 'news_report',
                    'symbols': [symbol],
                    'file_url': file_url,
                    'file_size_kb': file_size_kb,
                    'generation_time_ms': int(generation_time),
                    'status': 'completed',
                    'expires_at': (datetime.now() + timedelta(days=7)).isoformat()
                }

                self.supabase.table('pdf_generation_history').insert(history_record).execute()
                logger.info(f"[PDF] History saved successfully")
            except Exception as history_error:
                logger.warning(f"[PDF] Failed to save history (non-critical): {str(history_error)}")

            logger.info(f"[PDF] News report PDF generated successfully: {file_name}")

            return {
                'status': 'success',
                'file_url': file_url,
                'file_name': file_name,
                'file_size_kb': file_size_kb,
                'generation_time_ms': int(generation_time),
                'expires_at': (datetime.now() + timedelta(days=7)).isoformat()
            }

        except Exception as e:
            logger.error(f"[PDF] Error generating news report PDF: {str(e)}")
            import traceback
            logger.error(f"[PDF] Traceback: {traceback.format_exc()}")

            # 실패 이력 저장
            try:
                error_record = {
                    'user_id': user_id,
                    'report_type': 'news_report',
                    'symbols': [symbol],
                    'status': 'failed',
                    'error_message': str(e)
                }
                self.supabase.table('pdf_generation_history').insert(error_record).execute()
            except:
                pass

            return {
                'status': 'error',
                'error': str(e)
            }

    async def generate_stock_analysis_pdf(
        self,
        user_id: str,
        symbol: str,
        analysis_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """주식 분석 PDF 생성"""
        try:
            logger.info(f"[PDF] Generating stock analysis PDF for {symbol} using Playwright")

            # HTML 생성
            html_content = self._render_stock_analysis_html(
                symbol=symbol,
                analysis_data=analysis_data
            )

            # Playwright로 PDF 생성
            start_time = datetime.now()
            pdf_bytes = await self._html_to_pdf(html_content)
            generation_time = (datetime.now() - start_time).total_seconds() * 1000

            if not pdf_bytes:
                raise Exception("Failed to generate PDF from HTML")

            file_size_kb = len(pdf_bytes) // 1024

            # Storage 업로드
            file_name = f"stock_analysis_{symbol}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            file_path = f"{user_id}/{file_name}"

            upload_result = await self._upload_to_storage(file_path, pdf_bytes)

            if not upload_result.get('success'):
                raise Exception(f"Storage upload failed: {upload_result.get('error')}")

            file_url = upload_result.get('url')

            # 이력 저장 (실패해도 무시)
            try:
                history_record = {
                    'user_id': user_id,
                    'report_type': 'stock_analysis',
                    'symbols': [symbol],
                    'file_url': file_url,
                    'file_size_kb': file_size_kb,
                    'generation_time_ms': int(generation_time),
                    'status': 'completed',
                    'expires_at': (datetime.now() + timedelta(days=7)).isoformat()
                }

                self.supabase.table('pdf_generation_history').insert(history_record).execute()
            except Exception as history_error:
                logger.warning(f"[PDF] Failed to save history (non-critical): {str(history_error)}")

            logger.info(f"[PDF] Stock analysis PDF generated: {file_name}")

            return {
                'status': 'success',
                'file_url': file_url,
                'file_name': file_name,
                'file_size_kb': file_size_kb,
                'generation_time_ms': int(generation_time),
                'expires_at': (datetime.now() + timedelta(days=7)).isoformat()
            }

        except Exception as e:
            logger.error(f"[PDF] Error generating stock analysis PDF: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }

    async def generate_comprehensive_report_pdf(
        self,
        user_id: str,
        symbols: List[str],
        report_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """종합 리포트 PDF 생성"""
        try:
            logger.info(f"[PDF] Generating comprehensive report for {len(symbols)} symbols using Playwright")

            # HTML 생성
            html_content = self._render_comprehensive_report_html(
                symbols=symbols,
                report_data=report_data
            )

            # Playwright로 PDF 생성
            start_time = datetime.now()
            pdf_bytes = await self._html_to_pdf(html_content)
            generation_time = (datetime.now() - start_time).total_seconds() * 1000

            if not pdf_bytes:
                raise Exception("Failed to generate PDF from HTML")

            file_size_kb = len(pdf_bytes) // 1024

            # Storage 업로드
            file_name = f"comprehensive_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            file_path = f"{user_id}/{file_name}"

            upload_result = await self._upload_to_storage(file_path, pdf_bytes)

            if not upload_result.get('success'):
                raise Exception(f"Storage upload failed: {upload_result.get('error')}")

            file_url = upload_result.get('url')

            # 이력 저장 (실패해도 무시)
            try:
                history_record = {
                    'user_id': user_id,
                    'report_type': 'comprehensive',
                    'symbols': symbols,
                    'file_url': file_url,
                    'file_size_kb': file_size_kb,
                    'generation_time_ms': int(generation_time),
                    'status': 'completed',
                    'expires_at': (datetime.now() + timedelta(days=7)).isoformat()
                }

                self.supabase.table('pdf_generation_history').insert(history_record).execute()
            except Exception as history_error:
                logger.warning(f"[PDF] Failed to save history (non-critical): {str(history_error)}")

            logger.info(f"[PDF] Comprehensive report PDF generated: {file_name}")

            return {
                'status': 'success',
                'file_url': file_url,
                'file_name': file_name,
                'file_size_kb': file_size_kb,
                'generation_time_ms': int(generation_time),
                'expires_at': (datetime.now() + timedelta(days=7)).isoformat()
            }

        except Exception as e:
            logger.error(f"[PDF] Error generating comprehensive report: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }

    async def _html_to_pdf(self, html_content: str) -> bytes:
        """Playwright를 사용하여 HTML을 PDF로 변환 (subprocess 방식)"""
        try:
            # 임시 파일 생성
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as html_file:
                html_file.write(html_content)
                html_path = html_file.name

            with tempfile.NamedTemporaryFile(mode='wb', suffix='.pdf', delete=False) as pdf_file:
                pdf_path = pdf_file.name

            try:
                # playwright_worker.py 경로
                worker_path = Path(__file__).parent / "playwright_worker.py"

                # subprocess로 동기 Playwright 실행
                logger.info("[PDF] Running Playwright worker subprocess...")
                result = subprocess.run(
                    [sys.executable, str(worker_path), html_path, pdf_path],
                    capture_output=True,
                    text=True,
                    timeout=30
                )

                if result.returncode != 0:
                    raise Exception(f"Playwright worker failed: {result.stderr}")

                # PDF 파일 읽기
                with open(pdf_path, 'rb') as f:
                    pdf_bytes = f.read()

                logger.info(f"[PDF] PDF generated successfully ({len(pdf_bytes)} bytes)")
                return pdf_bytes

            finally:
                # 임시 파일 정리
                try:
                    Path(html_path).unlink(missing_ok=True)
                    Path(pdf_path).unlink(missing_ok=True)
                except Exception as e:
                    logger.warning(f"[PDF] Failed to cleanup temp files: {e}")

        except Exception as e:
            logger.error(f"[PDF] Error converting HTML to PDF: {str(e)}")
            raise

    def _render_news_report_html(
        self,
        symbol: str,
        news_data: List[Dict[str, Any]],
        analysis_summary: Optional[str] = None
    ) -> str:
        """뉴스 리포트 HTML 렌더링 (Card 레이아웃)"""

        # 첫 번째 뉴스 데이터에서 구조화된 내용 파싱
        first_news = news_data[0] if news_data else {}
        content = first_news.get('content', '')

        # content에서 섹션별 데이터 추출
        def extract_section(text, start_marker, end_marker=None):
            if start_marker not in text:
                return ''
            start = text.index(start_marker) + len(start_marker)
            if end_marker and end_marker in text[start:]:
                end = text.index(end_marker, start)
                return text[start:end].strip()
            return text[start:].strip()

        def extract_list_items(text, prefix='- '):
            lines = text.split('\n')
            return [line.replace(prefix, '').strip() for line in lines if line.strip().startswith(prefix)]

        # 섹션별 내용 추출
        sentiment_section = extract_section(content, '## 감성 분석', '## 핵심 요약')
        summary_section = extract_section(content, '## 핵심 요약', '## 시장 반응')
        market_section = extract_section(content, '## 시장 반응', '## 주가 영향 분석')
        price_impact_section = extract_section(content, '## 주가 영향 분석', '## 경쟁사 분석')
        competitor_section = extract_section(content, '## 경쟁사 분석', '## 리스크 요인')
        risk_section = extract_section(content, '## 리스크 요인', '## 투자 권고')
        investment_section = extract_section(content, '## 투자 권고', '## 결론')
        conclusion_section = extract_section(content, '## 결론', None)

        # 감성 분석 파싱
        sentiment_data = {'positive': 0, 'neutral': 0, 'negative': 0}
        for line in sentiment_section.split('\n'):
            if '긍정:' in line:
                sentiment_data['positive'] = int(line.split(':')[1].strip().replace('개', ''))
            elif '중립:' in line:
                sentiment_data['neutral'] = int(line.split(':')[1].strip().replace('개', ''))
            elif '부정:' in line:
                sentiment_data['negative'] = int(line.split(':')[1].strip().replace('개', ''))

        template_html = """
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ symbol }} 뉴스 분석 레포트</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
            line-height: 1.4;
            color: #1a1a1a;
            background: #ffffff;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            padding: 25px 0;
            border-bottom: 3px solid #1a1a2e;
            margin-bottom: 25px;
        }

        .header h1 {
            font-size: 24px;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 10px;
        }

        .header .meta {
            font-size: 12px;
            color: #666;
        }

        .card {
            background: #ffffff;
            padding: 15px 0;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }

        .card.with-border {
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 15px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }

        .card-title {
            font-size: 16px;
            font-weight: 600;
            color: #1a1a2e;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
        }

        .sentiment-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-top: 10px;
        }

        .sentiment-box {
            text-align: center;
            padding: 12px 10px;
            border-radius: 4px;
            background: #f8f9fa;
        }

        .sentiment-box.total { background: #f8f9fa; }
        .sentiment-box.positive { background: #d4edda; }
        .sentiment-box.neutral { background: #f8f9fa; }
        .sentiment-box.negative { background: #f8d7da; }

        .sentiment-label {
            font-size: 10px;
            color: #666;
            margin-bottom: 5px;
        }

        .sentiment-value {
            font-size: 20px;
            font-weight: 700;
        }

        .sentiment-value.positive-color { color: #22c55e; }
        .sentiment-value.negative-color { color: #ef4444; }
        .sentiment-value.neutral-color { color: #6b7280; }

        .section {
            margin-bottom: 12px;
        }

        .section-title {
            font-size: 13px;
            font-weight: 600;
            color: #1a1a2e;
            margin-bottom: 8px;
        }

        .section-content {
            font-size: 12px;
            line-height: 1.5;
            color: #374151;
        }

        .highlight-box {
            background: #f8f9fa;
            border-left: 3px solid #0f3460;
            padding: 12px 15px;
            margin: 10px 0;
            border-radius: 4px;
        }

        .list-items {
            margin-top: 8px;
            padding-left: 0;
            list-style: none;
        }

        .list-items li {
            margin-bottom: 8px;
            line-height: 1.6;
            color: #4b5563;
            font-size: 11px;
            padding-left: 18px;
            position: relative;
        }

        .list-items li:before {
            content: "•";
            position: absolute;
            left: 6px;
            color: #9ca3af;
        }

        .list-items.numbered {
            counter-reset: item;
        }

        .list-items.numbered li:before {
            content: counter(item) ".";
            counter-increment: item;
            left: 0;
            width: 16px;
        }

        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .badge.buy { background: #22c55e; color: white; }
        .badge.sell { background: #ef4444; color: white; }
        .badge.hold { background: #6b7280; color: white; }

        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
        }

        .footer p {
            font-size: 9px;
            color: #9ca3af;
            line-height: 1.4;
        }

        .disclaimer {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 4px;
            padding: 12px;
            margin-top: 20px;
            page-break-inside: avoid;
        }

        .disclaimer-title {
            font-size: 11px;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 6px;
        }

        .disclaimer-text {
            font-size: 10px;
            line-height: 1.5;
            color: #78350f;
        }

        @media print {
            body { padding: 20px; }
            .card { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <h1>{{ symbol }} 뉴스 종합 분석 레포트</h1>
        <div class="meta">
            <span>생성일시: {{ generated_at }}</span>
            <span style="margin: 0 10px;">|</span>
            <span>분석 뉴스: {{ total_count }}개</span>
        </div>
    </div>

    <!-- Sentiment Analysis Card -->
    <div class="card with-border">
        <div class="card-title">감성 분석 결과</div>
        <p class="section-content">{{ total_count }}개의 뉴스를 분석했습니다</p>
        <div class="sentiment-grid">
            <div class="sentiment-box total">
                <div class="sentiment-label">전체</div>
                <div class="sentiment-value">{{ total_count }}</div>
            </div>
            <div class="sentiment-box positive">
                <div class="sentiment-label">긍정</div>
                <div class="sentiment-value positive-color">{{ sentiment.positive }}</div>
            </div>
            <div class="sentiment-box neutral">
                <div class="sentiment-label">중립</div>
                <div class="sentiment-value neutral-color">{{ sentiment.neutral }}</div>
            </div>
            <div class="sentiment-box negative">
                <div class="sentiment-label">부정</div>
                <div class="sentiment-value negative-color">{{ sentiment.negative }}</div>
            </div>
        </div>
    </div>

    <!-- Executive Summary Card -->
    {% if summary_overview %}
    <div class="card">
        <div class="card-title">핵심 요약 (Executive Summary)</div>
        <p class="section-content">{{ summary_overview }}</p>
        {% if key_findings %}
        <div class="highlight-box">
            <div class="section-title">주요 발견사항:</div>
            <ul class="list-items numbered">
                {% for finding in key_findings %}
                <li>{{ finding }}</li>
                {% endfor %}
            </ul>
        </div>
        {% endif %}
    </div>
    {% endif %}

    <!-- Market Reaction Card -->
    {% if market_overview %}
    <div class="card">
        <div class="card-title">1. 시장 반응 및 감성 분석</div>
        <p class="section-content">{{ market_overview }}</p>

        {% if positive_factors %}
        <div class="section" style="margin-top: 20px;">
            <div class="section-title">주요 긍정 요인:</div>
            <ul class="list-items">
                {% for factor in positive_factors %}
                <li>{{ factor }}</li>
                {% endfor %}
            </ul>
        </div>
        {% endif %}

        {% if neutral_factors %}
        <div class="section">
            <div class="section-title">중립적 평가:</div>
            <ul class="list-items">
                {% for factor in neutral_factors %}
                <li>{{ factor }}</li>
                {% endfor %}
            </ul>
        </div>
        {% endif %}

        {% if negative_factors %}
        <div class="section">
            <div class="section-title">부정적 우려:</div>
            <ul class="list-items">
                {% for factor in negative_factors %}
                <li>{{ factor }}</li>
                {% endfor %}
            </ul>
        </div>
        {% endif %}
    </div>
    {% endif %}

    <!-- Price Impact Card -->
    {% if price_overview %}
    <div class="card">
        <div class="card-title">2. 주가 영향 분석</div>
        <p class="section-content">{{ price_overview }}</p>

        {% if expected_changes %}
        <div class="section" style="margin-top: 20px;">
            <div class="section-title">예상 주가 변동:</div>
            <div style="padding-left: 15px;">
                {% if expected_changes.shortTerm %}
                <p class="section-content" style="margin-bottom: 8px;"><strong>단기(1-2주):</strong> {{ expected_changes.shortTerm }}</p>
                {% endif %}
                {% if expected_changes.mediumTerm %}
                <p class="section-content" style="margin-bottom: 8px;"><strong>중기(1-3개월):</strong> {{ expected_changes.mediumTerm }}</p>
                {% endif %}
                {% if expected_changes.longTerm %}
                <p class="section-content" style="margin-bottom: 8px;"><strong>장기(6개월 이상):</strong> {{ expected_changes.longTerm }}</p>
                {% endif %}
            </div>
        </div>
        {% endif %}

        {% if related_sectors %}
        <div class="section" style="margin-top: 15px;">
            <div class="section-title">관련 섹터 영향:</div>
            <ul class="list-items">
                {% for sector in related_sectors %}
                <li>{{ sector }}</li>
                {% endfor %}
            </ul>
        </div>
        {% endif %}

        {% if investment_point %}
        <div class="highlight-box" style="margin-top: 20px;">
            <div class="section-title">투자 포인트:</div>
            <p class="section-content">{{ investment_point }}</p>
        </div>
        {% endif %}
    </div>
    {% endif %}

    <!-- Competitor Analysis Card -->
    {% if competitor_overview or competitors_list or market_outlook %}
    <div class="card">
        <div class="card-title">3. 경쟁사 분석</div>
        {% if competitor_overview %}
        <p class="section-content">{{ competitor_overview }}</p>
        {% endif %}

        {% if competitors_list %}
        <div class="section" style="margin-top: 20px;">
            <div class="section-title">경쟁사 현황:</div>
            <div style="padding-left: 15px;">
                {% for competitor in competitors_list %}
                <p class="section-content" style="margin-bottom: 10px;"><strong>{{ competitor.name }}</strong></p>
                {% endfor %}
            </div>
        </div>
        {% endif %}

        {% if market_outlook %}
        <div class="highlight-box" style="margin-top: 20px;">
            <div class="section-title">시장 전망:</div>
            <p class="section-content">{{ market_outlook }}</p>
        </div>
        {% endif %}
    </div>
    {% endif %}

    <!-- Risk Factors Card -->
    {% if risk_overview or technical_risks or regulatory_risks or market_risks %}
    <div class="card">
        <div class="card-title">4. 리스크 요인</div>
        {% if risk_overview %}
        <p class="section-content">{{ risk_overview }}</p>
        {% endif %}

        <div class="section" style="margin-top: 20px;">
            {% if technical_risks %}
            <div style="margin-bottom: 15px;">
                <div class="section-title">기술적 리스크:</div>
                <ul class="list-items">
                    {% for risk in technical_risks %}
                    <li>{{ risk }}</li>
                    {% endfor %}
                </ul>
            </div>
            {% endif %}

            {% if regulatory_risks %}
            <div style="margin-bottom: 15px;">
                <div class="section-title">규제 리스크:</div>
                <ul class="list-items">
                    {% for risk in regulatory_risks %}
                    <li>{{ risk }}</li>
                    {% endfor %}
                </ul>
            </div>
            {% endif %}

            {% if market_risks %}
            <div style="margin-bottom: 15px;">
                <div class="section-title">시장 리스크:</div>
                <ul class="list-items">
                    {% for risk in market_risks %}
                    <li>{{ risk }}</li>
                    {% endfor %}
                </ul>
            </div>
            {% endif %}
        </div>

        {% if mitigation %}
        <div class="highlight-box" style="margin-top: 20px;">
            <div class="section-title">대응 전략:</div>
            <p class="section-content">{{ mitigation }}</p>
        </div>
        {% endif %}
    </div>
    {% endif %}

    <!-- Investment Recommendation Card -->
    {% if investment_recommendation %}
    <div class="card">
        <div class="card-title">5. 투자 권고</div>
        <p class="section-content">종합적인 분석 결과를 바탕으로 한 투자 권고 의견입니다.</p>

        <div style="margin-top: 20px;">
            <span class="badge {{ investment_class }}">{{ investment_recommendation }}</span>
        </div>

        {% if target_prices %}
        <div class="section" style="margin-top: 20px;">
            <div class="section-title">목표주가:</div>
            <div style="padding-left: 15px;">
                {% if target_prices.shortTerm %}
                <p class="section-content" style="margin-bottom: 8px;"><strong>단기(3개월):</strong> {{ target_prices.shortTerm }}</p>
                {% endif %}
                {% if target_prices.mediumTerm %}
                <p class="section-content" style="margin-bottom: 8px;"><strong>중기(6개월):</strong> {{ target_prices.mediumTerm }}</p>
                {% endif %}
                {% if target_prices.longTerm %}
                <p class="section-content" style="margin-bottom: 8px;"><strong>장기(12개월):</strong> {{ target_prices.longTerm }}</p>
                {% endif %}
            </div>
        </div>
        {% endif %}

        {% if investment_reasons %}
        <div class="section" style="margin-top: 20px;">
            <div class="section-title">투자 근거:</div>
            <ul class="list-items numbered">
                {% for reason in investment_reasons %}
                <li>{{ reason }}</li>
                {% endfor %}
            </ul>
        </div>
        {% endif %}

        {% if monitoring_points %}
        <div class="section">
            <div class="section-title">주요 모니터링 포인트:</div>
            <ul class="list-items">
                {% for point in monitoring_points %}
                <li>{{ point }}</li>
                {% endfor %}
            </ul>
        </div>
        {% endif %}

        {% if risk_warning %}
        <div class="highlight-box" style="margin-top: 20px; background: #fef3c7; border-left-color: #fbbf24;">
            <div class="section-title" style="color: #92400e;">리스크:</div>
            <p class="section-content" style="color: #78350f;">{{ risk_warning }}</p>
        </div>
        {% endif %}
    </div>
    {% endif %}

    <!-- Conclusion Card -->
    {% if conclusion_summary or conclusion_opinion or conclusion_perspective %}
    <div class="card">
        <div class="card-title">6. 결론</div>
        {% if conclusion_summary %}
        <div class="highlight-box">
            <div class="section-title">핵심 요약:</div>
            <ul class="list-items">
                {% for item in conclusion_summary %}
                <li>{{ item }}</li>
                {% endfor %}
            </ul>
        </div>
        {% endif %}
        {% if conclusion_opinion %}
        <div class="section" style="margin-top: 20px;">
            <div class="section-title">최종 의견:</div>
            <p class="section-content">{{ conclusion_opinion }}</p>
        </div>
        {% endif %}
        {% if conclusion_perspective %}
        <p class="section-content" style="margin-top: 15px;">{{ conclusion_perspective }}</p>
        {% endif %}
    </div>
    {% endif %}

    <!-- Disclaimer -->
    <div class="disclaimer">
        <div class="disclaimer-title">면책 조항 (Disclaimer)</div>
        <p class="disclaimer-text">
            본 레포트는 AI 기반 뉴스 분석을 통해 자동 생성된 참고 자료입니다. 투자 권고나 종목 추천이 아니며,
            투자 결정에 대한 책임은 투자자 본인에게 있습니다. 본 레포트에 포함된 정보는 작성 시점 기준이며,
            시장 상황 변화에 따라 달라질 수 있습니다. 실제 투자 결정 시에는 전문가의 조언을 구하시기 바랍니다.
        </p>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p><strong>AI Finance News Recommendation System</strong></p>
        <p>이 레포트는 자동으로 생성되었습니다.</p>
    </div>
</body>
</html>
        """

        # 각 섹션에서 리스트 아이템 추출 (제한 없이 전체)
        key_findings = []
        for line in summary_section.split('\n'):
            if line.strip() and (line.strip()[0].isdigit() or line.startswith('-')):
                key_findings.append(line.strip().lstrip('0123456789.-) '))

        positive_factors = extract_list_items(market_section.split('긍정 요인:')[1] if '긍정 요인:' in market_section else '')
        neutral_factors = extract_list_items(market_section.split('중립 요인:')[1].split('부정 요인:')[0] if '중립 요인:' in market_section else '')
        negative_factors = extract_list_items(market_section.split('부정 요인:')[1] if '부정 요인:' in market_section else '')

        investment_reasons = []
        monitoring_points = []
        if investment_section:
            if '투자 근거:' in investment_section:
                reasons_text = investment_section.split('투자 근거:')[1].split('모니터링')[0]
                investment_reasons = [line.strip().lstrip('0123456789.-) ') for line in reasons_text.split('\n') if line.strip() and (line.strip()[0].isdigit() or line.startswith('-'))]
            if '모니터링 포인트:' in investment_section:
                monitoring_text = investment_section.split('모니터링 포인트:')[1]
                monitoring_points = [line.strip().lstrip('0123456789.-) ') for line in monitoring_text.split('\n') if line.strip() and (line.strip()[0].isdigit() or line.startswith('-'))]

        # 투자 권고 추출
        investment_recommendation = 'HOLD'
        if '추천: BUY' in investment_section:
            investment_recommendation = '매수 (BUY)'
            investment_class = 'buy'
        elif '추천: SELL' in investment_section:
            investment_recommendation = '매도 (SELL)'
            investment_class = 'sell'
        else:
            investment_recommendation = '보유 (HOLD)'
            investment_class = 'hold'

        # 목표주가 추출
        target_prices = {}
        if '목표주가:' in investment_section:
            target_section = investment_section.split('목표주가:')[1].split('투자 근거:')[0] if '투자 근거:' in investment_section else investment_section.split('목표주가:')[1]
            for line in target_section.split('\n'):
                if '단기(3개월):' in line:
                    target_prices['shortTerm'] = line.split('단기(3개월):')[1].strip()
                elif '중기(6개월):' in line:
                    target_prices['mediumTerm'] = line.split('중기(6개월):')[1].strip()
                elif '장기(12개월):' in line:
                    target_prices['longTerm'] = line.split('장기(12개월):')[1].strip()

        # 리스크 경고 추출
        risk_warning = ''
        if '리스크:' in investment_section:
            risk_warning = investment_section.split('리스크:')[1].strip()

        # 예상 주가 변동 추출
        expected_changes = {}
        if '예상 주가 변동:' in price_impact_section:
            change_section = price_impact_section.split('예상 주가 변동:')[1].split('관련 섹터')[0] if '관련 섹터' in price_impact_section else price_impact_section.split('예상 주가 변동:')[1]
            for line in change_section.split('\n'):
                if '단기(1-2주):' in line:
                    expected_changes['shortTerm'] = line.split('단기(1-2주):')[1].strip()
                elif '중기(1-3개월):' in line:
                    expected_changes['mediumTerm'] = line.split('중기(1-3개월):')[1].strip()
                elif '장기(6개월 이상):' in line:
                    expected_changes['longTerm'] = line.split('장기(6개월 이상):')[1].strip()

        # 관련 섹터 영향 추출
        related_sectors = []
        if '관련 섹터 영향:' in price_impact_section:
            sector_section = price_impact_section.split('관련 섹터 영향:')[1].split('투자 포인트:')[0] if '투자 포인트:' in price_impact_section else price_impact_section.split('관련 섹터 영향:')[1]
            related_sectors = extract_list_items(sector_section)

        # 경쟁사 분석 추출
        competitor_overview = ''
        competitors_list = []
        market_outlook = ''
        if competitor_section:
            competitor_overview = competitor_section.split('경쟁사 현황:')[0].strip() if '경쟁사 현황:' in competitor_section else ''
            market_outlook = competitor_section.split('시장 전망:')[1].strip() if '시장 전망:' in competitor_section else ''

            # 경쟁사 현황 파싱
            if '경쟁사 현황:' in competitor_section:
                competitors_text = competitor_section.split('경쟁사 현황:')[1].split('시장 전망:')[0] if '시장 전망:' in competitor_section else competitor_section.split('경쟁사 현황:')[1]
                # 간단한 파싱 - 줄 단위로 처리
                competitor_lines = [line.strip() for line in competitors_text.split('\n') if line.strip() and not line.strip().startswith('-')]
                for line in competitor_lines:
                    if line and ':' not in line and not line.startswith('-'):
                        competitors_list.append({'name': line, 'points': []})

        # 리스크 요인 추출
        risk_overview = ''
        technical_risks = []
        regulatory_risks = []
        market_risks = []
        mitigation = ''
        if risk_section:
            risk_overview = risk_section.split('기술적 리스크:')[0].strip() if '기술적 리스크:' in risk_section else ''

            if '기술적 리스크:' in risk_section:
                tech_text = risk_section.split('기술적 리스크:')[1].split('규제 리스크:')[0] if '규제 리스크:' in risk_section else risk_section.split('기술적 리스크:')[1]
                technical_risks = extract_list_items(tech_text)

            if '규제 리스크:' in risk_section:
                reg_text = risk_section.split('규제 리스크:')[1].split('시장 리스크:')[0] if '시장 리스크:' in risk_section else risk_section.split('규제 리스크:')[1]
                regulatory_risks = extract_list_items(reg_text)

            if '시장 리스크:' in risk_section:
                market_text = risk_section.split('시장 리스크:')[1].split('대응 전략:')[0] if '대응 전략:' in risk_section else risk_section.split('시장 리스크:')[1]
                market_risks = extract_list_items(market_text)

            if '대응 전략:' in risk_section:
                mitigation = risk_section.split('대응 전략:')[1].strip()

        # 결론의 핵심 요약 추출
        conclusion_summary = []
        if '핵심 요약:' in conclusion_section:
            summary_text = conclusion_section.split('핵심 요약:')[1].split('최종 의견:')[0] if '최종 의견:' in conclusion_section else conclusion_section.split('핵심 요약:')[1]
            conclusion_summary = extract_list_items(summary_text)

        template = Template(template_html)
        return template.render(
            symbol=symbol,
            generated_at=datetime.now().strftime('%Y년 %m월 %d일 %H:%M'),
            total_count=sentiment_data['positive'] + sentiment_data['neutral'] + sentiment_data['negative'],
            sentiment=sentiment_data,
            summary_overview=summary_section.split('주요 발견사항:')[0].strip() if '주요 발견사항:' in summary_section else summary_section,
            key_findings=key_findings,
            market_overview=market_section.split('긍정 요인:')[0].strip() if '긍정 요인:' in market_section else market_section,
            positive_factors=positive_factors,
            neutral_factors=neutral_factors,
            negative_factors=negative_factors,
            price_overview=price_impact_section.split('예상 주가 변동:')[0].strip() if '예상 주가 변동:' in price_impact_section else price_impact_section.split('관련 섹터')[0].strip() if '관련 섹터' in price_impact_section else price_impact_section.split('투자 포인트:')[0].strip() if '투자 포인트:' in price_impact_section else price_impact_section,
            expected_changes=expected_changes,
            related_sectors=related_sectors,
            investment_point=price_impact_section.split('투자 포인트:')[1].strip() if '투자 포인트:' in price_impact_section else '',
            competitor_overview=competitor_overview,
            competitors_list=competitors_list,
            market_outlook=market_outlook,
            risk_overview=risk_overview,
            technical_risks=technical_risks,
            regulatory_risks=regulatory_risks,
            market_risks=market_risks,
            mitigation=mitigation,
            investment_recommendation=investment_recommendation,
            investment_class=investment_class,
            target_prices=target_prices,
            investment_reasons=investment_reasons,
            monitoring_points=monitoring_points,
            risk_warning=risk_warning,
            conclusion_summary=conclusion_summary,
            conclusion_opinion=conclusion_section.split('최종 의견:')[1].split('\n')[0].strip() if '최종 의견:' in conclusion_section else conclusion_section.split('\n')[0] if conclusion_section else '',
            conclusion_perspective=conclusion_section.split('최종 의견:')[1].split('\n', 1)[1].strip() if '최종 의견:' in conclusion_section and len(conclusion_section.split('최종 의견:')[1].split('\n', 1)) > 1 else ''
        )

    def _render_stock_analysis_html(
        self,
        symbol: str,
        analysis_data: Dict[str, Any]
    ) -> str:
        """주식 분석 HTML 렌더링"""
        template_html = """
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ symbol }} 주식 분석 레포트</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 20px;
        }

        .header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 3px solid #1a1a2e;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 32px;
            color: #1a1a2e;
        }

        .analysis {
            padding: 20px;
            background: #f8f9fa;
            border-radius: 4px;
            line-height: 1.8;
        }

        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 12px;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ symbol }} 주식 분석 레포트</h1>
        <p>생성일시: {{ generated_at }}</p>
    </div>

    <div class="analysis">
        <p>{{ analysis }}</p>
    </div>

    <div class="footer">
        <p>AI Finance Analysis System</p>
    </div>
</body>
</html>
        """

        template = Template(template_html)
        return template.render(
            symbol=symbol,
            generated_at=datetime.now().strftime('%Y년 %m월 %d일 %H:%M'),
            analysis=analysis_data.get('analysis', 'No analysis available')
        )

    def _render_comprehensive_report_html(
        self,
        symbols: List[str],
        report_data: Dict[str, Any]
    ) -> str:
        """종합 리포트 HTML 렌더링"""
        template_html = """
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>종합 투자 리포트</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 20px;
        }

        .header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 3px solid #1a1a2e;
            margin-bottom: 30px;
        }

        .symbol-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }

        .symbol-section h2 {
            font-size: 24px;
            color: #0f3460;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
        }

        .symbol-section .content {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 4px;
        }

        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 12px;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>종합 투자 리포트</h1>
        <p>생성일시: {{ generated_at }}</p>
        <p>분석 종목: {{ symbols_text }}</p>
    </div>

    {% for symbol in symbols %}
    <div class="symbol-section">
        <h2>{{ symbol }}</h2>
        <div class="content">
            <p>{{ report_data[symbol].get('analysis', 'No data available') }}</p>
        </div>
    </div>
    {% endfor %}

    <div class="footer">
        <p>AI Finance Analysis System</p>
    </div>
</body>
</html>
        """

        template = Template(template_html)
        return template.render(
            generated_at=datetime.now().strftime('%Y년 %m월 %d일 %H:%M'),
            symbols=symbols,
            symbols_text=', '.join(symbols),
            report_data=report_data
        )

    async def _upload_to_storage(self, file_path: str, file_bytes: bytes) -> Dict[str, Any]:
        """Supabase Storage에 파일 업로드"""
        try:
            # Supabase Storage 업로드
            result = self.supabase.storage.from_(self.storage_bucket).upload(
                file_path,
                file_bytes,
                {"content-type": "application/pdf"}
            )

            # 공개 URL 생성 (7일 유효)
            url = self.supabase.storage.from_(self.storage_bucket).create_signed_url(
                file_path,
                expires_in=604800  # 7 days
            )

            return {
                'success': True,
                'url': url.get('signedURL') if url else None
            }

        except Exception as e:
            logger.error(f"[PDF] Storage upload error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def get_user_pdf_history(
        self,
        user_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """사용자 PDF 생성 이력 조회"""
        try:
            result = self.supabase.table('pdf_generation_history')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"[PDF] Error fetching PDF history: {str(e)}")
            return []

    async def delete_expired_pdfs(self) -> Dict[str, Any]:
        """만료된 PDF 파일 삭제"""
        try:
            logger.info("[PDF] Cleaning up expired PDFs")

            # 만료된 PDF 조회
            result = self.supabase.table('pdf_generation_history')\
                .select('*')\
                .lt('expires_at', datetime.now().isoformat())\
                .eq('status', 'completed')\
                .execute()

            expired_pdfs = result.data if result.data else []
            deleted_count = 0

            for pdf in expired_pdfs:
                try:
                    # Storage에서 파일 삭제
                    file_url = pdf.get('file_url', '')
                    # URL에서 파일 경로 추출 로직 필요

                    # 이력 업데이트 (deleted 상태로)
                    self.supabase.table('pdf_generation_history')\
                        .update({'status': 'deleted'})\
                        .eq('id', pdf['id'])\
                        .execute()

                    deleted_count += 1
                except Exception as e:
                    logger.warning(f"[PDF] Failed to delete PDF {pdf.get('id')}: {str(e)}")

            logger.info(f"[PDF] Cleaned up {deleted_count} expired PDFs")

            return {
                'status': 'success',
                'deleted_count': deleted_count
            }

        except Exception as e:
            logger.error(f"[PDF] Error cleaning up expired PDFs: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }

    def __del__(self):
        """소멸자 - 브라우저 정리"""
        if self._browser or self._playwright:
            try:
                # 비동기 정리는 이벤트 루프가 필요하므로 여기서는 로그만
                logger.info("[PDF] PDFService instance destroyed (browser cleanup needed)")
            except:
                pass
