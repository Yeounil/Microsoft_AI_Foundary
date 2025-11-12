/**
 * API 관련 타입 정의
 */

import { AxiosError } from 'axios';

// API 에러 응답 타입
export interface APIErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
  statusCode?: number;
  timestamp?: string;
  path?: string;
}

// API 성공 응답 래퍼
export interface APIResponse<T = unknown> {
  data: T;
  status: number;
  message?: string;
}

// 페이지네이션 응답
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// API 에러 코드 열거형
export enum APIErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

// Axios 에러 타입 확장
export type APIError = AxiosError<APIErrorResponse>;

// 타입 가드 함수들
export function isAPIError(error: unknown): error is APIError {
  return (
    error instanceof Error &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

export function isAPIErrorResponse(data: unknown): data is APIErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    ('detail' in data || 'message' in data || 'error' in data)
  );
}

// 에러 메시지 추출 헬퍼
export function extractErrorMessage(error: unknown): string {
  if (isAPIError(error)) {
    const response = error.response?.data;
    if (response) {
      return response.detail || response.message || response.error || '요청 처리 중 오류가 발생했습니다';
    }
    if (error.code === 'ECONNABORTED') {
      return '요청 시간이 초과되었습니다';
    }
    if (!error.response) {
      return '네트워크 연결을 확인해주세요';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다';
}

// HTTP 상태 코드에서 에러 코드 매핑
export function getErrorCodeFromStatus(status?: number): APIErrorCode {
  if (!status) return APIErrorCode.NETWORK_ERROR;

  switch (status) {
    case 400:
      return APIErrorCode.BAD_REQUEST;
    case 401:
      return APIErrorCode.UNAUTHORIZED;
    case 403:
      return APIErrorCode.FORBIDDEN;
    case 404:
      return APIErrorCode.NOT_FOUND;
    case 500:
      return APIErrorCode.INTERNAL_SERVER_ERROR;
    case 503:
      return APIErrorCode.SERVICE_UNAVAILABLE;
    default:
      if (status >= 500) {
        return APIErrorCode.INTERNAL_SERVER_ERROR;
      }
      if (status >= 400) {
        return APIErrorCode.BAD_REQUEST;
      }
      return APIErrorCode.NETWORK_ERROR;
  }
}