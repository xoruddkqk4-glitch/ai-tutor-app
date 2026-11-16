-- ============================================================================
-- Phase 4: 보안 강화 (API 키 노출 차단) 및 수업 방 생성/수정 원자적 트랜잭션 RPC
-- ============================================================================
-- 배포 순서:
-- 1. Supabase CLI로 Edge Function 배포:
--      supabase functions deploy ai-chat
-- 2. Supabase SQL Editor에서 아래 SQL 실행하여 get_active_room_data 갱신
--    (주의: 기존 get_active_room_data는 room.api_key 평문을 반환하므로,
--     반드시 Edge Function 배포 및 프론트엔드 .env의 VITE_USE_AI_PROXY=true 설정과 함께 적용하세요.)
-- 3. 프론트엔드 환경 변수(.env / Vercel)에 VITE_USE_AI_PROXY=true 추가 후 재배포
-- ============================================================================

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

-- 방 생성 원자적 트랜잭션 RPC (교사용 인증 사용자 전용)
CREATE OR REPLACE FUNCTION public.create_room_with_questions(
    p_class_names text[],
    p_question_ids bigint[]
)
RETURNS public.rooms
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_code text;
    v_room public.rooms;
    v_attempt int := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인이 필요합니다';
    END IF;

    LOOP
        v_attempt := v_attempt + 1;
        v_code := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
        BEGIN
            INSERT INTO public.rooms (teacher_id, code, class_name, folder_name, is_active)
            VALUES (
                v_user_id,
                v_code,
                array_to_string(p_class_names, ','),
                format('문항 %s개', COALESCE(array_length(p_question_ids, 1), 0)),
                true
            )
            RETURNING * INTO v_room;
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            IF v_attempt >= 5 THEN
                RAISE;
            END IF;
        END;
    END LOOP;

    IF COALESCE(array_length(p_question_ids, 1), 0) > 0 THEN
        INSERT INTO public.room_questions (room_id, question_id)
        SELECT v_room.id, q_id
        FROM unnest(p_question_ids) AS q_id;
    END IF;

    RETURN v_room;
END;
$$;

-- 방 수정 원자적 트랜잭션 RPC (교사용 인증 사용자 전용)
CREATE OR REPLACE FUNCTION public.update_room_with_questions(
    p_room_id bigint,
    p_class_names text[],
    p_question_ids bigint[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '로그인이 필요합니다';
    END IF;

    UPDATE public.rooms
    SET class_name = array_to_string(p_class_names, ','),
        folder_name = format('문항 %s개', COALESCE(array_length(p_question_ids, 1), 0))
    WHERE id = p_room_id
      AND teacher_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION '수정 권한이 없거나 방을 찾을 수 없습니다';
    END IF;

    DELETE FROM public.room_questions
    WHERE room_id = p_room_id;

    IF COALESCE(array_length(p_question_ids, 1), 0) > 0 THEN
        INSERT INTO public.room_questions (room_id, question_id)
        SELECT p_room_id, q_id
        FROM unnest(p_question_ids) AS q_id;
    END IF;
END;
$$;
