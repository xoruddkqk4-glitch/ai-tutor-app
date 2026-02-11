import React, { useState } from 'react';
import {
    LayoutDashboard, Users, BookOpen, Settings, Plus, Save,
    Trash2, Upload, FileText, CheckCircle, Play
} from 'lucide-react';
import type { Question, Room } from '../types';

/**
 * [Mock Data]
 * 백엔드 연동 전 UI 테스트용 데이터
 */
const MOCK_QUESTIONS: Question[] = [
    {
        id: 1,
        examCode: '2024-1학기-64번',
        targetGrade: '고3',
        topic: '환경 보호의 시급성',
        logicFlow: '문제 제기 -> 원인 분석 -> 해결책 제시',
        passage: 'Climate change is not just a distant threat...'
    }
];

type TeacherRole = 'master' | 'regular';

export default function TeacherAdminPage() {
    // --- State ---
    const [activeTab, setActiveTab] = useState<'dashboard' | 'materials' | 'students' | 'settings'>('dashboard');
    const [isLogin, setIsLogin] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Teacher Info
    const [teacherEmail, setTeacherEmail] = useState('');
    const [teacherRole, setTeacherRole] = useState<TeacherRole>('regular');

    // Data States
    const [rooms, setRooms] = useState<Room[]>([]);
    const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);

    // Forms
    const [bulkStudentText, setBulkStudentText] = useState('');
    const [parsedStudents, setParsedStudents] = useState<{ class: string, number: string, name: string, competency: string }[]>([]);
    const [savedStudents, setSavedStudents] = useState<{ class: string, number: string, name: string, competency: string }[]>([]);

    const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
        examCode: '', targetGrade: '고3', topic: '', logicFlow: '', passage: ''
    });
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

    const [settings, setSettings] = useState({
        driveId: '',
        systemPrompt: '너는 친절하고 꼼꼼한 고등학교 선생님이야. 학생의 수준에 맞춰 설명해줘.',
        apiKey: '',
        maxQuestionsForRegular: 50
    });

    // Room Creation Modal
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);

    // Student Table Sorting and Selection
    const [sortColumn, setSortColumn] = useState<'class' | 'number' | 'name' | 'competency'>('class');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [selectedStudentsForDeletion, setSelectedStudentsForDeletion] = useState<number[]>([]);

    // Logic Flow Steps
    const [flowSteps, setFlowSteps] = useState<string[]>(['']);

    // --- Handlers ---

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        // Admin credentials check
        if (loginEmail === 'ghinokr@hongik68.sen.hs.kr' && loginPassword === '111111') {
            setTeacherEmail(loginEmail);
            setTeacherRole('master');
            setIsLogin(true);
        } else {
            // For other teachers, just log them in as regular
            setTeacherEmail(loginEmail);
            setTeacherRole('regular');
            setIsLogin(true);
        }
    };

    // 학생 명단 파싱 (탭/공백/콤마 구분)
    const handleParseStudents = () => {
        const lines = bulkStudentText.split('\n').filter(line => line.trim() !== '');
        const parsed = lines.map(line => {
            const parts = line.split(/[\t,]+/).map(s => s.trim());
            if (parts.length >= 3) {
                return {
                    class: parts[0],
                    number: parts[1],
                    name: parts[2],
                    competency: parts[3] || '정보 없음'
                };
            }
            return null;
        }).filter(item => item !== null) as any[];

        setParsedStudents(parsed);
    };

    const handleSaveStudents = () => {
        setSavedStudents([...savedStudents, ...parsedStudents]);
        alert(`${parsedStudents.length}명의 학생이 데이터베이스에 등록되었습니다.`);
        setBulkStudentText('');
        setParsedStudents([]);
    };

    const canAddQuestion = () => {
        if (teacherRole === 'master') return true;
        return questions.length < settings.maxQuestionsForRegular;
    };

    const handleAddQuestion = () => {
        if (!canAddQuestion()) {
            alert(`일반 교사는 최대 ${settings.maxQuestionsForRegular}개까지만 문항을 등록할 수 있습니다.`);
            return;
        }

        if (!newQuestion.examCode || !newQuestion.passage) {
            alert('기출 번호와 본문은 필수입니다.');
            return;
        }
        const q: Question = {
            id: Date.now(),
            examCode: newQuestion.examCode!,
            targetGrade: newQuestion.targetGrade!,
            topic: newQuestion.topic!,
            logicFlow: newQuestion.logicFlow!,
            passage: newQuestion.passage!
        };
        setQuestions([...questions, q]);
        setNewQuestion({ examCode: '', targetGrade: '고3', topic: '', logicFlow: '', passage: '' });
    };

    const handleCreateRoom = () => {
        setShowRoomModal(true);
    };

    const handleConfirmCreateRoom = () => {
        if (!selectedClass || selectedQuestions.length === 0) {
            alert('학급과 문항을 선택해주세요.');
            return;
        }

        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newRoom: Room = {
            code,
            className: selectedClass,
            folderName: `문항 ${selectedQuestions.length}개`,
            isActive: true,
            createdAt: new Date().toLocaleString('ko-KR')
        };
        setRooms([...rooms, newRoom]);
        setShowRoomModal(false);
        setSelectedClass('');
        setSelectedQuestions([]);
    };

    const handleEditQuestion = (q: Question) => {
        setEditingQuestion(q);
        setNewQuestion(q);
        // Split by newline or ' -> ' for backward compatibility
        setFlowSteps(q.logicFlow ? q.logicFlow.split(/\r?\n| -> /) : ['']);
    };

    const handleUpdateQuestion = () => {
        if (!editingQuestion) return;

        const updatedQuestions = questions.map(q =>
            q.id === editingQuestion.id ? {
                ...editingQuestion,
                ...newQuestion,
                logicFlow: flowSteps.filter(s => s.trim()).join('\n')
            } : q
        );
        setQuestions(updatedQuestions);
        setEditingQuestion(null);
        setNewQuestion({ examCode: '', targetGrade: '고3', topic: '', logicFlow: '', passage: '' });
        setFlowSteps(['']);
        alert('문항이 수정되었습니다.');
    };

    const handleCancelEdit = () => {
        setEditingQuestion(null);
        setNewQuestion({ examCode: '', targetGrade: '고3', topic: '', logicFlow: '', passage: '' });
        setFlowSteps(['']);
    };

    const handleSortColumn = (column: 'class' | 'number' | 'name' | 'competency') => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const handleToggleStudentSelection = (index: number) => {
        setSelectedStudentsForDeletion(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const handleToggleAllStudents = () => {
        if (selectedStudentsForDeletion.length === savedStudents.length) {
            setSelectedStudentsForDeletion([]);
        } else {
            setSelectedStudentsForDeletion(savedStudents.map((_, idx) => idx));
        }
    };

    const handleDeleteSelectedStudents = () => {
        const newStudents = savedStudents.filter((_, idx) => !selectedStudentsForDeletion.includes(idx));
        setSavedStudents(newStudents);
        setSelectedStudentsForDeletion([]);
        alert(`${selectedStudentsForDeletion.length}명의 학생이 삭제되었습니다.`);
    };

    const handleSaveSettings = () => {
        alert('설정이 저장되었습니다.');
    };

    // Get unique classes from saved students
    const uniqueClasses = Array.from(new Set(savedStudents.map(s => s.class))).sort();

    const toggleQuestionSelection = (questionId: number) => {
        setSelectedQuestions(prev =>
            prev.includes(questionId)
                ? prev.filter(id => id !== questionId)
                : [...prev, questionId]
        );
    };

    // Sort saved students
    const sortedStudents = [...savedStudents].sort((a, b) => {
        let aVal: any = a[sortColumn];
        let bVal: any = b[sortColumn];

        // Convert to numbers for number column
        if (sortColumn === 'number') {
            aVal = parseInt(aVal) || 0;
            bVal = parseInt(bVal) || 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // --- Login View ---
    if (!isLogin) {
        return (
            <div className="teacher-login-container">
                <div className="teacher-login-box">
                    <div className="teacher-login-header">
                        <div className="teacher-login-icon">
                            <BookOpen style={{ color: 'white', width: '32px', height: '32px' }} />
                        </div>
                        <h1>AI 챗봇 관리자</h1>
                        <p>선생님 계정으로 로그인하세요</p>
                    </div>
                    <form onSubmit={handleLogin} className="teacher-login-form">
                        <div className="teacher-login-input-group">
                            <label>이메일</label>
                            <input
                                type="email"
                                placeholder="teacher@school.com"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="teacher-login-input-group">
                            <label>비밀번호</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="teacher-login-button">
                            로그인
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- Dashboard View ---
    return (
        <div className="teacher-dashboard">

            {/* Sidebar */}
            <aside className="teacher-sidebar">
                <div className="teacher-sidebar-header">
                    <div className="teacher-sidebar-logo">
                        <BookOpen style={{ color: 'white', width: '20px', height: '20px' }} />
                    </div>
                    <span className="teacher-sidebar-title">AI 챗봇</span>
                </div>

                <nav className="teacher-sidebar-nav">
                    <SidebarItem
                        icon={<Users size={20} />}
                        label="학생 명단 관리"
                        active={activeTab === 'students'}
                        onClick={() => setActiveTab('students')}
                    />
                    <SidebarItem
                        icon={<FileText size={20} />}
                        label="학습 자료 관리"
                        active={activeTab === 'materials'}
                        onClick={() => setActiveTab('materials')}
                    />
                    <SidebarItem
                        icon={<LayoutDashboard size={20} />}
                        label="수업 대시보드"
                        active={activeTab === 'dashboard'}
                        onClick={() => setActiveTab('dashboard')}
                    />
                    <SidebarItem
                        icon={<Settings size={20} />}
                        label="설정"
                        active={activeTab === 'settings'}
                        onClick={() => setActiveTab('settings')}
                    />
                </nav>

                <div className="teacher-sidebar-footer">
                    <div className="teacher-profile">
                        <div className="teacher-profile-avatar">
                            T
                        </div>
                        <div className="teacher-profile-info">
                            <div className="teacher-profile-email">{teacherEmail}</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="teacher-main">

                {/* --- TAB: Dashboard (Rooms) --- */}
                {activeTab === 'dashboard' && (
                    <div className="teacher-content-wrapper">
                        <div className="teacher-section-header">
                            <h1 className="teacher-section-title">수업 대시보드</h1>
                            <p className="teacher-section-subtitle">현재 진행 중인 수업 방을 관리하세요.</p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                            <button onClick={handleCreateRoom} className="teacher-button-primary">
                                <Plus size={20} /> 새 수업 시작 (방 만들기)
                            </button>
                        </div>

                        {/* Room List */}
                        {rooms.length === 0 ? (
                            <div className="teacher-empty-state">
                                <Play className="teacher-empty-state-icon" />
                                <div className="teacher-empty-state-title">진행 중인 수업이 없습니다.</div>
                                <div className="teacher-empty-state-subtitle">새 수업 시작 버튼을 눌러 Room Code를 생성하세요.</div>
                            </div>
                        ) : (
                            rooms.map((room) => (
                                <div key={room.code} className="teacher-room-card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div className="teacher-room-code">
                                            {room.code}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#222', marginBottom: '4px' }}>
                                                {room.className}
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
                                                수업 진행 중 • {room.createdAt}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setRooms(rooms.filter(r => r.code !== room.code))}
                                        className="teacher-button-danger"
                                    >
                                        종료
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* --- TAB: Materials (Questions) --- */}
                {activeTab === 'materials' && (
                    <div className="teacher-content-wrapper">
                        <div className="teacher-section-header">
                            <h1 className="teacher-section-title">학습 자료 관리</h1>
                            <p className="teacher-section-subtitle">
                                문항을 추가하고 관리하세요.
                                {teacherRole === 'regular' && ` (${questions.length}/${settings.maxQuestionsForRegular}개)`}
                            </p>
                        </div>

                        {teacherRole === 'regular' && questions.length >= settings.maxQuestionsForRegular && (
                            <div className="teacher-alert-warning">
                                ⚠️ 일반 교사는 최대 {settings.maxQuestionsForRegular}개까지만 문항을 등록할 수 있습니다.
                            </div>
                        )}

                        {/* Add Question Form */}
                        <div className="teacher-content-card">
                            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>새 문항 추가</h2>

                            <div className="teacher-grid-2">
                                <div className="teacher-input-group">
                                    <label className="teacher-input-label">기출 번호</label>
                                    <input
                                        type="text"
                                        className="teacher-input-field"
                                        placeholder="2024-1학기-64번"
                                        value={newQuestion.examCode || ''}
                                        onChange={e => setNewQuestion({ ...newQuestion, examCode: e.target.value })}
                                    />
                                </div>

                                <div className="teacher-input-group">
                                    <label className="teacher-input-label">학년</label>
                                    <select
                                        className="teacher-input-field"
                                        value={newQuestion.targetGrade || '고3'}
                                        onChange={e => setNewQuestion({ ...newQuestion, targetGrade: e.target.value })}
                                    >
                                        <option value="고1">고1</option>
                                        <option value="고2">고2</option>
                                        <option value="고3">고3</option>
                                    </select>
                                </div>
                            </div>

                            <div className="teacher-input-group">
                                <label className="teacher-input-label">주제</label>
                                <input
                                    type="text"
                                    className="teacher-input-field"
                                    placeholder="예: 환경 보호의 시급성"
                                    value={newQuestion.topic || ''}
                                    onChange={e => setNewQuestion({ ...newQuestion, topic: e.target.value })}
                                />
                            </div>

                            <div className="teacher-input-group">
                                <label className="teacher-input-label">논리 흐름 (순서대로 입력)</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {flowSteps.map((step, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <div style={{
                                                width: '24px', height: '24px',
                                                borderRadius: '50%', background: '#3b82f6',
                                                color: 'white', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                fontSize: '12px', fontWeight: 'bold',
                                                flexShrink: 0
                                            }}>
                                                {index + 1}
                                            </div>
                                            <input
                                                type="text"
                                                className="teacher-input-field"
                                                placeholder={`단계 ${index + 1} 입력 (예: 문제 제기)`}
                                                value={step}
                                                onChange={(e) => {
                                                    const newSteps = [...flowSteps];
                                                    newSteps[index] = e.target.value;
                                                    setFlowSteps(newSteps);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const newSteps = [...flowSteps];
                                                        newSteps.splice(index + 1, 0, '');
                                                        setFlowSteps(newSteps);
                                                    }
                                                }}
                                                style={{ flex: 1 }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const newSteps = flowSteps.filter((_, i) => i !== index);
                                                    setFlowSteps(newSteps.length ? newSteps : ['']);
                                                }}
                                                className="teacher-button-secondary"
                                                style={{ padding: '8px', color: '#ef4444', borderColor: '#fee2e2' }}
                                                title="삭제"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setFlowSteps([...flowSteps, ''])}
                                        className="teacher-button-secondary"
                                        style={{ alignSelf: 'start', marginTop: '4px' }}
                                    >
                                        <Plus size={16} /> 단계 추가
                                    </button>
                                </div>
                            </div>

                            <div className="teacher-input-group">
                                <label className="teacher-input-label">지문 (본문)</label>
                                <textarea
                                    rows={6}
                                    className="teacher-textarea"
                                    placeholder="영어 지문을 입력하세요..."
                                    value={newQuestion.passage || ''}
                                    onChange={e => setNewQuestion({ ...newQuestion, passage: e.target.value })}
                                />
                            </div>

                            <div className="teacher-flex-end">
                                {editingQuestion ? (
                                    <>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="teacher-button-secondary"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={handleUpdateQuestion}
                                            className="teacher-button-primary"
                                        >
                                            <Save size={18} /> 수정 완료
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleAddQuestion}
                                        disabled={!canAddQuestion()}
                                        className="teacher-button-primary"
                                    >
                                        <Plus size={18} /> 문항 추가
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Question List */}
                        <div className="teacher-content-card">
                            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                                등록된 문항 ({questions.length}개)
                            </h2>

                            {questions.length === 0 ? (
                                <div className="teacher-empty-state">
                                    <FileText className="teacher-empty-state-icon" />
                                    <div className="teacher-empty-state-title">등록된 문항이 없습니다.</div>
                                    <div className="teacher-empty-state-subtitle">위 양식을 통해 문항을 추가하세요.</div>
                                </div>
                            ) : (
                                questions.map((q) => (
                                    <div key={q.id} className="teacher-question-card">
                                        <div style={{ flex: 1 }}>
                                            <div style={{ marginBottom: '8px' }}>
                                                <span className="teacher-question-badge">{q.examCode}</span>
                                                <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#222' }}>{q.topic}</span>
                                            </div>
                                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '600px' }}>
                                                {q.passage}
                                            </p>
                                            <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '12px' }}>
                                                <div className="teacher-card-row">
                                                    <span className="teacher-card-label">논리 흐름:</span>
                                                    <span className="teacher-card-value">
                                                        {q.logicFlow ? (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                                                {q.logicFlow.split(/\r?\n| -> /).map((step, i, arr) => (
                                                                    <React.Fragment key={i}>
                                                                        <div style={{
                                                                            background: '#f3f4f6', padding: '4px 10px',
                                                                            borderRadius: '6px', fontSize: '13px',
                                                                            border: '1px solid #e5e7eb'
                                                                        }}>
                                                                            {step}
                                                                        </div>
                                                                        {i < arr.length - 1 && <span style={{ color: '#9ca3af' }}>→</span>}
                                                                    </React.Fragment>
                                                                ))}
                                                            </div>
                                                        ) : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                            <button
                                                onClick={() => handleEditQuestion(q)}
                                                className="teacher-button-secondary"
                                                style={{ padding: '8px 16px', fontSize: '13px' }}
                                            >
                                                수정
                                            </button>
                                            <button
                                                onClick={() => setQuestions(questions.filter(qi => qi.id !== q.id))}
                                                className="teacher-button-danger"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* --- TAB: Students (Bulk Upload) --- */}
                {activeTab === 'students' && (
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
                                    <strong>형식:</strong> [학급] [번호] [이름] [역량]<br />
                                    (엑셀에서 복사하면 자동으로 탭으로 구분됩니다)
                                </div>
                                <textarea
                                    className="teacher-textarea"
                                    rows={12}
                                    placeholder={`예시:\n3학년 1반\t13번\t김철수\t상위권\n3학년 1반\t14번\t이영희\t어휘부족`}
                                    value={bulkStudentText}
                                    onChange={e => setBulkStudentText(e.target.value)}
                                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                                />
                                <button
                                    onClick={handleParseStudents}
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
                                                    onClick={handleSaveStudents}
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
                                                            onClick={handleDeleteSelectedStudents}
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
                                                                onChange={handleToggleAllStudents}
                                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                            />
                                                        </div>
                                                        <div
                                                            onClick={() => handleSortColumn('class')}
                                                            style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            학급 {sortColumn === 'class' && (sortDirection === 'asc' ? '▲' : '▼')}
                                                        </div>
                                                        <div
                                                            onClick={() => handleSortColumn('number')}
                                                            style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            번호 {sortColumn === 'number' && (sortDirection === 'asc' ? '▲' : '▼')}
                                                        </div>
                                                        <div
                                                            onClick={() => handleSortColumn('name')}
                                                            style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            이름 {sortColumn === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                                                        </div>
                                                        <div
                                                            onClick={() => handleSortColumn('competency')}
                                                            style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            역량 {sortColumn === 'competency' && (sortDirection === 'asc' ? '▲' : '▼')}
                                                        </div>
                                                    </div>
                                                    {sortedStudents.map((s, idx) => {
                                                        const originalIdx = savedStudents.findIndex(st =>
                                                            st.class === s.class && st.number === s.number && st.name === s.name
                                                        );
                                                        return (
                                                            <div key={idx} className="teacher-student-row">
                                                                <div style={{ width: '40px', textAlign: 'center' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedStudentsForDeletion.includes(originalIdx)}
                                                                        onChange={() => handleToggleStudentSelection(originalIdx)}
                                                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                                    />
                                                                </div>
                                                                <div>{s.class}</div>
                                                                <div>{s.number}</div>
                                                                <div>{s.name}</div>
                                                                <div>{s.competency}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: Settings --- */}
                {activeTab === 'settings' && (
                    <div className="teacher-content-wrapper">
                        <div className="teacher-section-header">
                            <h1 className="teacher-section-title">설정</h1>
                            <p className="teacher-section-subtitle">시스템 설정을 관리하세요.</p>
                        </div>

                        {/* API Key */}
                        <div className="teacher-content-card">
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                                🔑 OpenAI API 키
                            </h3>
                            <div className="teacher-input-group">
                                <label className="teacher-input-label">API 키</label>
                                <input
                                    type="password"
                                    className="teacher-input-field"
                                    placeholder="sk-..."
                                    value={settings.apiKey}
                                    onChange={e => setSettings({ ...settings, apiKey: e.target.value })}
                                />
                                <div className="teacher-alert-info">
                                    🔒 API 키는 암호화되어 저장되며, 본인만 접근 가능합니다.
                                </div>
                            </div>
                        </div>

                        {/* Master Only: Question Limit */}
                        {teacherRole === 'master' && (
                            <div className="teacher-content-card">
                                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                                    일반 교사 문항 제한 설정
                                </h3>
                                <div className="teacher-input-group">
                                    <label className="teacher-input-label">최대 문항 수</label>
                                    <input
                                        type="number"
                                        className="teacher-input-field"
                                        value={settings.maxQuestionsForRegular}
                                        onChange={e => setSettings({ ...settings, maxQuestionsForRegular: Number(e.target.value) })}
                                        min={1}
                                        max={1000}
                                    />
                                    <div className="teacher-alert-info">
                                        일반 교사가 등록할 수 있는 최대 문항 수를 설정합니다. (마스터 교사는 무제한)
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* System Prompt */}
                        <div className="teacher-content-card">
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                                AI 기본 시스템 프롬프트 (Persona)
                            </h3>
                            <div className="teacher-input-group">
                                <label className="teacher-input-label">시스템 프롬프트</label>
                                <textarea
                                    rows={4}
                                    className="teacher-textarea"
                                    value={settings.systemPrompt}
                                    onChange={e => setSettings({ ...settings, systemPrompt: e.target.value })}
                                />
                                <div className="teacher-alert-info">
                                    모든 대화에 기본적으로 적용되는 AI의 성격입니다.
                                </div>
                            </div>
                        </div>

                        <div className="teacher-flex-end">
                            <button onClick={handleSaveSettings} className="teacher-button-primary">
                                <Save size={18} /> 설정 저장
                            </button>
                        </div>
                    </div>
                )}

            </main>

            {/* Room Creation Modal */}
            {showRoomModal && (
                <div className="modal-overlay" onClick={() => setShowRoomModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>새 수업 방 만들기</h2>
                            <button onClick={() => setShowRoomModal(false)} className="modal-close">×</button>
                        </div>

                        <div className="modal-body">
                            {/* Class Selection */}
                            <div className="teacher-input-group">
                                <label className="teacher-input-label">학급 선택</label>
                                {uniqueClasses.length === 0 ? (
                                    <div className="teacher-alert-warning">
                                        ⚠️ 등록된 학급이 없습니다. 먼저 학생 명단을 등록해주세요.
                                    </div>
                                ) : (
                                    <select
                                        className="teacher-input-field"
                                        value={selectedClass}
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                    >
                                        <option value="">학급을 선택하세요</option>
                                        {uniqueClasses.map((cls) => (
                                            <option key={cls} value={cls}>{cls}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Question Selection */}
                            <div className="teacher-input-group">
                                <label className="teacher-input-label">
                                    문항 선택 ({selectedQuestions.length}개 선택됨)
                                </label>
                                {questions.length === 0 ? (
                                    <div className="teacher-alert-warning">
                                        ⚠️ 등록된 문항이 없습니다. 먼저 학습 자료를 등록해주세요.
                                    </div>
                                ) : (
                                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '2px solid #e5e5e5', borderRadius: '12px', padding: '12px' }}>
                                        {questions.map((q) => (
                                            <div
                                                key={q.id}
                                                onClick={() => toggleQuestionSelection(q.id)}
                                                style={{
                                                    padding: '12px',
                                                    marginBottom: '8px',
                                                    borderRadius: '8px',
                                                    border: selectedQuestions.includes(q.id) ? '2px solid #3b82f6' : '1px solid #e5e5e5',
                                                    background: selectedQuestions.includes(q.id) ? '#eff6ff' : 'white',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedQuestions.includes(q.id)}
                                                        onChange={() => { }}
                                                        style={{ width: '16px', height: '16px' }}
                                                    />
                                                    <span className="teacher-question-badge">{q.examCode}</span>
                                                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{q.topic}</span>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#666', marginLeft: '24px' }}>
                                                    {q.targetGrade} • {q.logicFlow}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button onClick={() => setShowRoomModal(false)} className="teacher-button-secondary">
                                취소
                            </button>
                            <button
                                onClick={handleConfirmCreateRoom}
                                disabled={!selectedClass || selectedQuestions.length === 0}
                                className="teacher-button-primary"
                            >
                                <Plus size={18} /> 방 생성
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper Component for Sidebar
function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`teacher-nav-item ${active ? 'active' : ''}`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}
