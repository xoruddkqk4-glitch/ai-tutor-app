import { supabase } from './supabase';
import type { Student, Question } from '../types';

export async function fetchRoomData(code: string) {
    const { data, error } = await supabase
        .rpc('get_active_room_data', { p_code: code });

    if (error) throw error;

    // ===== DEBUG: RPC 응답 원본 확인 =====
    console.log('[DEBUG fetchRoomData] Raw RPC response:', JSON.stringify(data, null, 2));
    const rawQuestions: any[] = data?.questions || [];
    if (rawQuestions.length > 0) {
        console.log('[DEBUG fetchRoomData] First raw question keys:', Object.keys(rawQuestions[0]));
        console.log('[DEBUG fetchRoomData] First raw question:', JSON.stringify(rawQuestions[0], null, 2));
    }
    // ===== END DEBUG =====

    // Map snake_case DB columns to camelCase TypeScript fields for questions
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
