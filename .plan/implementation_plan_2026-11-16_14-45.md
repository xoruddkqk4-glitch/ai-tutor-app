# 📋 AI Tutor 프로젝트 현황 점검 및 보완 계획서

- **작성 일시**: 2026-11-16 14:45:38 KST (`+09:00`)
- **대상 프로젝트**: `04-ai-tutor-app-main` (`https://github.com/xoruddkqk4-glitch/ai-tutor-app.git`)
- **기준 브랜치 / 최신 커밋**: `main` / `2ad4a2b` (`2026-09-06 17:03:48 +0900`)
- **작성 모드**: `/ask` (소스 코드 수정 없는 현황 진단 및 구현 계획 수립 — `/apply` 명령 시 단계별 반영 가능)

---

## 1. 프로젝트 기능 현황 분석

### 1.1 공통 진입 및 인증·인프라 (`src/App.tsx`, `src/lib/supabase.ts`, `src/lib/auth.ts`, `public/privacy.html`)
- **역할 선택 랜딩 페이지 (`src/App.tsx`)**:
  - `For Teachers` (교사 대시보드), `For Learners` (학생 채팅 화면) 카드 제공 및 초심자 한·영 안내 문구 표시
  - 하단 `개인정보처리방침` 링크를 통해 정적 문서 `public/privacy.html` 제공
- **환경 변수 안전 가드 (`src/lib/supabase.ts`, `src/App.tsx`)**:
  - `VITE_SUPABASE_URL` 또는 `VITE_SUPABASE_ANON_KEY` 미설정 시에도 `createClient` 예외로 인한 흰 화면 크래시를 방지하기 위해 fallback URL/Anon Key로 초기화하고, 랜딩 상단에 `.env` 설정 안내 경고 배너를 노출 (`isSupabaseConfigured`)
- **교사 인증 및 비밀번호 복구 (`src/lib/auth.ts`, `src/App.tsx`)**:
  - Supabase Auth 기반 이메일 로그인(`signIn`), 회원가입(`signUp` 시 `teachers` 테이블에 `role: 'regular'` 자동 등록), 비밀번호 재설정 이메일 발송(`resetPassword`)
  - 재설정 링크 리다이렉트 시 `PASSWORD_RECOVERY` 인증 이벤트를 감지하여 새 비밀번호 설정 화면(`view === 'reset-password'`) 제공
  - 로그인 시 `teachers.is_active === false`인 계정은 즉시 로그아웃 및 차단 처리

### 1.2 교사용 관리자 대시보드 (`src/pages/TeacherAdminDashboard.tsx`, `src/pages/RoomEditWindow.tsx`, `src/lib/*`)
- **학생 명단 관리 (`students` 탭, `src/lib/students.ts`)**:
  - 엑셀 복사/붙여넣기(탭·콤마 구분: `학급 / 번호 / 이름 / 역량(선택, 기본값 '중')`) 파싱 미리보기 및 일괄 등록
  - 저장된 학생 테이블 컬럼별 정렬(`학급`, `번호`, `이름`, `역량`) 및 체크박스 다중 선택 일괄 삭제
- **학습 자료(문항) 관리 (`materials` 탭, `src/lib/questions.ts`, `src/lib/logic-flow.ts`)**:
  - `[수능형 지문 | 교과서 지문]` 세그먼트 토글 제공
    - `교과서 지문` 선택 시 주제(`topic`)와 논리 흐름(`logicFlow`) 입력 영역 비활성화 및 빈 값 정규화 저장
    - DB `questions` 테이블에 `passage_type` 컬럼이 없는 경우를 대비한 fallback INSERT/UPDATE 및 `topic`/`logic_flow` 유무 기반 유형 추론
  - **논리 흐름 2계층 구조 (`src/lib/logic-flow.ts`)**:
    - 각 단계마다 `큰 범주(macroLabel, 필수)` · `작은 범주(role, 선택)` · `연결어(conjunction, 선택)` · `중심 의미(content, 필수)` 입력 지원
    - 연속된 행에 동일한 큰 범주를 입력하면 `getMacroOrderedLabels` / `hasMacroRefinement`가 거시 의미 덩어리로 자동 그룹화
