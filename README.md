# 🏫 AI Tutor (AI Tutor App)

학생들과 AI 튜터가 상호작용하며 학습할 수 있는 교육용 웹 애플리케이션입니다.  
선생님은 학습 자료와 학생을 관리하고, 학생은 개별 또는 모둠으로 AI와 대화하며 심화 학습을 진행할 수 있습니다.

## ✨ 주요 기능

### 👩‍🏫 선생님용 (Teacher Admin Dashboard)
- **수업 관리**: 수업 방(Room)을 생성하고 관리하며, 접속 코드를 발급합니다.
- **학생 관리**: 학생 명단을 개별 또는 일괄(엑셀 붙여넣기 방식)로 등록 및 관리합니다.
- **학습 자료 관리**:
  - **수업용 문항 번호(`examCode`)**를 독립 항목으로 유지하면서, **출처 4분할(년도·학년·월/시기·출처 문항 번호 `sourceNumber`)** 드롭다운 및 직접 입력 전환, 지문(Passage), **문항 태그**, 우리말 주제, **논리 흐름** 등을 등록합니다.
  - **문항 태그**: 기본 구분(`논리지문`, `반전지문`, `반론지문`, `문제와해결책`), 추가 태그(`예시`, `인용`, `실험`, `비유`, `대조`), 그리고 사용자가 직접 문구를 추가·재사용할 수 있는 커스텀 태그를 지원합니다.
  - **통합 다중 검색·필터**: 출처 년도·학년·월/시기·출처 문항 번호 개별 필터, 수업 문항 번호 필터, 지문 유형(`전체`/`수능형`/`교과서`), 주제·본문 키워드, 다중 태그(`모두 포함 AND` / `하나 이상 OR` 전환)로 문항을 효율적으로 검색할 수 있습니다.
  - **논리 흐름 (순서대로 입력)**  
    - **큰 범주(필수)**: 각 단계마다 입력합니다. 예: 도입, 주제, 설명, 구체적 설명, 결론 등.  
    - **작은 범주(선택)**: 더 잘게 나눌 때만 입력합니다(예: 설명1, 설명2).  
    - **연속된 행**에 동일한 큰 범주를 넣으면 하나의 의미 덩어리로 묶입니다(예: 두 행 모두 큰 범주 `설명` → 거시 구조에서는 한 덩어리).  
    - **중심 의미**는 단계마다 필수입니다.  
  - 학생 화면의 문항 선택에서는 문항 번호와 출처가 함께 표시됩니다.
  - 이전에 큰 범주 없이 저장된 문항은, 수정 시 각 행에 큰 범주를 채운 뒤 저장해야 합니다.
- **설정 및 연동**:
  - OpenAI API Key 설정
  - System Prompt 커스터마이징
  - Google Drive 연동 (Google Apps Script URL)을 통해 학생들의 대화 내역을 자동 저장

### 👨‍🎓 학생용 (Student Chat Interface)
- **간편 접속**: 선생님이 공유한 Room Code로 수업에 입장합니다. (입장 시 방 코드 함께 표시)
- **AI 튜터와 대화**:
  - 특정 문항(문항 번호·출처 표시)을 선택하여 AI에게 질문하거나 설명을 요청합니다.
  - **문장 분석**: 지문의 특정 문장을 선택하여 구문 분석 및 해석 요청이 가능합니다.
  - **추천 질문**: '우리말 주제', '논리적 흐름 분석(3단계)', 어휘, 문장 분석 등 미리 정의된 질문을 클릭 한 번으로 보낼 수 있습니다.  
    - 논리 흐름 **Step 1**(「의미 기준으로 몇 부분으로 나눌 수 있어?」)은, 교사가 **연속 동일 큰 범주**로 거시 구조를 만든 경우에만: **1~2번째** 클릭은 **큰 범주** 기준 유도, **3~4번째** 클릭부터는 **세부(행) 개수·작은 범주(또는 큰 범주)** 기준으로 안내합니다. 큰 범주를 한 덩어리씩만 쓴 문항은 기존과 같이 전 구간 세부 기준입니다.
- **UI/UX 개선**:
  - 선생님/학생 화면의 '뒤로가기' 버튼 디자인 통일
  - **다크 모드 지원** (시스템 설정에 따라 자동 적용)
  - 모바일 환경 최적화
