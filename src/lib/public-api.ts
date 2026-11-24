import { supabase } from './supabase';
import { mapQuestionRecord, type RawQuestionRecord } from './question-mapper';
import type { Student, Question, RoomPublicInfo } from '../types';

interface RawRpcStudent {
    id: number;
    class?: string | null;
    className?: string | null;
    number?: string | number | null;
    name?: string | null;
    competency?: string | null;
}

interface RawRpcResponse {
    room?: RoomPublicInfo | null;
    students?: RawRpcStudent[] | null;
    questions?: RawQuestionRecord[] | null;
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

    const mappedQuestions: Question[] = (payload?.questions ?? []).map((q) => mapQuestionRecord(q));

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