- **수업 대시보드 및 방 관리 (`dashboard` 탭, `src/pages/RoomEditWindow.tsx`, `src/lib/rooms.ts`)**:
  - 6자리 숫자 Room Code 자동 발급 및 `rooms` / `room_questions` 매핑
  - 팝업 창(`/?page=room-edit`)을 통한 학급 다중 선택 및 문항 다중 선택 생성/수정, 저장 완료 시 `window.opener.postMessage('roomUpdated', '*')`로 부모 대시보드 목록 갱신
  - 수업 방 삭제(`deleteRoom`)
- **설정 및 마스터 관리자 기능 (`settings` 탭, `src/lib/settings.ts`)**:
  - 교사 공통: OpenAI API 키, AI 기본 시스템 프롬프트 설정
  - Google Drive 연동(`google_script_url`, `drive_folder_id`): 현재 `master` 계정만 입력 가능, 일반 교사는 비활성화("준비 중") 상태
  - `master` 전용 전역 설정 및 교사 관리:
    - 일반 교사 문항 등록 기본 제한수(`limit_regular_questions`), 로그인 페이지 서비스 안내 문구(`login_notice_text`, `{limit}` 치환 및 이메일 자동 `mailto:` 링크 변환)
    - 일반 교사 회원 목록 조회, 계정 활성/중지 토글(`is_active`), 교사별 개별 문항 제한수(`max_questions`) 설정, 교사 삭제

### 1.3 학생용 AI 튜터 채팅 인터페이스 (`src/pages/StudentChatInterface.tsx`, `src/lib/public-api.ts`)
- **비로그인 방 입장 (`step === 'room'`)**:
  - 숫자형 Room Code 유효성 검증 후 `get_active_room_data` Supabase RPC로 방 정보·학생 목록·문항 목록 조회
  - 입장 화면 내 반별 참여 코드(`세문영A` 822435, `세문영D` 353514, `세문영E` 946410), 게스트용 오픈 클래스(`272394`), 가이드 다운로드 배너(`http://tiny.cc/hongik-aitutor`) 표시
- **학생(모둠)·문항 선택 및 자유 대화 (`step === 'chat'`)**:
  - 학급별 학생 다중 선택 모달(학급 단위 전체 선택/해제 지원, 2인 이상 선택 시 `모둠` 말풍선으로 구분)
  - 문항 선택 모달(문항 번호 `examCode` 및 출처 `targetGrade` 표시) 및 문항 전환 시 대화·FAQ 클릭 카운트 초기화
  - 자유 질문 시 교사 정답 데이터(`topic`, `logicFlow`)를 최우선 지침(`STRICT`)으로 시스템 프롬프트에 주입해 OpenAI `gpt-4o` 호출
- **추천 질문(FAQ) 4종 및 소크라테스식 단계별 튜터링**:
  1. **우리말 주제 질문**: 문항별 클릭 횟수에 따라 1단계(방향 제시) → 2단계(키워드 암시) → 3단계(주제문 위치/절반 힌트) → 4단계(정답 공개 + 칭찬)로 점진 유도
  2. **논리적 흐름 분석 (3단계 아코디언)**:
     - **Step 1 (몇 부분인지 찾기)**: 교사가 연속 동일 큰 범주로 거시 구조를 구성한 경우(`hasMacroRefinement`) 1~2회 클릭은 큰 범주 기준 유도, 3~4회 클릭부터 세부 부분 수·작은 범주 기준으로 안내
     - **Step 2 (각 부분 중심 내용과 논리적 흐름)**: 1~4단계 소크라테스식 힌트 후 교사 데이터 형식 그대로 정리
     - **Step 3 (영어 연결어 및 논리적 역할)**: 연결어 존재 시 위치 안내 + 대표 연결어 분류표 제시 → 추론 범위 축소 → 정답 공개(연결어 없을 때는 숨은 논리 관계 유도)
  3. **중요 단어 5개 질문**: 이전 어휘 질문에 대한 AI 응답을 누적 수집해 중복 없는 새 단어 5개 출제
  4. **구두점 기준 n번째 영어 문장 분석**: 문장 선택 모달에서 특정 문장을 골라 문법 분석 및 문맥 해석 요청
  - `교과서 지문` 선택 시 '우리말 주제'와 '논리적 흐름 분석 (3단계)' 버튼/아코디언 자동 비활성화 및 `(교과서 지문 미지원)` 안내
