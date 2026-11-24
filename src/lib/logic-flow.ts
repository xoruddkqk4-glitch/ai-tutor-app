import type { LogicFlowStep, PassageType } from '../types';

export interface QuestionEmbeddedMeta {
    __meta: true;
    tags?: string[];
    sourceYear?: string;
    sourceGrade?: string;
    sourceMonth?: string;
    sourceNumber?: string;
    passageType?: PassageType;
}

export function isEmbeddedMetaItem(item: unknown): item is QuestionEmbeddedMeta {
    return (
        typeof item === 'object' &&
        item !== null &&
        '__meta' in item &&
        (item as { __meta?: unknown }).__meta === true
    );
}

/**
 * DB에 신규 컬럼이 없을 때 logic_flow JSON 배열 끝에 저장한 메타 정보를 추출합니다.
 */
export function extractEmbeddedQuestionMeta(logicFlow: unknown): QuestionEmbeddedMeta | null {
    if (!logicFlow) return null;

    let items: unknown[] | null = null;
    if (Array.isArray(logicFlow)) {
        items = logicFlow;
    } else if (typeof logicFlow === 'string') {
        const trimmed = logicFlow.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) items = parsed;
            } catch {
                items = null;
            }
        }
    }

    if (!items) return null;
    for (const item of items) {
        if (isEmbeddedMetaItem(item)) {
            return item;
        }
    }
    return null;
}

/**
 * logic_flow 배열에 메타 엔트리를 덧붙여 폴백 저장용 배열을 생성합니다.
 */
export function attachEmbeddedQuestionMeta(
    steps: LogicFlowStep[],
    meta: Omit<QuestionEmbeddedMeta, '__meta'>
): unknown[] {
    const cleanMeta: QuestionEmbeddedMeta = { __meta: true };
    if (meta.tags && meta.tags.length > 0) cleanMeta.tags = meta.tags;
    if (meta.sourceYear) cleanMeta.sourceYear = meta.sourceYear;
    if (meta.sourceGrade) cleanMeta.sourceGrade = meta.sourceGrade;
    if (meta.sourceMonth) cleanMeta.sourceMonth = meta.sourceMonth;
    if (meta.sourceNumber) cleanMeta.sourceNumber = meta.sourceNumber;
    if (meta.passageType) cleanMeta.passageType = meta.passageType;

    const hasMetaFields =
        Boolean(cleanMeta.tags?.length) ||
        Boolean(cleanMeta.sourceYear) ||
        Boolean(cleanMeta.sourceGrade) ||
        Boolean(cleanMeta.sourceMonth) ||
        Boolean(cleanMeta.sourceNumber) ||
        Boolean(cleanMeta.passageType);

    return hasMetaFields ? [...steps, cleanMeta] : [...steps];
}

/**
 * DB/JSON 등에서 논리 흐름을 LogicFlowStep 배열로 정규화합니다.
 */
export function safeParseLogicFlow(logicFlow: unknown): LogicFlowStep[] {
    if (!logicFlow) return [];

    let steps: unknown[] = [];
    if (Array.isArray(logicFlow)) {
        steps = logicFlow.filter(item => !isEmbeddedMetaItem(item));
    } else {
        const trimmed = String(logicFlow).trim();
        let isJsonArray = false;
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    isJsonArray = true;
                    steps = parsed.filter(item => !isEmbeddedMetaItem(item));
                }
            } catch (e) {
                console.error('JSON parse failed for logicFlow:', e);
            }
        }
        if (!isJsonArray && steps.length === 0 && trimmed) {
            steps = trimmed.split(/\r?\n| -> /).filter(s => s.trim());
        }
    }

    return steps.map(step => {
        if (typeof step === 'object' && step !== null && ('role' in step || 'content' in step)) {
            const o = step as Record<string, unknown>;
            return {
                macroLabel: String(o.macroLabel ?? o.macro_label ?? '').trim() || undefined,
                role: String(o.role ?? ''),
                conjunction: String(o.conjunction ?? ''),
                content: String(o.content ?? ''),
            };
        }

        const str = String(step).trim();
        const regex = /^\[(.*?)\]\s*(.*?)\s*(?:\((.*?)\))?$/;
        const match = str.match(regex);

        if (match) {
            return {
                role: match[1] || '',
                content: match[2] || '',
                conjunction: match[3] || '',
            };
        }

        return { role: '', conjunction: '', content: str };
    });
}

/**
 * 큰 범주 라벨 순서.
 * - macroLabel이 있으면 연속 동일 값은 한 덩어리.
 * - macroLabel이 비어 있으면(구형 데이터) 해당 행은 role로 한 덩어리 처리.
 */
