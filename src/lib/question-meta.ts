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

    const shortMatch = trimmed.match(/^(\d{2})\s*(?:학년도|년)$/);
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

export function normalizeSourceNumber(raw?: string | null): string {
    const trimmed = (raw ?? '').replace(/\s+/g, ' ').trim();
    if (!trimmed) return '';

    const numRangeMatch = trimmed.match(/^(?:#|No\.?\s*)?(\d{1,3}(?:\s*[~-]\s*\d{1,3})?)(?:\s*번)?$/i);
    if (numRangeMatch) {
        return `${numRangeMatch[1].replace(/\s+/g, '')}번`;
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
    sourceNumber: string;
}

function parseLegacyTargetGrade(targetGrade: string): ParsedQuestionSource {
    let remaining = targetGrade.trim();
    let sourceYear = '';
    let sourceGrade = '';
    let sourceMonth = '';
    let sourceNumber = '';

    if (!remaining) {
        return { sourceYear, sourceGrade, sourceMonth, sourceNumber };
    }

    const fullYearMatch = remaining.match(/(20\d{2})\s*(?:학년도|년)?/);
    if (fullYearMatch) {
        sourceYear = fullYearMatch[1];
        remaining = remaining.replace(fullYearMatch[0], ' ');
    } else {
        const shortYearMatch = remaining.match(/(?<!\d)(\d{2})\s*(?:학년도|년)/);
        if (shortYearMatch) {
            sourceYear = `20${shortYearMatch[1]}`;
            remaining = remaining.replace(shortYearMatch[0], ' ');
        }
    }

    const gradeMatch = remaining.match(/(?:고\s*([1-3])(?:\s*학년)?|(?<!\d)([1-3])\s*학년)/);
    if (gradeMatch) {
        const digit = gradeMatch[1] || gradeMatch[2];
        sourceGrade = `고${digit}`;
        remaining = remaining.replace(gradeMatch[0], ' ');
    }

    const monthMatch = remaining.match(/(?<!\d)(1[0-2]|0?[1-9])\s*월/);
    if (monthMatch) {
        sourceMonth = `${Number(monthMatch[1])}월`;
        remaining = remaining.replace(monthMatch[0], ' ');
    } else {
        const csatMatch = remaining.match(/(대학수학능력시험|대수능|수능)(?!특강|완성)/);
        if (csatMatch) {
            sourceMonth = '수능';
            remaining = remaining.replace(csatMatch[1], ' ');
        }
    }

    if (sourceYear || sourceGrade || sourceMonth) {
        remaining = remaining.replace(/(?:전국연합학력평가|전국연합|학력평가|모의평가|모의고사|평가원|모평|학평)/g, ' ');
    }

    const explicitNumMatch = remaining.match(/(?:문항\s*)?(?:#|No\.?\s*)?(?<!\d)(\d{1,3}(?:\s*[~-]\s*\d{1,3})?)\s*번/i);
    if (explicitNumMatch) {
        sourceNumber = `${explicitNumMatch[1].replace(/\s+/g, '')}번`;
        remaining = remaining.replace(explicitNumMatch[0], ' ');
    } else if (sourceYear || sourceGrade || sourceMonth) {
        const prefixedNumMatch = remaining.match(/(?:#|No\.?\s*)(?<!\d)(\d{1,3}(?:\s*[~-]\s*\d{1,3})?)(?!\d)/i);
        if (prefixedNumMatch) {
            sourceNumber = `${prefixedNumMatch[1].replace(/\s+/g, '')}번`;
            remaining = remaining.replace(prefixedNumMatch[0], ' ');
        } else {
            const bareNumMatch = remaining.match(/(?:^|\s)(\d{1,3}(?:\s*[~-]\s*\d{1,3})?)(?=\s|$)/);
            if (bareNumMatch) {
                sourceNumber = `${bareNumMatch[1].replace(/\s+/g, '')}번`;
                remaining = remaining.replace(bareNumMatch[0], ' ');
            }
        }
    }

    const leftover = remaining
        .replace(/^[\s,·•/|\\-]+|[\s,·•/|\\-]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (leftover) {
        if (!sourceMonth) {
            sourceMonth = leftover;
        } else if (!sourceNumber) {
            sourceNumber = leftover;
        } else {
            sourceMonth = `${sourceMonth} ${leftover}`;
        }
    }

    return {
        sourceYear,
        sourceGrade,
        sourceMonth,
        sourceNumber,
    };
}

function extractExplicitNumberFromLegacy(targetGrade: string): string {
    const trimmed = targetGrade.trim();
    if (!trimmed) return '';

    const explicitNumMatch = trimmed.match(/(?:문항\s*)?(?:#|No\.?\s*)?(?<!\d)(\d{1,3}(?:\s*[~-]\s*\d{1,3})?)\s*번/i);
    if (explicitNumMatch) {
        return `${explicitNumMatch[1].replace(/\s+/g, '')}번`;
    }

    const prefixedNumMatch = trimmed.match(/(?:#|No\.?\s*)(?<!\d)(\d{1,3}(?:\s*[~-]\s*\d{1,3})?)(?!\d)/i);
    if (prefixedNumMatch) {
        return `${prefixedNumMatch[1].replace(/\s+/g, '')}번`;
    }

    return '';
}

export function parseQuestionSource(q: {
    sourceYear?: string | null;
    sourceGrade?: string | null;
    sourceMonth?: string | null;
    sourceNumber?: string | null;
    targetGrade?: string | null;
}): ParsedQuestionSource {
    const explicitYear = normalizeYear(q.sourceYear);
    const explicitGrade = normalizeGrade(q.sourceGrade);
    const explicitMonth = normalizeMonth(q.sourceMonth);
    const explicitNumber = normalizeSourceNumber(q.sourceNumber);

    if (explicitYear || explicitGrade || explicitMonth || explicitNumber) {
        let fallbackNumber = '';
        if (!explicitNumber && q.sourceNumber === undefined && q.targetGrade) {
            fallbackNumber = extractExplicitNumberFromLegacy(q.targetGrade);
        }
        return {
            sourceYear: explicitYear,
            sourceGrade: explicitGrade,
            sourceMonth: explicitMonth,
            sourceNumber: explicitNumber || fallbackNumber,
        };
    }

    return parseLegacyTargetGrade(q.targetGrade ?? '');
}

export function formatSourceSummary(source: {
    sourceYear?: string | null;
    sourceGrade?: string | null;
    sourceMonth?: string | null;
    sourceNumber?: string | null;
}): string {
    const year = normalizeYear(source.sourceYear);
    const grade = normalizeGrade(source.sourceGrade);
    const month = normalizeMonth(source.sourceMonth);
    const num = normalizeSourceNumber(source.sourceNumber);

    const yearLabel = year ? (/^\d{4}$/.test(year) ? `${year}년` : year) : '';
    return [yearLabel, grade, month, num].filter(Boolean).join(' ');
}

function expandNumberToken(startStr: string, endStr?: string): number[] {
    const start = Number(startStr);
    if (!Number.isFinite(start)) return [];
    if (!endStr) return [start];
    const end = Number(endStr);
    if (!Number.isFinite(end) || end < start || end - start > 50) {
        return [start, ...(Number.isFinite(end) ? [end] : [])];
    }
    const result: number[] = [];
    for (let n = start; n <= end; n++) {
        result.push(n);
    }
    return result;
}

function extractQuestionNumbers(str: string): number[] {
    const trimmed = str.trim();
    if (!trimmed) return [];

    const bareMatch = trimmed.match(/^(\d{1,3})(?:\s*[~-]\s*(\d{1,3}))?$/);
    if (bareMatch) {
        return expandNumberToken(bareMatch[1], bareMatch[2]);
    }

    const result: number[] = [];
    const regex = /(\d{1,3})(?:\s*[~-]\s*(\d{1,3}))?\s*번/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(trimmed)) !== null) {
        result.push(...expandNumberToken(match[1], match[2]));
    }
    return result;
}

export function matchesQuestionNumberFilter(targetNumber: string, filterQuery: string): boolean {
    const query = filterQuery.trim();
    if (!query) return true;

    if (/^\d+번$/.test(query)) {
        const expected = Number(query.slice(0, -1));
        return extractQuestionNumbers(targetNumber).includes(expected);
    }

    if (/^\d+$/.test(query)) {
        const expected = Number(query);
        return extractQuestionNumbers(targetNumber).includes(expected);
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