- **Google Drive 자동 기록 (`saveTurnToGAS`)**:
  - 매 질문-응답 턴 종료 시 선택된 모든 학생 파일명(`[학급] 번호번 이름`)으로 Google Apps Script 웹 앱에 대화 로그 전송

---

## 2. Git 커밋 및 작업 트리 상태 점검 결과

### 2.1 브랜치 및 원격 동기화 상태
- **현재 브랜치**: `main` (추적 원격: `origin/main` — `ahead 0, behind 0`, 완전 동기화 상태)
- **Stash**: 없음

### 2.2 최근 커밋 히스토리
| 커밋 해시 | 작성 시각 | 요약 |
| :--- | :--- | :--- |
| `2ad4a2b` | `2026-09-06 17:03:48 +0900` | `feat: add passage type toggle (textbook vs csat) and conditional input/FAQ disabling` |
| `58e7b46` | `2026-09-01 01:06:51 +0900` | `style: separate AI tutor guide download message into two lines for improved visibility` |
| `a81236d` | `2026-09-01 01:04:41 +0900` | `docs: update README.md and detailed commit results` |
| `74788d1` | `2026-08-31 23:59:37 +0900` | `feat: move Open Class room code to blue banner card` |
| `17c1561` | `2026-08-31 21:55:32 +0900` | `feat: update class participation codes, landing card text and download link banner` |
| `be34109` | 이전 커밋 | `docs: update README.md and detailed commit results` |
| `69a968f` | 이전 커밋 | `Merge remote main with local; keep local 논리 흐름·README 등 최신 코드` |
| `4b0ffad` | 이전 커밋 | `feat: 논리 흐름 큰/작은 범주(필수/선택), Step1 FAQ 거시·세부 유도, logic-flow 모듈 및 README 반영` |

### 2.3 미커밋 작업 트리 상태
> 애플리케이션 소스 코드(`src/`, `public/`, `package.json` 등)에는 미커밋 변경 사항이 없으며, 에이전트 규칙·스킬(`.agents/`)만 수정·추가된 상태입니다.

- **Modified (unstaged, 2건)**:
  - `.agents/rules/rules.md`: 브라우저/스크래치패드 정책 예외(`/scratchpad`), 언어별 정적 검증 명령, `/git-commit` 엄격 트리거 및 `README.md` KST 누적 기록 규칙, `/ask`·`/apply` 모드 정책 반영
  - `.agents/skills/git-commit/SKILL.md`: 자동 커밋 금지 명시 및 `README.md` 하단 누적 이력 포맷 구체화
- **Untracked (3건)**:
  - `.agents/skills/apply/SKILL.md`
  - `.agents/skills/ask/SKILL.md`
  - `.agents/skills/scratchpad/SKILL.md`
- **기타 디렉터리 참고**:
  - `.plan/` 폴더가 생성됨 (`2026-11-16`)
  - Windows 환경에서 `.agents/rules/rules.md`, `.agents/skills/git-commit/SKILL.md`에 대한 Git 경고(`LF will be replaced by CRLF`) 출력 확인

---

## 3. 정적 검증 결과 (`tsc` & `eslint`)

| 검사 항목 | 실행 명령 | 결과 | 상세 내역 |
| :--- | :--- | :--- | :--- |
| TypeScript 컴파일 체크 | `npx tsc --noEmit` | **통과** (에러 0건) | `tsconfig.app.json` 기준 타입 오류 없음 |
| ESLint 정적 분석 | `npm run lint` | **실패** (Exit Code 1) | 총 **34건** (`error 33건`, `warning 1건`) |

- **ESLint 상세 분포**:
  - `@typescript-eslint/no-explicit-any` (**33 errors**):
    - `src/pages/TeacherAdminDashboard.tsx`: 21건 (159, 177, 214, 224, 235, 246, 283, 298, 311, 322, 341, 358, 401, 432, 444, 619, 680, 706, 712, 713, 732행)
    - `src/pages/StudentChatInterface.tsx`: 5건 (153, 268, 282, 527, 712행)
    - `src/lib/public-api.ts`: 2건 (10, 11행)
    - `src/lib/questions.ts`: 2건 (38, 86행)
    - `src/pages/RoomEditWindow.tsx`: 2건 (50, 76행)
    - `src/App.tsx`: 1건 (53행)
  - `react-hooks/exhaustive-deps` (**1 warning**):
    - `src/pages/TeacherAdminDashboard.tsx:141` (`useEffect` 의존성 배열에 `'teacherRole'` 누락)

