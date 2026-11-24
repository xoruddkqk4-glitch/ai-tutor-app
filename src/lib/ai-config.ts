export const DEFAULT_AI_MODEL = 'gpt-6-sol';

export const AI_MODEL: string =
    (import.meta.env.VITE_AI_MODEL as string | undefined)?.trim() || DEFAULT_AI_MODEL;

export type AiRequestKind = 'tutoring' | 'simple';
export type ReasoningEffort = 'none' | 'low';

export const REASONING_BY_KIND: Record<AiRequestKind, ReasoningEffort> = {
    tutoring: 'low',
    simple: 'none',
};

export const MAX_COMPLETION_TOKENS_BY_KIND: Record<AiRequestKind, number> = {
    tutoring: 1500,
    simple: 1000,
};

export function isReasoningModel(model: string): boolean {
    return /^(?:gpt-[56]|o[134])/i.test(model.trim());
}
