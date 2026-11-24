import { supabase } from './supabase';

export interface TeacherSettings {
    openai_api_key: string | null;
    system_prompt: string | null;
    drive_folder_id: string | null;
    google_script_url: string | null;
    max_questions: number | null;
}

export async function getTeacherSettings(teacherId: string): Promise<TeacherSettings> {
    const { data, error } = await supabase
        .from('teachers')
        .select('openai_api_key, system_prompt, drive_folder_id, google_script_url, max_questions')
        .eq('id', teacherId)
        .single();

    if (error && error.message?.includes('max_questions')) {
        const fallback = await supabase
            .from('teachers')
            .select('openai_api_key, system_prompt, drive_folder_id, google_script_url')
            .eq('id', teacherId)
            .single();

        if (fallback.error) {
            console.error('getTeacherSettings error:', fallback.error);
            throw fallback.error;
        }

        return {
            openai_api_key: fallback.data.openai_api_key,
            system_prompt: fallback.data.system_prompt,
            drive_folder_id: fallback.data.drive_folder_id,
            google_script_url: fallback.data.google_script_url,
            max_questions: null
        };
    }

    if (error) {
        console.error('getTeacherSettings error:', error);
        throw error;
    }

    return {
        openai_api_key: data.openai_api_key,
        system_prompt: data.system_prompt,
        drive_folder_id: data.drive_folder_id,
        google_script_url: data.google_script_url,
        max_questions: data.max_questions ?? null
    };
}

export async function updateTeacherSettings(teacherId: string, settings: Partial<TeacherSettings>): Promise<void> {
    const { error } = await supabase
        .from('teachers')
        .update(settings)
        .eq('id', teacherId);

    if (error) {
        console.error('updateTeacherSettings error:', error);
        throw error;
    }
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
        throw error;
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
 * 교사 삭제 (Edge Function으로 Auth 계정까지 삭제 시도, 미배포 환경에서는 teachers 행 삭제 폴백)
 */
export async function deleteTeacher(teacherId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke<{ deleted?: boolean; error?: string }>('delete-teacher', {
        body: { teacherId },
    });

    if (!error && data?.deleted) return;

    const status = (error as { context?: { status?: number } } | null)?.context?.status;
    const errName = (error as { name?: string } | null)?.name ?? '';
    const errMsg = (error?.message || '').toLowerCase();
    const isUnavailableFunction =
        status === 404 ||
        errName === 'FunctionsFetchError' ||
        errName === 'FunctionsRelayError' ||
        errMsg.includes('failed to send') ||
        errMsg.includes('not found') ||
        errMsg.includes('404');

    if (!isUnavailableFunction && (error || data?.error)) {
        throw new Error(data?.error || error?.message || '교사 삭제에 실패했습니다.');
    }

    const { error: fallbackError } = await supabase
        .from('teachers')
        .delete()
        .eq('id', teacherId);

    if (fallbackError) throw fallbackError;
}