---

## 4. 보완이 필요한 부분 상세 진단 및 구현 계획

### 🔴 [P0] 보안 및 아키텍처 취약점

#### P0-1. 클라이언트(학생 브라우저)로 교사 OpenAI API 키 평문 노출
- **위치**: `src/lib/public-api.ts` (`get_active_room_data` RPC), `src/pages/StudentChatInterface.tsx` (79, 255~259, 515~519, 557~561행)
- **현황 및 문제점**:
  - 학생이 방 코드만으로 `fetchRoomData`를 호출하면 RPC 응답의 `room.api_key`에 교사의 OpenAI API 키 평문이 내려오고, 브라우저에서 `https://api.openai.com/v1/chat/completions`를 직접 호출(`Authorization: Bearer ${roomInfo.api_key}`)합니다.
  - 특히 입장 화면에 오픈 클래스 코드(`272394`)가 공개되어 있어 누구나 개발자 도구(Network 탭)로 API 키를 탈취·남용할 수 있으며, 설정 화면의 `"🔒 API 키는 암호화되어 저장되며, 본인만 접근 가능합니다."`(`TeacherAdminDashboard.tsx:1837`) 안내와도 어긋납니다.
- **보완 계획**:
  1. Supabase Edge Function(예: `supabase/functions/ai-chat/index.ts`)을 신설해 서버 측에서 `roomCode`(또는 `roomId`) 기반으로 교사의 OpenAI API 키를 조회하고 OpenAI Chat Completions API를 대리 호출하도록 전환합니다.
  2. `get_active_room_data` RPC 반환 필드에서 `api_key` 평문을 제거하고 `has_api_key: boolean`만 반환하도록 DB RPC를 갱신합니다.

#### P0-2. 팝업 `postMessage` 출처(`origin`) 미검증
- **위치**: `src/pages/RoomEditWindow.tsx:73`, `src/pages/TeacherAdminDashboard.tsx:601-605`
- **현황 및 문제점**:
  - 송신 측(`RoomEditWindow.tsx`)에서 `targetOrigin`을 `'*'`로 지정하고, 수신 측(`TeacherAdminDashboard.tsx`)에서 `event.origin`을 검증하지 않고 메시지를 처리합니다.
- **보완 계획**:
  - 송신 시 `window.opener.postMessage('roomUpdated', window.location.origin)`을 사용하고, 수신 핸들러에서 `if (event.origin !== window.location.origin) return;` 검사를 추가합니다.

---

### 🟠 [P1] 기능 누락 · 런타임 버그 · 비즈니스 로직 결함

#### P1-1. 교사 개별 문항 등록 제한수(`max_questions`) 미적용 버그
- **위치**: `src/lib/settings.ts:10-29`, `src/pages/TeacherAdminDashboard.tsx:54-61, 253-264, 363-366, 1117, 1121`
- **현황 및 문제점**:
  - 관리자가 교사 관리 표에서 특정 일반 교사에게 개별 `max_questions`를 부여(`updateTeacherMaxQuestions`)하더라도, 정작 교사 로그인 시 `getTeacherSettings`가 `max_questions` 컬럼을 조회하지 않습니다.
  - 이로 인해 `canAddQuestion()`과 UI 문구(`{questions.length}/{maxQuestionsForRegular}개`)가 항상 전역 `limit_regular_questions`만 참조합니다.
- **보완 계획**:
  - `TeacherSettings` 및 `getTeacherSettings` 반환값에 `max_questions: number | null`을 추가합니다.
  - `TeacherAdminDashboard.tsx`에 `individualMaxQuestions` 상태를 두고 `effectiveQuestionLimit = individualMaxQuestions ?? maxQuestionsLimit` 계산식으로 문항 제한 검사와 화면 표시를 통일합니다.