- **모둠 학습**: 여러 학생을 선택하여 그룹(모둠) 활동으로 대화를 진행할 수 있습니다.
- **자동 저장**: 대화 내용은 선생님의 Google Drive에 자동으로 기록됩니다.

### 🔒 개인정보처리방침 (Privacy Policy)
- 서비스 하단의 링크를 통해 개인정보처리방침을 확인할 수 있습니다.
- 교사와 학생의 데이터 보호 및 권리에 대한 내용을 명시하였습니다.

## 🛠 기술 스택 (Tech Stack)

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (PostCSS), Lucide React (Icons)
- **Backend / Database**: Supabase (Auth & DB)
- **AI / API**: OpenAI API (GPT-4o)
- **Integration**: Google Apps Script (for Google Drive Log Saving)

## 🚀 설치 및 실행 (Installation)

1. **저장소 클론 (Clone)**
   ```bash
   git clone <repository_url>
   cd ai-tutor-app
   ```

2. **패키지 설치 (Install Dependencies)**
   ```bash
   npm install
   ```

3. **환경 변수 설정 (Environment Variables)**
   프로젝트 루트에 `.env` 파일을 생성하고 다음 설정을 추가하세요.
   (`.env.example` 참고)

   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **개발 서버 실행 (Run Dev Server)**
   ```bash
   npm run dev
   ```

## 📂 프로젝트 구조

```
src/
├── pages/
│   ├── StudentChatInterface.tsx  # 학생용 채팅 화면
│   ├── TeacherAdminDashboard.tsx # 선생님용 관리자 대시보드
│   └── RoomEditWindow.tsx        # 수업 방 생성/수정
├── lib/
│   ├── ai.ts          # OpenAI 호출 통합 및 Edge Function 프록시 연동
│   ├── auth.ts        # Supabase 인증 관련
│   ├── errors.ts      # 공통 오류 메시지 추출 유틸
│   ├── logic-flow.ts     # 논리 흐름 파싱·큰/작은 범주·저장 정규화·지문 유형 판별
│   ├── public-api.ts     # 학생용 방·문항 RPC (비로그인)
│   ├── question-meta.ts  # 출처 4분할 파싱·포맷, 태그 분류·커스텀 태그 저장 유틸
│   ├── questions.ts      # 문항 관리 API (네이티브 컬럼 + 폴백 영속성)
│   ├── rooms.ts          # 수업 방 관리 API (재시도·보상 롤백·원자적 RPC 지원)
│   ├── students.ts       # 학생 관리 API
│   ├── settings.ts       # 설정 관리
│   ├── supabase.ts       # Supabase 클라이언트
│   └── text.ts           # 영어 약어 예외 처리 문장 분리 유틸
├── types/            # TypeScript 타입 정의
├── App.tsx           # 메인 라우팅 및 렌더링
└── index.css         # 전역 스타일 (다크모드·모바일 반응형 포함)
public/
└── privacy.html      # 개인정보처리방침 (HTML)
supabase/
├── functions/ai-chat/ # OpenAI 서버 프록시 Edge Function
└── sql/               # 보안(API 키 비노출)·트랜잭션 RPC·출처/태그 마이그레이션
```

## 📋 최근 작업 및 변경 이력 (Recent Updates)

### 2026-11-16
- **수업용 문항 번호(`examCode`) 유지 및 출처 문항 번호(`sourceNumber`) 분리·보존**:
  - 수업용 문항 번호(`examCode`)를 단독 입력·검색·표시 항목으로 유지하고, 출처의 문항 번호(`sourceNumber`)를 년도·학년·월/시기와 동일한 4개 독립 항목으로 분리
  - 기존 자유 출처 문자열(`target_grade`) 내 출처 문항 번호(예: `29번`, `41~42번` 등) 무손실 파싱·정규화 및 `source_number` 컬럼·폴백 메타(`__meta.sourceNumber`) 저장·조회 반영
- **학습 자료 관리 출처 4분할·문항 태그 및 다중 검색 필터 추가**:
  - 출처 입력·검색을 년도, 학년, 월/시기, 출처 문항 번호 4분할 구조(프리셋 드롭다운 + 직접 입력 전환)로 개편하고 기존 자유 출처 문자열 자동 파싱·호환 지원
  - 기본 구분(`논리지문`, `반전지문`, `반론지문`, `문제와해결책`), 추가(`예시`, `인용`, `실험`, `비유`, `대조`), 사용자 직접 추가 태그 및 다중 검색 필터(`AND`/`OR` 전환, 키워드·유형 필터) 구현
  - 신규 컬럼(`source_year`, `source_grade`, `source_month`, `source_number`, `tags`) 우선 저장 및 미적용 DB용 `logic_flow` 메타 폴백 처리, 마이그레이션 SQL(`supabase/sql/phase5_question_source_and_tags.sql`) 추가
