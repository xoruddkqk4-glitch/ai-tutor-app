import { supabase } from './supabase';

export type ChatApiMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

export interface RequestAiCompletionParams {
    roomCode: string;
    apiKey?: string;
    hasApiKey?: boolean;
    messages: ChatApiMessage[];
    model?: string;
    temperature?: number;
}

/**
 * 현재 방에서 AI 응답 호출이 가능한지(클라이언트 키 또는 서버 프록시 사용 여부) 판단합니다.
 */
export function canUseRoomAi(room: { api_key?: string; has_api_key?: boolean } | null): boolean {
    return Boolean(
        room?.api_key?.trim() ||
        room?.has_api_key ||
        import.meta.env.VITE_USE_AI_PROXY === 'true'
    );
}

/**
 * OpenAI Chat Completions 호출을 통합 처리합니다.
 * Edge Function 프록시(`ai-chat`) 또는 기존 클라이언트 키 직접 호출을 모두 지원합니다.
 */
export async function requestAiCompletion(params: RequestAiCompletionParams): Promise<string> {
    const model = params.model ?? 'gpt-4o';
    const temperature = params.temperature ?? 0.7;
    const forceProxy = import.meta.env.VITE_USE_AI_PROXY === 'true';
    const useProxy = forceProxy || Boolean(params.hasApiKey && !params.apiKey?.trim());

    if (useProxy) {
        const { data, error } = await supabase.functions.invoke<{ content?: string; error?: string }>('ai-chat', {
            body: {
                roomCode: params.roomCode,
                messages: params.messages,
                model,
                temperature,
            },
        });

        if (!error && data?.content?.trim()) {
            return data.content;
        }

        if (forceProxy || !params.apiKey?.trim()) {
            throw new Error(error?.message || data?.error || 'AI 서버 응답 오류가 발생했습니다.');
        }
    }

    if (!params.apiKey?.trim()) {
        throw new Error('API 키가 설정되지 않았습니다.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${params.apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: params.messages,
            temperature,
        }),
    });

    const data = (await response.json().catch(() => null)) as {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
    } | null;

    if (!response.ok) {
        throw new Error(data?.error?.message || `OpenAI API 요청 실패 (HTTP ${response.status})`);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content?.trim()) {
        throw new Error('AI 응답 내용이 비어 있습니다.');
    }

    return content;
}
