"""
PDF 생성 및 다운로드 API
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from app.services.pdf_service import PDFService
from app.core.auth_supabase import get_current_user_or_create_temp as get_current_user

router = APIRouter()


class GenerateNewsReportPDFRequest(BaseModel):
    symbol: str
    news_data: List[Dict[str, Any]]
    analysis_summary: Optional[str] = None


class GenerateStockAnalysisPDFRequest(BaseModel):
    symbol: str
    analysis_data: Dict[str, Any]


class GenerateComprehensiveReportPDFRequest(BaseModel):
    symbols: List[str]
    report_data: Dict[str, Any]


@router.post("/generate/news-report")
async def generate_news_report_pdf(
    request: GenerateNewsReportPDFRequest,
    current_user: dict = Depends(get_current_user)
):
    """뉴스 리포트 PDF 생성"""
    try:
        pdf_service = PDFService()

        result = await pdf_service.generate_news_report_pdf(
            user_id=current_user["user_id"],
            symbol=request.symbol,
            news_data=request.news_data,
            analysis_summary=request.analysis_summary
        )

        if result.get('status') == 'error':
            raise HTTPException(status_code=500, detail=result.get('error'))

        return {
            "message": f"PDF generated successfully for {request.symbol}",
            "file_url": result.get('file_url'),
            "file_name": result.get('file_name'),
            "file_size_kb": result.get('file_size_kb'),
            "generation_time_ms": result.get('generation_time_ms'),
            "expires_at": result.get('expires_at')
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 생성 오류: {str(e)}")


@router.post("/generate/stock-analysis")
async def generate_stock_analysis_pdf(
    request: GenerateStockAnalysisPDFRequest,
    current_user: dict = Depends(get_current_user)
):
    """주식 분석 PDF 생성"""
    try:
        pdf_service = PDFService()

        result = await pdf_service.generate_stock_analysis_pdf(
            user_id=current_user["user_id"],
            symbol=request.symbol,
            analysis_data=request.analysis_data
        )

        if result.get('status') == 'error':
            raise HTTPException(status_code=500, detail=result.get('error'))

        return {
            "message": f"Stock analysis PDF generated for {request.symbol}",
            "file_url": result.get('file_url'),
            "file_name": result.get('file_name'),
            "file_size_kb": result.get('file_size_kb'),
            "generation_time_ms": result.get('generation_time_ms'),
            "expires_at": result.get('expires_at')
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 생성 오류: {str(e)}")


@router.post("/generate/comprehensive-report")
async def generate_comprehensive_report_pdf(
    request: GenerateComprehensiveReportPDFRequest,
    current_user: dict = Depends(get_current_user)
):
    """종합 리포트 PDF 생성"""
    try:
        pdf_service = PDFService()

        result = await pdf_service.generate_comprehensive_report_pdf(
            user_id=current_user["user_id"],
            symbols=request.symbols,
            report_data=request.report_data
        )

        if result.get('status') == 'error':
            raise HTTPException(status_code=500, detail=result.get('error'))

        return {
            "message": "Comprehensive report PDF generated",
            "symbols": request.symbols,
            "file_url": result.get('file_url'),
            "file_name": result.get('file_name'),
            "file_size_kb": result.get('file_size_kb'),
            "generation_time_ms": result.get('generation_time_ms'),
            "expires_at": result.get('expires_at')
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 생성 오류: {str(e)}")


@router.get("/history")
async def get_pdf_history(
    limit: int = Query(20, description="조회할 PDF 이력 개수"),
    current_user: dict = Depends(get_current_user)
):
    """사용자 PDF 생성 이력 조회"""
    try:
        pdf_service = PDFService()

        history = await pdf_service.get_user_pdf_history(
            user_id=current_user["user_id"],
            limit=limit
        )

        return {
            "user_id": current_user["user_id"],
            "total_count": len(history),
            "history": history
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 이력 조회 오류: {str(e)}")


@router.delete("/cleanup-expired")
async def cleanup_expired_pdfs(
    current_user: dict = Depends(get_current_user)
):
    """만료된 PDF 파일 정리 (관리자 전용)"""
    try:
        # TODO: 관리자 권한 확인 로직 추가

        pdf_service = PDFService()
        result = await pdf_service.delete_expired_pdfs()

        if result.get('status') == 'error':
            raise HTTPException(status_code=500, detail=result.get('error'))

        return {
            "message": "Expired PDFs cleaned up successfully",
            "deleted_count": result.get('deleted_count')
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 정리 오류: {str(e)}")
