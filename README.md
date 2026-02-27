# 🏫 AI Tutor (AI Tutor App)

학생들과 AI 튜터가 상호작용하며 학습할 수 있는 교육용 웹 애플리케이션입니다.  
선생님은 학습 자료와 학생을 관리하고, 학생은 개별 또는 모둠으로 AI와 대화하며 심화 학습을 진행할 수 있습니다.

## ✨ 주요 기능

### 👩‍🏫 선생님용 (Teacher Admin Dashboard)
- **수업 관리**: 수업 방(Room)을 생성하고 관리하며, 접속 코드를 발급합니다.
- **학생 관리**: 학생 명단을 개별 또는 일괄(엑셀 붙여넣기 방식)로 등록 및 관리합니다.
- **계정 관리**: 별도의 승인 절차 없이 회원가입 즉시 이용 가능하며, 비밀번호 분실 시 이메일을 통한 **비밀번호 재설정(Forgot Password)** 기능을 제공합니다.
- **학습 자료 관리**:
  - 기출 문제, 지문(Passage), 주제, 논리 흐름(Logic Flow) 등을 등록합니다.
  - 논리 흐름은 구조화된 JSONB 형식으로 저장됩니다 (역할 라벨, 중심 내용, **영어 연결어(conjunction)** 포함).
  - 학년별, 난이도별 문항 관리가 가능하며, **교사 1인당 등록 가능한 문항 수 제한**을 실시간으로 안내합니다.
- **설정 및 연동**:
  - OpenAI API Key 설정 (필수)
  - System Prompt 커스터마이징
  - 기능 안내: 로그인 페이지 안내 문구 편집 기능 (마스터 교사 전용, {limit} 자동 치환)
  - Google Drive 연동 (Google Apps Script URL)을 통해 학생들의 대화 내역 자동 저장 (현재 마스터 교사만 사용 가능, 일반 교사는 추후 지원 예정)

### 👨‍🎓 학생용 (Student Chat Interface)
- **간편 접속**: 선생님이 공유한 Room Code로 수업에 입장합니다.
- **AI 튜터와 대화**:
  - 특정 문항/지문을 선택하여 AI에게 질문하거나 설명을 요청합니다.
  - **문장 분석**: 지문의 특정 문장을 선택하여 구문 분석 및 해석 요청이 가능합니다.
  - **추천 질문**: '주제 찾기', '논리 흐름 분석(3단계)', '단어 의미' 등 미리 정의된 질문을 클릭 한 번으로 할 수 있습니다.
- **4단계 점진적 힌트 시스템 (Socratic Tutoring)**:
  - 모든 추천 질문(주제 찾기, Step 1~3)에 점진적 힌트가 적용됩니다.
  - **1단계 (방향 제시)**: 넓은 유도 질문으로 학생이 스스로 탐구하도록 유도
  - **2단계 (범위 좁히기)**: 특정 부분이나 구조 틀을 제시하여 사고 범위를 좁힘
  - **3단계 (핵심 단서 제공)**: 핵심 문장/키워드 인용으로 정답에 근접한 힌트 제공
  - **4단계 (정답 공개)**: 학생의 노력을 칭찬한 후 교사 데이터의 정답을 그대로 공개
  - 같은 질문을 반복 클릭할 때마다 단계가 올라갑니다.
- **논리적 흐름 분석 (3단계)**:
  - **Step 1**: 지문을 의미 기준으로 몇 부분으로 나눌 수 있는지 파악 (교사 데이터 기반)
  - **Step 2**: 각 부분의 역할 라벨과 중심 내용 파악
  - **Step 3**: 지문에 사용된 **영어 연결어를 직접 찾고**, 각 연결어의 논리적 역할(인과, 역접, 추가 등)을 분석
    - 연결어가 있는 경우: 교사 데이터를 활용해 **지문 내 연결어 위치를 먼저 안내**하고, 대표 연결어 분류표를 참고로 제공하여 학생이 논리적 역할을 스스로 추론하도록 유도
    - 연결어가 없는 경우: 문장 사이에 숨은 논리적 연결 관계를 탐색하도록 유도
    - 대표 연결어 분류:
      - 인과: because, since, therefore, thus, consequently 등
      - 역접·대조: however, nevertheless, whereas, although 등
      - 추가: moreover, furthermore, in addition 등
      - 예시: for example, for instance, such as 등
      - 순서·전개: first, second, finally, then, next 등
      - 강조·재진술: in fact, indeed, that is, in other words 등
- **단어 의미 질문 (누적 중복 제외)**:
  - '이 글에서 중요한 단어 5개만 뽑아서, 의미와 함께 알려줘.' 질문을 반복할 때, 이전 모든 회차 답변에서 다룬 단어를 **누적하여 제외**합니다.
  - 1회차 → 새 단어 5개 / 2회차 → 1회차 제외 후 새 단어 5개 / 3회차 → 1·2회차 모두 제외 후 새 단어 5개
- **AI Strict Mode**:
  - AI는 교사가 설정한 논리 흐름 구조(부분 수, 역할 라벨)를 절대 변경하지 않습니다.
  - 교사 데이터가 존재할 때만 구조 강조 지침이 적용됩니다.
- **UI/UX**:
  - 오른쪽 사이드바 패널이 항상 화면 전체 높이(`100vh`)에 맞게 동적으로 조정됩니다.
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

4. **Supabase RPC 함수 설정**
   Supabase SQL Editor에서 `get_active_room_data` 함수에 `logic_flow` 컬럼이 포함되어 있는지 확인하세요.
   ```sql
   -- questions SELECT에 logic_flow 컬럼 필수 포함
   SELECT q.id, q.exam_code as "examCode", q.topic, q.passage,
          q.target_grade as "targetGrade", q.logic_flow as "logicFlow"
   ```

5. **개발 서버 실행 (Run Dev Server)**
   ```bash
   npm run dev
   ```

## 📂 프로젝트 구조

```
src/
├── pages/
│   ├── StudentChatInterface.tsx  # 학생용 채팅 화면 (4단계 힌트, Strict Mode, 어휘 누적 제외)
│   ├── TeacherAdminDashboard.tsx # 선생님용 관리자 대시보드 (로그인, 회원가입, 비밀번호 찾기 포함)
│   └── RoomEditWindow.tsx        # 수업 방 생성/수정
├── lib/
│   ├── auth.ts       # Supabase 인증 및 비밀번호 재설정/업데이트 기능
│   ├── public-api.ts # Supabase RPC 데이터 조회 (snake_case → camelCase 매핑)
│   ├── questions.ts  # 문항 관리 API
│   ├── rooms.ts      # 수업 방 관리 API
│   ├── students.ts   # 학생 관리 API
│   └── settings.ts   # 설정 및 앱 설정(문항 제한 등) 관리
├── types/            # TypeScript 타입 정의 (LogicFlowStep 등)
├── App.tsx           # 메인 라우팅, 렌더링 및 비밀번호 재설정(Recovery) 처리
└── index.css         # 전역 스타일 (사이드바 100vh, 다크모드 포함)
public/
└── privacy.html      # 개인정보처리방침 (HTML)
```

## 📝 라이선스

This project is private and for educational use only.
