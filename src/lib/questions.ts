import { supabase } from './supabase'
import type { Question } from '../types'

/**
 * 내 문항 조회
 */
export async function getQuestions(): Promise<Question[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

    if (error) throw error

    // DB 컬럼명을 Question 타입으로 변환
    return (data || []).map(item => ({
        id: item.id,
        examCode: item.exam_code,
        targetGrade: item.target_grade,
        topic: item.topic || '',
        logicFlow: item.logic_flow,
        passage: item.passage || '',
        passageType: item.passage_type || ( (!item.topic && (!item.logic_flow || (Array.isArray(item.logic_flow) ? item.logic_flow.length === 0 : String(item.logic_flow).trim() === '[]'))) ? 'textbook' : 'csat' )
    }))
}

/**
 * 문항 추가
 */
export async function createQuestion(question: Omit<Question, 'id'>): Promise<Question> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const insertData: any = {
        teacher_id: user.id,
        exam_code: question.examCode,
        target_grade: question.targetGrade,
        topic: question.topic,
        logic_flow: question.logicFlow,
        passage: question.passage,
        passage_type: question.passageType || 'csat'
    }

    let result = await supabase
        .from('questions')
        .insert(insertData)
        .select()
        .single()

    // If passage_type column doesn't exist in DB, fallback without passage_type
    if (result.error && result.error.message?.includes('passage_type')) {
        delete insertData.passage_type;
        result = await supabase
            .from('questions')
            .insert(insertData)
            .select()
            .single()
    }

    if (result.error) throw result.error
    const data = result.data

    // DB 컬럼명을 Question 타입으로 변환
    return {
        id: data.id,
        examCode: data.exam_code,
        targetGrade: data.target_grade,
        topic: data.topic || '',
        logicFlow: data.logic_flow,
        passage: data.passage || '',
        passageType: data.passage_type || question.passageType || 'csat'
    }
}

/**
 * 문항 수정
 */
export async function updateQuestion(id: number, updates: Partial<Omit<Question, 'id'>>): Promise<Question> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const updateData: any = {}
    if (updates.examCode !== undefined) updateData.exam_code = updates.examCode
    if (updates.targetGrade !== undefined) updateData.target_grade = updates.targetGrade
    if (updates.topic !== undefined) updateData.topic = updates.topic
    if (updates.logicFlow !== undefined) updateData.logic_flow = updates.logicFlow
    if (updates.passage !== undefined) updateData.passage = updates.passage
    if (updates.passageType !== undefined) updateData.passage_type = updates.passageType

    let result = await supabase
        .from('questions')
        .update(updateData)
        .eq('id', id)
        .eq('teacher_id', user.id)
        .select()
        .single()

    // Fallback if passage_type column doesn't exist in DB
    if (result.error && result.error.message?.includes('passage_type')) {
        delete updateData.passage_type;
        result = await supabase
            .from('questions')
            .update(updateData)
            .eq('id', id)
            .eq('teacher_id', user.id)
            .select()
            .single()
    }

    if (result.error) throw result.error
    const data = result.data

    return {
        id: data.id,
        examCode: data.exam_code,
        targetGrade: data.target_grade,
        topic: data.topic || '',
        logicFlow: data.logic_flow,
        passage: data.passage || '',
        passageType: data.passage_type || updates.passageType || 'csat'
    }
}

/**
 * 문항 삭제
 */
export async function deleteQuestion(id: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id)
        .eq('teacher_id', user.id)

    if (error) throw error
}
