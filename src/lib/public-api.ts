import { supabase } from './supabase';
import { extractEmbeddedQuestionMeta, isTextbookQuestion, safeParseLogicFlow } from './logic-flow';
import { formatSourceSummary, normalizeTags, parseQuestionSource } from './question-meta';
import type { Student, Question, PassageType, RoomPublicInfo } from '../types';

interface RawRpcStudent {
    id: number;
    class?: string | null;
    className?: string | null;
    number?: string | number | null;
    name?: string | null;
    competency?: string | null;
}

interface RawRpcQuestion {
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
    tags?: unknown;
    topic?: string | null;
    logic_flow?: Question['logicFlow'] | null;
    logicFlow?: Question['logicFlow'] | null;
    passage?: string | null;
    passage_type?: PassageType | null;
    passageType?: PassageType | null;
}

interface RawRpcResponse {
    room?: RoomPublicInfo | null;
    students?: RawRpcStudent[] | null;
    questions?: RawRpcQuestion[] | null;
}

export async function fetchRoomData(code: string): Promise<{
    room: RoomPublicInfo | null;
    students: Student[];
    questions: Question[];
}> {
    const { data, error } = await supabase
        .rpc('get_active_room_data', { p_code: code });

    if (error) throw error;

    const payload = (data ?? null) as RawRpcResponse | null;

    const rawQuestions = payload?.questions ?? [];
    const mappedQuestions: Question[] = rawQuestions.map((q) => {
        const topicStr = q.topic ?? '';
        const rawFlow = q.logic_flow ?? q.logicFlow ?? undefined;
        const embedded = extractEmbeddedQuestionMeta(rawFlow);
        const cleanFlow = safeParseLogicFlow(rawFlow);
        const explicitType = q.passage_type ?? q.passageType ?? embedded?.passageType ?? undefined;
        const derivedType: PassageType = isTextbookQuestion({
            passageType: explicitType,
            topic: topicStr,
            logicFlow: rawFlow,
        })
            ? 'textbook'
            : 'csat';

        const examCode = q.exam_code || q.examCode || '';
        const rawTargetGrade = q.target_grade || q.targetGrade || '';
        const parsedSource = parseQuestionSource({
            sourceYear: (q.source_year ?? q.sourceYear ?? '').trim() || embedded?.sourceYear,
            sourceGrade: (q.source_grade ?? q.sourceGrade ?? '').trim() || embedded?.sourceGrade,
            sourceMonth: (q.source_month ?? q.sourceMonth ?? '').trim() || embedded?.sourceMonth,
            questionNumber: embedded?.questionNumber ?? examCode,
            targetGrade: rawTargetGrade,
            examCode,
        });
        const nativeTags = normalizeTags(q.tags);
        const embeddedTags = normalizeTags(embedded?.tags);
        const tags = nativeTags.length > 0 ? nativeTags : embeddedTags;
        const targetGrade = rawTargetGrade.trim() || formatSourceSummary(parsedSource);

        return {
            id: q.id,
            examCode,
            questionNumber: parsedSource.questionNumber || examCode,
            targetGrade,
            sourceYear: parsedSource.sourceYear,
            sourceGrade: parsedSource.sourceGrade,
            sourceMonth: parsedSource.sourceMonth,
            tags,
            topic: topicStr,
            logicFlow: cleanFlow,
            passage: q.passage || '',
            passageType: explicitType ?? derivedType,
        };
    });

    const mappedStudents: Student[] = (payload?.students ?? []).map((s) => {
        const classStr = String(s.class ?? s.className ?? '');
        return {
            id: Number(s.id),
            class: classStr,
            className: String(s.className ?? classStr),
            number: String(s.number ?? ''),
            name: String(s.name ?? ''),
            competency: String(s.competency ?? '중'),
        };
    });

    return {
        room: payload?.room ?? null,
        students: mappedStudents,
        questions: mappedQuestions,
    };
}