#### P1-2. 문항 카드 `[수능형]` / `[교과서]` 구분 배지 누락 및 논리 흐름 표시 불일치
- **위치**: `src/pages/TeacherAdminDashboard.tsx:1413-1458`, `src/pages/RoomEditWindow.tsx:165-175`, `src/pages/StudentChatInterface.tsx:971-981`
- **현황 및 문제점**:
  - `README.md`(109행) 및 `2ad4a2b` 커밋 메시지에 `"등록 문항 카드에 [수능형] / [교과서] 구분 배지 추가"`가 기록되어 있으나, 실제 `TeacherAdminDashboard.tsx` 문항 목록 카드 JSX에는 해당 배지가 렌더링되지 않습니다.
  - 교과서 지문 저장 시 `logicFlow`에 빈 배열 `[]`이 저장되는데, `q.logicFlow ? ... : '-'` 조건에서 `[]`가 truthy여서 `논리 흐름:` 라벨 뒤가 빈칸으로 노출됩니다.
  - `RoomEditWindow.tsx:173`에서는 `typeof q.logicFlow === 'string' ? q.logicFlow : JSON.stringify(q.logicFlow)`로 원시 JSON 문자열이 그대로 화면에 출력됩니다.
- **보완 계획**:
  - 교사 문항 카드, 방 편집 창(`RoomEditWindow.tsx`), 학생 문항 선택 모달(`StudentChatInterface.tsx`)에 `[수능형]` / `[교과서]` 구분 배지를 일관되게 표시합니다.
  - 교과서 지문 또는 파싱된 `logicFlow` 길이가 `0`인 경우 `'-'`(또는 `'해당 없음 (교과서 지문)'`)로 표시하고, `RoomEditWindow.tsx`는 `safeParseLogicFlow`를 이용해 읽기 쉬운 요약 텍스트로 렌더링합니다.

#### P1-3. OpenAI 호출 중복·예외 처리 미비 및 API 키 미설정 시 로딩 무한 고정 버그
- **위치**: `src/pages/StudentChatInterface.tsx:255-272, 495-531, 535-570`
- **현황 및 문제점**:
  1. `handleFAQClick`(495~497행)과 `handleSentenceSelect`(545~547행)에서 `setIsLoading(true)`를 먼저 실행한 뒤 `if (!roomInfo?.api_key) return;`으로 조기 종료하면서 `setIsLoading(false)`를 호출하지 않습니다(`handleSendMessage`와 다름). API 키 미설정 방에서 추천 질문/문장 분석을 누르면 입력창과 전송 버튼이 영구 비활성화됩니다.
  2. `handleSentenceSelect`는 HTTP 응답 상태(`!response.ok`) 및 `data.choices?.[0]?.message?.content` null 체크 없이 `data.choices[0].message.content`에 직접 접근하여 API 오류 시 런타임 TypeError가 발생하며, `catch` 블록에서도 사용자에게 오류 메시지를 띄우지 않고 콘솔에만 기록합니다.
  3. `handleSentenceSelect`의 히스토리 전송(551~554행)만 `m.context`를 매번 메시지에 직렬화해 중복 토큰을 소모합니다(`handleSendMessage`·`handleFAQClick`는 `!m.context`로 필터링).
  4. 3개 함수 모두 `fetch` 실패 시 `response.ok` / `data.error?.message` 검증이 없습니다.
- **보완 계획**:
  - 공통 AI 호출 헬퍼 함수(또는 `src/lib/ai.ts` 모듈)를 추출해 API 키/프록시 여부 사전 확인, `response.ok` 및 응답 구조 검증, `try/catch/finally`를 통한 일관된 오류 메시지와 로딩 해제를 보장합니다.
  - 히스토리 구성 방식을 3개 핸들러 모두 일관되게 정리합니다.

#### P1-4. 학생 일괄 삭제 선택 상태의 배열 인덱스 의존 버그
- **위치**: `src/pages/TeacherAdminDashboard.tsx:69, 650-683, 1581-1633`
- **현황 및 문제점**:
  - `selectedStudentsForDeletion`이 고유 PK(`student.id`)가 아닌 `savedStudents` 배열 인덱스를 저장하며, 정렬 렌더링 중 `savedStudents.findIndex(st => st.class === s.class && st.number === s.number && st.name === s.name)`으로 역추적합니다.
  - 동명이인·중복 학번 등록 시 첫 번째 행만 매칭되어 잘못된 학생이 선택·삭제될 위험이 있습니다.
  - `handleDeleteSelectedStudents` 내부에서 `await import('../lib/students')`로 동적 임포트를 불필요하게 사용합니다(상단에 이미 `../lib/students`를 임포트 중).
