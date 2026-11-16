export const PRIMARY_QUESTION_TAGS = [
    '논리지문',
    '반전지문',
    '반론지문',
    '문제와해결책',
] as const;

export const SECONDARY_QUESTION_TAGS = [
    '예시',
    '인용',
    '실험',
    '비유',
    '대조',
] as const;

export const GRADE_PRESETS = ['고1', '고2', '고3'] as const;

export const MONTH_PRESETS = [
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '9월',
    '10월',
    '11월',
    '수능',
    '교과서',
    'EBS',
] as const;

export function getYearPresets(): string[] {
    const maxYear = new Date().getFullYear() + 1;
    const years: string[] = [];
    for (let y = maxYear; y >= 2015; y--) {
        years.push(String(y));
    }
    return years;
}

export function normalizeYear(raw?: string | null): string {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) return '';

    const fullMatch = trimmed.match(/^(20\d{2})\s*(?:학년도|년)?$/);
    if (fullMatch) return fullMatch[1];

    const shortMatch = trimmed.match(/^(\d{2})\s*년$/);
    if (shortMatch) return `20${shortMatch[1]}`;

    return trimmed;
}

export function normalizeGrade(raw?: string | null): string {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) return '';

    const highMatch = trimmed.match(/^고\s*([1-3])(?:\s*학년)?$/);
    if (highMatch) return `고${highMatch[1]}`;

    const gradeOnlyMatch = trimmed.match(/^([1-3])\s*학년$/);
    if (gradeOnlyMatch) return `고${gradeOnlyMatch[1]}`;

    return trimmed;
}

export function normalizeMonth(raw?: string | null): string {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) return '';

    if (trimmed === '대학수학능력시험' || trimmed === '대수능') {
        return '수능';
    }

    const monthMatch = trimmed.match(/^(1[0-2]|0?[1-9])\s*월?$/);
    if (monthMatch) {
        return `${Number(monthMatch[1])}월`;
    }

    return trimmed;
}

export function normalizeTags(raw?: unknown): string[] {
    let items: string[] = [];
    if (Array.isArray(raw)) {
        items = raw.map((item) => String(item ?? ''));
    } else if (typeof raw === 'string') {
        items = raw.split(',');
    } else {
        return [];
    }

    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of items) {
        const cleaned = item.trim().replace(/^#+/, '').trim();
        if (!cleaned || seen.has(cleaned)) continue;
        seen.add(cleaned);
        result.push(cleaned);
    }
    return result;
}

export function getTagCategory(tag: string): 'primary' | 'secondary' | 'custom' {
    if ((PRIMARY_QUESTION_TAGS as readonly string[]).includes(tag)) return 'primary';
    if ((SECONDARY_QUESTION_TAGS as readonly string[]).includes(tag)) return 'secondary';
    return 'custom';
}

export interface ParsedQuestionSource {
    sourceYear: string;
    sourceGrade: string;
    sourceMonth: string;
    questionNumber: string;
}

