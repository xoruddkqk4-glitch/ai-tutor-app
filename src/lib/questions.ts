import { supabase } from './supabase'
import {
    attachEmbeddedQuestionMeta,
    extractEmbeddedQuestionMeta,
    isTextbookQuestion,
    safeParseLogicFlow,
} from './logic-flow'
import {
    formatSourceSummary,
    normalizeGrade,
    normalizeMonth,
    normalizeTags,
    normalizeYear,
    parseQuestionSource,
} from './question-meta'
import type { PassageType, Question } from '../types'

interface QuestionRow {
    id: number
    exam_code: string
    target_grade?: string | null
    source_year?: string | null
    source_grade?: string | null
    source_month?: string | null
    tags?: unknown
    topic?: string | null
    logic_flow?: Question['logicFlow'] | null
    passage?: string | null
    passage_type?: PassageType | null
}

interface QuestionDbWrite {
    teacher_id?: string
    exam_code?: string
    target_grade?: string
    source_year?: string
    source_grade?: string
    source_month?: string
    tags?: string[]
    topic?: string
    logic_flow?: unknown
    passage?: string
    passage_type?: PassageType
}

let extendedColumnsSupported: boolean | null = null

function isMissingQuestionColumnError(error: { code?: string; message?: string } | null): boolean {
    if (!error) return false
    if (error.code === 'PGRST204' || error.code === '42703') return true
    const msg = error.message?.toLowerCase() ?? ''
    return (
        msg.includes('source_year') ||
        msg.includes('source_grade') ||
        msg.includes('source_month') ||
        msg.includes('tags') ||
        msg.includes('passage_type') ||
        msg.includes('schema cache') ||
        msg.includes('column')
    )
}

