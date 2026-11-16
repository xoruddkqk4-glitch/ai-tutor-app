import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    LayoutDashboard, Users, BookOpen, Settings, Plus, Save,
    Trash2, Upload, FileText, CheckCircle, Play, Pause, LogOut, Edit,
    Search, Tag, X, RotateCcw
} from 'lucide-react';
import type { Question, Room, LogicFlowStep } from '../types';
import { signIn, signUp, signOut, getCurrentUser, resetPassword } from '../lib/auth';
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from '../lib/questions';
import { getStudents, createStudents, deleteStudents, type Student } from '../lib/students';
import { getRooms, deleteRoom, toggleRoomStatus } from '../lib/rooms';


import { getTeacherSettings, updateTeacherSettings, getAppConfig, updateAppConfig, getAllTeachers, toggleTeacherActive, updateTeacherMaxQuestions, deleteTeacher, type TeacherRecord } from '../lib/settings';
import { safeParseLogicFlow, normalizeFlowStepsForSave, isTextbookQuestion } from '../lib/logic-flow';
import {
    PRIMARY_QUESTION_TAGS,
    SECONDARY_QUESTION_TAGS,
    GRADE_PRESETS,
    MONTH_PRESETS,
    getYearPresets,
    normalizeYear,
    normalizeGrade,
    normalizeMonth,
    normalizeSourceNumber,
    normalizeTags,
    getTagCategory,
    parseQuestionSource,
    formatSourceSummary,
    matchesQuestionNumberFilter,
    loadSavedCustomTags,
    saveCustomTagsToStorage,
} from '../lib/question-meta';
import { getErrorMessage } from '../lib/errors';

type TeacherRole = 'master' | 'regular';

