import { supabase } from './supabase';
import type { Student, Question } from '../types';

export async function fetchRoomData(code: string) {
    const { data, error } = await supabase
        .rpc('get_active_room_data', { p_code: code });

    if (error) throw error;

    const rawQuestions: any[] = data?.questions || [];
    const mappedQuestions: Question[] = rawQuestions.map((q: any) => ({
        id: q.id,
        examCode: q.exam_code || q.examCode || '',
        targetGrade: q.target_grade || q.targetGrade || '',
        topic: q.topic || '',
        logicFlow: q.logic_flow ?? q.logicFlow ?? undefined,
        passage: q.passage || '',
    }));

    return {
        room: data?.room,
        students: (data?.students || []) as Student[],
        questions: mappedQuestions,
    };
}
