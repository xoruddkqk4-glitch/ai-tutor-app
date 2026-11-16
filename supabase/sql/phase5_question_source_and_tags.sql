-- ============================================================================
-- Phase 5: 문항 출처 분리(년도, 학년, 월/시기) 및 태그 기능 컬럼/인덱스 추가
-- ============================================================================
-- 참고: 본 스크립트 실행 전에도 프론트엔드(src/lib/questions.ts)가
-- 기존 컬럼(exam_code, target_grade, logic_flow) 기반 자동 폴백으로 정상 동작합니다.
-- Supabase SQL Editor에서 이 스크립트를 실행하면 네이티브 컬럼 및 GIN 인덱스로 전환됩니다.
-- ============================================================================

ALTER TABLE public.questions
    ADD COLUMN IF NOT EXISTS source_year text,
    ADD COLUMN IF NOT EXISTS source_grade text,
    ADD COLUMN IF NOT EXISTS source_month text,
    ADD COLUMN IF NOT EXISTS source_number text,
    ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS passage_type text;

CREATE INDEX IF NOT EXISTS idx_questions_tags_gin
    ON public.questions USING gin (tags);

CREATE INDEX IF NOT EXISTS idx_questions_source_parts
    ON public.questions (teacher_id, source_year, source_grade, source_month, source_number);

-- 학생용 공개 RPC(get_active_room_data)가 분리 출처 및 태그 필드도 함께 반환하도록 갱신
CREATE OR REPLACE FUNCTION public.get_active_room_data(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room record;
    v_teacher record;
    v_students jsonb;
    v_questions jsonb;
BEGIN
    SELECT id, teacher_id, class_name, is_active
    INTO v_room
    FROM public.rooms
    WHERE code = p_code
      AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('room', NULL, 'students', '[]'::jsonb, 'questions', '[]'::jsonb);
    END IF;

    SELECT drive_folder_id, google_script_url, openai_api_key, system_prompt, is_active
    INTO v_teacher
    FROM public.teachers
    WHERE id = v_room.teacher_id
    LIMIT 1;

    IF NOT FOUND OR v_teacher.is_active = false THEN
        RETURN jsonb_build_object('room', NULL, 'students', '[]'::jsonb, 'questions', '[]'::jsonb);
    END IF;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'class', s.class,
                'number', s.number,
                'name', s.name,
                'competency', s.competency
            )
            ORDER BY s.class, s.number
        ),
        '[]'::jsonb
    )
    INTO v_students
    FROM public.students s
    WHERE s.teacher_id = v_room.teacher_id
      AND s.class = ANY (string_to_array(v_room.class_name, ','));

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', q.id,
                'exam_code', q.exam_code,
                'target_grade', q.target_grade,
                'source_year', q.source_year,
                'source_grade', q.source_grade,
                'source_month', q.source_month,
                'source_number', q.source_number,
                'tags', COALESCE(q.tags, '{}'::text[]),
                'topic', q.topic,
                'logic_flow', q.logic_flow,
                'passage', q.passage,
                'passage_type', q.passage_type
            )
            ORDER BY q.id
        ),
        '[]'::jsonb
    )
    INTO v_questions
    FROM public.room_questions rq
    JOIN public.questions q ON q.id = rq.question_id
    WHERE rq.room_id = v_room.id;

    RETURN jsonb_build_object(
        'room', jsonb_build_object(
            'id', v_room.id,
            'class_name', v_room.class_name,
            'drive_folder_id', v_teacher.drive_folder_id,
            'google_script_url', v_teacher.google_script_url,
            'has_api_key', (v_teacher.openai_api_key IS NOT NULL AND btrim(v_teacher.openai_api_key) <> ''),
            'system_prompt', v_teacher.system_prompt
        ),
        'students', v_students,
        'questions', v_questions
    );
END;
$$;
