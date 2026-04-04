import { supabase } from './supabase';
import type { Student, Question, Room } from '../types';

interface RoomDataResponse {
    room: {
        id: number;
        teacher_id: string;
        class_name: string;
    };
    students: Student[];
    questions: Question[];
}

/**
 * Room Code로 방 데이터 조회 (학생용)
 * - RPC 함수 'get_active_room_data' 호출
 */
export async function fetchRoomData(code: string): Promise<RoomDataResponse> {
    const { data, error } = await supabase.rpc('get_active_room_data', { p_code: code });

    if (error) {
        console.error('Room data fetch error:', error);
        throw error;
    }

    if (!data || data.error) {
        throw new Error(data?.error || '방을 찾을 수 없습니다.');
    }

    return {
        room: data.room,
        questions: data.questions,
        students: data.students.map((s: any) => ({
            id: s.id,
            number: Number(s.number), // Convert string to number for frontend compatibility
            name: s.name,
            competency: s.competency,
            className: s.class // Map DB 'class' to Frontend 'className'
        }))
    };
}

/**
 * ��ȭ ���� DB ���� (RPC save_chat_session ȣ��)
 */
export async function saveChatSession(roomId: number, studentNames: string[], messages: any[]) {
    const { error } = await supabase.rpc('save_chat_session', {
        p_room_id: roomId,
        p_student_names: studentNames,
        p_messages: messages
    });

    if (error) {
        console.error('Chat DB Save Error:', error);
        // Backup failure shouldn't necessarily stop the flow, but good to know
        throw error;
    }
}

