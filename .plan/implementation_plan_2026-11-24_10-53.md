# 🔍 AI Tutor 코드 검증 피드백 및 보완 계획서

- **작성 일시**: 2026-11-24 10:53 KST (`+09:00`)
- **대상 프로젝트**: `04-ai-tutor-app-main`
- **기준 커밋**: `main` / `3631fa3` (2026-11-16 16:02, 작업 트리 clean)
- **선행 계획서**: [implementation_plan_2026-11-16_14-45.md](./implementation_plan_2026-11-16_14-45.md)
- **작성 모드**: 소스 코드 수정 없이 검증 결과와 보완 계획만 작성 (`/apply` 명령 시 단계별 반영)
- **개정 이력**:
  - 2026-11-24 11:14 KST: §3 🔵 [M] 추가. AI 모델 교체(`gpt-4o` → `gpt-6-sol`, 요청 유형별 추론 수준)와 프롬프트 앞부분 순서 고정(캐시 최적화)을 반영하고, 로드맵 Phase A와 검증 절차를 갱신
  - 2026-11-24 11:18 KST: M-1에서 n번째 문장 분석의 추론 수준을 `none`에서 `low`로 변경하고 예상 비용 재계산(약 22% → 약 19% 절감)
  - 2026-11-24 11:31 KST: Phase A 반영 완료(커밋 a76d9fb). UI/UX 유지를 위해 Phase B(P1-6), Phase C(P0-3), Phase D(P2-1~5, P2-8, P3-2) 범위 조정

---

## 0. 요약

| 항목 | 결과 |
| :--- | :--- |
| TypeScript (`npx tsc -p tsconfig.app.json --noEmit`, `tsc -b`) | ✅ **통과** (에러 0) |
| ESLint (`npm run lint`) | ✅ **통과** (0 errors / 0 warnings, 지난 점검 34건에서 해소) |
| 지난 계획서(11-16) 항목 반영 | 대부분 반영됨 (아래 §2) |
| 이번에 새로 찾은 결함 | 🔴 P0 4건 · 🟠 P1 9건 · 🟡 P2 8건 · 🟢 P3 4건 |
| AI 모델 교체·비용 최적화 | 🔵 M 2건 (`gpt-4o` API 종료 예정일 **2027-01-14** 대응) |

> [!IMPORTANT]
> 정적 검사는 모두 통과했습니다. 하지만 런타임 로직 결함이 남아 있습니다. 가장 중요한 두 가지는 **① 학생 채팅에서 대화 이력의 사용자 발화가 전부 빠지는 버그**와 **② 서버 측 권한 검증(RLS·트리거)이 저장소에서 확인되지 않는 문제**입니다.

---

## 1. 기능 현황 (검증 기준)

### 1.1 공통 / 인증 (`App.tsx`, `lib/auth.ts`, `lib/supabase.ts`)
- 랜딩(교사/학생 선택), `.env` 미설정 경고 배너, 개인정보처리방침 링크
- 교사 로그인·회원가입·비밀번호 재설정(`PASSWORD_RECOVERY` 이벤트 → 새 비밀번호 화면)
- 로그인할 때 비활성 계정(`is_active=false`)을 차단

### 1.2 교사 대시보드 (`TeacherAdminDashboard.tsx` 2,828줄, `RoomEditWindow.tsx`)
- **수업 방**: 6자리 코드 방 생성/수정(팝업 + `postMessage` origin 검증), 일시정지/재개(`toggleRoomStatus`), 삭제
- **학습 자료**:
  - 수능형/교과서 지문 토글
  - 수업용 문항 번호(`examCode`)
  - 출처 4분할(년도·학년·월/시기·출처 문항 번호): 프리셋과 직접 입력 지원
  - 태그: 주/보조 프리셋, 사용자 정의 태그는 localStorage에 저장
  - 논리 흐름 2계층(큰 범주/작은 범주/연결어/중심 의미) 편집기
  - 다중 검색 필터: 유형·출처·번호·키워드·태그 AND/OR
- **학생 명단**: TSV/CSV 붙여넣기 → 미리보기 → 일괄 등록, 정렬, `id` 기준 다중 삭제
- **설정**:
  - 모든 교사: OpenAI API 키, 시스템 프롬프트
  - master 전용: Drive/GAS 연동, 전역 문항 제한, 로그인 안내 문구, 교사 관리(활성 토글·개별 제한·삭제)

### 1.3 학생 채팅 (`StudentChatInterface.tsx` 1,127줄, `lib/public-api.ts`, `lib/ai.ts`)
- 방 코드로 입장(`get_active_room_data` RPC). 반별/오픈 클래스 코드가 하드코딩되어 있음
- 학생(모둠) 다중 선택, 문항 선택, 자유 질문
- 추천 질문 4종:
  - 주제와 논리 흐름 3단계는 1~4단계 소크라테스식 힌트로 진행
  - 어휘 5개는 이전 답변과 겹치지 않게 출제
  - n번째 문장 분석
- AI 호출 통합(`requestAiCompletion`): Edge Function 프록시(`ai-chat`)를 쓰거나, 클라이언트 키로 직접 호출
- GAS(Google Apps Script)로 학생별 대화 로그 자동 저장

### 1.4 서버 (`supabase/`)
- `functions/ai-chat`: 방 코드로 교사 키를 조회한 뒤 OpenAI를 대신 호출
- `sql/phase4`: `get_active_room_data`에서 `api_key`를 제거하고 `has_api_key`만 반환, 방 생성/수정 트랜잭션 RPC
- `sql/phase5`: 출처 분리 컬럼, `tags text[]` 컬럼과 GIN 인덱스, RPC 갱신