- **보안·런타임 버그 보완, 타입/ESLint 정비 및 UI/UX 개선**:
  - 교사 개별 문항 제한수(`max_questions`) 실제 적용, 문항 카드/방 편집 창/학생 모달의 `[수능형]`·`[교과서]` 구분 배지 및 논리 흐름 요약 표시 복구
  - OpenAI 호출 모듈(`src/lib/ai.ts`) 통합 및 API 키 미설정 시 로딩 고정 버그 수정, 학생 ID 기반 삭제, 영어 약어 문장 오분리 방지(`src/lib/text.ts`), 팝업 `postMessage` `origin` 검증 적용
  - `Student`/DB Row 타입 단일화 및 ESLint 34건 전량 해소(`npx tsc --noEmit`, `npm run lint` 0 errors), 레거시 파일(`public-api.txt`, `build_log.txt`, `tailwind.config.js`) 정리
  - OS 다크 모드 라이트 카드 가독성 보완, 모바일(`768px` 이하) 학생 채팅 학습 메뉴 드로어 및 `지문 보기` 패널 추가, 수업 방 `일시중지`/`재개` 토글 연결
  - Supabase Edge Function 프록시(`ai-chat`) 및 보안·트랜잭션 SQL 스크립트 준비

### 2026-09-06
- **교과서 지문 / 수능형 지문 선택 토글 및 조건부 비활성화 구현**:
  - 교사 대시보드의 학습 자료 관리 화면에 `[수능형 지문 | 교과서 지문]` 토글 버튼 추가 (기본값: 수능형 지문).
  - 교과서 지문 선택 시 교사 화면의 '주제' 및 '논리 흐름' 입력 영역 비활성화 및 저장 데이터 정규화.
  - 교과서 지문 선택 문항에 대해 학생 대화 화면의 추천 질문 중 `이 글의 우리말 주제는 뭘까?` 및 `논리적 흐름 분석 (3단계)` 버튼 비활성화 (`(교과서 지문 미지원)` 배지 및 안내 적용).
  - 등록 문항 카드에 `[수능형]` / `[교과서]` 구분을 위한 상태 배지 추가.

### 2026-09-01
- **학생 접속 화면 다운로드 안내 문구 시각성 개선**:
  - 학생 대화 화면의 가이드 다운로드 안내 문구(`📢 New to AI Tutor?` 및 `Click the link to download the guide`)를 두 줄로 분리하고 폰트 크기 및 스타일 조정을 통해 가시성 및 가독성 향상.

### 2026-08-31
- **학생 접속 화면 레이아웃 및 배너 재배치**:
  - `Open Class for Any Guest` 참여 코드(`272394`)를 상단 카드에서 하단 파란색 다운로드 안내 박스 내부로 이동 배치.
- **학생 접속 화면 참여 코드 및 다운로드 배너 업데이트**:
  - 각 반 참여 코드를 최신 항목(`세문영A`, `세문영D`, `세문영E`, `Open Class for Any Guest`)으로 반영.
  - 학생 입장 화면에 강조된 다운로드 배너(`http://tiny.cc/hongik-aitutor`) 추가.
- **메인 화면(랜딩 페이지) UI/UX 개선**:
  - 카드 제목을 `For Teachers` 및 `For Learners`로 변경.
  - 카드 하단에 2줄의 방문자 안내 문구(중앙 정렬) 추가.
- **에이전트 디렉토리 단일화 & GitHub 연동**:
  - 레거시 `.antigravity` 제거, [`.agents`](./.agents) 단일화 및 Vercel 자동 배포 연동 완료.

## 📝 라이선스

This project is private and for educational use only.

---

