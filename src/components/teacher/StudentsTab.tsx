import { CheckCircle, Save, Trash2, Upload } from 'lucide-react';
import type { Student } from '../../lib/students';

interface ParsedStudent {
    class: string;
    number: string;
    name: string;
    competency: string;
}

interface StudentsTabProps {
    bulkStudentText: string;
    onChangeBulkText: (value: string) => void;
    parsedStudents: ParsedStudent[];
    savedStudents: Student[];
    sortedStudents: Student[];
    selectedStudentsForDeletion: number[];
    sortColumn: 'class' | 'number' | 'name' | 'competency';
    sortDirection: 'asc' | 'desc';
    onParseStudents: () => void;
    onSaveStudents: () => void;
    onDeleteSelectedStudents: () => void;
    onToggleAllStudents: () => void;
    onSortColumn: (column: 'class' | 'number' | 'name' | 'competency') => void;
    onToggleStudentSelection: (studentId: number) => void;
}

export default function StudentsTab({
    bulkStudentText,
    onChangeBulkText,
    parsedStudents,
    savedStudents,
    sortedStudents,
    selectedStudentsForDeletion,
    sortColumn,
    sortDirection,
    onParseStudents,
    onSaveStudents,
    onDeleteSelectedStudents,
    onToggleAllStudents,
    onSortColumn,
    onToggleStudentSelection,
}: StudentsTabProps) {
    return (
        <div className="teacher-content-wrapper">
            <div className="teacher-section-header">
                <h1 className="teacher-section-title">학생 명단 관리</h1>
                <p className="teacher-section-subtitle">엑셀 데이터를 복사해서 붙여넣으세요.</p>
            </div>

            <div className="teacher-grid-2">
                {/* Input Area */}
                <div className="teacher-content-card">
                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Upload size={20} style={{ color: '#3b82f6' }} /> 데이터 붙여넣기
                    </h2>
                    <div className="teacher-alert-info" style={{ marginBottom: '16px' }}>
                        <strong>형식:</strong> [학급] [번호] [이름] [역량 (상/중/하)]<br />
                        (엑셀에서 복사하면 자동으로 탭으로 구분됩니다)
                    </div>
                    <textarea
                        className="teacher-textarea"
                        rows={12}
                        placeholder={`예시:\n3학년 1반\t13번\t김철수\t상\n3학년 1반\t14번\t이영희\t중`}
                        value={bulkStudentText}
                        onChange={e => onChangeBulkText(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: '13px' }}
                    />
                    <button
                        onClick={onParseStudents}
                        className="teacher-button-secondary"
                        style={{ width: '100%', marginTop: '12px' }}
                    >
                        데이터 미리보기 (파싱)
                    </button>
                </div>

                {/* Preview Area */}
                <div className="teacher-content-card">
                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={20} style={{ color: '#10b981' }} /> 미리보기
                    </h2>

                    {parsedStudents.length === 0 && savedStudents.length === 0 ? (
                        <div className="teacher-alert-info">
                            왼쪽에 데이터를 붙여넣고 "데이터 미리보기" 버튼을 클릭하세요.
                        </div>
                    ) : (
                        <>
                            {/* Parsed Students (not yet saved) */}
                            {parsedStudents.length > 0 && (
                                <>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#f59e0b' }}>
                                        📋 파싱된 데이터 (저장 전)
                                    </div>
                                    <div className="teacher-student-preview" style={{ marginBottom: '16px' }}>
                                        <div className="teacher-student-row teacher-student-header">
                                            <div>학급</div>
                                            <div>번호</div>
                                            <div>이름</div>
                                            <div>역량</div>
                                        </div>
                                        {parsedStudents.map((s, idx) => (
                                            <div key={idx} className="teacher-student-row">
                                                <div>{s.class}</div>
                                                <div>{s.number}</div>
                                                <div>{s.name}</div>
                                                <div>{s.competency}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="teacher-alert-success">
                                        ✓ {parsedStudents.length}명의 학생 데이터가 파싱되었습니다.
                                    </div>
                                    <button
                                        onClick={onSaveStudents}
                                        className="teacher-button-primary"
                                        style={{ width: '100%', marginTop: '12px' }}
                                    >
                                        <Save size={18} /> 데이터베이스에 저장
                                    </button>
                                </>
                            )}

                            {/* Saved Students */}
                            {savedStudents.length > 0 && (
                                <>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: parsedStudents.length > 0 ? '24px' : '0', marginBottom: '8px', color: '#10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>✅ 저장된 학생 ({savedStudents.length}명)</span>
                                        {selectedStudentsForDeletion.length > 0 && (
                                            <button
                                                onClick={onDeleteSelectedStudents}
                                                className="teacher-button-danger"
                                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                            >
                                                <Trash2 size={14} /> {selectedStudentsForDeletion.length}명 삭제
                                            </button>
                                        )}
                                    </div>
                                    <div className="teacher-student-preview">
                                        <div className="teacher-student-row teacher-student-header">
                                            <div style={{ width: '40px', textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudentsForDeletion.length === savedStudents.length && savedStudents.length > 0}
                                                    onChange={onToggleAllStudents}
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                            </div>
                                            <div
                                                onClick={() => onSortColumn('class')}
                                                style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                학급 {sortColumn === 'class' && (sortDirection === 'asc' ? '▲' : '▼')}
                                            </div>
                                            <div
                                                onClick={() => onSortColumn('number')}
                                                style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                번호 {sortColumn === 'number' && (sortDirection === 'asc' ? '▲' : '▼')}
                                            </div>
                                            <div
                                                onClick={() => onSortColumn('name')}
                                                style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                이름 {sortColumn === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                                            </div>
                                            <div
                                                onClick={() => onSortColumn('competency')}
                                                style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                역량 {sortColumn === 'competency' && (sortDirection === 'asc' ? '▲' : '▼')}
                                            </div>
                                        </div>
                                        {sortedStudents.map((s) => (
                                            <div key={s.id} className="teacher-student-row">
                                                <div style={{ width: '40px', textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudentsForDeletion.includes(s.id)}
                                                        onChange={() => onToggleStudentSelection(s.id)}
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                    />
                                                </div>
                                                <div>{s.class}</div>
                                                <div>{s.number}</div>
                                                <div>{s.name}</div>
                                                <div>{s.competency}</div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
