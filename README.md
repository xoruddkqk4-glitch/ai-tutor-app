# 🏫 AI Tutor (AI Tutor App)

학생들과 AI 튜터가 상호작용하며 학습할 수 있는 교육용 웹 애플리케이션입니다.  
선생님은 학습 자료와 학생을 관리하고, 학생은 개별 또는 모둠으로 AI와 대화하며 심화 학습을 진행할 수 있습니다.

## ✨ 주요 기능

### 👩‍🏫 선생님용 (Teacher Admin Dashboard)
- **수업 관리**: 수업 방(Room)을 생성하고 관리하며, 접속 코드를 발급합니다.
- **학생 관리**: 학생 명단을 개별 또는 일괄(엑셀 붙여넣기 방식)로 등록 및 관리합니다.
- **학습 자료 관리**:
  - 기출 문제, 지문(Passage), 주제, 논리 흐름(Logic Flow) 등을 등록합니다.
  - 논리 흐름은 구조화된 JSONB 형식으로 저장됩니다 (역할 라벨, 중심 내용, 연결어 포함).
  - 학년별, 난이도별 문항 관리가 가능합니다.
- **설정 및 연동**:
  - OpenAI API Key 설정
  - System Prompt 커스터마이징
  - Google Drive 연동 (Google Apps Script URL)을 통해 학생들의 대화 내역을 자동 저장

### 👨‍🎓 학생용 (Student Chat Interface)
- **간편 접속**: 선생님이 공유한 Room Code로 수업에 입장합니다. (입장 시 방 코드 함께 표시)
- **AI 튜터와 대화**:
  - 특정 문항/지문을 선택하여 AI에게 질문하거나 설명을 요청합니다.
  - **문장 분석**: 지문의 특정 문장을 선택하여 구문 분석 및 해석 요청이 가능합니다.
  - **추천 질문**: '주제 찾기', '논리 흐름 분석(3단계)' 등 미리 정의된 유용한 질문을 클릭 한 번으로 할 수 있습니다.
- **4단계 점진적 힌트 시스템 (Socratic Tutoring)**:
  - 모든 추천 질문(주제 찾기, Step 1~3)에 점진적 힌트가 적용됩니다.
  - **1단계 (방향 제시)**: 넓은 유도 질문으로 학생이 스스로 탐구하도록 유도
  - **2단계 (범위 좁히기)**: 특정 부분이나 구조 틀을 제시하여 사고 범위를 좁힘
  - **3단계 (핵심 단서 제공)**: 핵심 문장/키워드 인용으로 정답에 근접한 힌트 제공
  - **4단계 (정답 공개)**: 학생의 노력을 칭찬한 후 교사 데이터의 정답을 그대로 공개
  - 같은 질문을 반복 클릭할 때마다 단계가 올라갑니다.
- **논리적 흐름 분석 (3단계)**:
  - **Step 1**: 지문의 논리적 부분 수 파악 (교사 데이터 기반)
  - **Step 2**: 각 부분의 역할과 중심 내용 파악
  - **Step 3**: 역할 라벨 + 중심 내용 + 영어 연결어를 포함한 논리 흐름 정리
- **AI Strict Mode**:
  - AI는 교사가 설정한 논리 흐름 구조(부분 수, 역할 라벨)를 절대 변경하지 않습니다.
  - 교사 데이터가 존재할 때만 구조 강조 지침이 적용됩니다.
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
│   ├── StudentChatInterface.tsx  # 학생용 채팅 화면 (4단계 힌트, Strict Mode)
│   ├── TeacherAdminDashboard.tsx # 선생님용 관리자 대시보드
│   └── RoomEditWindow.tsx        # 수업 방 생성/수정
├── lib/
│   ├── auth.ts       # Supabase 인증 관련
│   ├── public-api.ts # Supabase RPC 데이터 조회 (snake_case → camelCase 매핑)
│   ├── questions.ts  # 문항 관리 API
│   ├── rooms.ts      # 수업 방 관리 API
│   ├── students.ts   # 학생 관리 API
│   └── settings.ts   # 설정 관리
├── types/            # TypeScript 타입 정의 (LogicFlowStep 등)
├── App.tsx           # 메인 라우팅 및 렌더링
└── index.css         # 전역 스타일 (다크모드 포함)
public/
└── privacy.html      # 개인정보처리방침 (HTML)
```

## 📝 라이선스

This project is private and for educational use only.