---

## 2. 지난 계획서(2026-11-16) 반영 상태

| 항목 | 상태 | 확인 내용 |
| :--- | :--- | :--- |
| P0-1 API 키 노출 | 🟡 **부분** | 프록시와 SQL은 작성됨. 단, `ai.ts`는 여전히 `room.api_key` 직접 호출 경로를 지원함. 구 RPC가 배포된 상태라면 키가 계속 노출됨 (배포 여부는 확인 불가) |
| P0-2 postMessage origin | ✅ 해결 | 송신(`RoomEditWindow.tsx:76`)과 수신 모두 origin 검증 |
| P1-1 개별 `max_questions` | ✅ 해결 | `getTeacherSettings`에서 조회. 컬럼이 없을 때의 폴백 포함 |
| P1-2 지문 유형 배지 | ✅ 해결 | 대시보드, 방 편집, 학생 화면 모두 표시 |
| P1-3 AI 호출 공통화 | ✅ 해결 | `lib/ai.ts`: `response.ok`와 내용 검증, `finally`에서 로딩 해제 |
| P1-4 학생 삭제 `id` 기준 | ✅ 해결 | |
| P1-5 방 트랜잭션·토글 UI | ✅ 해결 | RPC를 먼저 쓰고, 없으면 보상 트랜잭션으로 폴백. 일시정지 토글 연결 |
| P1-6 약어 문장 분리 | 🟡 **부분** | `splitEnglishSentences` 도입. 새 결함 있음 (§3 P1-8) |
| P2-1 ESLint | ✅ 해결 | 0건 |
| P2-2 Tailwind 정합성 | 🟡 부분 | `.animate-spin`은 CSS에 직접 정의됨. 사용하지 않는 `tailwindcss`, `autoprefixer`, `postcss`가 아직 devDependencies에 남아 있음 |
| P2-3 저장소 위생 | ✅ 해결 | `public-api.txt`, `build_log.txt` 제거, `lang="ko"` |
| P3 다크모드·반응형 | ⚪ 미검증 | 규칙(Rule 1)에 따라 브라우저 시각 검증은 하지 않음 |

---

## 3. 신규 검증 피드백

### 🔴 [P0] 보안 · 핵심 기능 결함

#### P0-1. 학생 채팅의 대화 이력에서 사용자 발화가 전부 빠짐 (신뢰도: 높음)
- **위치**: `StudentChatInterface.tsx:191-199`, `222`, `484`, `532`
- **문제**:
  - `buildConversationHistory()`는 `!m.context`인 메시지만 이력에 넣습니다.
  - 그런데 자유 질문, 추천 질문, 문장 분석의 **모든 user 메시지에 `context`가 설정**됩니다.
  - 그래서 AI에는 assistant 답변만 연속으로 전달되고, 학생이 직전에 무엇을 물었는지 알 수 없습니다.
  - 그 결과 소크라테스식 단계 유도, "방금 답에 대해…" 같은 후속 질문, 어휘 중복 방지 같은 다회차 맥락이 크게 약해집니다.
- **보완**:
  - user 메시지는 표시용 `content`만 이력에 넣습니다. 맥락은 매 요청의 system 메시지에 이미 들어 있으므로 `context` 필드로 걸러낼 필요가 없습니다.
  - 필터를 `m.role === 'user' || m.role === 'assistant'`로 바꿉니다.
  - **Phase A**에서는 동일 문항 내 맥락 유지를 위해 별도 턴 제한 없이 전체 대화 이력을 전송합니다(문항 전환 시 이미 초기화됨).
  - **Phase C**에서 Edge Function(`ai-chat`)의 메시지 수·길이 상한을 정할 때, 클라이언트(`buildConversationHistory`)도 해당 상한에 맞춰 오래된 메시지부터 자르도록 함께 조정합니다.

#### P0-2. 서버 측 권한 검증이 저장소에 없음: 클라이언트 신뢰 구조 (신뢰도: 클라이언트 측은 높음, 실제 RLS 설정은 확인 불가)
- **위치**: `lib/auth.ts:61-67`, `lib/settings.ts:54-59, 130-161`, `TeacherAdminDashboard.tsx:650, 1030`
- **문제**:
  1. `signUp`이 클라이언트에서 `teachers`에 `role: 'regular'`를 INSERT합니다. 요청을 조작하면 `role: 'master'`로 가입할 수 있습니다.
  2. `updateTeacherSettings(Partial<TeacherSettings>)`에 `max_questions`가 포함되어 있습니다. 일반 교사가 개발자 도구로 자기 제한을 올리거나 `role`/`is_active`를 바꿀 수 있습니다. 본인 행 UPDATE를 허용하는 RLS라면 막을 수 없습니다.
  3. 문항 등록 제한은 `canAddQuestion()`과 버튼 비활성화 등 UI에서만 적용됩니다.
  4. `getAllTeachers`, `toggleTeacherActive`, `deleteTeacher`, `updateAppConfig` 같은 master 기능도 UI에서만 숨깁니다.
