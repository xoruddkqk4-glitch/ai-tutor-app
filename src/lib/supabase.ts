import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** 로컬에서 .env 미설정 시 createClient(undefined)가 예외를 던져 전체 앱이 하얀 화면이 되는 것을 방지 */
export const isSupabaseConfigured = Boolean(
    supabaseUrl?.trim() && supabaseAnonKey?.trim()
)

// 유효한 URL 형태 + 비어 있지 않은 문자열이어야 createClient가 예외를 던지지 않음
const fallbackUrl = 'https://local-dev-missing-env.supabase.co'
const fallbackAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIn0.placeholder'

export const supabase = createClient(
    isSupabaseConfigured ? supabaseUrl! : fallbackUrl,
    isSupabaseConfigured ? supabaseAnonKey! : fallbackAnonKey
)

if (!isSupabaseConfigured && import.meta.env.DEV) {
    console.warn(
        '[AI Tutor] .env에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 없습니다. .env.example을 복사해 값을 넣으면 로그인·DB가 동작합니다.'
    )
}
