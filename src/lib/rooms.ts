import { supabase } from './supabase'
import type { Room } from '../types'

/**
 * 내 수업 방 조회
 */
export async function getRooms(): Promise<Room[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(item => ({
        id: item.id,
        code: item.code,
        className: item.class_name,
        folderName: item.folder_name,
        isActive: item.is_active,
        createdAt: item.created_at // Supabase returns ISO string which works
    }))

}

/**
 * 단일 수업 방 조회
 */
export async function getRoomById(id: number): Promise<Room> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', id)
        .eq('teacher_id', user.id)
        .single()

    if (error) throw error

    return {
        id: data.id,
        code: data.code,
        className: data.class_name,
        folderName: data.folder_name,
        isActive: data.is_active,
        createdAt: data.created_at
    }
}

/**
 * 수업 방 생성 및 문항 연결
 */
export async function createRoom(classNames: string[], questionIds: number[]): Promise<Room> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    // 1. 방 코드 생성 (6자리 숫자)
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const folderName = `문항 ${questionIds.length}개`

    // 2. 방 생성
    const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert({
            teacher_id: user.id,
            code,
            class_name: classNames.join(','),
            folder_name: folderName,
            is_active: true
        })
        .select()
        .single()

    if (roomError) throw roomError

    // 3. 문항 연결
    if (questionIds.length > 0) {
        const roomQuestions = questionIds.map(qId => ({
            room_id: roomData.id,
            question_id: qId
        }))

        const { error: linkError } = await supabase
            .from('room_questions')
            .insert(roomQuestions)

        if (linkError) {
            // 실패 시 방도 삭제하는 것이 좋겠지만, 일단 에러 던짐
            console.error('문항 연결 실패:', linkError)
            throw linkError
        }
    }

    return {
        id: roomData.id,
        code: roomData.code,
        className: roomData.class_name,
        folderName: roomData.folder_name,
        isActive: roomData.is_active,
        createdAt: roomData.created_at
    }
}

/**
 * 수업 방 수정
 */
export async function updateRoom(id: number, classNames: string[], questionIds: number[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const folderName = `문항 ${questionIds.length}개`

    // 1. 방 정보 업데이트
    const { error: roomError } = await supabase
        .from('rooms')
        .update({
            class_name: classNames.join(','),
            folder_name: folderName
        })
        .eq('id', id)
        .eq('teacher_id', user.id)

    if (roomError) throw roomError

    // 2. 기존 문항 연결 삭제
    const { error: deleteError } = await supabase
        .from('room_questions')
        .delete()
        .eq('room_id', id)

    if (deleteError) throw deleteError

    // 3. 새로운 문항 연결
    if (questionIds.length > 0) {
        const roomQuestions = questionIds.map(qId => ({
            room_id: id,
            question_id: qId
        }))

        const { error: linkError } = await supabase
            .from('room_questions')
            .insert(roomQuestions)

        if (linkError) throw linkError
    }
}

/**
 * 수업 방 삭제
 */
export async function deleteRoom(id: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id)
        .eq('teacher_id', user.id)

    if (error) throw error
}

/**
 * 수업 방 활성/비활성 토글 (선택 사항)
 */
export async function toggleRoomStatus(id: number, isActive: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const { error } = await supabase
        .from('rooms')
        .update({ is_active: isActive })
        .eq('id', id)
        .eq('teacher_id', user.id)

    if (error) throw error
}

/**
 * 방에 연결된 문항 ID 목록 조회
 */
export async function getRoomQuestionIds(roomId: number): Promise<number[]> {
    const { data, error } = await supabase
        .from('room_questions')
        .select('question_id')
        .eq('room_id', roomId)

    if (error) throw error

    return (data || []).map(item => item.question_id)
}