const emptyQuestionForm = (): Partial<Question> => ({
    examCode: '',
    targetGrade: '',
    sourceYear: '',
    sourceGrade: '',
    sourceMonth: '',
    sourceNumber: '',
    tags: [],
    topic: '',
    logicFlow: '',
    passage: '',
});

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

    const [newQuestion, setNewQuestion] = useState<Partial<Question>>(emptyQuestionForm);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [passageType, setPassageType] = useState<'csat' | 'textbook'>('csat');
    const [customYearMode, setCustomYearMode] = useState(false);
    const [customGradeMode, setCustomGradeMode] = useState(false);
    const [customMonthMode, setCustomMonthMode] = useState(false);
    const [customTagInput, setCustomTagInput] = useState('');
    const [customTagTick, setCustomTagTick] = useState(0);

    // Materials Search & Filter States
    const [filterYear, setFilterYear] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterSourceNumber, setFilterSourceNumber] = useState('');
    const [filterExamCode, setFilterExamCode] = useState('');
    const [filterKeyword, setFilterKeyword] = useState('');
    const [filterPassageType, setFilterPassageType] = useState<'all' | 'csat' | 'textbook'>('all');
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [filterTagMode, setFilterTagMode] = useState<'and' | 'or'>('and');

    const formCardRef = useRef<HTMLDivElement>(null);

    // Settings
    const [apiKey, setApiKey] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('너는 친절하고 꼼꼼한 고등학교 선생님이야. 학생의 수준에 맞춰 설명해줘.');
    const [driveFolderId, setDriveFolderId] = useState('');
    const [googleScriptUrl, setGoogleScriptUrl] = useState('');
    const [maxQuestionsLimit, setMaxQuestionsLimit] = useState(50);
    const [individualMaxQuestions, setIndividualMaxQuestions] = useState<number | null>(null);
    const [limitInput, setLimitInput] = useState('50');
    const [loginNoticeText, setLoginNoticeText] = useState(`회원가입 후 별도의 승인 절차 없이 바로 서비스를 이용하실 수 있습니다.
서버 관리 문제로 교사 1인당 최대 {limit}문항까지 업로드하실 수 있습니다.
서비스가 아직은 불안정하여, 예기치 않게 이용이 제한될 수 있는 점 양해 부탁드립니다.
기타 문의사항은 ghinokr@gmail.com으로 이메일을 보내주시면 안내해 드리겠습니다.`);
    const maxQuestionsForRegular = individualMaxQuestions ?? maxQuestionsLimit;

    // Room Creation: Now handled via new window (RoomEditWindow)
    // Removed old modal state

    // Student Table Sorting and Selection
    const [sortColumn, setSortColumn] = useState<'class' | 'number' | 'name' | 'competency'>('class');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [selectedStudentsForDeletion, setSelectedStudentsForDeletion] = useState<number[]>([]);

    // Logic Flow Steps
    const emptyFlowStep = (): LogicFlowStep => ({ macroLabel: '', role: '', conjunction: '', content: '' });
    const [flowSteps, setFlowSteps] = useState<LogicFlowStep[]>([emptyFlowStep()]);

    // Teacher Management (Master Only)
    const [teacherList, setTeacherList] = useState<TeacherRecord[]>([]);

    // --- Handlers ---

    // 로그인 페이지용 문항 제한수 및 안내문구 조회 (항상 최신 데이터를 가져오도록 함수화)
    const loadLoginConfig = async () => {
        console.log('[loadLoginConfig] Fetching fresh config for login page...');
        try {
            const limit = await getAppConfig('limit_regular_questions');
            if (limit) {
                setLoginQuestionLimit(Number(limit));
            } else {
                setLoginQuestionLimit(50); // 기본값 설정
            }

            const notice = await getAppConfig('login_notice_text');
            if (notice) {
                setLoginNotice(notice);
                setLoginNoticeText(notice); // 에디터용 데이터도 동기화
            } else {
                const defaultNotice = `회원가입 후 별도의 승인 절차 없이 바로 서비스를 이용하실 수 있습니다.\n서버 관리 문제로 교사 1인당 최대 {limit}문항까지 업로드하실 수 있습니다.\n서비스가 아직은 불안정하여, 예기치 않게 이용이 제한될 수 있는 점 양해 부탁드립니다.\n기타 문의사항은 ghinokr@gmail.com으로 이메일을 보내주시면 안내해 드리겠습니다.`;
                setLoginNotice(defaultNotice);
                setLoginNoticeText(defaultNotice);
            }
        } catch (error) {
            console.error('[loadLoginConfig] Error fetching config:', error);
        }
    };

    // 문항 로드
    const loadQuestions = async () => {
        try {
            const data = await getQuestions();
            setQuestions(data);
        } catch (error: unknown) {
            console.error('문항 로드 실패:', error);
            alert('문항을 불러오는데 실패했습니다: ' + getErrorMessage(error));
        }
    };

    // 수업 방 로드
    const loadRooms = async () => {
        try {
            const data = await getRooms();
            setRooms(data);
        } catch (error: unknown) {
            console.error('수업 방 로드 실패:', error);
            // alert('수업 방을 불러오는데 실패했습니다: ' + getErrorMessage(error));
        }
    };

    // 학생 로드
    const loadStudents = async () => {
        try {
            const data = await getStudents();
            setSavedStudents(data);
            setSelectedStudentsForDeletion(prev => prev.filter(id => data.some(s => s.id === id)));
        } catch (error: unknown) {
            console.error('학생 로드 실패:', error);
            alert('학생을 불러오는데 실패했습니다: ' + getErrorMessage(error));
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
            setIndividualMaxQuestions(data.max_questions ?? null);
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
        } catch (error: unknown) {
            console.error('교사 목록 로드 실패:', error);
        }
    };

    useEffect(() => {
        let cancelled = false;
        void Promise.resolve().then(() => {
            if (!cancelled) {
                void loadLoginConfig();
            }
        });
        return () => {
            cancelled = true;
        };
    }, [isLogin]);

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
            } else {
                console.log('[SessionRestore] No user found');
            }
        }).catch(err => {
            console.error('세션 복원 실패:', err);
        });
    }, []);

    // 탭 전환 시 설정 정보 최신화
    useEffect(() => {
        if (activeTab === 'settings' && isLogin && teacherId) {
            let cancelled = false;
            void Promise.resolve().then(() => {
                if (cancelled) return;
                void loadSettings(teacherId);
                void loadAppConfig();
                if (teacherRole === 'master') {
                    void loadTeacherList();
                }
            });
            return () => {
                cancelled = true;
            };
        }
    }, [activeTab, isLogin, teacherId, teacherRole]);

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
        } catch (error: unknown) {
            alert('로그인 실패: ' + getErrorMessage(error, '이메일 또는 비밀번호를 확인하세요'));
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
        } catch (error: unknown) {
            alert('회원가입 실패: ' + getErrorMessage(error, '이메일 또는 비밀번호를 확인하세요'));
        }
    };

    const yearPresets = useMemo(() => getYearPresets(), []);

    const storedCustomTags = useMemo(() => {
        void customTagTick;
        return loadSavedCustomTags(teacherId);
    }, [teacherId, customTagTick]);

    const customTagPool = useMemo(() => {
        const merged: string[] = [...storedCustomTags];
        const pushIfCustom = (tag: string) => {
            if (getTagCategory(tag) === 'custom' && !merged.includes(tag)) {
                merged.push(tag);
            }
        };
        for (const q of questions) {
            for (const tag of normalizeTags(q.tags)) {
                pushIfCustom(tag);
            }
        }
        for (const tag of normalizeTags(newQuestion.tags)) {
            pushIfCustom(tag);
        }
        return merged;
    }, [storedCustomTags, questions, newQuestion.tags]);

    const questionEntries = useMemo(() => {
        return questions.map((q) => {
            const source = parseQuestionSource(q);
            const tags = normalizeTags(q.tags);
            const isTextbook = isTextbookQuestion(q);
            return { q, source, tags, isTextbook };
        });
    }, [questions]);

    const {
        yearCounts,
        gradeCounts,
        monthCounts,
        tagCounts,
        availableFilterYears,
        availableFilterGrades,
        availableFilterMonths,
        filterCustomTags,
    } = useMemo(() => {
        const yCounts = new Map<string, number>();
        const gCounts = new Map<string, number>();
        const mCounts = new Map<string, number>();
        const tCounts = new Map<string, number>();

        for (const { source, tags } of questionEntries) {
            if (source.sourceYear) yCounts.set(source.sourceYear, (yCounts.get(source.sourceYear) ?? 0) + 1);
            if (source.sourceGrade) gCounts.set(source.sourceGrade, (gCounts.get(source.sourceGrade) ?? 0) + 1);
            if (source.sourceMonth) mCounts.set(source.sourceMonth, (mCounts.get(source.sourceMonth) ?? 0) + 1);
            for (const tag of tags) {
                tCounts.set(tag, (tCounts.get(tag) ?? 0) + 1);
            }
        }

        const yearSet = new Set<string>([...yearPresets, ...yCounts.keys()]);
        const years = Array.from(yearSet).sort((a, b) => {
            const aNum = /^\d{4}$/.test(a) ? Number(a) : -1;
            const bNum = /^\d{4}$/.test(b) ? Number(b) : -1;
            if (aNum !== bNum) return bNum - aNum;
            return a.localeCompare(b, 'ko');
        });

        const gradeSet = new Set<string>([...GRADE_PRESETS, ...gCounts.keys()]);
        const grades = Array.from(gradeSet);

        const monthSet = new Set<string>([...MONTH_PRESETS, ...mCounts.keys()]);
        const months = Array.from(monthSet);

        const customSet = new Set<string>(storedCustomTags);
        for (const tag of tCounts.keys()) {
            if (getTagCategory(tag) === 'custom') customSet.add(tag);
        }
        for (const tag of filterTags) {
            if (getTagCategory(tag) === 'custom') customSet.add(tag);
        }

        return {
            yearCounts: yCounts,
            gradeCounts: gCounts,
            monthCounts: mCounts,
            tagCounts: tCounts,
            availableFilterYears: years,
            availableFilterGrades: grades,
            availableFilterMonths: months,
            filterCustomTags: Array.from(customSet),
        };
    }, [questionEntries, yearPresets, storedCustomTags, filterTags]);

    const filteredEntries = useMemo(() => {
        const kw = filterKeyword.trim().toLowerCase();
        return questionEntries.filter(({ q, source, tags, isTextbook }) => {
            if (filterPassageType === 'csat' && isTextbook) return false;
            if (filterPassageType === 'textbook' && !isTextbook) return false;
            if (filterYear && source.sourceYear !== filterYear) return false;
            if (filterGrade && source.sourceGrade !== filterGrade) return false;
            if (filterMonth && source.sourceMonth !== filterMonth) return false;
            if (filterSourceNumber.trim() && !matchesQuestionNumberFilter(source.sourceNumber, filterSourceNumber)) {
                return false;
            }
            if (filterExamCode.trim() && !matchesQuestionNumberFilter(q.examCode, filterExamCode)) {
                return false;
            }
            if (filterTags.length > 0) {
                if (filterTagMode === 'and') {
                    if (!filterTags.every(tag => tags.includes(tag))) return false;
                } else {
                    if (!filterTags.some(tag => tags.includes(tag))) return false;
                }
            }
            if (kw) {
                const haystack = [
                    q.examCode,
                    q.targetGrade ?? '',
                    source.sourceYear,
                    source.sourceGrade,
                    source.sourceMonth,
                    source.sourceNumber,
                    q.topic,
                    q.passage,
                    ...tags,
                ]
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(kw)) return false;
            }
            return true;
        });
    }, [
        questionEntries,
        filterPassageType,
        filterYear,
        filterGrade,
        filterMonth,
        filterSourceNumber,
        filterExamCode,
        filterTags,
        filterTagMode,
        filterKeyword,
    ]);

    const hasActiveQuestionFilter = Boolean(
        filterYear ||
        filterGrade ||
        filterMonth ||
        filterSourceNumber.trim() ||
        filterExamCode.trim() ||
        filterKeyword.trim() ||
        filterPassageType !== 'all' ||
        filterTags.length > 0
    );

    const resetQuestionForm = () => {
        setEditingQuestion(null);
        setNewQuestion(emptyQuestionForm());
        setFlowSteps([emptyFlowStep()]);
        setPassageType('csat');
        setCustomYearMode(false);
        setCustomGradeMode(false);
        setCustomMonthMode(false);
        setCustomTagInput('');
    };

    const resetQuestionFilters = () => {
        setFilterYear('');
        setFilterGrade('');
        setFilterMonth('');
        setFilterSourceNumber('');
        setFilterExamCode('');
        setFilterKeyword('');
        setFilterPassageType('all');
        setFilterTags([]);
    };

    const handleToggleFormTag = (tag: string) => {
        const current = normalizeTags(newQuestion.tags);
        const next = current.includes(tag)
            ? current.filter(t => t !== tag)
            : [...current, tag];
        setNewQuestion(prev => ({ ...prev, tags: next }));
    };

    const handleAddCustomTags = () => {
        const parsed = normalizeTags(customTagInput);
        if (parsed.length === 0) return;

        const currentTags = normalizeTags(newQuestion.tags);
        const nextTags = normalizeTags([...currentTags, ...parsed]);
        setNewQuestion(prev => ({ ...prev, tags: nextTags }));

        const newCustom = parsed.filter(t => getTagCategory(t) === 'custom');
        if (newCustom.length > 0) {
            saveCustomTagsToStorage(teacherId, [...storedCustomTags, ...newCustom]);
            setCustomTagTick(t => t + 1);
        }
        setCustomTagInput('');
    };

    const handleRemoveCustomTag = (tag: string) => {
        const nextStored = storedCustomTags.filter(t => t !== tag);
        saveCustomTagsToStorage(teacherId, nextStored);
        setCustomTagTick(t => t + 1);
        setNewQuestion(prev => ({
            ...prev,
            tags: normalizeTags(prev.tags).filter(t => t !== tag),
        }));
    };

    const handleToggleFilterTag = (tag: string) => {
        setFilterTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
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
            setIndividualMaxQuestions(null);

            // Clear data
            setRooms([]);
            setQuestions([]);
            setSavedStudents([]);
            setParsedStudents([]);
            setSelectedStudentsForDeletion([]);
            setBulkStudentText('');
            setTeacherList([]);

            // Clear editing & filter states
            resetQuestionForm();
            resetQuestionFilters();
            setFilterTagMode('and');

            // Reset Limits
            setMaxQuestionsLimit(50);
            setLimitInput('50');

        } catch (error: unknown) {
            alert('로그아웃 실패: ' + getErrorMessage(error));
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
        } catch (error: unknown) {
            alert('교사 상태 변경 실패: ' + getErrorMessage(error));
        }
    };

    // 교사 삭제
    const handleDeleteTeacher = async (teacher: TeacherRecord) => {
        if (!confirm(`정말 ${teacher.email} 교사를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

        try {
            await deleteTeacher(teacher.id);
            await loadTeacherList();
            alert(`${teacher.email} 교사가 삭제되었습니다.`);
        } catch (error: unknown) {
            alert('교사 삭제 실패: ' + getErrorMessage(error));
        }
    };

    // 교사 개별 문항 제한수 수정
    const handleUpdateTeacherLimit = async (teacher: TeacherRecord, value: string) => {
        const numValue = value.trim() === '' ? null : Number(value);
        try {
            await updateTeacherMaxQuestions(teacher.id, numValue);
            await loadTeacherList();
        } catch (error: unknown) {
            alert('문항 제한수 수정 실패: ' + getErrorMessage(error));
        }
    };

    // 학생 명단 파싱 (탭/공백/콤마 구분)
    const handleParseStudents = () => {
        const lines = bulkStudentText.split('\n').filter(line => line.trim() !== '');
        const parsed = lines
            .map((line) => {
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
            })
            .filter((item): item is { class: string; number: string; name: string; competency: string } => item !== null);

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
        } catch (error: unknown) {
            alert('학생 등록 실패: ' + getErrorMessage(error));
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

        const examCode = (newQuestion.examCode || '').trim();
        if (!examCode || !newQuestion.passage?.trim()) {
            alert('문항 번호와 본문은 필수입니다.');
            return;
        }

        const logicFlowSaved = passageType === 'textbook' ? [] : normalizeFlowStepsForSave(flowSteps);
        if (passageType === 'csat' && logicFlowSaved.length === 0) {
            alert('수능형 지문: 논리 흐름 최소 1단계가 필요합니다. 각 단계마다 큰 범주와 중심 의미는 필수이며, 작은 범주는 선택입니다.');
            return;
        }

        const sourceYear = normalizeYear(newQuestion.sourceYear);
        const sourceGrade = normalizeGrade(newQuestion.sourceGrade);
        const sourceMonth = normalizeMonth(newQuestion.sourceMonth);
        const sourceNumber = normalizeSourceNumber(newQuestion.sourceNumber);
        const targetGrade = formatSourceSummary({ sourceYear, sourceGrade, sourceMonth, sourceNumber });
        const tags = normalizeTags(newQuestion.tags);

        try {
            const q: Omit<Question, 'id'> = {
                examCode,
                targetGrade,
                sourceYear,
                sourceGrade,
                sourceMonth,
                sourceNumber,
                tags,
                topic: passageType === 'textbook' ? '' : (newQuestion.topic || ''),
                logicFlow: logicFlowSaved,
                passage: newQuestion.passage,
                passageType: passageType,
            };

            await createQuestion(q);
            await loadQuestions(); // 문항 목록 새로고침
            resetQuestionForm();
            alert('문항이 추가되었습니다.');
        } catch (error: unknown) {
            alert('문항 추가 실패: ' + getErrorMessage(error));
        }
    };

    const handleUpdateQuestion = async () => {
        if (!editingQuestion) return;

        const examCode = (newQuestion.examCode || '').trim();
        if (!examCode || !newQuestion.passage?.trim()) {
            alert('문항 번호와 본문은 필수입니다.');
            return;
        }

        const logicFlowSaved = passageType === 'textbook' ? [] : normalizeFlowStepsForSave(flowSteps);
        if (passageType === 'csat' && logicFlowSaved.length === 0) {
            alert('수능형 지문: 논리 흐름 최소 1단계가 필요합니다. 각 단계마다 큰 범주와 중심 의미는 필수이며, 작은 범주는 선택입니다.');
            return;
        }

        const sourceYear = normalizeYear(newQuestion.sourceYear);
        const sourceGrade = normalizeGrade(newQuestion.sourceGrade);
        const sourceMonth = normalizeMonth(newQuestion.sourceMonth);
        const sourceNumber = normalizeSourceNumber(newQuestion.sourceNumber);
        const targetGrade = formatSourceSummary({ sourceYear, sourceGrade, sourceMonth, sourceNumber });
        const tags = normalizeTags(newQuestion.tags);

        try {
            const updates: Partial<Omit<Question, 'id'>> = {
                examCode,
                targetGrade,
                sourceYear,
                sourceGrade,
                sourceMonth,
                sourceNumber,
                tags,
                topic: passageType === 'textbook' ? '' : (newQuestion.topic || ''),
                logicFlow: logicFlowSaved,
                passage: newQuestion.passage,
                passageType: passageType,
            };

            await updateQuestion(editingQuestion.id, updates);
            await loadQuestions();
            resetQuestionForm();
            alert('문항이 수정되었습니다.');
        } catch (error: unknown) {
            alert('문항 수정 실패: ' + getErrorMessage(error));
        }
    };

    const handleDeleteQuestion = async (id: number) => {
        if (!confirm('정말 이 문항을 삭제하시겠습니까?')) return;

        try {
            await deleteQuestion(id);
            await loadQuestions();
            alert('문항이 삭제되었습니다.');
        } catch (error: unknown) {
            alert('문항 삭제 실패: ' + getErrorMessage(error));
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
            if (event.origin !== window.location.origin) return;
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
        } catch (error: unknown) {
            alert('수업 방 삭제 실패: ' + getErrorMessage(error));
        }
    };

    const handleToggleRoomActive = async (room: Room) => {
        try {
            await toggleRoomStatus(room.id, !room.isActive);
            await loadRooms();
        } catch (error: unknown) {
            alert('수업 방 상태 변경 실패: ' + getErrorMessage(error));
        }
    };

    const handleEditQuestion = (q: Question) => {
        const parsed = parseQuestionSource(q);
        const tags = normalizeTags(q.tags);
        setEditingQuestion(q);
        setNewQuestion({
            ...q,
            examCode: q.examCode,
            sourceYear: parsed.sourceYear,
            sourceGrade: parsed.sourceGrade,
            sourceMonth: parsed.sourceMonth,
            sourceNumber: parsed.sourceNumber,
            tags,
        });
        setCustomYearMode(Boolean(parsed.sourceYear && !yearPresets.includes(parsed.sourceYear)));
        setCustomGradeMode(Boolean(parsed.sourceGrade && !(GRADE_PRESETS as readonly string[]).includes(parsed.sourceGrade)));
        setCustomMonthMode(Boolean(parsed.sourceMonth && !(MONTH_PRESETS as readonly string[]).includes(parsed.sourceMonth)));
        setCustomTagInput('');

        // Use robust parsing for logicFlow
        const steps = safeParseLogicFlow(q.logicFlow);
        setFlowSteps(steps.length > 0 ? steps.map(s => ({ ...s, macroLabel: s.macroLabel ?? '' })) : [emptyFlowStep()]);
        setPassageType(isTextbookQuestion(q) ? 'textbook' : 'csat');
        formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleCancelEdit = () => {
        resetQuestionForm();
    };

    const handleSortColumn = (column: 'class' | 'number' | 'name' | 'competency') => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const handleToggleStudentSelection = (studentId: number) => {
        setSelectedStudentsForDeletion(prev =>
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const handleToggleAllStudents = () => {
        if (selectedStudentsForDeletion.length === savedStudents.length) {
            setSelectedStudentsForDeletion([]);
        } else {
            setSelectedStudentsForDeletion(savedStudents.map(s => s.id));
        }
    };

    const handleDeleteSelectedStudents = async () => {
        if (selectedStudentsForDeletion.length === 0) return;

        if (!confirm(`선택한 ${selectedStudentsForDeletion.length}명의 학생을 삭제하시겠습니까?`)) return;

        try {
            const count = selectedStudentsForDeletion.length;
            await deleteStudents(selectedStudentsForDeletion);

            await loadStudents();
            setSelectedStudentsForDeletion([]);
            alert(`${count}명의 학생이 삭제되었습니다.`);
        } catch (error: unknown) {
            alert('학생 삭제 실패: ' + getErrorMessage(error));
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
        } catch (error: unknown) {
            alert('설정 저장 실패: ' + getErrorMessage(error));
        }
    };

    const sortedStudents = [...savedStudents].sort((a, b) => {
        if (sortColumn === 'number') {
            const aNum = parseInt(String(a.number), 10) || 0;
            const bNum = parseInt(String(b.number), 10) || 0;
            if (aNum < bNum) return sortDirection === 'asc' ? -1 : 1;
            if (aNum > bNum) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        }

        const aStr = String(a[sortColumn] ?? '');
        const bStr = String(b[sortColumn] ?? '');
        const cmp = aStr.localeCompare(bStr, 'ko');
        return sortDirection === 'asc' ? cmp : -cmp;
    });

    // --- 비밀번호 재설정 핸들러 ---
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await resetPassword(loginEmail);
            setForgotEmailSent(true);
        } catch (error: unknown) {
            alert('비밀번호 재설정 이메일 발송 실패: ' + getErrorMessage(error, '이메일을 확인해주세요.'));
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
                                        <div
                                            className="teacher-room-code"
                                            style={{
                                                background: room.isActive ? undefined : '#f1f5f9',
                                                color: room.isActive ? undefined : '#64748b'
                                            }}
                                        >
                                            {room.code}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#222', marginBottom: '4px' }}>
                                                {room.className}
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    background: room.isActive ? '#10b981' : '#f59e0b',
                                                    borderRadius: '50%'
                                                }}></span>
                                                {room.isActive ? '수업 진행 중' : '일시 중지됨'} • {room.createdAt ? new Date(room.createdAt).toLocaleString('ko-KR') : '-'}
                                                {room.folderName && <span style={{ marginLeft: '8px', color: '#888' }}>({room.folderName})</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleToggleRoomActive(room)}
                                            className="teacher-button-secondary"
                                            style={{ padding: '8px 12px', fontSize: '12px' }}
                                            title={room.isActive ? '일시 중지' : '수업 재개'}
                                        >
                                            {room.isActive ? <><Pause size={15} /> 일시중지</> : <><Play size={15} /> 재개</>}
                                        </button>
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
                        <div className="teacher-content-card" ref={formCardRef}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                                    {editingQuestion ? '문항 수정' : '새 문항 추가'}
                                </h2>
                                <div style={{
                                    display: 'flex',
                                    background: '#f1f5f9',
                                    padding: '4px',
                                    borderRadius: '10px',
                                    gap: '4px',
                                    border: '1px solid #cbd5e1'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => setPassageType('csat')}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '7px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: passageType === 'csat' ? '#2563eb' : 'transparent',
                                            color: passageType === 'csat' ? 'white' : '#64748b',
                                            boxShadow: passageType === 'csat' ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none'
                                        }}
                                    >
                                        수능형 지문
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPassageType('textbook')}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '7px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: passageType === 'textbook' ? '#2563eb' : 'transparent',
                                            color: passageType === 'textbook' ? 'white' : '#64748b',
                                            boxShadow: passageType === 'textbook' ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none'
                                        }}
                                    >
                                        교과서 지문
                                    </button>
                                </div>
                            </div>

                            <div className="teacher-input-group">
                                <label className="teacher-input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>문항 번호 <strong style={{ color: '#ef4444' }}>*</strong></span>
                                    <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#64748b' }}>
                                        (수업을 위한 문항 번호)
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    className="teacher-input-field"
                                    placeholder="예: 2024-1학기-64번"
                                    value={newQuestion.examCode || ''}
                                    onChange={e => setNewQuestion({ ...newQuestion, examCode: e.target.value })}
                                />
                            </div>

                            <div className="teacher-input-group">
                                <label className="teacher-input-label">출처 (년도 · 학년 · 월 · 문항 번호)</label>
                                <div className="teacher-source-grid">
                                    <div className="teacher-source-field">
                                        <span className="teacher-source-sublabel">년도</span>
                                        {customYearMode ? (
                                            <div className="teacher-custom-input-wrap">
                                                <input
                                                    type="text"
                                                    className="teacher-input-field"
                                                    placeholder="예: 2025"
                                                    value={newQuestion.sourceYear || ''}
                                                    onChange={e => setNewQuestion({ ...newQuestion, sourceYear: e.target.value })}
                                                />
                                                <button
                                                    type="button"
                                                    className="teacher-inline-switch-btn"
                                                    onClick={() => {
                                                        setCustomYearMode(false);
                                                        if (newQuestion.sourceYear && !yearPresets.includes(normalizeYear(newQuestion.sourceYear))) {
                                                            setNewQuestion({ ...newQuestion, sourceYear: '' });
                                                        }
                                                    }}
                                                >
                                                    목록
                                                </button>
                                            </div>
                                        ) : (
                                            <select
                                                className="teacher-select"
                                                value={newQuestion.sourceYear || ''}
                                                onChange={e => {
                                                    if (e.target.value === '__custom__') {
                                                        setCustomYearMode(true);
                                                    } else {
                                                        setNewQuestion({ ...newQuestion, sourceYear: e.target.value });
                                                    }
                                                }}
                                            >
                                                <option value="">년도 선택</option>
                                                {yearPresets.map(y => (
                                                    <option key={y} value={y}>{y}년</option>
                                                ))}
                                                <option value="__custom__">직접 입력...</option>
                                            </select>
                                        )}
                                    </div>

                                    <div className="teacher-source-field">
                                        <span className="teacher-source-sublabel">학년</span>
                                        {customGradeMode ? (
                                            <div className="teacher-custom-input-wrap">
                                                <input
                                                    type="text"
                                                    className="teacher-input-field"
                                                    placeholder="예: 고2, 중3"
                                                    value={newQuestion.sourceGrade || ''}
                                                    onChange={e => setNewQuestion({ ...newQuestion, sourceGrade: e.target.value })}
                                                />
                                                <button
                                                    type="button"
                                                    className="teacher-inline-switch-btn"
                                                    onClick={() => {
                                                        setCustomGradeMode(false);
                                                        if (newQuestion.sourceGrade && !(GRADE_PRESETS as readonly string[]).includes(normalizeGrade(newQuestion.sourceGrade))) {
                                                            setNewQuestion({ ...newQuestion, sourceGrade: '' });
                                                        }
                                                    }}
                                                >
                                                    목록
                                                </button>
                                            </div>
                                        ) : (
                                            <select
                                                className="teacher-select"
                                                value={newQuestion.sourceGrade || ''}
                                                onChange={e => {
                                                    if (e.target.value === '__custom__') {
                                                        setCustomGradeMode(true);
                                                    } else {
                                                        setNewQuestion({ ...newQuestion, sourceGrade: e.target.value });
                                                    }
                                                }}
                                            >
                                                <option value="">학년 선택</option>
                                                {GRADE_PRESETS.map(g => (
                                                    <option key={g} value={g}>{g}</option>
                                                ))}
                                                <option value="__custom__">직접 입력...</option>
                                            </select>
                                        )}
                                    </div>

                                    <div className="teacher-source-field">
                                        <span className="teacher-source-sublabel">월/시기</span>
                                        {customMonthMode ? (
                                            <div className="teacher-custom-input-wrap">
                                                <input
                                                    type="text"
                                                    className="teacher-input-field"
                                                    placeholder="예: 9월, 수능, 교과서 2과"
                                                    value={newQuestion.sourceMonth || ''}
                                                    onChange={e => setNewQuestion({ ...newQuestion, sourceMonth: e.target.value })}
                                                />
                                                <button
                                                    type="button"
                                                    className="teacher-inline-switch-btn"
                                                    onClick={() => {
                                                        setCustomMonthMode(false);
                                                        if (newQuestion.sourceMonth && !(MONTH_PRESETS as readonly string[]).includes(normalizeMonth(newQuestion.sourceMonth))) {
                                                            setNewQuestion({ ...newQuestion, sourceMonth: '' });
                                                        }
                                                    }}
                                                >
                                                    목록
                                                </button>
                                            </div>
                                        ) : (
                                            <select
                                                className="teacher-select"
                                                value={newQuestion.sourceMonth || ''}
                                                onChange={e => {
                                                    if (e.target.value === '__custom__') {
                                                        setCustomMonthMode(true);
                                                    } else {
                                                        setNewQuestion({ ...newQuestion, sourceMonth: e.target.value });
                                                    }
                                                }}
                                            >
                                                <option value="">월/시기 선택</option>
                                                {MONTH_PRESETS.map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                                <option value="__custom__">직접 입력...</option>
                                            </select>
                                        )}
                                    </div>

                                    <div className="teacher-source-field">
                                        <span className="teacher-source-sublabel">문항 번호</span>
                                        <input
                                            type="text"
                                            className="teacher-input-field"
                                            placeholder="예: 29번, 31~32번"
                                            value={newQuestion.sourceNumber || ''}
                                            onChange={e => setNewQuestion({ ...newQuestion, sourceNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="teacher-input-group">
                                <label className="teacher-input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Tag size={15} /> 문항 태그 (복수 선택 가능)
                                    {normalizeTags(newQuestion.tags).length > 0 && (
                                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#2563eb' }}>
                                            ({normalizeTags(newQuestion.tags).length}개 선택됨)
                                        </span>
                                    )}
                                </label>
                                <div className="teacher-tag-section">
                                    <div className="teacher-tag-group-row">
                                        <span className="teacher-tag-group-label">기본 구분</span>
                                        <div className="teacher-tag-chip-list">
                                            {PRIMARY_QUESTION_TAGS.map(tag => {
                                                const active = normalizeTags(newQuestion.tags).includes(tag);
                                                return (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => handleToggleFormTag(tag)}
                                                        className={`teacher-tag-chip primary ${active ? 'active' : ''}`}
                                                    >
                                                        #{tag}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="teacher-tag-group-row">
                                        <span className="teacher-tag-group-label">추가 태그</span>
                                        <div className="teacher-tag-chip-list">
                                            {SECONDARY_QUESTION_TAGS.map(tag => {
                                                const active = normalizeTags(newQuestion.tags).includes(tag);
                                                return (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => handleToggleFormTag(tag)}
                                                        className={`teacher-tag-chip secondary ${active ? 'active' : ''}`}
                                                    >
                                                        #{tag}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="teacher-tag-group-row">
                                        <span className="teacher-tag-group-label">직접 추가</span>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div className="teacher-custom-tag-input-row">
                                                <input
                                                    type="text"
                                                    className="teacher-input-field"
                                                    placeholder="직접 입력 후 Enter 또는 추가 클릭 (쉼표로 여러 개 입력 가능)"
                                                    value={customTagInput}
                                                    onChange={e => setCustomTagInput(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.nativeEvent.isComposing) return;
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddCustomTags();
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    className="teacher-button-secondary"
                                                    onClick={handleAddCustomTags}
                                                    disabled={!customTagInput.trim()}
                                                    style={{ padding: '10px 14px', fontSize: '13px' }}
                                                >
                                                    <Plus size={15} /> 추가
                                                </button>
                                            </div>

                                            {customTagPool.length > 0 && (
                                                <div className="teacher-tag-chip-list">
                                                    {customTagPool.map(tag => {
                                                        const active = normalizeTags(newQuestion.tags).includes(tag);
                                                        return (
                                                            <div
                                                                key={tag}
                                                                className={`teacher-tag-chip custom teacher-tag-chip-compound ${active ? 'active' : ''}`}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className="teacher-tag-chip-label"
                                                                    onClick={() => handleToggleFormTag(tag)}
                                                                >
                                                                    #{tag}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="teacher-tag-chip-remove"
                                                                    title="사용자 태그 목록에서 제거"
                                                                    aria-label={`${tag} 사용자 태그 제거`}
                                                                    onClick={() => handleRemoveCustomTag(tag)}
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="teacher-input-group" style={{ opacity: passageType === 'textbook' ? 0.6 : 1 }}>
                                <label className="teacher-input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    주제
                                    {passageType === 'textbook' && (
                                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'normal' }}>
                                            (교과서 지문 선택 시 비활성화)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    className="teacher-input-field"
                                    placeholder={passageType === 'textbook' ? '교과서 지문 선택 시 비활성화됩니다' : '예: 환경 보호의 시급성'}
                                    value={passageType === 'textbook' ? '' : (newQuestion.topic || '')}
                                    onChange={e => setNewQuestion({ ...newQuestion, topic: e.target.value })}
                                    disabled={passageType === 'textbook'}
                                    style={{
                                        background: passageType === 'textbook' ? '#f1f5f9' : 'white',
                                        cursor: passageType === 'textbook' ? 'not-allowed' : 'text'
                                    }}
                                />
                            </div>

                            <div className="teacher-input-group" style={{ opacity: passageType === 'textbook' ? 0.6 : 1 }}>
                                <label className="teacher-input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    논리 흐름 (순서대로 입력)
                                    {passageType === 'textbook' && (
                                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'normal' }}>
                                            (교과서 지문 선택 시 비활성화)
                                        </span>
                                    )}
                                </label>
                                {passageType === 'textbook' ? (
                                    <div className="teacher-alert-info" style={{ marginBottom: '10px', fontSize: '12px', background: '#f1f5f9', color: '#64748b', borderColor: '#cbd5e1' }}>
                                        ℹ️ 교과서 지문은 &apos;우리말 주제&apos; 및 &apos;논리 흐름&apos; 없이 지문 본문으로만 대화 학습을 진행합니다.
                                    </div>
                                ) : (
                                    <div className="teacher-alert-info" style={{ marginBottom: '10px', fontSize: '12px' }}>
                                        <strong>큰 범주(필수):</strong> 각 행마다 입력합니다. <strong>연속된 행</strong>에 같은 큰 범주를 넣으면 한 덩어리로 묶여, Step 1 추천 질문 초반에 거시 구조로 쓰입니다(예: 두 행 모두 &quot;설명&quot;). <strong>작은 범주는 선택</strong>입니다.
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: passageType === 'textbook' ? 'none' : 'auto' }}>
                                    {/* Header with Examples */}
                                    <div style={{ display: 'flex', gap: '8px', paddingLeft: '32px', marginBottom: '-4px' }}>
                                        <div style={{ flex: '0.95', fontSize: '11px', color: '#000', textAlign: 'center' }}>큰 범주 (필수)<br />ex) 도입, 주제, 설명, 구체적 설명, 결론</div>
                                        <div style={{ flex: '1.15', fontSize: '11px', color: '#000', textAlign: 'center' }}>작은 범주 (선택)<br />ex) 설명1, 설명2</div>
                                        <div style={{ flex: '1', fontSize: '11px', color: '#000', textAlign: 'center' }}>연결어 (선택)<br />ex) for example</div>
                                        <div style={{ flex: '2', fontSize: '11px', color: '#000', textAlign: 'center' }}>중심 의미 (필수)</div>
                                        <div style={{ width: '40px' }}></div>
                                    </div>

                                    {flowSteps.map((step, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <div style={{
                                                width: '24px', height: '24px',
                                                borderRadius: '50%', background: passageType === 'textbook' ? '#94a3b8' : '#3b82f6',
                                                color: 'white', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                fontSize: '12px', fontWeight: 'bold',
                                                flexShrink: 0
                                            }}>
                                                {index + 1}
                                            </div>

                                            {/* 큰 범주 (필수) */}
                                            <input
                                                type="text"
                                                className="teacher-input-field"
                                                placeholder="예: 주제, 설명, 결론"
                                                value={passageType === 'textbook' ? '' : (step.macroLabel ?? '')}
                                                onChange={(e) => {
                                                    const newSteps = [...flowSteps];
                                                    newSteps[index] = { ...newSteps[index], macroLabel: e.target.value };
                                                    setFlowSteps(newSteps);
                                                }}
                                                disabled={passageType === 'textbook'}
                                                style={{ flex: '0.95', background: passageType === 'textbook' ? '#f1f5f9' : 'white' }}
                                            />

                                            {/* 작은 범주 (선택) */}
                                            <input
                                                type="text"
                                                className="teacher-input-field"
                                                placeholder="작은 범주 (선택)"
                                                value={passageType === 'textbook' ? '' : step.role}
                                                onChange={(e) => {
                                                    const newSteps = [...flowSteps];
                                                    newSteps[index] = { ...newSteps[index], role: e.target.value };
                                                    setFlowSteps(newSteps);
                                                }}
                                                disabled={passageType === 'textbook'}
                                                style={{ flex: '1.15', background: passageType === 'textbook' ? '#f1f5f9' : 'white' }}
                                            />

                                            {/* Conjunction */}
                                            <input
                                                type="text"
                                                className="teacher-input-field"
                                                placeholder="연결어"
                                                value={passageType === 'textbook' ? '' : step.conjunction}
                                                onChange={(e) => {
                                                    const newSteps = [...flowSteps];
                                                    newSteps[index] = { ...newSteps[index], conjunction: e.target.value };
                                                    setFlowSteps(newSteps);
                                                }}
                                                disabled={passageType === 'textbook'}
                                                style={{ flex: '1', background: passageType === 'textbook' ? '#f1f5f9' : 'white' }}
                                            />

                                            {/* Content */}
                                            <input
                                                type="text"
                                                className="teacher-input-field"
                                                placeholder="중심 의미"
                                                value={passageType === 'textbook' ? '' : step.content}
                                                onChange={(e) => {
                                                    const newSteps = [...flowSteps];
                                                    newSteps[index] = { ...newSteps[index], content: e.target.value };
                                                    setFlowSteps(newSteps);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const newSteps = [...flowSteps];
                                                        newSteps.splice(index + 1, 0, emptyFlowStep());
                                                        setFlowSteps(newSteps);
                                                    }
                                                }}
                                                disabled={passageType === 'textbook'}
                                                style={{ flex: '2', background: passageType === 'textbook' ? '#f1f5f9' : 'white' }}
                                            />

                                            <button
                                                onClick={() => {
                                                    const newSteps = flowSteps.filter((_, i) => i !== index);
                                                    setFlowSteps(newSteps.length ? newSteps : [emptyFlowStep()]);
                                                }}
                                                disabled={passageType === 'textbook'}
                                                className="teacher-button-secondary"
                                                style={{ padding: '8px', color: '#ef4444', borderColor: '#fee2e2' }}
                                                title="삭제"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setFlowSteps([...flowSteps, emptyFlowStep()])}
                                        disabled={passageType === 'textbook'}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                                    등록된 문항 ({hasActiveQuestionFilter ? `${filteredEntries.length} / ${questions.length}개` : `${questions.length}개`})
                                </h2>
                                {hasActiveQuestionFilter && (
                                    <button
                                        type="button"
                                        className="teacher-button-secondary"
                                        onClick={resetQuestionFilters}
                                        style={{ padding: '7px 12px', fontSize: '12px' }}
                                    >
                                        <RotateCcw size={14} /> 필터 초기화
                                    </button>
                                )}
                            </div>

                            {questions.length > 0 && (
                                <div className="teacher-search-panel">
                                    <div className="teacher-search-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>
                                            <Search size={16} color="#2563eb" />
                                            <span>문항 검색 및 필터</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <div className="teacher-filter-segment">
                                                {(
                                                    [
                                                        { value: 'all', label: '전체' },
                                                        { value: 'csat', label: '수능형' },
                                                        { value: 'textbook', label: '교과서' },
                                                    ] as const
                                                ).map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        className={`teacher-filter-segment-btn ${filterPassageType === opt.value ? 'active' : ''}`}
                                                        onClick={() => setFilterPassageType(opt.value)}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <span className="teacher-search-count-badge">
                                                {filteredEntries.length} / {questions.length}개
                                            </span>
                                        </div>
                                    </div>

                                    <div className="teacher-source-grid">
                                        <div className="teacher-source-field">
                                            <span className="teacher-source-sublabel">출처 년도</span>
                                            <select
                                                className="teacher-select"
                                                value={filterYear}
                                                onChange={e => setFilterYear(e.target.value)}
                                            >
                                                <option value="">전체 년도</option>
                                                {availableFilterYears.map(y => (
                                                    <option key={y} value={y}>
                                                        {/^\d{4}$/.test(y) ? `${y}년` : y} ({yearCounts.get(y) ?? 0})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="teacher-source-field">
                                            <span className="teacher-source-sublabel">출처 학년</span>
                                            <select
                                                className="teacher-select"
                                                value={filterGrade}
                                                onChange={e => setFilterGrade(e.target.value)}
                                            >
                                                <option value="">전체 학년</option>
                                                {availableFilterGrades.map(g => (
                                                    <option key={g} value={g}>
                                                        {g} ({gradeCounts.get(g) ?? 0})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="teacher-source-field">
                                            <span className="teacher-source-sublabel">출처 월/시기</span>
                                            <select
                                                className="teacher-select"
                                                value={filterMonth}
                                                onChange={e => setFilterMonth(e.target.value)}
                                            >
                                                <option value="">전체 월/시기</option>
                                                {availableFilterMonths.map(m => (
                                                    <option key={m} value={m}>
                                                        {m} ({monthCounts.get(m) ?? 0})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="teacher-source-field">
                                            <span className="teacher-source-sublabel">출처 문항 번호</span>
                                            <input
                                                type="text"
                                                className="teacher-input-field"
                                                placeholder="예: 29, 29번"
                                                value={filterSourceNumber}
                                                onChange={e => setFilterSourceNumber(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="teacher-search-subgrid">
                                        <div className="teacher-source-field">
                                            <span className="teacher-source-sublabel">수업 문항 번호</span>
                                            <input
                                                type="text"
                                                className="teacher-input-field"
                                                placeholder="예: 64번, 1학기-64"
                                                value={filterExamCode}
                                                onChange={e => setFilterExamCode(e.target.value)}
                                            />
                                        </div>

                                        <div className="teacher-source-field">
                                            <span className="teacher-source-sublabel">주제·본문 키워드</span>
                                            <input
                                                type="text"
                                                className="teacher-input-field"
                                                placeholder="주제, 지문 단어 검색"
                                                value={filterKeyword}
                                                onChange={e => setFilterKeyword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="teacher-search-tags-area">
                                        <div className="teacher-search-tags-header">
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <Tag size={13} /> 태그 필터
                                            </span>
                                            <div className="teacher-filter-segment">
                                                <button
                                                    type="button"
                                                    className={`teacher-filter-segment-btn ${filterTagMode === 'and' ? 'active' : ''}`}
                                                    onClick={() => setFilterTagMode('and')}
                                                >
                                                    모두 포함 (AND)
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`teacher-filter-segment-btn ${filterTagMode === 'or' ? 'active' : ''}`}
                                                    onClick={() => setFilterTagMode('or')}
                                                >
                                                    하나 이상 (OR)
                                                </button>
                                            </div>
                                        </div>

                                        <div className="teacher-search-tag-groups">
                                            <div className="teacher-tag-group-row">
                                                <span className="teacher-tag-group-label">기본 구분</span>
                                                <div className="teacher-tag-chip-list">
                                                    {PRIMARY_QUESTION_TAGS.map(tag => {
                                                        const active = filterTags.includes(tag);
                                                        const count = tagCounts.get(tag) ?? 0;
                                                        return (
                                                            <button
                                                                key={tag}
                                                                type="button"
                                                                onClick={() => handleToggleFilterTag(tag)}
                                                                className={`teacher-tag-chip primary ${active ? 'active' : ''}`}
                                                            >
                                                                #{tag} <span className="teacher-tag-count">{count}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="teacher-tag-group-row">
                                                <span className="teacher-tag-group-label">추가 태그</span>
                                                <div className="teacher-tag-chip-list">
                                                    {SECONDARY_QUESTION_TAGS.map(tag => {
                                                        const active = filterTags.includes(tag);
                                                        const count = tagCounts.get(tag) ?? 0;
                                                        return (
                                                            <button
                                                                key={tag}
                                                                type="button"
                                                                onClick={() => handleToggleFilterTag(tag)}
                                                                className={`teacher-tag-chip secondary ${active ? 'active' : ''}`}
                                                            >
                                                                #{tag} <span className="teacher-tag-count">{count}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {filterCustomTags.length > 0 && (
                                                <div className="teacher-tag-group-row">
                                                    <span className="teacher-tag-group-label">직접 추가</span>
                                                    <div className="teacher-tag-chip-list">
                                                        {filterCustomTags.map(tag => {
                                                            const active = filterTags.includes(tag);
                                                            const count = tagCounts.get(tag) ?? 0;
                                                            return (
                                                                <button
                                                                    key={tag}
                                                                    type="button"
                                                                    onClick={() => handleToggleFilterTag(tag)}
                                                                    className={`teacher-tag-chip custom ${active ? 'active' : ''}`}
                                                                >
                                                                    #{tag} <span className="teacher-tag-count">{count}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {questions.length === 0 ? (
                                <div className="teacher-empty-state">
                                    <FileText className="teacher-empty-state-icon" />
                                    <div className="teacher-empty-state-title">등록된 문항이 없습니다.</div>
                                    <div className="teacher-empty-state-subtitle">위 양식을 통해 문항을 추가하세요.</div>
                                </div>
                            ) : filteredEntries.length === 0 ? (
                                <div className="teacher-empty-state" style={{ padding: '40px 20px' }}>
                                    <Search className="teacher-empty-state-icon" />
                                    <div className="teacher-empty-state-title">조건에 맞는 문항이 없습니다.</div>
                                    <div className="teacher-empty-state-subtitle" style={{ marginBottom: '16px' }}>
                                        검색어나 태그 필터 조건을 변경해 보세요.
                                    </div>
                                    <button
                                        type="button"
                                        className="teacher-button-secondary"
                                        onClick={resetQuestionFilters}
                                    >
                                        <RotateCcw size={15} /> 필터 초기화
                                    </button>
                                </div>
                            ) : (
                                filteredEntries.map(({ q, source, tags, isTextbook }) => {
                                    const parsedFlowSteps = safeParseLogicFlow(q.logicFlow);
                                    const hasSplitBadges = Boolean(
                                        source.sourceYear ||
                                        source.sourceGrade ||
                                        source.sourceMonth ||
                                        source.sourceNumber
                                    );
                                    return (
                                        <div key={q.id} className="teacher-question-card">
                                            <div style={{ flex: 1 }}>
                                                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                                    <span className="teacher-question-badge" style={{ marginRight: 0 }}>{q.examCode}</span>
                                                    <span
                                                        className="teacher-question-badge"
                                                        style={{
                                                            marginRight: 0,
                                                            background: isTextbook ? '#dcfce7' : '#ede9fe',
                                                            color: isTextbook ? '#166534' : '#5b21b6'
                                                        }}
                                                    >
                                                        {isTextbook ? '[교과서]' : '[수능형]'}
                                                    </span>
                                                    {hasSplitBadges ? (
                                                        <>
                                                            {source.sourceYear && (
                                                                <span className="teacher-question-badge teacher-source-badge">
                                                                    {/^\d{4}$/.test(source.sourceYear) ? `${source.sourceYear}년` : source.sourceYear}
                                                                </span>
                                                            )}
                                                            {source.sourceGrade && (
                                                                <span className="teacher-question-badge teacher-source-badge">
                                                                    {source.sourceGrade}
                                                                </span>
                                                            )}
                                                            {source.sourceMonth && (
                                                                <span className="teacher-question-badge teacher-source-badge">
                                                                    {source.sourceMonth}
                                                                </span>
                                                            )}
                                                            {source.sourceNumber && (
                                                                <span className="teacher-question-badge teacher-source-badge">
                                                                    {source.sourceNumber}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : q.targetGrade ? (
                                                        <span className="teacher-question-badge teacher-source-badge">
                                                            출처: {q.targetGrade}
                                                        </span>
                                                    ) : null}
                                                    <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#222' }}>{q.topic}</span>
                                                </div>
                                                {tags.length > 0 && (
                                                    <div className="teacher-card-tags-row">
                                                        {tags.map(tag => {
                                                            const category = getTagCategory(tag);
                                                            const isFiltering = filterTags.includes(tag);
                                                            return (
                                                                <button
                                                                    key={tag}
                                                                    type="button"
                                                                    onClick={() => handleToggleFilterTag(tag)}
                                                                    className={`teacher-card-tag ${category} ${isFiltering ? 'active' : ''}`}
                                                                    title="클릭하여 이 태그로 필터링"
                                                                >
                                                                    #{tag}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '600px' }}>
                                                    {q.passage}
                                                </p>
                                                <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '12px' }}>
                                                    <div className="teacher-card-row">
                                                        <span className="teacher-card-label">논리 흐름:</span>
                                                        <span className="teacher-card-value">
                                                            {isTextbook ? (
                                                                <span style={{ color: '#94a3b8' }}>해당 없음 (교과서 지문)</span>
                                                            ) : parsedFlowSteps.length > 0 ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    {parsedFlowSteps.map((step, i) => (
                                                                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                            <span style={{ fontSize: '11px', color: '#94a3b8', width: '15px' }}>{i + 1}</span>
                                                                            <span style={{
                                                                                fontSize: '10px', background: '#fef3c7', color: '#92400e',
                                                                                padding: '2px 6px', borderRadius: '4px', fontWeight: '600'
                                                                            }}>큰 범주: {step.macroLabel?.trim() || '—'}</span>
                                                                            {step.role?.trim() ? (
                                                                                <span style={{
                                                                                    fontSize: '11px', background: '#dbeafe', color: '#1e40af',
                                                                                    padding: '2px 6px', borderRadius: '4px', fontWeight: '600'
                                                                                }}>작은 범주: [{step.role}]</span>
                                                                            ) : null}
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
                                    );
                                })
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
                                                    {sortedStudents.map((s) => (
                                                        <div key={s.id} className="teacher-student-row">
                                                            <div style={{ width: '40px', textAlign: 'center' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedStudentsForDeletion.includes(s.id)}
                                                                    onChange={() => handleToggleStudentSelection(s.id)}
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