- **보완** (`supabase/sql/phase6_rls_hardening.sql` 신설):
  - `teachers`:
    - INSERT는 `id = auth.uid()`이고 `role = 'regular'`일 때만 허용합니다(`WITH CHECK`). 또는 `auth.users` 트리거로 자동 생성합니다.
    - UPDATE는 `BEFORE UPDATE` 트리거로 막습니다. 본인 요청이면서 master가 아니면 `role`, `is_active`, `max_questions` 변경을 거부합니다.
  - `questions`: INSERT 시 `BEFORE INSERT` 트리거로 교사별 제한(`max_questions` → 없으면 `app_config.limit_regular_questions`)을 서버에서 검증합니다.
  - `app_config` 쓰기와 다른 교사 행의 UPDATE/DELETE는 `is_master()` 헬퍼 함수로 제한합니다.
  - 현재 DB의 RLS 정책을 SQL로 내보내 저장소에 버전 관리합니다(현재 저장소에 RLS 정의가 없음).

#### P0-3. 방 코드 열거 → 학생 명단(PII) 노출 및 AI 프록시 남용 (신뢰도: 높음)
- **위치**: `sql/phase5 get_active_room_data`, `functions/ai-chat/index.ts`
- **문제**:
  - 방 코드는 6자리 숫자(90만 가지)이고, anon RPC에 호출 횟수 제한이 없습니다. 무차별 대입으로 활성 방을 찾으면 **학생 실명, 학급, 번호**와 `google_script_url`이 노출됩니다.
  - `ai-chat`은 클라이언트가 보낸 `messages`, `model`, `temperature`를 그대로 OpenAI에 전달합니다.
    - 공개된 오픈 클래스 코드(`272394`)만 알면 누구나 교사 키로 **임의 프롬프트를 쓰는 범용 GPT 프록시**로 쓸 수 있습니다.
    - 고가 모델 지정이나 초대형 메시지 전송도 막혀 있지 않습니다.
  - CORS가 `*`로 열려 있습니다.
- **보완**:
  - Edge Function:
    - `model` 허용 목록(`gpt-4o`, `gpt-4o-mini`)을 둡니다.
    - `messages` 개수와 총 길이 상한(예: 40개, 30k자)을 두고, 클라이언트(`StudentChatInterface.tsx`의 `buildConversationHistory`)도 해당 상한에 맞춰 오래된 메시지부터 자르도록 동기화합니다.
    - `max_tokens`를 고정합니다.
    - `temperature`를 0~1로 제한합니다.
    - CORS 허용 origin을 배포 도메인으로 제한합니다.
  - 방 코드와 IP 기준으로 호출 횟수를 제한합니다(분당 N회, Supabase 테이블 또는 Upstash 이용).
  - **[범위 조정 — 기존 UI 유지]** 학생 이름 마스킹(`김*수`) 및 방 코드 자릿수 확장·영문/숫자 혼합은 **제외**하고 기존 6자리 코드와 학생 학번·이름을 그대로 유지합니다. `ai-chat` Edge Function의 모델 제한, 메시지 수·길이·토큰 상한, CORS 제한, Rate limit 등 UI와 무관한 서버 보호만 적용합니다.
  - `google_script_url`은 클라이언트에 주지 않고 GAS 저장도 Edge Function을 거치도록 바꾸는 방안을 검토합니다(가짜 로그 주입 방지).

#### P0-4. 비활성 교사가 세션 복원으로 다시 로그인됨 (신뢰도: 높음)
- **위치**: `lib/auth.ts:115-133` (`getCurrentUser`), `TeacherAdminDashboard.tsx:238-258`
- **문제**: `signIn`에서만 `is_active`를 검사합니다. 새로고침이나 재방문으로 세션을 복원할 때는 `role`만 조회하므로, 중지된 계정도 대시보드를 그대로 쓸 수 있습니다.
- **보완**: `getCurrentUser`에서 `role, is_active`를 조회하고, `is_active === false`이면 `signOut()` 후 `null`을 반환합니다. P0-2의 RLS에도 `is_active` 조건을 넣어 함께 막습니다.

---

### 🟠 [P1] 런타임 버그 · 데이터 정합성

#### P1-1. "컬럼 누락" 판정이 너무 넓어서 실제 오류가 가려지고 세션 전체가 폴백 모드로 고정됨 (신뢰도: 높음)
- **위치**: `lib/questions.ts:49-65, 199, 291`
- **문제**:
  - `msg.includes('column')`, `'tags'`, `'schema cache'` 조건 때문에 NOT NULL 위반(`23502`, "null value in column …")이나 RLS 관련 메시지까지 "컬럼 없음"으로 판정합니다.
  - 그러면 모듈 전역 변수 `extendedColumnsSupported = false`로 바뀌어 **이후 모든 쓰기가 `logic_flow`에 메타데이터를 넣는 방식**으로 진행되고, 원래 오류는 사라집니다.
  - 폴백 쓰기는 네이티브 `tags` 컬럼을 갱신하지 않습니다. 그런데 읽을 때는 네이티브 태그를 우선하므로(`mapQuestionRow:103`) **태그를 수정해도 반영되지 않는 것처럼** 보입니다.
- **보완**:
  - 판정은 `PGRST204`/`42703`, 또는 메시지에 **특정 신규 컬럼명**과 `does not exist`/`schema cache`가 함께 있을 때로 한정합니다.
  - 폴백 플래그는 성공 시 재평가하거나, 앱 시작 시 컬럼 존재 여부를 한 번 확인(`select source_year limit 0`)해 결정합니다.

#### P1-2. 논리 흐름 행이 경고 없이 삭제됨 (신뢰도: 높음)
- **위치**: `lib/logic-flow.ts:187-196`, `TeacherAdminDashboard.tsx:668, 714`
- **문제**:
  - `normalizeFlowStepsForSave`는 큰 범주(`macroLabel`)나 중심 의미가 비어 있는 행을 버립니다.
  - 검증은 "남은 행이 0개"일 때만 실패합니다.
  - 구형 데이터(`[role] content` 문자열에는 `macroLabel`이 없음)를 열고 그대로 저장하면 **해당 행이 조용히 사라집니다.**
