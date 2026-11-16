import { supabase } from './supabase'
import type { Student } from '../types'

export type { Student }

interface StudentRow {
    id: number
    teacher_id?: string
    class: string | null
    number: string | number | null
    name: string | null
    competency: string | null
    created_at?: string
}

function mapStudentRow(row: StudentRow): Student {
    const className = String(row.class ?? '')
    return {
        id: row.id,
        teacher_id: row.teacher_id,
        class: className,
        className,
        number: String(row.number ?? ''),
        name: String(row.name ?? ''),
        competency: String(row.competency ?? '중'),
        created_at: row.created_at,
    }
}

/**
 * 내 학생 조회
 */
export async function getStudents(): Promise<Student[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('teacher_id', user.id)
        .order('class, number', { ascending: true })

    if (error) throw error
    return ((data || []) as StudentRow[]).map(mapStudentRow)
}

/**
 * 학생 일괄 등록
 */
export async function createStudents(students: Omit<Student, 'id' | 'teacher_id' | 'created_at' | 'className'>[]): Promise<Student[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const studentsWithTeacherId = students.map(s => ({
        teacher_id: user.id,
        class: s.class,
        number: s.number,
        name: s.name,
        competency: s.competency
    }))

    const { data, error } = await supabase
        .from('students')
        .insert(studentsWithTeacherId)
        .select()

    if (error) throw error
    return ((data || []) as StudentRow[]).map(mapStudentRow)
}

/**
 * 학생 삭제
 */
export async function deleteStudent(id: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
        .eq('teacher_id', user.id)

    if (error) throw error
}

/**
 * 학생 일괄 삭제
 */
export async function deleteStudents(ids: number[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다')

    const { error } = await supabase
        .from('students')
        .delete()
        .in('id', ids)
        .eq('teacher_id', user.id)

    if (error) throw error
}