export function getMacroOrderedLabels(steps: LogicFlowStep[]): string[] {
    const labels: string[] = [];
    let i = 0;
    while (i < steps.length) {
        const m = steps[i].macroLabel?.trim();
        if (m) {
            labels.push(m);
            const block = m;
            i++;
            while (i < steps.length && steps[i].macroLabel?.trim() === block) i++;
        } else {
            labels.push(steps[i].role?.trim() || '역할미정');
            i++;
        }
    }
    return labels;
}

/** 세부 단계 수보다 큰 범주 덩어리 수가 적을 때만 true (선택적 거시 구조 사용 중) */
export function hasMacroRefinement(steps: LogicFlowStep[]): boolean {
    return steps.length > 0 && getMacroOrderedLabels(steps).length < steps.length;
}

/** 컨텍스트용: 큰 범주별로 묶인 작은 범주(선택) 나열 */
export function getMacroBlocksDescription(steps: LogicFlowStep[]): string {
    const lines: string[] = [];
    let i = 0;
    let blockNum = 1;
    while (i < steps.length) {
        const m = steps[i].macroLabel?.trim();
        if (m) {
            const roles: string[] = [];
            const block = m;
            while (i < steps.length && steps[i].macroLabel?.trim() === block) {
                roles.push(steps[i].role?.trim() || '(작은 범주 없음)');
                i++;
            }
            lines.push(`${blockNum}. [${block}] → 작은 범주: ${roles.map(r => `[${r}]`).join(', ')}`);
        } else {
            const r = steps[i].role?.trim() || '역할미정';
            lines.push(`${blockNum}. [${r}] → 작은 범주: [${r}] (큰 범주 미지정·구형 데이터)`);
            i++;
        }
        blockNum++;
    }
    return lines.join('\n');
}

/** 저장: 큰 범주·중심 의미 필수, 작은 범주(role)·연결어 선택 */
export function normalizeFlowStepsForSave(steps: LogicFlowStep[]): LogicFlowStep[] {
    return steps
        .filter(s => s.macroLabel?.trim() && s.content.trim())
        .map(s => ({
            macroLabel: s.macroLabel!.trim(),
            role: s.role?.trim() ?? '',
            content: s.content.trim(),
            conjunction: s.conjunction?.trim() ?? '',
        }));
}

/** 일부만 입력되고 필수 필드(큰 범주·중심 의미)가 비어 있는 행의 1-based 인덱스 목록 반환 */
export function findIncompleteFlowStepIndices(steps: LogicFlowStep[]): number[] {
    const incomplete: number[] = [];
    steps.forEach((step, idx) => {
        const hasAnyInput = Boolean(
            step.macroLabel?.trim() ||
            step.role?.trim() ||
            step.conjunction?.trim() ||
            step.content?.trim()
        );
        if (!hasAnyInput) return;
        if (!step.macroLabel?.trim() || !step.content?.trim()) {
            incomplete.push(idx + 1);
        }
    });
    return incomplete;
}

/**
 * 문항의 지문 유형이 교과서 지문인지 판별합니다.
 * passageType이 명시되지 않은 구형 데이터는 주제·논리 흐름이 모두 비어 있을 때 교과서 지문으로 간주합니다.
 */
export function isTextbookQuestion(
    q: { passageType?: 'csat' | 'textbook'; topic?: string; logicFlow?: unknown } | null | undefined
): boolean {
    if (!q) return false;
    if (q.passageType === 'textbook') return true;
    if (q.passageType === 'csat') return false;
    const embeddedType = extractEmbeddedQuestionMeta(q.logicFlow)?.passageType;
    if (embeddedType === 'textbook') return true;
    if (embeddedType === 'csat') return false;
    const hasTopic = Boolean(q.topic && q.topic.trim());
    const hasFlow = safeParseLogicFlow(q.logicFlow).length > 0;
    return !hasTopic && !hasFlow;
}

/**
 * 논리 흐름 배열/문자열을 읽기 쉬운 한 줄 요약으로 변환합니다.
 */
export function summarizeLogicFlow(logicFlow: unknown, isTextbook = false): string {
    if (isTextbook) return '해당 없음 (교과서 지문)';
    const steps = safeParseLogicFlow(logicFlow);
    if (steps.length === 0) return '-';
    return steps
        .map((s) => `[${s.role?.trim() || s.macroLabel?.trim() || '단계'}] ${s.content}`)
        .join(' → ');
}
