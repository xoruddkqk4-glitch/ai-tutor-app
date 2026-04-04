import type { LogicFlowStep } from '../types';

/**
 * DB/JSON 등에서 논리 흐름을 LogicFlowStep 배열로 정규화합니다.
 */
export function safeParseLogicFlow(logicFlow: unknown): LogicFlowStep[] {
    if (!logicFlow) return [];

    let steps: unknown[] = [];
    if (Array.isArray(logicFlow)) {
        steps = logicFlow;
    } else {
        const trimmed = String(logicFlow).trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) steps = parsed;
            } catch (e) {
                console.error('JSON parse failed for logicFlow:', e);
            }
        }
        if (steps.length === 0 && trimmed) {
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
