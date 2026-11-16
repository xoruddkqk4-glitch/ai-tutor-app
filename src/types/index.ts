export type Student = {
  id: number;
  teacher_id?: string;
  class: string; // 학급 정보 (DB 컬럼 및 기본 필드)
  className?: string; // 호환용 학급 별칭
  number: string;
  name: string;
  competency: string; // 상, 중, 하 등 역량 정보
  created_at?: string;
};

export type RoomPublicInfo = {
  id: number;
  class_name: string;
  drive_folder_id?: string;
  google_script_url?: string;
  api_key?: string;
  has_api_key?: boolean;
  system_prompt?: string;
};

export type ClassInfo = {
  id: number;
  name: string;
  studentCount: number;
};

export type LogicFlowStep = {
  /** 큰 범주(필수 권장). 연속 행에 같은 값이면 한 덩어리로 묶임 */
  macroLabel?: string;
  /** 작은 범주(선택) */
  role: string;
  conjunction?: string;
  content: string;
};

export type PassageType = 'csat' | 'textbook';

export type Question = {
  id: number;
  /** UI: 수업을 위한 문항 번호 (DB exam_code) */
  examCode: string;
  /** UI: 통합 출처 문자열 (DB target_grade 호환, 예: "2024년 고2 9월 29번") */
  targetGrade?: string;
  /** 분리된 출처: 년도 (예: "2024") */
  sourceYear?: string;
  /** 분리된 출처: 학년 (예: "고2") */
  sourceGrade?: string;
  /** 분리된 출처: 월/시기 (예: "9월", "수능", 또는 교과서 단원명) */
  sourceMonth?: string;
  /** 분리된 출처: 출처 문항 번호 (예: "29번", "31~32번") */
  sourceNumber?: string;
  /** 문항 태그 배열 */
  tags?: string[];
  topic: string;
  logicFlow?: string | string[] | LogicFlowStep[];
  passage: string;
  passageType?: PassageType;
};

export type Room = {
  id: number;
  code: string;
  className: string;
  folderName: string;
  isActive: boolean;
  createdAt: string;
};

export type FeedbackTone = 'Socratic' | 'Polite' | 'Friendly' | 'Emoji';
