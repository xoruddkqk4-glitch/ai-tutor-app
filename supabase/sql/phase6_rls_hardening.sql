-- ============================================================================
-- Phase 6 (Phase C): 서버 측 권한(RLS) 및 비즈니스 규칙(트리거) 하드닝
-- ============================================================================
-- ⚠️ 중요: 실행 전 반드시 현재 Supabase DB의 기존 RLS 정책을 백업하세요.
--   (Supabase Dashboard -> Database -> Policies 확인 또는 pg_dump --schema-only 실행)
--
-- 적용 내용:
-- 1. public.is_master() / public.is_active_teacher() 헬퍼 함수
-- 2. teachers RLS + BEFORE UPDATE 트리거(일반 교사의 role, is_active, max_questions 변경 차단)
-- 3. questions RLS + BEFORE INSERT 트리거(교사별 max_questions 또는 전역 제한 강제)
-- 4. app_config RLS (읽기 공개, 쓰기 master 전용)
-- 5. students / rooms / room_questions 소유권 및 활성 교사 검증 RLS
-- ============================================================================

-- 1. 권한 판별 헬퍼 함수
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.teachers
        WHERE id = auth.uid()
          AND role = 'master'
          AND COALESCE(is_active, true) = true
    );
$$;

CREATE OR REPLACE FUNCTION public.is_active_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.teachers
        WHERE id = auth.uid()
          AND COALESCE(is_active, true) = true
    );
$$;

-- 2. teachers 테이블 RLS 및 권한 필드 보호 트리거
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teachers_select_own_or_master ON public.teachers;
CREATE POLICY teachers_select_own_or_master
    ON public.teachers
    FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_master());

DROP POLICY IF EXISTS teachers_insert_self_regular ON public.teachers;
CREATE POLICY teachers_insert_self_regular
    ON public.teachers
    FOR INSERT
    TO authenticated
    WITH CHECK (
        id = auth.uid()
        AND role = 'regular'
        AND COALESCE(is_active, true) = true
        AND max_questions IS NULL
    );

DROP POLICY IF EXISTS teachers_update_self_or_master ON public.teachers;
CREATE POLICY teachers_update_self_or_master
    ON public.teachers
    FOR UPDATE
    TO authenticated
    USING ((id = auth.uid() AND COALESCE(is_active, true) = true) OR public.is_master())
    WITH CHECK (id = auth.uid() OR public.is_master());

DROP POLICY IF EXISTS teachers_delete_master_only ON public.teachers;
CREATE POLICY teachers_delete_master_only
    ON public.teachers
    FOR DELETE
    TO authenticated
    USING (public.is_master() AND id <> auth.uid());

CREATE OR REPLACE FUNCTION public.protect_teacher_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_master() THEN
        IF NEW.role IS DISTINCT FROM OLD.role
           OR NEW.is_active IS DISTINCT FROM OLD.is_active
           OR NEW.max_questions IS DISTINCT FROM OLD.max_questions THEN
            RAISE EXCEPTION '관리자만 역할, 활성 상태, 문항 제한수를 변경할 수 있습니다.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_teacher_privileged_columns ON public.teachers;
CREATE TRIGGER trg_protect_teacher_privileged_columns
    BEFORE UPDATE ON public.teachers
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_teacher_privileged_columns();

-- 3. questions 테이블 RLS 및 문항 등록 한도 서버 강제 트리거
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS questions_owner_all ON public.questions;
CREATE POLICY questions_owner_all
    ON public.questions
    FOR ALL
    TO authenticated
    USING (teacher_id = auth.uid() AND public.is_active_teacher())
    WITH CHECK (teacher_id = auth.uid() AND public.is_active_teacher());

CREATE OR REPLACE FUNCTION public.enforce_teacher_question_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_teacher record;
    v_global_limit_text text;
    v_limit int;
    v_count int;
BEGIN
    SELECT role, is_active, max_questions
    INTO v_teacher
    FROM public.teachers
    WHERE id = NEW.teacher_id
    LIMIT 1;

    IF NOT FOUND OR COALESCE(v_teacher.is_active, true) = false THEN
        RAISE EXCEPTION '비활성화되었거나 존재하지 않는 교사 계정입니다.';
    END IF;

    IF v_teacher.role = 'master' THEN
        RETURN NEW;
    END IF;

    IF v_teacher.max_questions IS NOT NULL THEN
        v_limit := v_teacher.max_questions;
    ELSE
        SELECT value
        INTO v_global_limit_text
        FROM public.app_config
        WHERE key = 'limit_regular_questions'
        LIMIT 1;

        IF v_global_limit_text ~ '^\d+$' THEN
            v_limit := v_global_limit_text::int;
        ELSE
            v_limit := 50;
        END IF;
    END IF;

    SELECT count(*)
    INTO v_count
    FROM public.questions
    WHERE teacher_id = NEW.teacher_id;

    IF v_count >= v_limit THEN
        RAISE EXCEPTION '문항 등록 한도(%개)를 초과했습니다.', v_limit;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_teacher_question_limit ON public.questions;
CREATE TRIGGER trg_enforce_teacher_question_limit
    BEFORE INSERT ON public.questions
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_teacher_question_limit();

-- 4. app_config 테이블 RLS (조회 공개, 수정 master 전용)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_config_public_read ON public.app_config;
CREATE POLICY app_config_public_read
    ON public.app_config
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS app_config_master_insert ON public.app_config;
CREATE POLICY app_config_master_insert
    ON public.app_config
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_master());

DROP POLICY IF EXISTS app_config_master_update ON public.app_config;
CREATE POLICY app_config_master_update
    ON public.app_config
    FOR UPDATE
    TO authenticated
    USING (public.is_master())
    WITH CHECK (public.is_master());

DROP POLICY IF EXISTS app_config_master_delete ON public.app_config;
CREATE POLICY app_config_master_delete
    ON public.app_config
    FOR DELETE
    TO authenticated
    USING (public.is_master());

-- 5. students / rooms / room_questions 테이블 RLS
-- (학생 입장 화면은 SECURITY DEFINER RPC인 get_active_room_data를 사용하므로 anon 직접 SELECT 불필요)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS students_owner_all ON public.students;
CREATE POLICY students_owner_all
    ON public.students
    FOR ALL
    TO authenticated
    USING (teacher_id = auth.uid() AND public.is_active_teacher())
    WITH CHECK (teacher_id = auth.uid() AND public.is_active_teacher());

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rooms_owner_all ON public.rooms;
CREATE POLICY rooms_owner_all
    ON public.rooms
    FOR ALL
    TO authenticated
    USING (teacher_id = auth.uid() AND public.is_active_teacher())
    WITH CHECK (teacher_id = auth.uid() AND public.is_active_teacher());

ALTER TABLE public.room_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS room_questions_owner_all ON public.room_questions;
CREATE POLICY room_questions_owner_all
    ON public.room_questions
    FOR ALL
    TO authenticated
    USING (
        public.is_active_teacher()
        AND EXISTS (
            SELECT 1
            FROM public.rooms r
            WHERE r.id = room_id
              AND r.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        public.is_active_teacher()
        AND EXISTS (
            SELECT 1
            FROM public.rooms r
            WHERE r.id = room_id
              AND r.teacher_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1
            FROM public.questions q
            WHERE q.id = question_id
              AND q.teacher_id = auth.uid()
        )
    );