export function parseQuestionSource(q: {
    sourceYear?: string | null;
    sourceGrade?: string | null;
    sourceMonth?: string | null;
    questionNumber?: string | null;
    targetGrade?: string | null;
    examCode?: string | null;
}): ParsedQuestionSource {
    const questionNumber = (q.questionNumber ?? q.examCode ?? '').trim();
    const explicitYear = normalizeYear(q.sourceYear);
    const explicitGrade = normalizeGrade(q.sourceGrade);
    const explicitMonth = normalizeMonth(q.sourceMonth);

    if (explicitYear || explicitGrade || explicitMonth) {
        return {
            sourceYear: explicitYear,
            sourceGrade: explicitGrade,
            sourceMonth: explicitMonth,
            questionNumber,
        };
    }

    let remaining = (q.targetGrade ?? '').trim();
    let sourceYear = '';
    let sourceGrade = '';
    let sourceMonth = '';

    if (remaining) {
        const fullYearMatch = remaining.match(/(20\d{2})\s*(?:학년도|년)?/);
        if (fullYearMatch) {
            sourceYear = fullYearMatch[1];
            remaining = remaining.replace(fullYearMatch[0], ' ');
        } else {
            const shortYearMatch = remaining.match(/(?:^|\s)(\d{2})\s*년(?=\s|$)/);
            if (shortYearMatch) {
                sourceYear = `20${shortYearMatch[1]}`;
                remaining = remaining.replace(shortYearMatch[0], ' ');
            }
        }

        const gradeMatch = remaining.match(/(?:고\s*([1-3])(?:\s*학년)?|([1-3])\s*학년)/);
        if (gradeMatch) {
            const digit = gradeMatch[1] || gradeMatch[2];
            sourceGrade = `고${digit}`;
            remaining = remaining.replace(gradeMatch[0], ' ');
        }

        const monthMatch = remaining.match(/(1[0-2]|0?[1-9])\s*월/);
        if (monthMatch) {
            sourceMonth = `${Number(monthMatch[1])}월`;
            remaining = remaining.replace(monthMatch[0], ' ');
        } else {
            const csatMatch = remaining.match(/(?:^|[\s,])(대학수학능력시험|대수능|수능)(?=[\s,]|$)/);
            if (csatMatch) {
                sourceMonth = '수능';
                remaining = remaining.replace(csatMatch[1], ' ');
            }
        }

        const leftover = remaining.replace(/\s+/g, ' ').trim();
        if (!sourceMonth && leftover) {
            sourceMonth = leftover;
        }
    }

    if (!sourceYear && q.examCode) {
        const examYearMatch = q.examCode.trim().match(/^(20\d{2})(?=[-.\s]|$)/);
        if (examYearMatch) {
            sourceYear = examYearMatch[1];
        }
    }

    return {
        sourceYear,
        sourceGrade,
        sourceMonth,
        questionNumber,
    };
}

export function formatSourceSummary(source: {
    sourceYear?: string | null;
    sourceGrade?: string | null;
    sourceMonth?: string | null;
}): string {
    const year = normalizeYear(source.sourceYear);
    const grade = normalizeGrade(source.sourceGrade);
    const month = normalizeMonth(source.sourceMonth);

    const yearLabel = year ? (/^\d{4}$/.test(year) ? `${year}년` : year) : '';
    return [yearLabel, grade, month].filter(Boolean).join(' ');
}

export function matchesQuestionNumberFilter(targetNumber: string, filterQuery: string): boolean {
    const query = filterQuery.trim();
    if (!query) return true;

    if (/^\d+번$/.test(query)) {
        const expected = Number(query.slice(0, -1));
        const tokens = targetNumber.match(/\d+/g) ?? [];
        return tokens.some((tok) => Number(tok) === expected);
    }

    const normTarget = targetNumber.replace(/번|\s+/g, '').toLowerCase();
    const normQuery = query.replace(/번|\s+/g, '').toLowerCase();
    if (!normQuery) return true;

    return normTarget.includes(normQuery);
}

const CUSTOM_TAGS_STORAGE_PREFIX = 'ai_tutor_custom_tags_';

export function loadSavedCustomTags(teacherId: string): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(`${CUSTOM_TAGS_STORAGE_PREFIX}${teacherId || 'default'}`);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        return normalizeTags(parsed).filter((tag) => getTagCategory(tag) === 'custom');
    } catch {
        return [];
    }
}

export function saveCustomTagsToStorage(teacherId: string, tags: string[]): void {
    if (typeof window === 'undefined') return;
    try {
        const customOnly = normalizeTags(tags).filter((tag) => getTagCategory(tag) === 'custom');
        window.localStorage.setItem(
            `${CUSTOM_TAGS_STORAGE_PREFIX}${teacherId || 'default'}`,
            JSON.stringify(customOnly)
        );
    } catch {
        // Ignore storage quota or private mode errors
    }
}
