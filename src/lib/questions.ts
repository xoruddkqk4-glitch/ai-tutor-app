import { supabase } from './supabase'
import { isTextbookQuestion } from './logic-flow'
import type { PassageType, Question } from '../types'

interface QuestionRow {
    id: number
    exam_code: string
    target_grade?: string | null
    topic?: string | null
    logic_flow?: Question['logicFlow'] | null
    passage?: string | null
    passage_type?: PassageType | null
}

interface QuestionDbWrite {
    teacher_id?: string
    exam_code?: string
    target_grade?: string
    topic?: string
    logic_flow?: Question['logicFlow']
    passage?: string
    passage_type?: PassageType
}

function mapQuestionRow(item: QuestionRow, fallbackType?: PassageType): Question {
    const topic = item.topic || ''
    const logicFlow = item.logic_flow ?? undefined
    const explicitType = item.passage_type ?? fallbackType
    const passageType: PassageType = isTextbookQuestion({
        passageType: explicitType,
        topic,
        logicFlow,
    })
        ? 'textbook'
        : 'csat'

    return {
        id: item.id,
        examCode: item.exam_code,
        targetGrade: item.target_grade ?? '',
        topic,
        logicFlow,
        passage: item.passage || '',
        passageType: explicitType ?? passageType,
    }
}

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
    return ((data || []) as QuestionRow[]).map((item) => mapQuestionRow(item))
}

/**
 * 문항 추가
 */
export async function createQuestion(question: Omit<Question, 'id'>): Promise<Question> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const insertData: QuestionDbWrite = {
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
        const { passage_type: _, ...fallbackInsert } = insertData
        void _
        result = await supabase
            .from('questions')
            .insert(fallbackInsert)
            .select()
            .single()
    }

    if (result.error) throw result.error
    return mapQuestionRow(result.data as QuestionRow, question.passageType || 'csat')
}

/**
 * 문항 수정
 */
export async function updateQuestion(id: number, updates: Partial<Omit<Question, 'id'>>): Promise<Question> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const updateData: QuestionDbWrite = {}
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
        const { passage_type: _, ...fallbackUpdate } = updateData
        void _
        result = await supabase
            .from('questions')
            .update(fallbackUpdate)
            .eq('id', id)
            .eq('teacher_id', user.id)
            .select()
            .single()
    }

    if (result.error) throw result.error
    return mapQuestionRow(result.data as QuestionRow, updates.passageType)
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