- **보완**:
  - 저장 전에 일부만 입력된 행을 찾아 "N행에 큰 범주/중심 의미가 비어 있습니다"라는 메시지와 함께 저장을 막습니다.
  - 구형 데이터를 편집기로 불러올 때 `macroLabel`이 없으면 `role` 값으로 미리 채웁니다.

#### P1-3. 추천 질문 중복 클릭 시 요청이 동시에 나감 (신뢰도: 높음)
- **위치**: `StudentChatInterface.tsx:291` (`handleFAQClick`), `917-975`
- **문제**:
  - `handleSendMessage`와 달리 `isLoading` 가드가 없고, FAQ 버튼의 `disabled`에도 로딩 상태가 반영되지 않습니다.
  - 응답을 기다리는 중에 다시 누르면 OpenAI 요청이 동시에 나가 비용이 늘고 답변 순서가 섞입니다.
  - `faqClickCounts`를 클로저에서 읽기 때문에 빠르게 연타하면 단계가 같은 값으로 두 번 계산됩니다.
- **보완**: 함수 시작에 `if (isLoading) return;`를 추가하고, FAQ 버튼과 문장 분석 버튼의 `disabled`에 `isLoading`을 반영합니다.

#### P1-4. 논리 흐름이 빈 수능형 문항에서 "정확히 0부분" 프롬프트가 생성됨 (신뢰도: 중간)
- **위치**: `StudentChatInterface.tsx:353, 398, 423`
- **문제**:
  - `selectedQuestion.logicFlow`는 항상 배열(`safeParseLogicFlow` 결과)이고, 빈 배열 `[]`도 truthy입니다.
  - 그래서 흐름이 비어 있어도 Step 1~3 분기로 들어가 "0부분 구조가 존재한다고 전제"하라는 모순된 지시가 만들어집니다.
- **보완**: 조건을 `logicFlowParts.length > 0`으로 바꿉니다. 비어 있으면 "선생님이 아직 논리 흐름을 등록하지 않았어요"라고 안내하거나 해당 버튼을 비활성화합니다.

#### P1-5. 방 생성 버튼을 여러 번 누르면 방이 중복 생성됨 (신뢰도: 높음)
- **위치**: `RoomEditWindow.tsx:62-82, 223-232`
- **문제**: 저장 중 상태가 없어서 응답 전에 "생성"을 여러 번 누르면 방이 여러 개 만들어집니다.
- **보완**: `isSaving` 상태를 추가해 버튼을 비활성화하고 로딩 표시를 보여줍니다.

#### P1-6. 전역·개별 문항 제한 입력값을 검증하지 않음 (신뢰도: 높음)
- **위치**: `TeacherAdminDashboard.tsx:1031-1033`, `2641-2665`
- **문제**:
  - 빈 값을 저장하면 `Number('')`가 0이 되어 화면에는 0으로 보이지만, 다른 클라이언트는 `getAppConfig`가 `''`를 `null`로 받아 기본값 50을 씁니다. 같은 설정이 서로 다르게 보입니다.
  - 음수와 소수도 그대로 저장됩니다.
  - 개별 제한 입력은 `defaultValue`(비제어 입력)라서 상태가 바뀌어도 화면이 갱신되지 않고, "기본값과 같은 값" 오버라이드를 만들 수 없습니다.
- **보완**:
  - 저장 전에 0 이상의 정수인지 검증합니다.
  - **[UI 유지]** 교사 설정 화면에 새 체크박스를 추가하지 않고, 기존 입력 UI 그대로 둔 채 제어 입력으로 전환하여 상태 동기화와 정수 검증만 적용합니다(빈 값 입력 시 기존과 동일하게 `null` 처리).

#### P1-7. 설정 조회 오류를 "설정 없음"으로 처리함 (신뢰도: 중간)
- **위치**: `lib/settings.ts:69-82`
- **문제**: 네트워크나 RLS 오류도 `null`로 반환되어 기본값 50과 기본 안내 문구로 조용히 바뀝니다.
- **보완**: `PGRST116`(행 없음)일 때만 `null`을 반환하고, 그 밖의 오류는 throw한 뒤 화면에 표시합니다.

#### P1-8. 영어 문장 분리에서 `No.`, `St.`, `etc.`가 문장 끝일 때 분리되지 않음 (신뢰도: 높음)
- **위치**: `lib/text.ts:17`
- **문제**:
  - 약어 정규식이 `gi`(대소문자 무시)라서 "The answer is **no.** However, …"처럼 문장 끝의 `no.`를 약어로 처리해 두 문장이 하나로 합쳐집니다.
  - 문장 끝의 `etc.`, `U.S.`도 같은 문제가 있습니다.
  - 그 결과 학생에게 보여주는 "n번째 문장" 번호가 실제와 어긋납니다.
- **보완**:
  - `No.`는 뒤에 숫자가 올 때만 약어로 처리합니다(`/\bNo\.(?=\s*\d)/`).
  - `Mr`/`Dr`/`St` 등은 대소문자를 구분합니다.
  - `etc.`와 `U.S.`는 뒤에 대문자로 시작하는 단어가 오면 문장 경계로 인정합니다.
  - 테스트 문장 세트를 만들어 회귀 검증합니다(§5).