## [2026-11-16 15:22] 업데이트 이력 (Commit ID: `57b0da9`)
- **수정 내용**:
  - **현황 점검 및 계획 수립 (`.plan/implementation_plan_2026-11-16_14-45.md`)**: 프로젝트 기능·Git 상태 점검 및 Phase 1~4 보완 계획서 작성
  - **기능·버그 보완 (Phase 1)**: 교사 개별 문항 제한수(`max_questions`) 실제 적용, 문항 카드 `[수능형]`/`[교과서]` 상태 배지 및 수업 방 편집 창 논리 흐름 요약 복구, OpenAI 호출 공통화(`src/lib/ai.ts`) 및 API 키 미설정 시 로딩 잠김·예외 처리 수정, 학생 일괄 삭제 `student.id` 기준 전환, 영어 약어 문장 오분리 방지(`src/lib/text.ts`), 팝업 `postMessage` 출처(`origin`) 검증 추가
  - **코드 품질·저장소 위생 (Phase 2)**: `Student`/DB Row 타입 통합 및 공통 에러 유틸(`src/lib/errors.ts`) 도입으로 ESLint 오류 34건 전량 해결, 미동작 Tailwind 지시어를 명시적 유틸리티 CSS로 교체, 레거시 파일(`src/lib/public-api.txt`, `build_log.txt`, `tailwind.config.js`) 제거, `index.html` 한국어 메타데이터 정비, `.agents` 규칙·스킬(`/ask`, `/apply`, `/scratchpad`, `/git-commit`) 업데이트
  - **UI/UX·반응형 개선 (Phase 3)**: OS 다크 모드 라이트 패널 가독성 보완, 모바일(`768px` 이하) 학생 채팅 학습 메뉴 드로어 적용, 학생 채팅 화면 `지문 보기/닫기` 토글 패널 및 SPA 뒤로가기(`onBack`) 추가, 교사 대시보드 수업 방 `일시중지`/`재개` 토글 UI 연결
  - **보안·트랜잭션 인프라 준비 (Phase 4)**: 방 코드 중복 재시도·실패 시 보상 롤백 및 원자적 RPC 폴백(`src/lib/rooms.ts`), Supabase Edge Function(`supabase/functions/ai-chat/index.ts`) 및 보안/트랜잭션 SQL(`supabase/sql/phase4_security_and_transactions.sql`) 추가
- **검증 결과**:
  - `npx tsc --noEmit`: 통과 (타입 에러 0건)
  - `npm run lint`: 통과 (`0 errors, 0 warnings`)

## [2026-11-16 15:47] 업데이트 이력 (Commit ID: `febedbd`)
- **수정 내용**:
  - **출처 4분할 구조화 및 레거시 호환 (`src/types/index.ts`, `src/lib/question-meta.ts`, `src/pages/TeacherAdminDashboard.tsx`)**: 기존 `[문항 번호, 출처]` 입력을 `[년도, 학년, 월/시기, 문항 번호]` 4분할 입력(표준 프리셋 드롭다운 + `직접 입력` 전환)으로 개편하고, 기존 자유 형식 출처 문자열 자동 파싱·보존 및 포맷팅 지원
  - **문항 태그 시스템 도입 (`src/lib/question-meta.ts`, `src/pages/TeacherAdminDashboard.tsx`, `src/pages/RoomEditWindow.tsx`)**: 기본 지문 구분(`논리지문`, `반전지문`, `반론지문`, `문제와해결책`), 추가 전개·표현 태그(`예시`, `인용`, `실험`, `비유`, `대조`), 사용자 직접 문구 추가(쉼표 다중 입력·한글 IME 중복 방지·교사별 사용자 태그 풀 보관 및 삭제) 구현, 문항 카드 및 수업 방 편집 창에 카테고리별 태그 배지 표시
  - **학습 자료 다중 검색·필터 패널 (`src/pages/TeacherAdminDashboard.tsx`, `src/index.css`)**: 년도·학년·월/시기(보유 문항 수 표시)·문항 번호·지문 유형(`전체/수능형/교과서`)·주제/본문 키워드·다중 태그(`모두 포함 AND` / `하나 이상 OR` 전환) 검색 및 카드 태그 클릭 필터링·초기화 UI/반응형/다크모드 스타일 추가
  - **무중단 DB 영속성 및 마이그레이션 SQL (`src/lib/questions.ts`, `src/lib/logic-flow.ts`, `src/lib/public-api.ts`, `supabase/sql/phase5_question_source_and_tags.sql`)**: 신규 컬럼(`source_year`, `source_grade`, `source_month`, `tags`) 우선 저장 및 미적용 DB 환경용 `logic_flow` 메타 엔트리(`__meta`) 자동 폴백·정제 처리, 네이티브 전환용 SQL 스크립트 추가
