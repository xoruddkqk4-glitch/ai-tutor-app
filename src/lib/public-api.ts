import { supabase } from './supabase';
import type { Student, Question } from '../types';

export async function fetchRoomData(code: string) {
    const { data, error } = await supabase
        .rpc('get_active_room_data', { p_code: code });

    if (error) throw error;

    return data as {
        room: any;
        students: Student[];
        questions: Question[];
    };
}