#### P1-9. 문항 번호 필터 의미 오류 및 출처 문항 번호가 엉뚱하게 생성됨 (신뢰도: 중간)
- **위치**: `lib/question-meta.ts:259-274`, `228-238`, `185`
- **문제**:
  - `1번`으로 검색하면 `2024-1학기-64번`도 걸립니다(모든 숫자 토큰과 비교하기 때문).
  - 숫자만 입력한 `2`는 부분 문자열로 비교해 12, 20, 2024까지 걸립니다.
  - 범위(`29~31번`)를 펼치지 않아 `30번`으로 검색해도 찾지 못합니다.
  - 사용자 정의 월/시기(예: `EBS 3`)가 들어간 `targetGrade`를 다시 파싱하면 `3번`이라는 출처 문항 번호가 엉뚱하게 생깁니다.
- **보완**:
  - 번호 필터는 "번"이 붙은 토큰만 비교하고 범위도 포함하도록 고칩니다.
  - 숫자만 입력하면 정확히 일치할 때만 매칭합니다.
  - 분리 컬럼 값이 하나라도 있으면 `targetGrade`를 다시 파싱하지 않도록 조건을 강화합니다.

---

### 🔵 [M] AI 모델 교체 · 비용 최적화

> [!WARNING]
> 웹 검색 결과에 따르면 OpenAI는 2026-10-14에 `gpt-4o` 계열 종료를 공지했고, **API 종료일은 2027-01-14**입니다. 이날이 지나면 학생 채팅의 AI 응답이 모두 오류가 됩니다. 그래서 M-1과 M-2는 **Phase A에 포함**합니다.
> 가격과 파라미터 사양(`reasoning_effort`, `temperature` 지원 여부, 캐시 단가)은 적용 전에 OpenAI 공식 문서로 다시 확인해야 합니다.

