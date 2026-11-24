import { extractEmbeddedQuestionMeta, isTextbookQuestion, safeParseLogicFlow } from './logic-flow';
import { formatSourceSummary, normalizeTags, parseQuestionSource } from './question-meta';
import type { PassageType, Question } from '../types';

export interface RawQuestionRecord {
    id: number;
    exam_code?: string | null;
    examCode?: string | null;
    target_grade?: string | null;
    targetGrade?: string | null;
    source_year?: string | null;
    sourceYear?: string | null;
    source_grade?: string | null;
    sourceGrade?: string | null;
    source_month?: string | null;
    sourceMonth?: string | null;
    source_number?: string | null;
    sourceNumber?: string | null;
    tags?: unknown;
    topic?: string | null;
    logic_flow?: Question['logicFlow'] | null;
    logicFlow?: Question['logicFlow'] | null;
    passage?: string | null;
    passage_type?: PassageType | null;
    passageType?: PassageType | null;
}

export interface QuestionFallbackMeta {
    passageType?: PassageType;
    tags?: string[];
    sourceYear?: string;
    sourceGrade?: string;
    sourceMonth?: string;
    sourceNumber?: string;
}

export function mapQuestionRecord(
    item: RawQuestionRecord,
    fallback?: QuestionFallbackMeta
): Question {
    const topic = item.topic ?? '';
    const rawFlow = item.logic_flow ?? item.logicFlow ?? undefined;
    const embedded = extractEmbeddedQuestionMeta(rawFlow);
    const cleanFlow = safeParseLogicFlow(rawFlow);
    const explicitType =
        item.passage_type ?? item.passageType ?? embedded?.passageType ?? fallback?.passageType;
    const passageType: PassageType = isTextbookQuestion({
        passageType: explicitType,
        topic,
        logicFlow: rawFlow,
    })
        ? 'textbook'
        : 'csat';

    const examCode = item.exam_code || item.examCode || '';
    const rawTargetGrade = (item.target_grade ?? item.targetGrade ?? '').trim();
    const rawSourceNumber =
        (item.source_number ?? item.sourceNumber ?? '').trim() ||
        embedded?.sourceNumber ||
        fallback?.sourceNumber;

    const parsedSource = parseQuestionSource({
        sourceYear:
            (item.source_year ?? item.sourceYear ?? '').trim() ||
            embedded?.sourceYear ||
            fallback?.sourceYear,
        sourceGrade:
            (item.source_grade ?? item.sourceGrade ?? '').trim() ||
            embedded?.sourceGrade ||
            fallback?.sourceGrade,
        sourceMonth:
            (item.source_month ?? item.sourceMonth ?? '').trim() ||
            embedded?.sourceMonth ||
            fallback?.sourceMonth,
        sourceNumber: rawSourceNumber || undefined,
        targetGrade: rawTargetGrade,
    });

    const nativeTags = normalizeTags(item.tags);
    const embeddedTags = normalizeTags(embedded?.tags);
    const fallbackTags = normalizeTags(fallback?.tags);
    const tags =
        nativeTags.length > 0
            ? nativeTags
            : embeddedTags.length > 0
                ? embeddedTags
                : fallbackTags;

    const formattedSource = formatSourceSummary(parsedSource);

    return {
        id: item.id,
        examCode,
        targetGrade: formattedSource || rawTargetGrade,
        sourceYear: parsedSource.sourceYear,
        sourceGrade: parsedSource.sourceGrade,
        sourceMonth: parsedSource.sourceMonth,
        sourceNumber: parsedSource.sourceNumber,
        tags,
        topic,
        logicFlow: cleanFlow,
        passage: item.passage || '',
        passageType: explicitType ?? passageType,
    };
}
