/**
 * 알 수 없는 오류 객체에서 사용자에게 표시할 오류 메시지를 안전하게 추출합니다.
 */
export function getErrorMessage(error: unknown, fallback = '알 수 없는 오류가 발생했습니다.'): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
    ) {
        const msg = (error as { message: string }).message.trim();
        if (msg) return msg;
    }

    if (typeof error === 'string' && error.trim()) {
        return error.trim();
    }

    return fallback;
}
