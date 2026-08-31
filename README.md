# 🏫 AI Tutor (AI Tutor App)

학생들과 AI 튜터가 상호작용하며 학습할 수 있는 교육용 웹 애플리케이션입니다.  
선생님은 학습 자료와 학생을 관리하고, 학생은 개별 또는 모둠으로 AI와 대화하며 심화 학습을 진행할 수 있습니다.

## ✨ 주요 기능

### 👩‍🏫 선생님용 (Teacher Admin Dashboard)
- **수업 관리**: 수업 방(Room)을 생성하고 관리하며, 접속 코드를 발급합니다.
- **학생 관리**: 학생 명단을 개별 또는 일괄(엑셀 붙여넣기 방식)로 등록 및 관리합니다.
- **학습 자료 관리**:
  - 문항 번호, 출처(자유 입력), 지문(Passage), 우리말 주제, **논리 흐름** 등을 등록합니다.
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
│   ├── auth.ts        # Supabase 인증 관련
│   ├── logic-flow.ts  # 논리 흐름 파싱·큰/작은 범주·저장 정규화
│   ├── questions.ts   # 문항 관리 API
│   ├── public-api.ts  # 학생용 방·문항 RPC (비로그인)
│   ├── rooms.ts       # 수업 방 관리 API
│   ├── students.ts    # 학생 관리 API
│   ├── settings.ts    # 설정 관리
│   └── supabase.ts    # Supabase 클라이언트
├── types/            # TypeScript 타입 정의
├── App.tsx           # 메인 라우팅 및 렌더링
└── index.css         # 전역 스타일 (다크모드 포함)
public/
└── privacy.html      # 개인정보처리방침 (HTML)
```

## 📋 최근 작업 및 변경 이력 (Recent Updates)

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
  - 레거시 `.antigravity` 제거, [`.agents`](file:///c:/Users/user/Desktop/web%20app/ai-tutor-app-main/.agents) 단일화 및 Vercel 자동 배포 연동 완료.

## 📝 라이선스

This project is private and for educational use only.
