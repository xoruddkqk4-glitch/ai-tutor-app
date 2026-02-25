import { supabase } from './supabase';

export interface TeacherSettings {
    openai_api_key: string | null;
    system_prompt: string | null;
    drive_folder_id: string | null;
    google_script_url: string | null;
}

export async function getTeacherSettings(teacherId: string): Promise<TeacherSettings> {
    console.log('Fetching settings for ID:', teacherId);
    const { data, error } = await supabase
        .from('teachers')
        .select('openai_api_key, system_prompt, drive_folder_id, google_script_url')
        .eq('id', teacherId)
        .single();

    if (error) {
        console.error('getTeacherSettings error:', error);
        throw error;
    }

    console.log('Fetched settings data:', data);
    return {
        openai_api_key: data.openai_api_key,
        system_prompt: data.system_prompt,
        drive_folder_id: data.drive_folder_id,
        google_script_url: data.google_script_url
    };
}

export async function updateTeacherSettings(teacherId: string, settings: Partial<TeacherSettings>): Promise<void> {
    console.log('Updating settings for ID:', teacherId, 'with:', settings);
    const { error } = await supabase
        .from('teachers')
        .update(settings)
        .eq('id', teacherId);

    if (error) {
        console.error('updateTeacherSettings error:', error);
        throw error;
    }
    console.log('Update success');
}

// App Config (Global Settings for Master)
export async function getAppConfig(key: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', key)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Config fetch error:', error);
        return null;
    }
    return data?.value || null;
}

export async function updateAppConfig(key: string, value: string): Promise<void> {
    const { error } = await supabase
        .from('app_config')
        .upsert({ key, value });

    if (error) throw error;
}

// ========== Teacher Management (Master Only) ==========

export interface TeacherRecord {
    id: string;
    email: string;
    role: 'master' | 'regular';
    is_active: boolean;
    max_questions: number | null;
    created_at?: string;
}

/**
 * 전체 교사 목록 조회 (마스터 교사 제외)
 */
export async function getAllTeachers(): Promise<TeacherRecord[]> {
    const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('role', 'regular')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('getAllTeachers error:', error);
        throw error;
    }
    console.log('getAllTeachers data:', data);
    return (data || []).map(t => ({
        id: t.id,
        email: t.email,
        role: t.role,
        is_active: t.is_active ?? true,
        max_questions: t.max_questions ?? null,
        created_at: t.created_at
    }));
}

/**
 * 교사 계정 활성/비활성 토글
 */
export async function toggleTeacherActive(teacherId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
        .from('teachers')
        .update({ is_active: isActive })
        .eq('id', teacherId);

    if (error) throw error;
}

/**
 * 교사 개별 문항 제한수 업데이트
 */
export async function updateTeacherMaxQuestions(teacherId: string, maxQuestions: number | null): Promise<void> {
    const { error } = await supabase
        .from('teachers')
        .update({ max_questions: maxQuestions })
        .eq('id', teacherId);

    if (error) throw error;
}

/**
 * 교사 삭제
 */
export async function deleteTeacher(teacherId: string): Promise<void> {
    const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', teacherId);

    if (error) throw error;
}
