import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Users, BookOpen, Settings, Plus, Save,
    Trash2, Upload, FileText, CheckCircle, Play, LogOut, Edit
} from 'lucide-react';
import type { Question, Room, LogicFlowStep } from '../types';
import { signIn, signUp, signOut, getCurrentUser, resetPassword } from '../lib/auth';
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from '../lib/questions';
import { getStudents, createStudents, type Student } from '../lib/students';
import { getRooms, deleteRoom } from '../lib/rooms';


import { getTeacherSettings, updateTeacherSettings, getAppConfig, updateAppConfig, getAllTeachers, toggleTeacherActive, updateTeacherMaxQuestions, deleteTeacher, type TeacherRecord } from '../lib/settings';

type TeacherRole = 'master' | 'regular';

export default function TeacherAdminPage() {
    // --- State ---
    const [activeTab, setActiveTab] = useState<'welcome' | 'dashboard' | 'materials' | 'students' | 'settings'>('welcome');
    const [isLogin, setIsLogin] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [forgotEmailSent, setForgotEmailSent] = useState(false);
    const [loginQuestionLimit, setLoginQuestionLimit] = useState<number | null>(null);
    const [loginNotice, setLoginNotice] = useState<string>('');

    // Teacher Info
    const [teacherEmail, setTeacherEmail] = useState('');
    const [teacherRole, setTeacherRole] = useState<TeacherRole>('regular');

    // Data States
    const [rooms, setRooms] = useState<Room[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);

    // Forms
    const [bulkStudentText, setBulkStudentText] = useState('');
    const [parsedStudents, setParsedStudents] = useState<{ class: string, number: string, name: string, competency: string }[]>([]);
    const [savedStudents, setSavedStudents] = useState<Student[]>([]);

    const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
        examCode: '', targetGrade: '고3', topic: '', logicFlow: '', passage: ''
    });
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

    // Settings
    const [apiKey, setApiKey] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('너는 친절하고 꼼꼼한 고등학교 선생님이야. 학생의 수준에 맞춰 설명해줘.');
    const [driveFolderId, setDriveFolderId] = useState('');
    const [googleScriptUrl, setGoogleScriptUrl] = useState('');
    const [maxQuestionsLimit, setMaxQuestionsLimit] = useState(50);
    const [limitInput, setLimitInput] = useState('50');
    const [loginNoticeText, setLoginNoticeText] = useState(`회원가입 후 별도의 승인 절차 없이 바로 서비스를 이용하실 수 있습니다.
서버 관리 문제로 교사 1인당 최대 {limit}문항까지 업로드하실 수 있습니다.
서비스가 아직은 불안정하여, 예기치 않게 이용이 제한될 수 있는 점 양해 부탁드립니다.
기타 문의사항은 ghinokr@gmail.com으로 이메일을 보내주시면 안내해 드리겠습니다.`);
    // Bridge for existing code compatibility
    const maxQuestionsForRegular = maxQuestionsLimit;

    // Room Creation: Now handled via new window (RoomEditWindow)
    // Removed old modal state

    // Student Table Sorting and Selection
    const [sortColumn, setSortColumn] = useState<'class' | 'number' | 'name' | 'competency'>('class');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [selectedStudentsForDeletion, setSelectedStudentsForDeletion] = useState<number[]>([]);

    // Logic Flow Steps
    const [flowSteps, setFlowSteps] = useState<LogicFlowStep[]>([{ role: '', conjunction: '', content: '' }]);

    // Teacher Management (Master Only)
    const [teacherList, setTeacherList] = useState<TeacherRecord[]>([]);

    // --- Handlers ---

    // 로그인 페이지용 문항 제한수 및 안내문구 조회
    useEffect(() => {
        getAppConfig('limit_regular_questions').then(limit => {
            if (limit) setLoginQuestionLimit(Number(limit));
        }).catch(() => { });

        getAppConfig('login_notice_text').then(notice => {
            if (notice) {
                setLoginNotice(notice);
            } else {
                setLoginNotice(`회원가입 후 별도의 승인 절차 없이 바로 서비스를 이용하실 수 있습니다.\n서버 관리 문제로 교사 1인당 최대 {limit}문항까지 업로드하실 수 있습니다.\n서비스가 아직은 불안정하여, 예기치 않게 이용이 제한될 수 있는 점 양해 부탁드립니다.\n기타 문의사항은 ghinokr@gmail.com으로 이메일을 보내주시면 안내해 드리겠습니다.`);
            }
        }).catch(() => { });
    }, []);

    // 세션 복원 (자동 로그인)
    useEffect(() => {
        getCurrentUser().then(user => {
            if (user) {
                setTeacherId(user.id);
                setTeacherEmail(user.email);
                setTeacherRole(user.role);
                setIsLogin(true);
                // After session restore, always go to welcome
                setActiveTab('welcome');
                loadQuestions();
                loadStudents();
                loadRooms();
                loadSettings(user.id);
                loadAppConfig();
            }
        }).catch(err => {
            console.error('세션 복원 실패:', err);
        });
    }, []);

    // 탭 전환 시 설정 정보 최신화
    useEffect(() => {
        if (activeTab === 'settings' && isLogin && teacherId) {
            loadSettings(teacherId);
            loadAppConfig();
            if (teacherRole === 'master') {
                loadTeacherList();
            }
        }
    }, [activeTab, isLogin, teacherId]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const user = await signIn(loginEmail, loginPassword);
            setTeacherId(user.id);
            setTeacherEmail(user.email);
            setTeacherRole(user.role);
            setIsLogin(true);
            setActiveTab('welcome'); // Login defaults to welcome
            // 로그인 후 문항, 학생, 수업 방 및 설정 로드
            loadQuestions();
            loadStudents();
            loadRooms();
            loadSettings(user.id);
            loadAppConfig();
        } catch (error: any) {
            alert('로그인 실패: ' + (error.message || '이메일 또는 비밀번호를 확인하세요'));
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const user = await signUp(loginEmail, loginPassword);
            setTeacherId(user.id);
            setTeacherEmail(user.email);
            setTeacherRole(user.role);
            setIsLogin(true);
            setActiveTab('welcome'); // Signup defaults to welcome
            loadSettings(user.id);
            loadAppConfig();
            alert('회원가입 성공! 일반 교사로 등록되었습니다.');
        } catch (error: any) {
            alert('회원가입 실패: ' + (error.message || '이메일 또는 비밀번호를 확인하세요'));
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            setIsLogin(false);
            setTeacherId('');
            setTeacherEmail('');
            setTeacherRole('regular');
            setActiveTab('welcome');

            // Clear all sensitive states
            setApiKey('');
            setSystemPrompt('너는 친절하고 꼼꼼한 고등학교 선생님이야. 학생의 수준에 맞춰 설명해줘.');
            setDriveFolderId('');
            setGoogleScriptUrl('');

            // Clear data
            setRooms([]);
            setQuestions([]);
            setSavedStudents([]);
            setParsedStudents([]);
            setBulkStudentText('');
            setTeacherList([]);

            // Clear editing state
            setNewQuestion({ examCode: '', targetGrade: '고3', topic: '', logicFlow: '', passage: '' });
            setEditingQuestion(null);
            setFlowSteps([{ role: '', conjunction: '', content: '' }]);

            // Reset Limits
            setMaxQuestionsLimit(50);
            setLimitInput('50');

        } catch (error: any) {
            alert('로그아웃 실패: ' + error.message);
        }
    };

    // 문항 로드
    const loadQuestions = async () => {
        try {
            const data = await getQuestions();
            setQuestions(data);
        } catch (error: any) {
            console.error('문항 로드 실패:', error);
            alert('문항을 불러오는데 실패했습니다: ' + error.message);
        }
    };

    // 수업 방 로드
    const loadRooms = async () => {
        try {
            const data = await getRooms();
            setRooms(data);
        } catch (error: any) {
            console.error('수업 방 로드 실패:', error);
            // alert('수업 방을 불러오는데 실패했습니다: ' + error.message);
        }
    };

    // 학생 로드
    const loadStudents = async () => {
        try {
            const data = await getStudents();
            setSavedStudents(data);
        } catch (error: any) {
            console.error('학생 로드 실패:', error);
            alert('학생을 불러오는데 실패했습니다: ' + error.message);
        }
    };

    // 설정 로드
    const loadSettings = async (userId: string) => {
        try {
            const data = await getTeacherSettings(userId);
            // Always set state to overwite potential stale data
            setApiKey(data.openai_api_key || '');
            setSystemPrompt(data.system_prompt || '너는 친절하고 꼼꼼한 고등학교 선생님이야. 학생의 수준에 맞춰 설명해줘.');
            setDriveFolderId(data.drive_folder_id || '');
            setGoogleScriptUrl(data.google_script_url || '');
        } catch (error) {
            console.error('설정 로드 실패:', error);
        }
    };

    const loadAppConfig = async () => {
        const limit = await getAppConfig('limit_regular_questions');
        if (limit) {
            setMaxQuestionsLimit(Number(limit));
            setLimitInput(limit);
        }
        const notice = await getAppConfig('login_notice_text');
        if (notice) {
            setLoginNoticeText(notice);
        }
    };

    // 교사 목록 로드 (Master Only)
    const loadTeacherList = async () => {
        try {
            const data = await getAllTeachers();
            setTeacherList(data);
        } catch (error: any) {
            console.error('교사 목록 로드 실패:', error);
        }
    };

    // 교사 활성/비활성 토글
    const handleToggleTeacherActive = async (teacher: TeacherRecord) => {
        const newStatus = !teacher.is_active;
        const action = newStatus ? '활성화' : '비활성화';
        if (!confirm(`${teacher.email} 교사를 ${action}하시겠습니까?`)) return;

        try {
            await toggleTeacherActive(teacher.id, newStatus);
            await loadTeacherList();
            alert(`${teacher.email} 교사가 ${action}되었습니다.`);
        } catch (error: any) {
            alert('교사 상태 변경 실패: ' + error.message);
        }
    };

    // 교사 삭제
    const handleDeleteTeacher = async (teacher: TeacherRecord) => {
        if (!confirm(`정말 ${teacher.email} 교사를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

        try {
            await deleteTeacher(teacher.id);
            await loadTeacherList();
            alert(`${teacher.email} 교사가 삭제되었습니다.`);
        } catch (error: any) {
            alert('교사 삭제 실패: ' + error.message);
        }
    };

    // 교사 개별 문항 제한수 수정
    const handleUpdateTeacherLimit = async (teacher: TeacherRecord, value: string) => {
        const numValue = value.trim() === '' ? null : Number(value);
        try {
            await updateTeacherMaxQuestions(teacher.id, numValue);
            await loadTeacherList();
        } catch (error: any) {
            alert('문항 제한수 수정 실패: ' + error.message);
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
                    competency: parts[3] || '중'
                };
            }
            return null;
        }).filter(item => item !== null) as any[];

        setParsedStudents(parsed);
    };

    const handleSaveStudents = async () => {
        if (parsedStudents.length === 0) {
            alert('등록할 학생이 없습니다.');
            return;
        }

        try {
            await createStudents(parsedStudents);
            await loadStudents(); // 학생 목록 새로고침
            alert(`${parsedStudents.length}명의 학생이 데이터베이스에 등록되었습니다.`);
            setBulkStudentText('');
            setParsedStudents([]);
        } catch (error: any) {
            alert('학생 등록 실패: ' + error.message);
        }
    };

    const canAddQuestion = () => {
        if (teacherRole === 'master') return true;
        return questions.length < maxQuestionsForRegular;
    };

    const handleAddQuestion = async () => {
        if (!canAddQuestion()) {
            alert(`일반 교사는 최대 ${maxQuestionsForRegular}개까지만 문항을 등록할 수 있습니다.`);
            return;
        }

        if (!newQuestion.examCode || !newQuestion.passage) {
            alert('기출 번호와 본문은 필수입니다.');
            return;
        }

        try {
            const q: Omit<Question, 'id'> = {
                examCode: newQuestion.examCode!,
                targetGrade: newQuestion.targetGrade!,
                topic: newQuestion.topic!,
                logicFlow: flowSteps.filter(s => s.role.trim() || s.content.trim()),
                passage: newQuestion.passage!
            };

            await createQuestion(q);
            await loadQuestions(); // 문항 목록 새로고침
            setNewQuestion({ examCode: '', targetGrade: '고3', topic: '', logicFlow: '', passage: '' });
            setFlowSteps([{ role: '', conjunction: '', content: '' }]);  // flowSteps도 초기화
            alert('문항이 추가되었습니다.');
        } catch (error: any) {
            alert('문항 추가 실패: ' + error.message);
        }
    };

    const handleUpdateQuestion = async () => {
        if (!editingQuestion) return;

        try {
            const updates: Partial<Omit<Question, 'id'>> = {
                examCode: newQuestion.examCode,
                targetGrade: newQuestion.targetGrade,
                topic: newQuestion.topic,
                logicFlow: flowSteps.filter(s => s.role.trim() || s.content.trim()),
                passage: newQuestion.passage
            };

            await updateQuestion(editingQuestion.id, updates);
            await loadQuestions();
            setEditingQuestion(null);
            setNewQuestion({ examCode: '', targetGrade: '고3', topic: '', logicFlow: '', passage: '' });
            setFlowSteps([{ role: '', conjunction: '', content: '' }]);
            alert('문항이 수정되었습니다.');
        } catch (error: any) {
            alert('문항 수정 실패: ' + error.message);
        }
    };

    const handleDeleteQuestion = async (id: number) => {
        if (!confirm('정말 이 문항을 삭제하시겠습니까?')) return;

        try {
            await deleteQuestion(id);
            await loadQuestions();
            alert('문항이 삭제되었습니다.');
        } catch (error: any) {
            alert('문항 삭제 실패: ' + error.message);
        }
    };

    const renderWelcome = () => (
        <div className="teacher-content-wrapper" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            textAlign: 'center',
            padding: '40px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
            borderRadius: '24px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
        }}>
            <div style={{
                width: '100px',
                height: '100px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px',
                boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.3)',
                transform: 'rotate(-5deg)'
            }}>
                <BookOpen size={48} color="white" />
            </div>
            <h1 style={{
                fontSize: '42px',
                fontWeight: '850',
                color: '#1e293b',
                marginBottom: '20px',
                letterSpacing: '-0.025em',
                lineHeight: '1.2'
            }}>
                Welcome Back,<br />
                <span style={{ color: '#3b82f6' }}>AI Tutor</span>
            </h1>
            <p style={{
                fontSize: '19px',
                color: '#475569',
                maxWidth: '650px',
                lineHeight: '1.7',
                marginBottom: '48px',
                fontWeight: '400'
            }}>
                선생님을 위한 지능형 학습 보조 솔루션, AI Tutor 교사 페이지입니다.<br />
                왼쪽 메뉴를 통해 학습 자료를 관리하고 실시간 대시보드를 확인하세요.
            </p>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '24px',
                width: '100%',
                maxWidth: '850px'
            }}>
                <div
                    className="welcome-card"
                    style={{
                        padding: '32px 24px',
                        background: 'white',
                        borderRadius: '20px',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}
                    onClick={() => setActiveTab('students')}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Users size={24} color="#ef4444" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>학생 명단 관리</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>클래스별 학생 명단을 등록하고 개인별 학습 역량을 설정 및 관리합니다.</p>
                </div>
                <div
                    className="welcome-card"
                    style={{
                        padding: '32px 24px',
                        background: 'white',
                        borderRadius: '20px',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}
                    onClick={() => setActiveTab('materials')}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <FileText size={24} color="#3b82f6" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>학습 자료 관리</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>지문 등록 및 논리 흐름 설정을 통해 AI 튜터의 지식 베이스를 구축합니다.</p>
                </div>
                <div
                    className="welcome-card"
                    style={{
                        padding: '32px 24px',
                        background: 'white',
                        borderRadius: '20px',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}
                    onClick={() => setActiveTab('dashboard')}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <LayoutDashboard size={24} color="#10b981" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>수업 대시보드</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>수업 방을 생성하고 참여 학생들의 학습 현황을 실시간으로 모니터링합니다.</p>
                </div>
            </div>
            <style>{`
                .welcome-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    border-color: #3b82f6;
                }
            `}</style>
        </div>
    );

    // Helper to robustly parse logicFlow from DB into LogicFlowStep objects
    const safeParseLogicFlow = (logicFlow: any): LogicFlowStep[] => {
        if (!logicFlow) return [];

        let steps: any[] = [];
        if (Array.isArray(logicFlow)) {
            steps = logicFlow;
        } else {
            const trimmed = String(logicFlow).trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) steps = parsed;
                } catch (e) {
                    console.error("JSON parse failed for logicFlow:", e);
                }
            }
            if (steps.length === 0 && trimmed) {
                // Fallback to regex splitting (newlines or arrows)
                steps = trimmed.split(/\r?\n| -> /).filter(s => s.trim());
            }
        }

        return steps.map(step => {
            // If it's already an object with the right shape
            if (typeof step === 'object' && step !== null && ('role' in step || 'content' in step)) {
                return {
                    role: step.role || '',
                    conjunction: step.conjunction || '',
                    content: step.content || ''
                };
            }

            // If it's a string, try to parse [Role] Content (Conjunction)
            const str = String(step).trim();
            const regex = /^\[(.*?)\]\s*(.*?)\s*(?:\((.*?)\))?$/;
            const match = str.match(regex);

            if (match) {
                return {
                    role: match[1] || '',
                    content: match[2] || '',
                    conjunction: match[3] || ''
                };
            }

            // Extreme fallback: whole string as content
            return { role: '', conjunction: '', content: str };
        });
    };

    const handleCreateRoom = () => {
        const width = 600;
        const height = 800;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        window.open(
            '/?page=room-edit', // No ID implies Create Mode
            'RoomCreate',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
    };

    const handleEditRoom = (room: Room) => {
        const width = 600;
        const height = 800;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        window.open(
            `/?page=room-edit&id=${room.id}`,
            'RoomEdit',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
    };

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data === 'roomUpdated') {
                loadRooms();
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);



    const handleDeleteRoom = async (id: number) => {
        if (!confirm('정말 이 수업 방을 삭제하시겠습니까?')) return;

        try {
            await deleteRoom(id);
            await loadRooms();
            alert('수업 방이 삭제되었습니다.');
        } catch (error: any) {
            alert('수업 방 삭제 실패: ' + error.message);
        }
    };

    const handleEditQuestion = (q: Question) => {
        setEditingQuestion(q);
        setNewQuestion(q);
        // Use robust parsing for logicFlow
        const steps = safeParseLogicFlow(q.logicFlow);
        setFlowSteps(steps.length > 0 ? steps : [{ role: '', conjunction: '', content: '' }]);
    };

    const handleCancelEdit = () => {
        setEditingQuestion(null);
        setNewQuestion({ examCode: '', targetGrade: '고3', topic: '', logicFlow: '', passage: '' });
        setFlowSteps([{ role: '', conjunction: '', content: '' }]);
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

    const handleDeleteSelectedStudents = async () => {
        if (selectedStudentsForDeletion.length === 0) return;

        if (!confirm(`선택한 ${selectedStudentsForDeletion.length}명의 학생을 삭제하시겠습니까?`)) return;

        try {
            // 선택된 인덱스를 실제 학생 ID로 변환
            const idsToDelete = selectedStudentsForDeletion.map(index => savedStudents[index].id);

            // deleteStudents 함수 import
            const { deleteStudents } = await import('../lib/students');
            await deleteStudents(idsToDelete);

            await loadStudents();
            setSelectedStudentsForDeletion([]);
            alert(`${selectedStudentsForDeletion.length}명의 학생이 삭제되었습니다.`);
        } catch (error: any) {
            alert('학생 삭제 실패: ' + error.message);
        }
    };

    const handleSaveSettings = async () => {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            // 1. Personal Settings
            await updateTeacherSettings(user.id, {
                openai_api_key: apiKey,
                system_prompt: systemPrompt,
                drive_folder_id: driveFolderId,
                google_script_url: googleScriptUrl
            });

            // 2. Global Config (Master Only)
            if (teacherRole === 'master') {
                await updateAppConfig('limit_regular_questions', limitInput);
                await updateAppConfig('login_notice_text', loginNoticeText);
                setMaxQuestionsLimit(Number(limitInput));
            }

            alert('설정이 저장되었습니다.');
        } catch (error: any) {
            alert('설정 저장 실패: ' + error.message);
        }
    };

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

    // --- 비밀번호 재설정 핸들러 ---
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await resetPassword(loginEmail);
            setForgotEmailSent(true);
        } catch (error: any) {
            alert('비밀번호 재설정 이메일 발송 실패: ' + (error.message || '이메일을 확인해주세요.'));
        }
    };

    // --- Login View ---
    if (!isLogin) {
        return (
            <div className="teacher-login-container">
                <div className="teacher-login-box">
                    <div className="teacher-login-header">
                        <div className="teacher-login-icon">
                            <BookOpen style={{ color: 'white', width: '32px', height: '32px' }} />
                        </div>
                        <h1>AI Tutor 사용자</h1>
                        <p>선생님 계정으로 로그인하세요</p>
                    </div>

                    {/* 로그인/회원가입 탭 */}
                    {authMode !== 'forgot' && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                            <button
                                type="button"
                                onClick={() => setAuthMode('login')}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: authMode === 'login' ? '#3b82f6' : '#e5e7eb',
                                    color: authMode === 'login' ? 'white' : '#6b7280',
                                    fontWeight: authMode === 'login' ? '600' : '400',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                로그인
                            </button>
                            <button
                                type="button"
                                onClick={() => setAuthMode('signup')}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: authMode === 'signup' ? '#3b82f6' : '#e5e7eb',
                                    color: authMode === 'signup' ? 'white' : '#6b7280',
                                    fontWeight: authMode === 'signup' ? '600' : '400',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                회원가입
                            </button>
                        </div>
                    )}

                    {/* 비밀번호 찾기 모드 */}
                    {authMode === 'forgot' ? (
                        <div style={{ textAlign: 'center' }}>
                            {forgotEmailSent ? (
                                <div style={{
                                    padding: '24px',
                                    background: '#f0fdf4',
                                    borderRadius: '12px',
                                    border: '1px solid #86efac',
                                    marginBottom: '20px'
                                }}>
                                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>📧</div>
                                    <p style={{ color: '#166534', fontWeight: '600', marginBottom: '8px' }}>이메일이 발송되었습니다!</p>
                                    <p style={{ color: '#15803d', fontSize: '14px' }}>{loginEmail}로 비밀번호 재설정 링크를 보냈습니다. 이메일함을 확인해주세요.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleForgotPassword} className="teacher-login-form">
                                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px', textAlign: 'left' }}>
                                        가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
                                    </p>
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
                                    <button
                                        type="submit"
                                        className="teacher-login-button"
                                        disabled={!loginEmail.trim()}
                                        style={{
                                            background: loginEmail.trim() ? '#3b82f6' : '#e5e7eb',
                                            color: loginEmail.trim() ? 'white' : '#9ca3af',
                                            opacity: loginEmail.trim() ? 1 : 0.6,
                                            cursor: loginEmail.trim() ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.2s',
                                            marginBottom: '12px'
                                        }}
                                    >
                                        재설정 이메일 발송
                                    </button>
                                </form>
                            )}
                            <button
                                type="button"
                                onClick={() => { setAuthMode('login'); setForgotEmailSent(false); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#6b7280',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                ← 로그인으로 돌아가기
                            </button>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="teacher-login-form">
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
                                <button
                                    type="submit"
                                    className="teacher-login-button"
                                    disabled={!loginEmail.trim() || !loginPassword.trim()}
                                    style={{
                                        background: (loginEmail.trim() && loginPassword.trim()) ? '#3b82f6' : '#e5e7eb',
                                        color: (loginEmail.trim() && loginPassword.trim()) ? 'white' : '#9ca3af',
                                        opacity: (loginEmail.trim() && loginPassword.trim()) ? 1 : 0.6,
                                        cursor: (loginEmail.trim() && loginPassword.trim()) ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {authMode === 'login' ? '로그인' : '회원가입'}
                                </button>
                            </form>
                            {/* 비밀번호 찾기 링크 */}
                            {authMode === 'login' && (
                                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setAuthMode('forgot'); setForgotEmailSent(false); }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#6b7280',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        비밀번호를 잊으셨나요?
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* 안내 문구 */}
                    <div style={{
                        marginTop: '28px',
                        padding: '16px 18px',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        fontSize: '13px',
                        color: '#64748b',
                        lineHeight: '1.8'
                    }}>
                        <p style={{ fontWeight: '600', color: '#475569', marginBottom: '8px' }}>📌 서비스 안내</p>
                        <ol style={{ paddingLeft: '18px', margin: 0 }}>
                            {loginNotice.split('\n').filter(line => line.trim() !== '').map((line, idx) => {
                                const limitParts = line.split('{limit}');
                                return (
                                    <li key={idx} style={{ marginBottom: '4px' }}>
                                        {limitParts.map((limitPart, lIdx) => {
                                            const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g;
                                            const emailParts = limitPart.split(emailRegex);

                                            const renderedPart = emailParts.map((part, eIdx) => {
                                                if (part.match(emailRegex)) {
                                                    return (
                                                        <a key={`email-${eIdx}`} href={`mailto:${part}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                                                            {part}
                                                        </a>
                                                    );
                                                }
                                                return part;
                                            });

                                            return (
                                                <React.Fragment key={`limit-${lIdx}`}>
                                                    {renderedPart}
                                                    {lIdx < limitParts.length - 1 && (
                                                        <strong style={{ color: '#3b82f6' }}>
                                                            {loginQuestionLimit !== null ? loginQuestionLimit : '…'}
                                                        </strong>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
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
                    <div
                        className="teacher-sidebar-logo-container"
                        onClick={() => setActiveTab('welcome')}
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}
                    >
                        <div className="teacher-sidebar-logo">
                            <BookOpen style={{ color: 'white', width: '20px', height: '20px' }} />
                        </div>
                        <span className="teacher-sidebar-title">AI Tutor</span>
                    </div>
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
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                {teacherRole === 'master' ? '관리자' : '일반 교사'}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="teacher-button-secondary"
                        style={{
                            width: '100%',
                            marginTop: '12px',
                            padding: '8px',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        <LogOut size={16} />
                        로그아웃
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="teacher-main">

                {/* --- TAB: Welcome --- */}
                {activeTab === 'welcome' && renderWelcome()}

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
                                <div key={room.id} className="teacher-room-card">
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
                                                수업 진행 중 • {room.createdAt ? new Date(room.createdAt).toLocaleString('ko-KR') : '-'}
                                                {room.folderName && <span style={{ marginLeft: '8px', color: '#888' }}>({room.folderName})</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleEditRoom(room)}
                                            className="teacher-button-secondary"
                                            title="수정"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRoom(room.id)}
                                            className="teacher-button-danger"
                                            title="종료(삭제)"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
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
                                {teacherRole === 'regular' && ` (${questions.length}/${maxQuestionsForRegular}개)`}
                            </p>
                        </div>

                        {teacherRole === 'regular' && questions.length >= maxQuestionsForRegular && (
                            <div className="teacher-alert-warning">
                                ⚠️ 일반 교사는 최대 {maxQuestionsForRegular}개까지만 문항을 등록할 수 있습니다.
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
                                    {/* Header with Examples */}
                                    <div style={{ display: 'flex', gap: '8px', paddingLeft: '32px', marginBottom: '-4px' }}>
                                        <div style={{ flex: '1.2', fontSize: '11px', color: '#000', textAlign: 'center' }}>논리적 역할 (필수)<br />ex) 주제, 설명, 결론 등</div>
                                        <div style={{ flex: '1', fontSize: '11px', color: '#000', textAlign: 'center' }}>연결어 (선택)<br />ex) for example, therefore</div>
                                        <div style={{ flex: '2', fontSize: '11px', color: '#000', textAlign: 'center' }}>중심 의미 (필수)</div>
                                        <div style={{ width: '40px' }}></div>
                                    </div>

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

                                            {/* Role */}
                                            <input
                                                type="text"
                                                className="teacher-input-field"
                                                placeholder="역할"
                                                value={step.role}
                                                onChange={(e) => {
                                                    const newSteps = [...flowSteps];
                                                    newSteps[index] = { ...newSteps[index], role: e.target.value };
                                                    setFlowSteps(newSteps);
                                                }}
                                                style={{ flex: '1.2' }}
                                            />

                                            {/* Conjunction */}
                                            <input
                                                type="text"
                                                className="teacher-input-field"
                                                placeholder="연결어"
                                                value={step.conjunction}
                                                onChange={(e) => {
                                                    const newSteps = [...flowSteps];
                                                    newSteps[index] = { ...newSteps[index], conjunction: e.target.value };
                                                    setFlowSteps(newSteps);
                                                }}
                                                style={{ flex: '1' }}
                                            />

                                            {/* Content */}
                                            <input
                                                type="text"
                                                className="teacher-input-field"
                                                placeholder="중심 의미"
                                                value={step.content}
                                                onChange={(e) => {
                                                    const newSteps = [...flowSteps];
                                                    newSteps[index] = { ...newSteps[index], content: e.target.value };
                                                    setFlowSteps(newSteps);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const newSteps = [...flowSteps];
                                                        newSteps.splice(index + 1, 0, { role: '', conjunction: '', content: '' });
                                                        setFlowSteps(newSteps);
                                                    }
                                                }}
                                                style={{ flex: '2' }}
                                            />

                                            <button
                                                onClick={() => {
                                                    const newSteps = flowSteps.filter((_, i) => i !== index);
                                                    setFlowSteps(newSteps.length ? newSteps : [{ role: '', conjunction: '', content: '' }]);
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
                                        onClick={() => setFlowSteps([...flowSteps, { role: '', conjunction: '', content: '' }])}
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
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                {safeParseLogicFlow(q.logicFlow).map((step, i) => (
                                                                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                        <span style={{ fontSize: '11px', color: '#94a3b8', width: '15px' }}>{i + 1}</span>
                                                                        <span style={{
                                                                            fontSize: '11px', background: '#3b82f6', color: 'white',
                                                                            padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'
                                                                        }}>[{step.role || '미지정'}]</span>
                                                                        {step.conjunction && (
                                                                            <span style={{ fontSize: '11px', color: '#64748b' }}>({step.conjunction})</span>
                                                                        )}
                                                                        <span style={{ fontSize: '12px', color: '#1e293b' }}>{step.content}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : ('-')}
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
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuestion(q.id)}
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
                                    <strong>형식:</strong> [학급] [번호] [이름] [역량 (상/중/하)]<br />
                                    (엑셀에서 복사하면 자동으로 탭으로 구분됩니다)
                                </div>
                                <textarea
                                    className="teacher-textarea"
                                    rows={12}
                                    placeholder={`예시:\n3학년 1반\t13번\t김철수\t상\n3학년 1반\t14번\t이영희\t중`}
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
                        <div className="teacher-section-header" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '24px'
                        }}>
                            <div>
                                <h1 className="teacher-section-title">설정</h1>
                                <p className="teacher-section-subtitle">시스템 설정을 관리하세요.</p>
                            </div>
                            <button onClick={handleSaveSettings} className="teacher-button-primary">
                                <Save size={18} /> 설정 저장
                            </button>
                        </div>


                        {/* Master Config Section */}
                        {teacherRole === 'master' && (
                            <>
                                <div className="teacher-content-card" style={{ border: '2px solid #3b82f6', background: '#eff6ff' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#1e40af' }}>
                                        🛠️ 시스템 설정 (관리자 전용)
                                    </h3>
                                    <div className="teacher-input-group">
                                        <label className="teacher-input-label">일반 교사 문항 등록 제한 수</label>
                                        <input
                                            type="number"
                                            className="teacher-input-field"
                                            value={limitInput}
                                            onChange={e => setLimitInput(e.target.value)}
                                            placeholder="50"
                                        />
                                        <div className="teacher-alert-info">
                                            모든 일반 교사에게 적용되는 문항 등록 최대 개수입니다.
                                        </div>
                                    </div>

                                    <div className="teacher-input-group" style={{ marginTop: '20px' }}>
                                        <label className="teacher-input-label">로그인 페이지 안내 문구</label>
                                        <textarea
                                            className="teacher-textarea"
                                            rows={5}
                                            value={loginNoticeText}
                                            onChange={e => setLoginNoticeText(e.target.value)}
                                            placeholder="안내 문구를 입력하세요. {limit}를 입력하면 '일반 교사 문항 등록 제한 수'로 자동 변환됩니다."
                                            style={{ lineHeight: '1.6' }}
                                        />
                                        <div className="teacher-alert-info" style={{ marginTop: '8px' }}>
                                            줄바꿈(Enter) 시 번호 매기기 목록(1, 2, 3...)으로 표시됩니다.
                                            <br />문구 내에 <strong>{`{limit}`}</strong>를 입력하면 위의 '문항 등록 제한 수' 값으로 자동 치환됩니다.
                                            <br />이메일 주소를 입력하면 자동으로 이메일 보내기 링크가 생성됩니다.
                                        </div>
                                    </div>
                                </div>

                                {/* Teacher Management Table */}
                                <div className="teacher-content-card" style={{ border: '2px solid #3b82f6', background: '#eff6ff' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#1e40af' }}>
                                        👥 교사 회원 관리
                                    </h3>
                                    {teacherList.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: '#6b7280', padding: '24px' }}>
                                            등록된 일반 교사가 없습니다.
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                                <thead>
                                                    <tr style={{ background: '#dbeafe', borderBottom: '2px solid #93c5fd' }}>
                                                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#1e40af', width: '30%' }}>이메일</th>
                                                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#1e40af', width: '15%' }}>상태</th>
                                                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#1e40af', width: '25%' }}>문항 제한수</th>
                                                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#1e40af', width: '30%' }}>관리</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {teacherList.map((t) => (
                                                        <tr key={t.id} style={{ borderBottom: '1px solid #e5e7eb', background: t.is_active ? 'white' : '#fef2f2' }}>
                                                            <td style={{ padding: '10px 12px', color: t.is_active ? '#222' : '#9ca3af' }}>
                                                                {t.email}
                                                                {!t.is_active && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#ef4444' }}>(중지됨)</span>}
                                                            </td>
                                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    padding: '2px 10px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '12px',
                                                                    fontWeight: '600',
                                                                    background: t.is_active ? '#dcfce7' : '#fee2e2',
                                                                    color: t.is_active ? '#166534' : '#991b1b'
                                                                }}>
                                                                    {t.is_active ? '✅ 활성' : '⛔ 중지'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                                    <input
                                                                        type="number"
                                                                        style={{
                                                                            width: '70px',
                                                                            padding: '4px 8px',
                                                                            border: '1px solid #d1d5db',
                                                                            borderRadius: '6px',
                                                                            textAlign: 'center',
                                                                            fontSize: '13px'
                                                                        }}
                                                                        defaultValue={t.max_questions ?? maxQuestionsLimit}
                                                                        onBlur={(e) => {
                                                                            const newVal = e.target.value;
                                                                            const currentVal = t.max_questions;
                                                                            const defaultVal = maxQuestionsLimit;
                                                                            if (Number(newVal) !== (currentVal ?? defaultVal)) {
                                                                                handleUpdateTeacherLimit(t, newVal);
                                                                            }
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                (e.target as HTMLInputElement).blur();
                                                                            }
                                                                        }}
                                                                    />
                                                                    {t.max_questions === null && (
                                                                        <span style={{ fontSize: '11px', color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>기본값</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                                    <button
                                                                        onClick={() => handleToggleTeacherActive(t)}
                                                                        style={{
                                                                            padding: '4px 12px',
                                                                            border: 'none',
                                                                            borderRadius: '6px',
                                                                            fontSize: '12px',
                                                                            fontWeight: '500',
                                                                            cursor: 'pointer',
                                                                            background: t.is_active ? '#fef3c7' : '#dcfce7',
                                                                            color: t.is_active ? '#92400e' : '#166534',
                                                                            transition: 'all 0.2s',
                                                                            whiteSpace: 'nowrap'
                                                                        }}
                                                                    >
                                                                        {t.is_active ? '🚫 중지' : '✅ 활성화'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteTeacher(t)}
                                                                        style={{
                                                                            padding: '4px 12px',
                                                                            border: 'none',
                                                                            borderRadius: '6px',
                                                                            fontSize: '12px',
                                                                            fontWeight: '500',
                                                                            cursor: 'pointer',
                                                                            background: '#fee2e2',
                                                                            color: '#991b1b',
                                                                            transition: 'all 0.2s',
                                                                            whiteSpace: 'nowrap'
                                                                        }}
                                                                    >
                                                                        🗑️ 삭제
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* API Key */}
                        <div className="teacher-content-card">
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                                🔑 OpenAI API 키 (필수 사항)
                            </h3>
                            <div className="teacher-input-group">
                                <label className="teacher-input-label">API 키</label>
                                <input
                                    type="password"
                                    className="teacher-input-field"
                                    placeholder="sk-..."
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                />
                                <div className="teacher-alert-info">
                                    🔒 API 키는 암호화되어 저장되며, 본인만 접근 가능합니다.
                                </div>
                            </div>
                        </div>

                        {/* Google Drive Integration */}
                        <div className="teacher-content-card" style={{ opacity: teacherRole === 'master' ? 1 : 0.6 }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>📁 구글 드라이브 연동 (선택 사항)</span>
                                {teacherRole !== 'master' && (
                                    <span style={{ fontSize: '12px', background: '#e2e8f0', color: '#64748b', padding: '2px 8px', borderRadius: '12px', fontWeight: 'normal' }}>준비 중</span>
                                )}
                            </h3>

                            <div className="teacher-input-group">
                                <label className="teacher-input-label">Google Apps Script URL (웹 앱 URL)</label>
                                <input
                                    type="text"
                                    className="teacher-input-field"
                                    placeholder="https://script.google.com/macros/s/.../exec"
                                    value={googleScriptUrl}
                                    onChange={e => setGoogleScriptUrl(e.target.value)}
                                    disabled={teacherRole !== 'master'}
                                    style={{ cursor: teacherRole !== 'master' ? 'not-allowed' : 'text', background: teacherRole !== 'master' ? '#f1f5f9' : 'white' }}
                                />
                                <div className="teacher-alert-info">
                                    대화 내용을 구글 드라이브에 저장하려면, 본인 구글 계정으로 Apps Script를 생성하고 웹 앱으로 배포한 URL을 입력하세요.
                                </div>
                            </div>

                            <div className="teacher-input-group">
                                <label className="teacher-input-label">구글 드라이브 폴더 ID</label>
                                <input
                                    type="text"
                                    className="teacher-input-field"
                                    placeholder="1AbC2DeF3GhI4JkL5MnO6PqR7StU8VwX9YzA"
                                    value={driveFolderId}
                                    onChange={e => setDriveFolderId(e.target.value)}
                                    disabled={teacherRole !== 'master'}
                                    style={{ cursor: teacherRole !== 'master' ? 'not-allowed' : 'text', background: teacherRole !== 'master' ? '#f1f5f9' : 'white' }}
                                />
                                <div className="teacher-alert-info">
                                    대화 내용이 저장될 폴더의 ID입니다. (URL의 folders/ 뒷부분)
                                </div>
                            </div>

                            {teacherRole !== 'master' && (
                                <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                                    💡 일반 교사분들을 위한 <strong>구글 드라이브 간편 연동 기능</strong>이 곧 지원될 예정입니다.
                                </div>
                            )}
                        </div>

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
                                    value={systemPrompt || ''}
                                    onChange={e => setSystemPrompt(e.target.value)}
                                />
                                <div className="teacher-alert-info">
                                    모든 대화에 기본적으로 적용되는 AI의 성격입니다.
                                </div>
                            </div>
                        </div>


                    </div>
                )}

            </main>


        </div >
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