#### M-1. 기본 모델을 `gpt-6-sol`로 교체하고 요청 유형별로 추론 수준 구분
- **위치**: [ai.ts:33-36, 61-72](file:///c:/Users/user/Desktop/web%20app/04-ai-tutor-app-main/src/lib/ai.ts#L33-L72), [ai-chat/index.ts:76-87](file:///c:/Users/user/Desktop/web%20app/04-ai-tutor-app-main/supabase/functions/ai-chat/index.ts#L76-L87), [StudentChatInterface.tsx:247, 506, 553](file:///c:/Users/user/Desktop/web%20app/04-ai-tutor-app-main/src/pages/StudentChatInterface.tsx#L247)
- **현황**:
  - `'gpt-4o'`와 `temperature: 0.7`이 클라이언트와 서버 양쪽에 하드코딩되어 있습니다.
  - 요청 유형과 관계없이 같은 설정으로 호출합니다.
- **설계 원칙**:
  - 기본은 `gpt-6-sol` + `reasoning_effort: 'low'`입니다. 교사 데이터 준수와 단계별 힌트 제약처럼 여러 조건을 동시에 지켜야 하는 튜터링 요청에 씁니다.
  - n번째 문장 분석도 `'low'`로 보냅니다. 구문 구조 파악(수식 관계, 생략, 도치 등)과 문맥에 맞는 해석에는 추론이 필요해 정확도를 우선합니다.
  - 단순 추출 요청인 어휘 5개만 `'none'`으로 보내 속도를 높이고 추론 토큰 비용을 없앱니다.
  - `medium` 이상은 쓰지 않습니다. 첫 응답까지 대기 시간이 늘고, 추론 토큰이 출력 요금으로 과금되어 비용이 약 60% 늘어날 것으로 추정됩니다.

- **요청 유형별 매핑**:

  | 요청 유형 | 위치(핸들러) | `reasoning_effort` | 이유 |
  | :--- | :--- | :--- | :--- |
  | 자유 질문 | `handleSendMessage` | `low` | 질문 의도가 다양하고 교사 데이터 준수가 필요 |
  | 우리말 주제 (FAQ 0) | `handleFAQClick` | `low` | 1~4단계 힌트 수준 제약 |
  | 논리 흐름 Step 1~3 (FAQ 1~3) | `handleFAQClick` | `low` | 부분 수·라벨 고정, 중심 내용 공개 금지 등 여러 제약 |
  | 중요 단어 5개 (FAQ 4) | `handleFAQClick` | `none` | 단순 추출. 중복 제외 목록은 프롬프트로 전달 |
  | n번째 문장 분석 (FAQ 5) | `handleSentenceSelect` | `low` | 구문 분석(수식·생략·도치)과 문맥 해석의 정확도 우선 |

- **구현 계획**:
  1. **`src/lib/ai-config.ts` 신설**:
     - `AI_MODEL = import.meta.env.VITE_AI_MODEL || 'gpt-6-sol'`
     - `type AiRequestKind = 'tutoring' | 'simple'`
     - `REASONING_BY_KIND = { tutoring: 'low', simple: 'none' } as const`
  2. **`requestAiCompletion` 수정** ([ai.ts](file:///c:/Users/user/Desktop/web%20app/04-ai-tutor-app-main/src/lib/ai.ts)):
     - 파라미터에 `kind: AiRequestKind`를 추가하고 `model`/`temperature` 직접 지정은 제거합니다.
     - 요청 본문에 `reasoning_effort`를 추가합니다.
     - `temperature`는 추론이 켜져 있으면(`low`) 보내지 않습니다. `none`일 때도 공식 사양에서 지원하는지 확인한 뒤에만 보냅니다.
     - `max_tokens` 대신 `max_completion_tokens`(예: `tutoring` 1,500 / `simple` 1,000)를 써서 비용 상한을 둡니다.
  3. **Edge Function `ai-chat` 수정** (P0-3과 함께):
     - 서버 환경 변수 `OPENAI_MODEL`(기본값 `gpt-6-sol`)을 사용하고, 클라이언트가 보낸 `model`은 무시하거나 허용 목록(`gpt-6-sol`)으로만 검증합니다.
     - `kind`(또는 `reasoning_effort`)는 `none`/`low`만 허용하고 그 외 값은 400을 반환합니다.
     - OpenAI 응답의 `usage`(입력·캐시·추론 토큰)를 그대로 클라이언트에 전달합니다(비용 모니터링용).
  4. **호출부 수정**: 위 매핑표대로 `kind`를 지정합니다. 3개 핸들러에서 `requestAiCompletion` 호출에 `kind` 한 줄씩 추가합니다.
  5. **롤백 경로**: 종료일 전에 문제가 생기면 `VITE_AI_MODEL`/`OPENAI_MODEL` 환경 변수만 바꿔 되돌릴 수 있게 합니다(코드 수정 없이 재배포만).

#### M-2. 매 턴 반복되는 프롬프트 앞부분(시스템 프롬프트 + 지문) 순서 고정
- **위치**: [StudentChatInterface.tsx:159-179, 231-245, 494-505, 544-552](file:///c:/Users/user/Desktop/web%20app/04-ai-tutor-app-main/src/pages/StudentChatInterface.tsx#L159-L179)
- **현황 (캐시 적중을 막는 원인)**:
  - 요청 경로마다 system 메시지 구성 순서가 달라서, 같은 문항인데도 앞부분이 일치하지 않습니다.

    | 경로 | 현재 system 메시지 구성 순서 |
    | :--- | :--- |
    | 자유 질문 | 교사 `system_prompt` → 최우선 지침 → `[문항 정보]`(전체) |
    | 추천 질문 | STRICT 헤더 → `[문항 정보]`(전체) → 교사 `system_prompt` → 데이터 부정 금지 |
    | 문장 분석 | 교사 `system_prompt` → `[문항 정보]`(지문만, 주제·흐름 제외) |

  - 그래서 학생이 자유 질문과 추천 질문을 섞어 쓰면 매번 캐시를 놓칩니다(OpenAI 프롬프트 캐시는 앞부분이 정확히 일치할 때만 적용).
  - 힌트 단계(`repeatNotice`), 어휘 제외 목록처럼 매번 바뀌는 내용은 이미 마지막 user 메시지에 들어 있어 이 원칙에 맞습니다. 이 구조는 유지합니다.
- **고정 메시지 구조** (모든 요청 경로 공통):

  ```text
  [0] system  ─ ① 공통 튜터 규칙 (코드 상수, 모든 방·문항에서 동일)
              ─ ② 교사 system_prompt (방 단위로 고정)
  [1] system  ─ ③ [문항 정보] = getContextString(q) (문항 단위로 고정: 지문 + 주제 + 논리 흐름)
  [2..n-1]    ─ ④ 대화 이력 (뒤에 추가만 함. 기존 메시지는 바꾸지 않음)
  [n]   user  ─ ⑤ 이번 요청 전용 지시 (FAQ 프롬프트, 힌트 단계, 어휘 제외 목록, 문장 분석 요청)
  ```

- **구현 계획**:
  1. **`src/lib/tutor-prompts.ts` 신설** (P2-2 일부를 앞당겨 진행):
     - `TUTOR_BASE_RULES`: 지금 세 경로에 흩어진 "교사 데이터 절대 준수", "데이터 부정 금지" 문구를 하나의 상수로 통합합니다.
     - `buildPrefixMessages(roomInfo, question): ChatApiMessage[]`: 위 [0], [1]을 만듭니다. **입력이 같으면 항상 글자 하나까지 같은 문자열**을 돌려줘야 합니다(시간, 횟수, 난수 금지).
     - `buildFaqUserPrompt(...)`, `buildSentenceUserPrompt(...)`: 지금 `handleFAQClick` 안의 `aiPrompt` 생성 로직을 그대로 옮깁니다(⑤에 해당).
  2. **세 핸들러 통일**: `apiMessages = [...buildPrefixMessages(roomInfo, q), ...history, { role: 'user', content: dynamicPrompt }]`
     - 문장 분석도 전체 `[문항 정보]`를 씁니다. 입력 토큰은 약간 늘지만 캐시를 공유하므로 실제 비용은 줄어듭니다. 정답 비공개는 ① 규칙으로 보장합니다.
  3. **이력은 뒤에 추가만 하고 자를 때는 블록 단위로** (P0-1과 정합):
     - **Phase A**: P0-1 결정대로 같은 문항 안에서는 이력을 자르지 않고 전부 보냅니다. 이력이 뒤에 추가만 되므로 직전 요청 전체가 다음 요청의 앞부분이 되어 캐시에 가장 유리합니다.
     - **Phase C**: 상한을 도입할 때 매 턴 앞에서 한 개씩 자르면 이력 부분 캐시가 계속 깨집니다. 그래서 **블록 단위**로 자릅니다. 예를 들어 상한(서버 메시지 수 제한 이하)을 넘으면 최근 절반만 남깁니다.
     - 어느 경우든 [0]+[1] 앞부분은 이력을 자르는 것과 상관없이 계속 캐시됩니다.
  4. **캐시 적용 조건 점검**: 앞부분이 1,024토큰 이상이어야 캐시가 적용됩니다. 지문 + 규칙 + 교사 데이터는 보통 1,500~2,500토큰이라 조건을 충족할 것으로 예상합니다. 짧은 교과서 지문은 미달할 수 있으므로 측정 후 판단합니다.
  5. **선택 사항**: 공식 사양에서 지원하면 `prompt_cache_key = room-{roomId}-q-{questionId}`를 지정해 같은 문항의 요청이 같은 캐시로 가도록 합니다.
  6. **Edge Function 주의**: 프록시는 `messages`의 순서나 내용을 바꾸지 않고 그대로 전달합니다. 서버에서 앞에 무언가를 덧붙이면 캐시가 깨집니다.

#### M-1 + M-2 적용 후 예상 비용 (가정치)
- **가정**:
  - 한 턴의 입력은 약 3,000토큰이고, 그중 고정 앞부분 약 2,000토큰이 캐시 적중합니다.
  - 출력은 약 600토큰이고, `low`일 때 추론 토큰이 약 300개 더 나옵니다.
  - 캐시 입력 단가는 \$0.20/1M으로 가정했습니다(**확인 필요**).
  - 요청 비율은 `low`(튜터링 + 문장 분석) 85%, `none`(어휘 5개) 15%입니다.
  - 월 사용량은 12,000턴입니다(학생 30명 × 하루 20턴 × 월 20일).

| 구성 | 턴당 비용 | 월 비용 (12,000턴) |
| :--- | :--- | :--- |
| 현재: `gpt-4o`, 캐시 미적중 | 약 \$0.0135 | 약 \$162 |
| `gpt-6-sol` + `low` 일괄, 캐시 미적중 | 약 \$0.0150 | 약 \$180 |
| **M-1 + M-2 적용** (`low` 85% / `none` 15%, 캐시 적중) | 약 \$0.0110 | **약 \$131 (현재 대비 약 19% 절감)** |

> [!NOTE]
> P0-1(대화 이력 버그) 수정 후에는 학생 발화가 이력에 정상적으로 들어가고, Phase A에서는 이력을 자르지 않으므로 대화가 길어질수록 입력 토큰이 늘어납니다. 다만 늘어나는 이력도 앞부분이 고정되어 대부분 캐시 단가로 과금됩니다. 위 추정은 문항당 대화가 짧은(약 10턴 이내) 일반 수업을 전제로 한 값입니다.

---

### 🟡 [P2] 코드 품질 · 유지보수성

> [!NOTE]
> **P2-1~P2-5**는 내부 코드 분리만 수행하고 기존 DOM 마크업·스타일·동작을 그대로 유지합니다.

| ID | 항목 | 위치 | 보완 |
| :--- | :--- | :--- | :--- |
| P2-1 | 대시보드 단일 컴포넌트 비대화: 2,828줄, `useState` 47개, 인라인 `style` 170개, `alert` 34회 | `TeacherAdminDashboard.tsx` | `useTeacherSession`, `LoginView`, `RoomsTab`, `StudentsTab`, `MaterialsTab`(`QuestionForm`/`LogicFlowEditor`/`SourceFields`/`TagPicker`/`QuestionFilters`/`QuestionCard`), `SettingsTab`(`MasterConfigCard`/`TeacherManagementTable`/`PersonalSettings`)로 분리 |
| P2-2 | 학생 채팅 컴포넌트 비대화(1,127줄). 프롬프트 빌더가 UI와 섞여 있고 소크라테스 지시문 중복(`socraticInstruction`과 `buildSocraticStrictForPartCount`가 거의 같은 내용) | `StudentChatInterface.tsx:50, 339` | `lib/tutor-prompts.ts`로 프롬프트 생성을 순수 함수로 분리(단위 테스트 가능) |
| P2-3 | 문항 추가/수정 핸들러가 약 90% 중복, 출처 3필드 블록 복붙, 태그 칩 그룹 6회 반복 | 대시보드 L655-748, L1549-1682 | `buildQuestionPayload()`, `<PresetOrCustomField>`, `<TagChipGroup>`으로 공통화 |
| P2-4 | 문항 행 매핑 중복 | `questions.ts:mapQuestionRow`와 `public-api.ts:57-100` | 공용 `mapQuestionRecord()` 하나로 통합 |
| P2-5 | 기본 시스템 프롬프트와 기본 안내 문구 상수가 여러 곳에 반복됨 | 대시보드 L100/194/545, L106/145, 학생 채팅 | `lib/constants.ts` |
| P2-6 | `console.log` 잔존(교사 ID 출력 포함) | `settings.ts:12,55,65`, 대시보드 L131, L253 | 제거하거나 `import.meta.env.DEV`일 때만 출력 |
| P2-7 | 한글 IME 입력 시 Enter로 단계가 두 번 추가됨, 흐름 행에 `key={index}` 사용 | 대시보드 L1929-1935, L1861 | `e.nativeEvent.isComposing` 검사, 행마다 고유 `id` 부여 |
| P2-8 | 사용하지 않는 의존성 | `package.json`(tailwindcss/autoprefixer/postcss) | 미사용 `package.json` 패키지(tailwindcss/autoprefixer/postcss) 정리만 진행 (입장 화면의 반별 코드 UI는 그대로 유지) |

---

### 🟢 [P3] 개선 제안

- **P3-1. 로그아웃 후 늦게 도착한 응답이 상태에 반영됨**: 로드 함수에 취소 플래그(`AbortController` 또는 `teacherId` 비교)를 둡니다. (대시보드 L155-223)
- **P3-2. 필터 선택값이 옵션 목록에서 사라져도 필터가 계속 적용됨**: 별도 안내 문구를 추가하지 않고, 옵션에 없는 내부 필터 값만 자동으로 초기화합니다(기존 DOM·스타일 유지).
- **P3-3. 회원가입 흐름**:
  - 이메일 인증을 켜면 세션이 없어 `teachers` INSERT가 실패할 수 있습니다. DB 트리거로 생성하도록 옮기는 것을 권장합니다(P0-2와 연계).
  - 회원가입 직후에는 문항, 학생, 방 데이터를 불러오지 않습니다.
- **P3-4. `deleteTeacher`는 `teachers` 행만 삭제**: `auth.users` 계정은 남습니다. Edge Function(service role)으로 완전히 삭제하도록 바꿉니다. 화면의 "API 키는 암호화되어 저장" 문구도 실제 구현(평문 컬럼)에 맞게 고치거나, Supabase Vault/pgsodium으로 실제 암호화를 적용합니다.

---

## 4. 단계별 실행 로드맵

| 단계 | 포함 항목 | DB/인프라 변경 | 기대 효과 |
| :--- | :--- | :--- | :--- |
| **Phase A (즉시, 2027-01-14 전 완료)** | P0-1(대화 이력 전체 전송), **M-1(`gpt-6-sol` + 유형별 추론 수준)**, **M-2(프롬프트 앞부분 순서 고정)**, P0-4(세션 `is_active`), P1-3(FAQ 중복 요청), P1-4(빈 흐름), P1-5(방 중복 생성), P1-2(흐름 행 삭제 경고), P1-8(문장 분리) | M-1은 Edge Function 재배포와 환경 변수(`VITE_AI_MODEL`, `OPENAI_MODEL`) 설정 필요. 나머지는 프론트엔드만 | `gpt-4o` 종료 대응, 학습 품질 회복, AI 비용 절감(추정), 주요 런타임 버그 해소 |
| **Phase B (데이터 정합성)** | P1-1(컬럼 누락 판정), P1-6(제한값 검증), P1-7(설정 오류 처리), P1-9(번호 필터·출처 파싱), P2-7(IME/key) | 불필요 | 저장 데이터 오염 방지 |
| **Phase C (서버 보안)** | P0-2(RLS·트리거 `phase6_rls_hardening.sql`), P0-3(Edge Function 입력 제한·클라이언트 이력 상한 동기화·호출 횟수 제한 등 서버 보호만 적용), P0-1 후속(`VITE_USE_AI_PROXY=true` 고정 후 `ai.ts` 직접 호출 경로 제거), P3-4 | **필요** (SQL·Edge Function 배포) | 권한 상승, 키 남용 차단 (기존 6자리 방 코드·학생 명단 UI 유지) |
| **Phase D (리팩터링)** | P2-1~P2-6, P2-8(패키지 정리만), P3-1~P3-3 | 불필요 | 유지보수성, 테스트 용이성 (기존 DOM·스타일 및 입장 화면 반별 코드 UI 유지) |

> [!WARNING]
> Phase C의 SQL은 운영 DB 정책을 바꿉니다. 먼저 현재 RLS 정책을 백업(`pg_dump --schema-only` 또는 대시보드에서 내보내기)하세요. 그다음 master와 일반 교사 계정으로 각각 회귀 테스트를 한 뒤 적용해야 합니다.

---

## 5. 검증 절차 (Workspace Rule 2 준수)

```powershell
npx tsc -p tsconfig.app.json --noEmit
npm run lint
```

- **추가 권장 (Phase A·B 이후)**: `vitest`를 도입해 아래 순수 함수의 단위 테스트를 작성합니다.
  - `splitEnglishSentences`: `no.`, `U.S.`, `e.g.`, 소수점, 인용부호 케이스
  - `parseQuestionSource`, `matchesQuestionNumberFilter`, `normalizeFlowStepsForSave`
  - `buildConversationHistory`: user/assistant 교대 순서 보장
- **M-1·M-2 적용 후 확인**:
  - 실제 수업 문항 5~10개로 `gpt-4o`와 `gpt-6-sol` 답변을 나란히 비교합니다. 확인할 점: 힌트 1~4단계를 지키는지, Step 1에서 중심 내용을 공개하지 않는지, 교사가 정한 부분 수를 유지하는지
  - `tutoring`/`simple` 요청별 응답 시간(첫 토큰까지)을 비교합니다. 목표는 `low` 기준 체감 지연이 `gpt-4o`와 비슷한 수준입니다.
  - 같은 문항에서 자유 질문 → 추천 질문 → 문장 분석 순서로 요청했을 때, 응답 `usage.prompt_tokens_details.cached_tokens`가 두 번째 요청부터 1,024 이상인지 확인합니다(DEV 콘솔 출력).
  - 단위 테스트: `buildPrefixMessages`가 같은 입력에 대해 세 경로 모두 같은 문자열을 반환하는지 검증합니다.
- **Phase C 이후 수동 확인**:
  - 일반 교사 세션에서 `supabase.from('teachers').update({ role: 'master' })`를 호출하면 거부되는지
  - 제한을 넘는 `questions` INSERT가 거부되는지
  - `ai-chat`에 허용되지 않은 `model`이나 과대 `messages`를 보내면 400이 반환되는지

---

> [!NOTE]
> - 이 계획서는 소스 코드와 Git 상태를 바꾸지 않고 작성했습니다(정적 검사와 코드 읽기만 수행).
> - DB의 실제 RLS 정책과 Edge Function 배포 상태는 저장소 밖에 있어 확인하지 못했습니다. P0-2와 P0-3의 심각도는 실제 설정에 따라 달라질 수 있습니다.
> - 반영을 원하시면 **`/apply`**(예: `/apply Phase A만 적용해줘`)를 입력해 주세요.