- **검증 결과**:
  - `npx tsc --noEmit`: 통과 (타입 에러 0건)
  - `npm run lint`: 통과 (`0 errors, 0 warnings`)

## [2026-11-16 16:02] 업데이트 이력 (Commit ID: `106d967`)
- **수정 내용**:
  - **수업용 문항 번호(`examCode`)와 출처 문항 번호(`sourceNumber`) 독립 분리 (`src/types/index.ts`, `src/lib/logic-flow.ts`, `src/pages/TeacherAdminDashboard.tsx`, `src/index.css`)**: 수업을 위한 문항 번호(`examCode`) 입력란을 기존과 동일하게 단독 유지하고, 출처 영역을 `[년도, 학년, 월/시기, 문항 번호(sourceNumber)]` 4개 독립 항목으로 분리하여 입력·검색(`출처 문항 번호` 및 `수업 문항 번호` 개별 필터)·카드 배지 표시 전 과정에서 모두 유지되도록 개선
  - **기존 자유 문자열 출처 내 문항 번호 무손실 파싱 (`src/lib/question-meta.ts`)**: `normalizeSourceNumber` 및 `parseLegacyTargetGrade`를 도입해 기존 `target_grade` 문자열(예: `"2024 고2 9월 29번"`, `"24년고2 9월29번"`, `"2025 수능 31"`, `"41~42번"`)에서 출처 문항 번호와 잔여 텍스트가 잘리지 않고 정확히 분리·통합 포맷팅되도록 수정
  - **DB 네이티브 컬럼·폴백 메타 및 SQL 스크립트 갱신 (`src/lib/questions.ts`, `src/lib/public-api.ts`, `supabase/sql/phase5_question_source_and_tags.sql`)**: `source_number` 컬럼 우선 저장 및 `logic_flow` 내 `__meta.sourceNumber` 폴백 저장·조회, `phase5` 마이그레이션 SQL 및 `get_active_room_data` RPC 반환 필드 반영
- **검증 결과**:
  - `npx tsc --noEmit`: 통과 (타입 에러 0건)
  - `npm run lint`: 통과 (`0 errors, 0 warnings`)

## [2026-11-24 11:19] 업데이트 이력 (Commit ID: `3dff202`)
- **수정 내용**:
  - **코드 검증 피드백 계획서 작성 (`.plan/implementation_plan_2026-11-24_10-53.md`)**: 웹앱 기능 현황을 점검하고, 11-16 계획서 항목의 반영 상태를 확인했습니다. 새로 찾은 결함은 P0 4건, P1 9건, P2 8건, P3 4건이며, Phase A~D 로드맵으로 정리했습니다.
    - 핵심: 학생 채팅 대화 이력에서 학생 발화가 빠지는 버그, 서버 측 권한 검증(RLS·트리거)이 저장소에 없음, 방 코드 열거로 학생 명단 노출과 AI 프록시 남용 가능, 비활성 교사가 세션 복원으로 다시 로그인됨
  - **AI 모델 교체 계획 (§3 🔵 M-1, M-2)**: `gpt-4o` API 종료일(2027-01-14)에 대비한 계획입니다.
    - 기본 모델은 `gpt-6-sol` + `reasoning_effort: low`로 하고, 어휘 5개만 `none`으로 보냅니다. 문장 분석은 정확도를 위해 `low`를 씁니다.
    - 매 턴 반복되는 앞부분(공통 규칙 → 교사 프롬프트 → 문항 정보) 순서를 고정해 프롬프트 캐시가 적용되게 합니다. 예상 AI 비용은 약 19% 절감(추정)입니다.
  - 이번 커밋은 계획서 추가만 포함하며, 소스 코드는 변경하지 않았습니다.
- **검증 결과**:
  - `npx tsc -p tsconfig.app.json --noEmit`: 통과 (타입 에러 0건)
  - `npm run lint`: 통과 (`0 errors, 0 warnings`)