function mapQuestionRow(
    item: QuestionRow,
    fallback?: {
        passageType?: PassageType
        tags?: string[]
        sourceYear?: string
        sourceGrade?: string
        sourceMonth?: string
        questionNumber?: string
    }
): Question {
    const topic = item.topic || ''
    const embedded = extractEmbeddedQuestionMeta(item.logic_flow)
    const cleanFlow = safeParseLogicFlow(item.logic_flow)
    const explicitType = item.passage_type ?? embedded?.passageType ?? fallback?.passageType
    const passageType: PassageType = isTextbookQuestion({
        passageType: explicitType,
        topic,
        logicFlow: item.logic_flow,
    })
        ? 'textbook'
        : 'csat'

    const parsedSource = parseQuestionSource({
        sourceYear: (item.source_year ?? '').trim() || embedded?.sourceYear || fallback?.sourceYear,
        sourceGrade: (item.source_grade ?? '').trim() || embedded?.sourceGrade || fallback?.sourceGrade,
        sourceMonth: (item.source_month ?? '').trim() || embedded?.sourceMonth || fallback?.sourceMonth,
        questionNumber: embedded?.questionNumber || fallback?.questionNumber || item.exam_code,
        targetGrade: item.target_grade,
        examCode: item.exam_code,
    })

    const nativeTags = normalizeTags(item.tags)
    const embeddedTags = normalizeTags(embedded?.tags)
    const fallbackTags = normalizeTags(fallback?.tags)
    const tags = nativeTags.length > 0 ? nativeTags : embeddedTags.length > 0 ? embeddedTags : fallbackTags
    const formattedSource = formatSourceSummary(parsedSource)

    return {
        id: item.id,
        examCode: item.exam_code,
        questionNumber: parsedSource.questionNumber || item.exam_code,
        targetGrade: (item.target_grade ?? '').trim() || formattedSource,
        sourceYear: parsedSource.sourceYear,
        sourceGrade: parsedSource.sourceGrade,
        sourceMonth: parsedSource.sourceMonth,
        tags,
        topic,
        logicFlow: cleanFlow,
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

    const examCode = (question.questionNumber || question.examCode || '').trim()
    const sourceYear = normalizeYear(question.sourceYear)
    const sourceGrade = normalizeGrade(question.sourceGrade)
    const sourceMonth = normalizeMonth(question.sourceMonth)
    const targetGrade = formatSourceSummary({ sourceYear, sourceGrade, sourceMonth }) || (question.targetGrade ?? '').trim()
    const cleanSteps = safeParseLogicFlow(question.logicFlow)
    const tags = normalizeTags(question.tags)
    const passageType: PassageType = question.passageType || 'csat'

    const fallbackInfo = {
        passageType,
        tags,
        sourceYear,
        sourceGrade,
        sourceMonth,
        questionNumber: examCode,
    }

    if (extendedColumnsSupported !== false) {
        const extendedInsert: QuestionDbWrite = {
            teacher_id: user.id,
            exam_code: examCode,
            target_grade: targetGrade,
            source_year: sourceYear,
            source_grade: sourceGrade,
            source_month: sourceMonth,
            tags,
            topic: question.topic,
            logic_flow: cleanSteps,
            passage: question.passage,
            passage_type: passageType,
        }

        const extendedResult = await supabase
            .from('questions')
            .insert(extendedInsert)
            .select()
            .single()

        if (!extendedResult.error) {
            extendedColumnsSupported = true
            return mapQuestionRow(extendedResult.data as QuestionRow, fallbackInfo)
        }

        if (!isMissingQuestionColumnError(extendedResult.error)) {
            throw extendedResult.error
        }
        extendedColumnsSupported = false
    }

    const fallbackInsert: QuestionDbWrite = {
        teacher_id: user.id,
        exam_code: examCode,
        target_grade: targetGrade,
        topic: question.topic,
        logic_flow: attachEmbeddedQuestionMeta(cleanSteps, {
            tags,
            sourceYear,
            sourceGrade,
            sourceMonth,
            questionNumber: examCode,
            passageType,
        }),
        passage: question.passage,
    }

    const fallbackResult = await supabase
        .from('questions')
        .insert(fallbackInsert)
        .select()
        .single()

    if (fallbackResult.error) throw fallbackResult.error
    return mapQuestionRow(fallbackResult.data as QuestionRow, fallbackInfo)
}

/**
 * 문항 수정
 */
export async function updateQuestion(id: number, updates: Partial<Omit<Question, 'id'>>): Promise<Question> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const examCode = updates.questionNumber !== undefined || updates.examCode !== undefined
        ? (updates.questionNumber ?? updates.examCode ?? '').trim()
        : undefined
    const hasSplitSourceUpdate =
        updates.sourceYear !== undefined ||
        updates.sourceGrade !== undefined ||
        updates.sourceMonth !== undefined
    const sourceYear = updates.sourceYear !== undefined ? normalizeYear(updates.sourceYear) : undefined
    const sourceGrade = updates.sourceGrade !== undefined ? normalizeGrade(updates.sourceGrade) : undefined
    const sourceMonth = updates.sourceMonth !== undefined ? normalizeMonth(updates.sourceMonth) : undefined
    const targetGrade = hasSplitSourceUpdate
        ? formatSourceSummary({ sourceYear, sourceGrade, sourceMonth })
        : updates.targetGrade
    const cleanSteps = updates.logicFlow !== undefined ? safeParseLogicFlow(updates.logicFlow) : undefined
    const tags = updates.tags !== undefined ? normalizeTags(updates.tags) : undefined
    const passageType = updates.passageType

    const fallbackInfo = {
        passageType,
        tags,
        sourceYear,
        sourceGrade,
        sourceMonth,
        questionNumber: examCode,
    }

    if (extendedColumnsSupported !== false) {
        const extendedUpdate: QuestionDbWrite = {}
        if (examCode !== undefined) extendedUpdate.exam_code = examCode
        if (targetGrade !== undefined) extendedUpdate.target_grade = targetGrade
        if (sourceYear !== undefined) extendedUpdate.source_year = sourceYear
        if (sourceGrade !== undefined) extendedUpdate.source_grade = sourceGrade
        if (sourceMonth !== undefined) extendedUpdate.source_month = sourceMonth
        if (tags !== undefined) extendedUpdate.tags = tags
        if (updates.topic !== undefined) extendedUpdate.topic = updates.topic
        if (cleanSteps !== undefined) extendedUpdate.logic_flow = cleanSteps
        if (updates.passage !== undefined) extendedUpdate.passage = updates.passage
        if (passageType !== undefined) extendedUpdate.passage_type = passageType

        const extendedResult = await supabase
            .from('questions')
            .update(extendedUpdate)
            .eq('id', id)
            .eq('teacher_id', user.id)
            .select()
            .single()

        if (!extendedResult.error) {
            extendedColumnsSupported = true
            return mapQuestionRow(extendedResult.data as QuestionRow, fallbackInfo)
        }

        if (!isMissingQuestionColumnError(extendedResult.error)) {
            throw extendedResult.error
        }
        extendedColumnsSupported = false
    }

    let fallbackSteps = cleanSteps
    let existingMeta = null as ReturnType<typeof extractEmbeddedQuestionMeta>
    if (fallbackSteps === undefined) {
        const { data: existingRow } = await supabase
            .from('questions')
            .select('logic_flow')
            .eq('id', id)
            .eq('teacher_id', user.id)
            .single()
        existingMeta = extractEmbeddedQuestionMeta(existingRow?.logic_flow)
        fallbackSteps = safeParseLogicFlow(existingRow?.logic_flow)
    }

    const fallbackUpdate: QuestionDbWrite = {}
    if (examCode !== undefined) fallbackUpdate.exam_code = examCode
    if (targetGrade !== undefined) fallbackUpdate.target_grade = targetGrade
    if (updates.topic !== undefined) fallbackUpdate.topic = updates.topic
    if (updates.passage !== undefined) fallbackUpdate.passage = updates.passage

    if (
        cleanSteps !== undefined ||
        tags !== undefined ||
        hasSplitSourceUpdate ||
        examCode !== undefined ||
        passageType !== undefined
    ) {
        fallbackUpdate.logic_flow = attachEmbeddedQuestionMeta(fallbackSteps, {
            tags: tags ?? existingMeta?.tags,
            sourceYear: sourceYear ?? existingMeta?.sourceYear,
            sourceGrade: sourceGrade ?? existingMeta?.sourceGrade,
            sourceMonth: sourceMonth ?? existingMeta?.sourceMonth,
            questionNumber: examCode ?? existingMeta?.questionNumber,
            passageType: passageType ?? existingMeta?.passageType,
        })
    }

    const fallbackResult = await supabase
        .from('questions')
        .update(fallbackUpdate)
        .eq('id', id)
        .eq('teacher_id', user.id)
        .select()
        .single()

    if (fallbackResult.error) throw fallbackResult.error
    return mapQuestionRow(fallbackResult.data as QuestionRow, fallbackInfo)
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
