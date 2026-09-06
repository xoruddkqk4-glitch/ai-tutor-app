import { supabase } from './supabase';
import type { Student, Question } from '../types';

export async function fetchRoomData(code: string) {
    const { data, error } = await supabase
        .rpc('get_active_room_data', { p_code: code });

    if (error) throw error;

    const rawQuestions: any[] = data?.questions || [];
    const mappedQuestions: Question[] = rawQuestions.map((q: any) => {
        const topicStr = q.topic || '';
        const rawFlow = q.logic_flow ?? q.logicFlow;
        const hasFlow = Array.isArray(rawFlow) ? rawFlow.length > 0 : Boolean(rawFlow && String(rawFlow).trim() !== '[]');
        const derivedType = (!topicStr && !hasFlow) ? 'textbook' : 'csat';

        return {
            id: q.id,
            examCode: q.exam_code || q.examCode || '',
            targetGrade: q.target_grade || q.targetGrade || '',
            topic: topicStr,
            logicFlow: rawFlow ?? undefined,
            passage: q.passage || '',
            passageType: q.passage_type || q.passageType || derivedType,
        };
    });

    return {
        room: data?.room,
        students: (data?.students || []) as Student[],
        questions: mappedQuestions,
    };
}