## [2026-11-24 11:29] 업데이트 이력 (Commit ID: `a76d9fb`)
- **수정 내용 (Phase A 반영)**:
  - **AI 모델 `gpt-6-sol` 전환 및 요청 유형별 추론 수준 분리 (`src/lib/ai-config.ts`, `src/lib/ai.ts`, `supabase/functions/ai-chat/index.ts`, `.env.example`)**:
    - 기본 모델을 `gpt-6-sol`로 변경하고 환경 변수(`VITE_AI_MODEL`, `OPENAI_MODEL`)로 즉시 롤백·전환할 수 있도록 구성
    - 자유 질문·주제·논리 흐름·문장 분석은 `reasoning_effort: 'low'`(`max_completion_tokens: 1500`, `temperature` 미전송), 어휘 5개 추출은 `reasoning_effort: 'none'`(`max_completion_tokens: 1000`)으로 분리
    - Edge Function(`ai-chat`)에서 허용된 `kind`(`tutoring`/`simple`)만 수용하고 클라이언트 임의 모델·온도 지정을 무시하도록 정리
  - **프롬프트 앞부분 순서 고정 및 대화 이력 누락 수정 (`src/lib/tutor-prompts.ts`, `src/pages/StudentChatInterface.tsx`)**:
    - `buildPrefixMessages`를 도입해 자유 질문·추천 질문·문장 분석 모두 `[공통 규칙 + 교사 시스템 프롬프트] → [문항 정보]` 순서와 문자열이 동일하게 유지되도록 통합(프롬프트 캐시 적중 대비)
    - `buildConversationHistory()`의 `!m.context` 필터를 제거해 학생 발화가 AI 대화 이력에서 전부 누락되던 P0-1 결함 수정
  - **런타임 오류 및 데이터 유실 방지 (`src/lib/auth.ts`, `src/lib/logic-flow.ts`, `src/pages/TeacherAdminDashboard.tsx`, `src/pages/RoomEditWindow.tsx`, `src/lib/text.ts`)**:
    - `getCurrentUser()`에서 `is_active`를 함께 조회해 비활성 교사 계정의 세션 복원 로그인을 차단(P0-4)
    - 추천 질문·문장 분석 핸들러 및 버튼에 `isLoading` 가드 추가(P1-3), 논리 흐름 미등록 수능형 문항에서 '0부분' 프롬프트가 생성되지 않도록 차단 및 안내(P1-4)
    - 수능형 문항 저장 전 `findIncompleteFlowStepIndices`로 불완전한 논리 흐름 행 검증, 수정 시 구형 데이터의 `macroLabel`을 `role`로 보전(P1-2)
    - `RoomEditWindow` 저장 중 `isSaving` 상태 추가 및 버튼 비활성화로 수업 방 중복 생성 방지(P1-5)
    - `splitEnglishSentences`에서 `no.`, `U.S.`, `etc.` 문장 경계 및 단일 대문자 이니셜 오인식 수정(P1-8)
- **검증 결과**:
  - `npx tsc -p tsconfig.app.json --noEmit`: 통과 (타입 에러 0건)
  - `npm run lint`: 통과 (`0 errors, 0 warnings`)
  - 단위 검증 스크립트(`splitEnglishSentences`, `buildPrefixMessages`, `findIncompleteFlowStepIndices`, Edge Function TS 트랜스파일 검사): 전체 통과

## [2026-11-24 11:39] 업데이트 이력 (Commit ID: `558d963`)
- **수정 내용 (Phase B 반영 및 계획서 범위 조정)**:
  - **계획서 범위 조정 (`.plan/implementation_plan_2026-11-24_10-53.md`)**: 기존 6자리 방 코드·학생 학번/이름 UI, 교사 설정 입력 UI, 입장 화면 반별 코드 UI 및 전체 DOM·스타일을 그대로 유지하도록 Phase B(P1-6), Phase C(P0-3), Phase D(P2-1~5, P2-8, P3-2) 범위를 조정
  - **확장 컬럼 누락 판정 정밀화 (`src/lib/questions.ts`)**: `isMissingQuestionColumnError`에서 일반 `column`/`tags`/`schema cache` 부분 일치를 제거해 NOT NULL(`23502`)·RLS 오류가 컬럼 누락으로 오판되어 세션 전체가 폴백 모드로 고정되던 결함(P1-1) 수정, 저장 전 `ensureExtendedColumnsSupport()` 1회 점검 추가
  - **전역·개별 문항 제한수 검증 및 제어 입력 전환 (`src/pages/TeacherAdminDashboard.tsx`)**: 기존 입력 UI는 그대로 유지하면서 전역 기본 제한수와 교사별 개별 제한수에 0 이상 정수 검증을 추가하고, 개별 제한 입력을 `teacherLimitDrafts` 기반 제어 입력으로 전환해 기본값 변경 즉시 반영(P1-6)
  - **설정 조회 오류 분리 (`src/lib/settings.ts`, `src/pages/TeacherAdminDashboard.tsx`)**: `getAppConfig`가 `PGRST116`(행 없음) 외 네트워크/RLS 오류를 `null`로 삼키지 않고 예외를 전달하도록 수정(P1-7)
  - **문항 번호 필터 및 출처 파싱 정합성 (`src/lib/question-meta.ts`)**: `matchesQuestionNumberFilter`에서 `1번` 검색 시 `2024-1학기-64번`이 걸리던 오매칭 및 숫자 부분 일치(`2`→`2024`)를 제거하고 범위 표기(`29~31번`) 확장 지원, 분리 출처가 있을 때 `EBS 3` 등에서 엉뚱한 출처 번호(`3번`)가 추출되던 문제(P1-9) 수정
  - **논리 흐름 편집기 IME·키 안정화 (`src/pages/TeacherAdminDashboard.tsx`)**: 한글 IME 조합 중 Enter 키 중복 행 추가(`!e.nativeEvent.isComposing`) 차단 및 행별 고유 `_uid` 키 부여(P2-7)
