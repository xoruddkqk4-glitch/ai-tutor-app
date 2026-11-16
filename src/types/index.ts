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
  /** UI: 문항 번호 */
  examCode: string;
  /** UI: 출처 (DB 필드명은 기존 유지) */
  targetGrade?: string;
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
