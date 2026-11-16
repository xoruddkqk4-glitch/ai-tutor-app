import { supabase } from './supabase';
import { isTextbookQuestion } from './logic-flow';
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
        const explicitType = q.passage_type ?? q.passageType ?? undefined;
        const derivedType: PassageType = isTextbookQuestion({
            passageType: explicitType,
            topic: topicStr,
            logicFlow: rawFlow,
        })
            ? 'textbook'
            : 'csat';

        return {
            id: q.id,
            examCode: q.exam_code || q.examCode || '',
            targetGrade: q.target_grade || q.targetGrade || '',
            topic: topicStr,
            logicFlow: rawFlow,
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