- **검증 결과**:
  - `npx tsc -p tsconfig.app.json --noEmit`: 통과 (타입 에러 0건)
  - `npm run lint`: 통과 (`0 errors, 0 warnings`)
  - 단위 검증 스크립트(`matchesQuestionNumberFilter`, `parseQuestionSource`, `isMissingQuestionColumnError`): 전체 통과

## [2026-11-24 11:41] 업데이트 이력 (Commit ID: `2d9b45c`)
- **수정 내용 (Phase C 반영 — 기존 6자리 방 코드·학생 명단 UI 유지)**:
  - **서버 측 RLS 및 비즈니스 규칙 트리거 추가 (`supabase/sql/phase6_rls_hardening.sql`)**:
    - `public.is_master()`, `public.is_active_teacher()` 헬퍼 함수 및 `teachers`/`questions`/`app_config`/`students`/`rooms`/`room_questions` RLS 정책 정의
    - 일반 교사가 클라이언트에서 자신의 `role`, `is_active`, `max_questions`를 변조하지 못하도록 `protect_teacher_privileged_columns` 트리거 추가
    - 비마스터 교사의 문항 등록 한도(`max_questions` 또는 `app_config.limit_regular_questions`)를 서버에서 강제하는 `enforce_teacher_question_limit` 트리거 추가(P0-2)
  - **`ai-chat` Edge Function 서버 보호 및 클라이언트 이력 동기화 (`supabase/functions/ai-chat/index.ts`, `src/pages/StudentChatInterface.tsx`)**:
    - `ALLOWED_ORIGIN` 기반 CORS 설정, 모델 화이트리스트 검증, `messages` 개수(최대 40개)·역할·총 길이(최대 30,000자) 검증, `(roomCode, IP)` 기준 분당 30회 Rate limit 적용(P0-3)
    - 기존 6자리 방 코드 및 학생 학번·이름은 그대로 유지
    - 클라이언트 `buildConversationHistory()`에 블록 단위 자르기(`MAX_HISTORY_MESSAGES = 36`, `TRIM_BLOCK_SIZE = 18`)를 적용해 서버 메시지 상한을 준수하면서 프롬프트 앞부분 캐시 적중 유지
  - **교사 완전 삭제 Edge Function 및 안내 문구 정비 (`supabase/functions/delete-teacher/index.ts`, `src/lib/settings.ts`, `src/pages/TeacherAdminDashboard.tsx`)**:
    - 마스터 교사가 교사를 삭제할 때 `teachers` 행과 Supabase `auth.users` 계정을 함께 삭제하는 `delete-teacher` Edge Function 추가(미배포 환경은 기존 행 삭제 폴백)(P3-4)
    - 설정 화면 API 키 안내 문구를 실제 저장·프록시 구조에 맞게 현행화
- **검증 결과**:
  - `npx tsc -p tsconfig.app.json --noEmit`: 통과 (타입 에러 0건)
  - `npm run lint`: 통과 (`0 errors, 0 warnings`)
  - Edge Function 2종 TS 트랜스파일 검사, 블록 단위 이력 자르기 검증, RLS SQL 구문 검증: 전체 통과

