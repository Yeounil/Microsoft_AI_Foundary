/**
 * 에러 핸들링 유틸리티
 * API 에러를 사용자 친화적인 메시지로 변환
 */

import { AxiosError } from 'axios';

// 에러 코드별 메시지 매핑
const ERROR_MESSAGES: Record<number, string> = {
  400: '잘못된 요청입니다. 입력 값을 확인해주세요.',
  401: '로그인이 필요합니다.',
  403: '접근 권한이 없습니다.',
  404: '요청한 리소스를 찾을 수 없습니다.',
  409: '이미 존재하는 데이터입니다.',
  422: '입력 값이 올바르지 않습니다.',
  429: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.',
  500: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  502: '서버에 연결할 수 없습니다.',
  503: '서비스를 일시적으로 사용할 수 없습니다.',
  504: '서버 응답 시간이 초과되었습니다.',
};

// 네트워크 에러 메시지
const NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인해주세요.';
const TIMEOUT_ERROR_MESSAGE = '요청 시간이 초과되었습니다.';
const UNKNOWN_ERROR_MESSAGE = '알 수 없는 오류가 발생했습니다.';

export interface ParsedError {
  message: string;
  code?: number;
  details?: string;
  isNetworkError: boolean;
  isAuthError: boolean;
  isServerError: boolean;
}

/**
 * 에러를 파싱하여 사용자 친화적인 정보 반환
 */
export function parseError(error: unknown): ParsedError {
  // Axios 에러
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: string; message?: string }>;

    // 네트워크 에러
    if (!axiosError.response) {
      if (axiosError.code === 'ECONNABORTED') {
        return {
          message: TIMEOUT_ERROR_MESSAGE,
          isNetworkError: true,
          isAuthError: false,
          isServerError: false,
        };
      }
      return {
        message: NETWORK_ERROR_MESSAGE,
        isNetworkError: true,
        isAuthError: false,
        isServerError: false,
      };
    }

    const status = axiosError.response.status;
    const data = axiosError.response.data;

    // 서버에서 제공한 상세 메시지
    const serverMessage = data?.detail || data?.message;

    // 상태 코드별 메시지
    const defaultMessage = ERROR_MESSAGES[status] || UNKNOWN_ERROR_MESSAGE;

    return {
      message: serverMessage || defaultMessage,
      code: status,
      details: serverMessage,
      isNetworkError: false,
      isAuthError: status === 401 || status === 403,
      isServerError: status >= 500,
    };
  }

  // 일반 Error 객체
  if (error instanceof Error) {
    return {
      message: error.message || UNKNOWN_ERROR_MESSAGE,
      isNetworkError: false,
      isAuthError: false,
      isServerError: false,
    };
  }

  // 문자열 에러
  if (typeof error === 'string') {
    return {
      message: error,
      isNetworkError: false,
      isAuthError: false,
      isServerError: false,
    };
  }

  // 알 수 없는 에러
  return {
    message: UNKNOWN_ERROR_MESSAGE,
    isNetworkError: false,
    isAuthError: false,
    isServerError: false,
  };
}

/**
 * 에러 메시지만 추출
 */
export function getErrorMessage(error: unknown): string {
  return parseError(error).message;
}

/**
 * Axios 에러인지 확인
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * 에러 로깅
 */
export function logError(error: unknown, context?: string): void {
  const parsed = parseError(error);
  const prefix = context ? `[${context}]` : '';

  if (parsed.isServerError) {
    console.error(`${prefix} Server Error:`, error);
  } else if (parsed.isNetworkError) {
    console.warn(`${prefix} Network Error:`, parsed.message);
  } else {
    console.error(`${prefix} Error:`, error);
  }

  // TODO: Sentry 등 에러 트래킹 서비스로 전송
  // if (parsed.isServerError || !parsed.isNetworkError) {
  //   Sentry.captureException(error, { extra: { context, parsed } });
  // }
}

/**
 * API 호출을 래핑하여 에러 처리
 */
export async function withErrorHandling<T>(
  apiCall: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    logError(error, context);
    throw error;
  }
}