- **보완 계획**:
  - `selectedStudentsForDeletion`을 `student.id`(`number[]`) 기반으로 변경하고, `deleteStudents`를 파일 상단 정적 임포트로 통합합니다.

#### P1-5. 수업 방 생성/수정 정합성 및 `isActive` 상태 UI 미반영
- **위치**: `src/lib/rooms.ts:59-152, 173-184`, `src/pages/TeacherAdminDashboard.tsx:1071-1105`
- **현황 및 문제점**:
  - `createRoom`은 6자리 난수 코드 생성 시 중복 충돌 재시도 로직이 없으며, `room_questions` INSERT 실패 시 이미 생성된 `rooms` 행을 롤백(삭제)하지 않고 예외만 던져 고아 방 레코드가 남을 수 있습니다.
  - `updateRoom`은 기존 연결을 `delete`한 뒤 재삽입하므로 중간 실패 시 연결 문항이 모두 사라질 수 있습니다.
  - `rooms.ts`에 `toggleRoomStatus`가 구현되어 있으나 대시보드 UI에서 전혀 사용되지 않으며, `TeacherAdminDashboard.tsx:1083`은 `room.isActive` 값과 무관하게 항상 `"수업 진행 중"`으로 표시합니다.
- **보완 계획**:
  - 1차적으로 대시보드 방 카드에 `room.isActive` 상태 배지(`진행 중` / `일시 중지`) 및 `toggleRoomStatus` 토글 버튼을 연결하고, `createRoom` 실패 시 보상 삭제 및 코드 중복 재시도를 추가합니다.
  - 중장기적으로 `create_room_with_questions` / `update_room_with_questions` DB RPC로 원자적 트랜잭션 처리를 권장합니다.

#### P1-6. 영어 문장 분리 정규식의 약어 오분리
- **위치**: `src/pages/StudentChatInterface.tsx:122-124`
- **현황 및 문제점**:
  - `.split(/(?<=[.!?])\s+/)` 패턴은 `Mr.`, `Mrs.`, `Dr.`, `Prof.`, `U.S.`, `e.g.`, `i.e.`, `etc.`, `a.m.` 등의 마침표 뒤 공백에서도 문장을 잘못 분리합니다.
- **보완 계획**:
  - `src/lib/text.ts` 등에 대표 영어 약어·이니셜 예외를 처리하는 문장 분리 헬퍼(`splitEnglishSentences`)를 도입하고, 모달 내 문장 번호와 실제 분리 정확도를 높입니다.

---

### 🟡 [P2] 코드 품질 · ESLint · 빌드 설정 · 저장소 위생

#### P2-1. ESLint 34건 해소 및 `Student` 타입 이원화 통합
- **위치**: `src/types/index.ts:1-8`, `src/lib/students.ts:3-11`, `src/pages/TeacherAdminDashboard.tsx`, `src/pages/StudentChatInterface.tsx`, `src/lib/public-api.ts`, `src/lib/questions.ts`, `src/pages/RoomEditWindow.tsx`, `src/App.tsx`
- **현황 및 문제점**:
  - `Student` 타입이 `src/types/index.ts`(`number: number`, `className?: string`, `class?: string`)와 `src/lib/students.ts`(`number: string`, `class: string`)에 이중 정의되어, `StudentChatInterface.tsx`(282, 712행) 등에서 `(student as any).class` 캐스팅이 발생합니다.
  - `catch (error: any)` 및 DB payload `any` 남용으로 `npm run lint`가 33 errors / 1 warning으로 실패합니다.
  - `TeacherAdminDashboard.tsx:141`의 `useEffect`에서 `teacherRole` 의존성이 누락되어(`react-hooks/exhaustive-deps` 경고), 세션 복원/로그인 직후 조건 분기 안정성이 떨어질 수 있습니다.
- **보완 계획**:
  - 공통 에러 메시지 추출 유틸(`getErrorMessage(error: unknown): string`) 도입
  - `Student` / `QuestionRow` / `QuestionInsertPayload` 등 명시적 인터페이스 정리 및 `(student as any)` 제거
  - `TeacherAdminDashboard.tsx:133-141`의 `useEffect` 의존성 배열에 `teacherRole` 추가
  - `npm run lint` **0 errors, 0 warnings** 달성

