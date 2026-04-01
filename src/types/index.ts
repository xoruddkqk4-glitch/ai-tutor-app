export type Student = {
  id: number;
  number: number;
  name: string;
  competency: string; // 상, 중, 하 등 역량 정보
  className?: string; // 학급 정보 (예: '1반', '2반')
  class?: string; // RPC returns this
};

export type ClassInfo = {
  id: number;
  name: string;
  studentCount: number;
};

export type Question = {
  id: number;
  examCode: string; // UI: 문항 번호 (DB: exam_code)
  targetGrade?: string; // UI: 출처 (DB: target_grade)
  topic: string;
  logicFlow?: string;
  passage: string;
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