## [2026-11-24 11:47] 업데이트 이력 (Commit ID: `f369de2`)
- **수정 내용 (Phase D 반영 — 기존 DOM·스타일·입장 화면 UI 유지)**:
  - **문항 매퍼·공통 상수 추출 (`src/lib/question-mapper.ts`, `src/lib/questions.ts`, `src/lib/public-api.ts`, `src/lib/constants.ts`)**:
    - `questions.ts`와 `public-api.ts`에 중복되었던 DB/RPC 문항 변환 로직을 `mapQuestionRecord()`로 통합(P2-4)
    - 기본 시스템 프롬프트·기본 문항 제한(50)·기본 로그인 안내 문구를 `src/lib/constants.ts`로 추출(P2-5)
  - **교사 대시보드 컴포넌트 분리 및 폼 핸들러 통합 (`src/components/teacher/*`, `src/pages/TeacherAdminDashboard.tsx`)**:
    - 기존 DOM·스타일·동작을 그대로 유지한 채 `WelcomeTab`, `RoomsTab`, `StudentsTab`, `SettingsTab`, `PresetOrCustomField`, `TagChipGroup` 컴포넌트로 분리(P2-1, P2-3)
    - `buildQuestionPayload()`로 문항 추가·수정 검증 및 payload 구성을 단일화하고, `customTagTick` 해킹 상태를 `storedCustomTags` 상태로 교체
  - **세션 레이스·필터·회원가입·로그·패키지 정리 (`src/pages/TeacherAdminDashboard.tsx`, `src/lib/settings.ts`, `package.json`)**:
    - `sessionEpochRef`를 도입해 로그아웃·계정 전환 후 늦게 도착한 비동기 응답이 상태를 덮어쓰지 않도록 차단(P3-1)
    - 삭제 등으로 목록에서 사라진 년도·학년·월 필터 선택값은 별도 안내 문구 없이 `effectiveFilter*` 파생 값으로 자동 초기화(P3-2)
    - 회원가입 직후(`handleSignup`)에도 문항·학생·방 초기 데이터를 함께 로드하도록 보완(P3-3)
    - `settings.ts` 및 대시보드 `console.log` 제거 또는 `DEV` 환경 한정(P2-6), 미사용 `package.json` 패키지(`tailwindcss`, `autoprefixer`, `postcss`) 제거(P2-8, 입장 화면 반별 코드 UI 유지)
- **검증 결과**:
  - `npx tsc -p tsconfig.app.json --noEmit`: 통과 (타입 에러 0건)
  - `npm run lint`: 통과 (`0 errors, 0 warnings`)
  - `npx vite build`: 통과 (1,770개 모듈 변환 및 프로덕션 번들 생성 확인)

## [2026-11-24 12:41] 업데이트 이력 (Commit ID: `15f70c5`)
- **수정 내용**:
  - **학생 문항 선택 모달 정렬 전환 버튼 추가 (`src/pages/StudentChatInterface.tsx`)**:
    - `문항 선택` 모달 헤더 제목 옆에 `등록순 ↑` / `최신순 ↓` 정렬 전환 버튼 추가(`questionSortOrder` 상태: `'asc' | 'desc'`)
    - `최신순 ↓` 선택 시 최근에 추가된 문항(`id` 내림차순)이 목록 상단에 표시되도록 구현
- **검증 결과**:
  - `npx tsc -p tsconfig.app.json --noEmit`: 통과 (타입 에러 0건)
  - `npm run lint`: 통과 (`0 errors, 0 warnings`)

## [2026-11-24 12:46] 업데이트 이력 (Commit ID: `dcf5418`)
- **수정 내용**:
  - **`.gitignore` 정비**: Supabase CLI 연결 시 생성되는 임시 디렉터리(`supabase/.temp/`)를 Git 추적 제외 목록에 추가
  - **Phase 4 SQL 안정화 (`supabase/sql/phase4_security_and_transactions.sql`)**: `BEGIN/COMMIT` 트랜잭션 블록, `questions.passage_type` 선행 `ADD COLUMN IF NOT EXISTS`, 기존 `get_active_room_data(text)` 반환 타입 충돌 방지용 `DROP FUNCTION IF EXISTS`, `GRANT EXECUTE` 권한 부여 반영
- **검증 결과**:
  - `git status --short`: `supabase/.temp/` 추적 제외 및 작업 트리 정리 확인

