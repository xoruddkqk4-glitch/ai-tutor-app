import { supabase } from './supabase';

export interface TeacherSettings {
    openai_api_key: string | null;
    system_prompt: string | null;
    drive_folder_id: string | null;
    google_script_url: string | null;
}

export async function getTeacherSettings(teacherId: string): Promise<TeacherSettings> {
    const { data, error } = await supabase
        .from('teachers')
        .select('openai_api_key, system_prompt, drive_folder_id, google_script_url')
        .eq('id', teacherId)
        .single();

    if (error) throw error;

    return {
        openai_api_key: data.openai_api_key,
        system_prompt: data.system_prompt,
        drive_folder_id: data.drive_folder_id,
        google_script_url: data.google_script_url
    };
}

export async function updateTeacherSettings(teacherId: string, settings: Partial<TeacherSettings>): Promise<void> {
    const { error } = await supabase
        .from('teachers')
        .update(settings)
        .eq('id', teacherId);

    if (error) throw error;
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