#### P2-2. Tailwind CSS v4 패키지(`^4.1.18`)와 v3 설정/지시어 불일치
- **위치**: `package.json:30`, `vite.config.ts`, `tailwind.config.js`, `src/index.css:1-3`, `src/pages/RoomEditWindow.tsx:96`, `src/pages/StudentChatInterface.tsx:945`
- **현황 및 문제점**:
  - `package.json`에는 `tailwindcss: ^4.1.18`이 설치되어 있으나, `postcss.config.js`나 `@tailwindcss/vite` 플러그인 설정이 없고 `src/index.css`는 v3 방식의 `@tailwind base; @tailwind components; @tailwind utilities;`를 사용 중입니다.
  - 결과적으로 Vite 빌드 시 Tailwind 유틸리티 클래스가 생성되지 않아 `animate-spin`(`RoomEditWindow.tsx:96`)이나 `text-blue-600`(`StudentChatInterface.tsx:945`) 등이 동작하지 않을 가능성이 있습니다.
- **보완 계획**:
  - 두 가지 방향 중 프로젝트 정책에 맞춰 택일:
    - **안 A (권장 — 경량 유지)**: 기존 UI가 대부분 `src/index.css`의 커스텀 클래스와 인라인 스타일 기반이므로, Tailwind 전체 도입 시 기존 CSS(`* { box-sizing }`, 여백/버튼 등)와 Preflight 충돌을 점검하거나, 미사용 Tailwind 의존성을 제거하고 필요한 `.animate-spin` 등의 스타일만 `src/index.css`에 명시적으로 정의
    - **안 B (Tailwind v4 정식 활성화)**: `@tailwindcss/vite` 플러그인 적용 및 `src/index.css`의 `@import "tailwindcss";` 전환 후 전 화면 스타일 회귀 검증

#### P2-3. 잔여 백업/로그 파일 정리 및 메타데이터·문서 현행화
- **대상**:
  - `src/lib/public-api.txt`: UTF-16LE 인코딩의 구버전 백업 파일이 `src/lib/`에 잔존
  - `build_log.txt`: 과거 `public-api.ts` unused `Room` 오류 로그가 루트에 잔존
  - `index.html:2,8`: `<html lang="en">`, `<title>ai-tutor-app</title>`로 되어 있어 한국어 웹앱 표기(`lang="ko"`, `<title>AI Tutor</title>`)와 불일치
  - `README.md:125`: 로컬 PC 절대 경로 링크(`[.agents](file:///c:/Users/user/Desktop/web%20app/ai-tutor-app-main/.agents)`)가 포함되어 원격 저장소에서 깨짐
  - `.gitignore`: `build_log.txt` 등 임시 로그 파일 제외 규칙 검토
  - `.agents/` 내 미커밋 변경분(`.agents/rules/rules.md`, `.agents/skills/git-commit/SKILL.md`, `.agents/skills/apply|ask|scratchpad/`)은 작업 시점에 맞춰 `/git-commit`으로 정식 버전 관리 권장

---

### 🟢 [P3] UI/UX · 다크 모드 · 모바일 반응형 개선

#### P3-1. OS 다크 모드(`prefers-color-scheme: dark`) 시 흰 배경 위 밝은 글자 가독성 깨짐
- **위치**: `src/index.css:1951-1966`
- **현황 및 문제점**:
  - `@media (prefers-color-scheme: dark)`에서 `body` 배경을 `#111827`, 글자색을 `#e5e5e5`로 덮어쓰지만, 내부 패널(`.sc-main-panel`, `.sc-sidebar-panel`, `.teacher-content-card`, 모달 등)은 여전히 흰 배경(`white`)이며 별도 글자색 지정이 없는 텍스트는 상속된 `#e5e5e5`로 렌더링되어 가독성이 떨어집니다.
- **보완 계획**:
  - 라이트 표면 컨테이너에 명시적 기본 텍스트 색상(`color: #1e293b`)을 지정하여 즉시 가독성 결함을 해결하고, 장기적으로 CSS 변수 기반 다크 모드 색상 토큰을 전체 패널에 일관 적용합니다.

