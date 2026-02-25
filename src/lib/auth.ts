import { supabase } from './supabase'

export interface AuthUser {
    id: string
    email: string
    role: 'master' | 'regular'
}

/**
 * 로그인
 */
export async function signIn(email: string, password: string): Promise<AuthUser> {
    // 1. Supabase Auth로 로그인
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('로그인 실패')

    // 2. teachers 테이블에서 role, is_active 조회
    const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select('role, is_active')
        .eq('id', authData.user.id)
        .single()

    // teachers 테이블에 레코드가 없으면 에러
    if (teacherError) {
        throw new Error('교사 정보를 찾을 수 없습니다. 관리자에게 문의하세요.')
    }

    // 비활성화된 교사 로그인 차단
    if (teacher.is_active === false) {
        await supabase.auth.signOut()
        throw new Error('계정이 비활성화되었습니다. 관리자에게 문의하세요.')
    }

    return {
        id: authData.user.id,
        email: authData.user.email!,
        role: teacher.role
    }
}

/**
 * 회원가입
 */
export async function signUp(email: string, password: string): Promise<AuthUser> {
    // 1. Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('회원가입 실패')

    // 2. teachers 테이블에 레코드 생성 (기본 역할: regular)
    const { error: insertError } = await supabase
        .from('teachers')
        .insert({
            id: authData.user.id,
            email: authData.user.email!,
            role: 'regular'
        })

    if (insertError) throw insertError

    return {
        id: authData.user.id,
        email: authData.user.email!,
        role: 'regular'
    }
}

/**
 * 로그아웃
 */
export async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
}

/**
 * 현재 세션 확인
 */
export async function getSession() {
    const { data } = await supabase.auth.getSession()
    return data.session
}

/**
 * 현재 사용자 정보 가져오기
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: teacher } = await supabase
        .from('teachers')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!teacher) return null

    return {
        id: user.id,
        email: user.email!,
        role: teacher.role
    }
}