#### P3-2. 학생 채팅 레이아웃(`.sc-desktop-layout`) 모바일 반응형 부재
- **위치**: `src/index.css:1997-2030`
- **현황 및 문제점**:
  - `.sc-desktop-layout`이 `grid-template-columns: 1fr 320px;`와 `height: 100vh; overflow: hidden;`으로 고정되어 모바일/태블릿 좁은 화면에서 채팅 창이 극도로 좁아지거나 사이드바와 겹칩니다.
- **보완 계획**:
  - `@media (max-width: 768px)` 브레이크포인트를 추가해 상단 고정 요약 바(학생·문항 선택, 추천 질문 드로어/토글 버튼) + 하단 전체 폭 채팅 영역으로 전환되도록 반응형 CSS를 추가합니다.

#### P3-3. 학생 학습 경험 및 교사 운영 편의성 개선
- **위치**: `src/pages/StudentChatInterface.tsx`, `src/App.tsx`
- **보완 계획**:
  1. **채팅 중 지문 본문 상시 열람 기능**: 현재 학생은 문장 선택 모달을 열기 전까지 선택된 지문 본문을 볼 수 없습니다. 채팅 헤더 또는 우측 카드에 `지문 보기` 토글/모달을 추가해 질문 중 언제든 지문을 확인할 수 있게 개선합니다.
  2. **SPA 네비게이션 일관성**: `StudentChatInterface.tsx:603`의 `window.location.href = '/'` 전체 페이지 새로고침 대신 `App.tsx`에서 `onBack` 콜백을 전달해 교사용 화면과 동일한 SPA 상태 전환을 적용합니다.
  3. **입장 화면 반별 참여 코드 설정화 검토**: `StudentChatInterface.tsx:646-668`에 하드코딩된 학기별 반 코드(`세문영A/D/E`, `272394`)를 매 학기 코드 수정 없이 `app_config`에서 불러와 표시하도록 확장하는 방안을 검토합니다.

---

## 5. 단계별 실행 로드맵 (`/apply` 반영 시 권장 순서)

| 단계 | 포함 항목 | DB/인프라 변경 필요 여부 | 기대 효과 |
| :--- | :--- | :--- | :--- |
| **Phase 1 (즉시 반영 권장)** | P1-1(개별 문항 제한 적용), P1-2(지문 유형 배지·논리 흐름 요약), P1-3(OpenAI 공통화·로딩 잠김/예외 수정), P1-4(학생 `id` 기반 삭제), P1-6(영어 약어 문장 분리), P0-2(`postMessage` origin 검증) | 불필요 (프론트엔드만 수정) | 누락 기능 복구 및 주요 런타임 버그 즉시 해소 |
| **Phase 2 (품질·정적 검증)** | P2-1(`Student` 타입 통합 & ESLint 34건 해결), P2-2(Tailwind/유틸리티 CSS 정합성 확보), P2-3(`index.html`, `README.md` 링크, `public-api.txt`/`build_log.txt` 정리) | 불필요 | `tsc --noEmit` 및 `npm run lint` 0 errors 달성 |
| **Phase 3 (UI/UX 고도화)** | P3-1(다크 모드 텍스트 대비 수정), P3-2(모바일 반응형 채팅 레이아웃), P3-3(지문 보기 패널, `onBack` SPA 전환, 방 `isActive` 토글 UI 연결) | 불필요 | 다크 모드·모바일 사용성 및 학습 편의성 향상 |
| **Phase 4 (보안·트랜잭션 고도화)** | P0-1(Supabase Edge Function OpenAI 프록시 & RPC 내 `api_key` 제거), P1-5(방 생성/수정 RPC 트랜잭션화) | **필요** (Supabase SQL/RPC & Edge Function 배포) | API 키 유출 위험 원천 차단 및 DB 정합성 확보 |

### 각 단계 적용 후 검증 절차 (Workspace Rule 2 준수)
```powershell
npx tsc --noEmit
npm run lint
```

---

> [!NOTE]
> - 본 계획서는 `/ask` 모드 규칙에 따라 기존 소스 코드 및 Git 상태를 전혀 변경하지 않고 작성되었습니다.
> - Phase 1~3 또는 전체 계획의 코드 반영을 원하시면 **`/apply`**(예: `/apply Phase 1만 먼저 적용해줘` 또는 `/apply`)를 입력해 주세요.
> - 현재 작업 트리에 대기 중인 `.agents/` 규칙·스킬 변경 사항을 저장소에 반영하려면 **`/git-commit`**을 입력해 주세요.
