import React, { useState, useEffect, useRef } from 'react';
import type { Student, Question, RoomPublicInfo } from '../types';

import { fetchRoomData } from '../lib/public-api';
import { safeParseLogicFlow, isTextbookQuestion } from '../lib/logic-flow';
import { canUseRoomAi, requestAiCompletion, type ChatApiMessage } from '../lib/ai';
import {
    FAQ_ITEMS,
    FLAT_FAQ,
    buildFaqUserPrompt,
    buildPrefixMessages,
    buildQuestionContext,
    buildSentenceUserPrompt,
} from '../lib/tutor-prompts';
import { splitEnglishSentences } from '../lib/text';
import { getErrorMessage } from '../lib/errors';
import { Send, User, Bot, Users, ArrowLeft, CheckSquare, Square, BookOpen, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

export default function StudentChatInterface({ onBack }: { onBack?: () => void } = {}) {
    // Helper for bold text
    const formatMessage = (content: string) => {
        const parts = content.split('**');
        return parts.map((part, index) =>
            index % 2 === 1 ? <strong key={index}>{part}</strong> : part
        );
    };

    // --- State Management ---
    const [step, setStep] = useState<'room' | 'chat'>('room');
    const [roomNumber, setRoomNumber] = useState('');

    // Data from API
    const [roomInfo, setRoomInfo] = useState<RoomPublicInfo | null>(null);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [roomQuestions, setRoomQuestions] = useState<Question[]>([]);

    // Selected User Info (Multi-Select)
    const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);

    // Chat State
    type Message = { role: 'user' | 'assistant' | 'system'; content: string; isGroup?: boolean; context?: string; repeatCount?: number };
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [faqClickCounts, setFaqClickCounts] = useState<Record<string, number>>({});
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Modals & UI Toggles
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showSentenceModal, setShowSentenceModal] = useState(false);
    const [showPassagePanel, setShowPassagePanel] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    // Sentence Modal (FAQ 4)
    const [sentences, setSentences] = useState<string[]>([]);
    const [selectedSentenceIndex, setSelectedSentenceIndex] = useState<number | null>(null);

    // Temporary selections
    const [tempQuestion, setTempQuestion] = useState<Question | null>(null);
    const [questionSortOrder, setQuestionSortOrder] = useState<'asc' | 'desc'>('asc');

    // Track if this is a new session for Google Docs header
    const isNewDocSession = useRef(true);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Split passage
    useEffect(() => {
        if (selectedQuestion) {
            setSentences(splitEnglishSentences(selectedQuestion.passage));
        } else {
            setSentences([]);
        }
    }, [selectedQuestion]);

    // --- Handlers ---

    // 1. Room Code Submit
    const handleRoomSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomNumber.trim()) return;

        // Validate room code (must be numeric)
        if (!/^\d+$/.test(roomNumber.trim())) {
            alert('방 코드는 숫자만 입력해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const data = await fetchRoomData(roomNumber.trim());

            if (!data.room) throw new Error('방 정보를 찾을 수 없습니다.');

            setRoomInfo(data.room);
            setAllStudents(data.students || []);
            setRoomQuestions(data.questions || []);

            setStep('chat');
        } catch (error: unknown) {
            console.error(error);
            alert('입장 중 오류가 발생했습니다: ' + getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Student Selection (Multi)
    const toggleStudent = (student: Student) => {
        setSelectedStudents(prev => {
            const exists = prev.find(s => s.id === student.id);
            if (exists) {
                return prev.filter(s => s.id !== student.id);
            } else {
                return [...prev, student];
            }
        });
    };

    const toggleClassGroup = (_className: string, studentsInClass: Student[]) => {
        const allSelected = studentsInClass.every(s => selectedStudents.some(sel => sel.id === s.id));
        if (allSelected) {
            setSelectedStudents(prev => prev.filter(s => !studentsInClass.some(sic => sic.id === s.id)));
        } else {
            const newSelections = studentsInClass.filter(s => !selectedStudents.some(sel => sel.id === s.id));
            setSelectedStudents(prev => [...prev, ...newSelections]);
        }
    };

    const buildConversationHistory = (): ChatApiMessage[] => {
        const MAX_HISTORY_MESSAGES = 36;
        const TRIM_BLOCK_SIZE = 18;

        const allTurns = messages
            .filter((m): m is Message & { role: 'user' | 'assistant' } =>
                m.role === 'user' || m.role === 'assistant'
            )
            .map((m) => ({
                role: m.role,
                content: m.content,
            }));

        const excessOffset =
            allTurns.length > MAX_HISTORY_MESSAGES
                ? Math.floor((allTurns.length - 1 - MAX_HISTORY_MESSAGES) / TRIM_BLOCK_SIZE + 1) * TRIM_BLOCK_SIZE
                : 0;

        return excessOffset > 0 ? allTurns.slice(excessOffset) : allTurns;
    };

    // 3. Send Message
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        if (selectedStudents.length === 0) {
            alert('학생을 먼저 선택해주세요.');
            return;
        }

        if (!selectedQuestion) {
            alert('문항을 선택해주세요.');
            return;
        }

        const userMessage = input.trim();
        setInput('');

        const isGroupMsg = selectedStudents.length > 1;
        const contextString = buildQuestionContext(selectedQuestion);

        setMessages(prev => [...prev, { role: 'user', content: userMessage, isGroup: isGroupMsg, context: contextString }]);

        if (!canUseRoomAi(roomInfo)) {
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ API 키가 설정되지 않았습니다. 담당 선생님께 문의해주세요.' }]);
            return;
        }

        setIsLoading(true);
        try {
            const apiMessages: ChatApiMessage[] = [
                ...buildPrefixMessages(roomInfo, selectedQuestion),
                ...buildConversationHistory(),
                { role: 'user', content: userMessage }
            ];

            const aiContent = await requestAiCompletion({
                roomCode: roomNumber.trim(),
                apiKey: roomInfo?.api_key,
                hasApiKey: roomInfo?.has_api_key,
                messages: apiMessages,
                kind: 'tutoring',
            });
            const aiMsg: Message = { role: 'assistant', content: aiContent };
            setMessages(prev => [...prev, aiMsg]);

            // Real-time save
            saveTurnToGAS(userMessage, aiMsg, isGroupMsg);
        } catch (error: unknown) {
            setMessages(prev => [...prev, { role: 'assistant', content: `오류: ${getErrorMessage(error)}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const saveTurnToGAS = async (userMsgText: string, aiMsg: Message, isGroup: boolean) => {
        if (!roomInfo?.google_script_url || selectedStudents.length === 0) return;

        try {
            const userMsgObj: Message = { role: 'user', content: userMsgText, isGroup };

            const savePromises = selectedStudents.map(student => {
                const fileName = `[${student.class || student.className || roomInfo.class_name}] ${student.number}번 ${student.name}`;
                return fetch(roomInfo.google_script_url!, {
                    method: 'POST',
                    body: JSON.stringify({
                        folderId: roomInfo.drive_folder_id,
                        fileName: fileName,
                        messages: [userMsgObj, aiMsg],
                        isNewSession: isNewDocSession.current
                    })
                });
            });

            await Promise.all(savePromises);
            isNewDocSession.current = false; // After first save, no more header for this entrance
        } catch (error) {
            console.error("Auto-save failed:", error);
        }
    };

    const handleFAQClick = async (index: number) => {
        if (isLoading) return;

        if (selectedStudents.length === 0) {
            alert('학생을 먼저 선택해주세요.');
            return;
        }
        if (!selectedQuestion) {
            alert('문항을 먼저 선택해주세요!');
            return;
        }

        const faqEntry = FLAT_FAQ[index];
        if (!faqEntry) return;

        if (isTextbookQuestion(selectedQuestion)) {
            if (faqEntry.text.includes('우리말 주제') || faqEntry.text.includes('나눈다면') || faqEntry.text.includes('중심 내용과 논리적') || faqEntry.text.includes('영어 연결어')) {
                alert('교과서 지문에서는 이용할 수 없는 질문입니다.');
                return;
            }
        }

        if (faqEntry.isSentenceModal) {
            setShowSentenceModal(true);
            return;
        }

        const questionText = faqEntry.text;
        const logicFlowParts = safeParseLogicFlow(selectedQuestion.logicFlow);
        const isLogicFlowFaq =
            questionText === FLAT_FAQ[1]?.text ||
            questionText === FLAT_FAQ[2]?.text ||
            questionText === FLAT_FAQ[3]?.text;
        if (isLogicFlowFaq && logicFlowParts.length === 0) {
            alert('선생님이 아직 이 문항의 논리 흐름 데이터를 등록하지 않았습니다.');
            return;
        }

        const isGroupMsg = selectedStudents.length > 1;
        const contextString = buildQuestionContext(selectedQuestion);

        // Track FAQ click count for this question text (scoped to Question ID)
        const faqKey = `${selectedQuestion.id}_${questionText}`;
        const currentCount = (faqClickCounts[faqKey] || 0) + 1;
        setFaqClickCounts(prev => ({ ...prev, [faqKey]: currentCount }));

        const aiPrompt = buildFaqUserPrompt({
            questionText,
            question: selectedQuestion,
            currentCount,
            messages,
        });

        setMessages(prev => [...prev, { role: 'user', content: questionText, isGroup: isGroupMsg, context: contextString, repeatCount: currentCount > 1 ? currentCount : undefined }]);
        setShowMobileSidebar(false);

        if (!canUseRoomAi(roomInfo)) {
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ API 키가 설정되지 않았습니다. 담당 선생님께 문의해주세요.' }]);
            return;
        }

        setIsLoading(true);
        try {
            const apiMessages: ChatApiMessage[] = [
                ...buildPrefixMessages(roomInfo, selectedQuestion),
                ...buildConversationHistory(),
                { role: 'user', content: aiPrompt }
            ];
            const aiContent = await requestAiCompletion({
                roomCode: roomNumber.trim(),
                apiKey: roomInfo?.api_key,
                hasApiKey: roomInfo?.has_api_key,
                messages: apiMessages,
                kind: questionText === FLAT_FAQ[4]?.text ? 'simple' : 'tutoring',
            });
            const aiMsg: Message = { role: 'assistant', content: aiContent };
            setMessages(prev => [...prev, aiMsg]);

            // Real-time save
            saveTurnToGAS(questionText, aiMsg, isGroupMsg);
        } catch (error: unknown) {
            setMessages(prev => [...prev, { role: 'assistant', content: `오류: ${getErrorMessage(error)}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSentenceSelect = async () => {
        if (isLoading || selectedSentenceIndex === null || !selectedQuestion) return;
        const sentence = sentences[selectedSentenceIndex];
        const questionText = `구두점 기준으로 ${selectedSentenceIndex + 1}번째 영어 문장을 문법적으로 분석하고 문맥에 맞게 해석해줘: "${sentence}"`;
        const isGroupMsg = selectedStudents.length > 1;
        const contextString = buildQuestionContext(selectedQuestion);

        setMessages(prev => [...prev, { role: 'user', content: questionText, isGroup: isGroupMsg, context: contextString }]);
        setShowSentenceModal(false);
        setShowMobileSidebar(false);
        setSelectedSentenceIndex(null);

        if (!canUseRoomAi(roomInfo)) {
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ API 키가 설정되지 않았습니다. 담당 선생님께 문의해주세요.' }]);
            return;
        }

        setIsLoading(true);
        try {
            const apiMessages: ChatApiMessage[] = [
                ...buildPrefixMessages(roomInfo, selectedQuestion),
                ...buildConversationHistory(),
                { role: 'user', content: buildSentenceUserPrompt(questionText) }
            ];
            const aiContent = await requestAiCompletion({
                roomCode: roomNumber.trim(),
                apiKey: roomInfo?.api_key,
                hasApiKey: roomInfo?.has_api_key,
                messages: apiMessages,
                kind: 'tutoring',
            });
            const aiMsg: Message = { role: 'assistant', content: aiContent };
            setMessages(prev => [...prev, aiMsg]);

            // Real-time save
            saveTurnToGAS(questionText, aiMsg, isGroupMsg);
        } catch (error: unknown) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: `오류: ${getErrorMessage(error)}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToRoom = () => {
        if (messages.length > 0) {
            const confirmBack = window.confirm('대화가 종료됩니다. 초기 화면으로 돌아가시겠습니까?');
            if (!confirmBack) return;
        }
        setStep('room');
        setMessages([]);
        setSelectedStudents([]);
        setSelectedQuestion(null);
        setShowPassagePanel(false);
        setShowMobileSidebar(false);
        isNewDocSession.current = true; // Reset session flag
    };

    const handleQuestionConfirm = () => {
        if (tempQuestion) {
            setSelectedQuestion(tempQuestion);
            setFaqClickCounts({}); // Reset FAQ click counts for new question
            // Reset history for the new question
            setMessages([{
                role: 'assistant',
                content: `문항 번호 "${tempQuestion.examCode}", 출처 "${tempQuestion.targetGrade || '-'}" 문항이 선택되었습니다.`
            }]);
            setShowQuestionModal(false);
            setTempQuestion(null);
        }
    };

    // --- Render ---
    if (step === 'room') {
        return (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <button
                    onClick={() => (onBack ? onBack() : (window.location.href = '/'))}
                    style={{
                        position: 'absolute', top: '20px', left: '20px',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: 'rgba(255,255,255,0.9)', color: '#666',
                        border: 'none', padding: '8px 12px', borderRadius: '999px',
                        cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    <ArrowLeft size={18} /> 뒤로가기
                </button>
                <div style={{ background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', width: '90%', maxWidth: '460px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏫</div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>AI Tutor 교실</h1>
                    <div
                        style={{
                            textAlign: 'center',
                            marginBottom: '20px',
                            padding: '22px 20px',
                            borderRadius: '10px',
                            background: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                marginBottom: '14px',
                                fontSize: '19px',
                                fontWeight: 700,
                                color: '#333'
                            }}
                        >
                            <span style={{ fontSize: '26px' }} aria-hidden>🎓</span>
                            <span>각 반 참여 코드</span>
                        </div>
                        <div style={{ fontSize: '17px', lineHeight: 1.9, color: '#333', fontWeight: 500 }}>
                            <div style={{ marginBottom: '4px' }}>
                                세문영A(월7,화3,목6) - <span style={{ color: '#007bff', fontWeight: 600, fontSize: '18px' }}>822435</span>
                            </div>
                            <div style={{ marginBottom: '4px' }}>
                                세문영D(화1,목3,금3) - <span style={{ color: '#007bff', fontWeight: 600, fontSize: '18px' }}>353514</span>
                            </div>
                            <div>
                                세문영E(월2,수5,목4) - <span style={{ color: '#007bff', fontWeight: 600, fontSize: '18px' }}>946410</span>
                            </div>
                        </div>
                    </div>
                    <div
                        style={{
                            marginBottom: '20px',
                            padding: '16px 16px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                            border: '1.5px solid #3b82f6',
                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.15)',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1e3a8a', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #bfdbfe' }}>
                            Open Class for Any Guest - <span style={{ color: '#2563eb', fontWeight: 700, fontSize: '18px' }}>272394</span>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: '#1e3a8a', marginBottom: '4px' }}>
                            📢 New to AI Tutor?
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e3a8a', marginBottom: '8px' }}>
                            Click the link to download the guide
                        </div>
                        <a
                            href="http://tiny.cc/hongik-aitutor"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-block',
                                color: '#2563eb',
                                fontWeight: 700,
                                fontSize: '15px',
                                textDecoration: 'underline',
                                wordBreak: 'break-all',
                                transition: 'color 0.2s ease'
                            }}
                        >
                            http://tiny.cc/hongik-aitutor
                        </a>
                    </div>
                    <form onSubmit={handleRoomSubmit}>
                        <input
                            type="text"
                            value={roomNumber}
                            onChange={(e) => setRoomNumber(e.target.value)}
                            placeholder="Room Code"
                            style={{ width: '100%', padding: '12px', fontSize: '20px', borderRadius: '12px', border: '2px solid #ddd', marginBottom: '16px', textAlign: 'center' }}
                        />
                        <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '12px', background: '#fee500', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                            {isLoading ? 'Loading...' : '입장하기'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (step === 'chat' && roomInfo) {
        const studentsByClass = allStudents.reduce((acc, student) => {
            const cls = student.class || student.className || '기타';
            if (!acc[cls]) acc[cls] = [];
            acc[cls].push(student);
            return acc;
        }, {} as Record<string, Student[]>);
        const classList = Object.keys(studentsByClass).sort();

        // Check if student selected
        const isStudentSelected = selectedStudents.length > 0;
        const selectedIsTextbook = isTextbookQuestion(selectedQuestion);
        const selectedHasLogicFlow = selectedQuestion ? safeParseLogicFlow(selectedQuestion.logicFlow).length > 0 : false;

        return (
            <div className="sc-desktop-layout">
                {/* Left: Chat Panel */}
                <div className="sc-main-panel">
                    <button className="sc-save-exit-btn" onClick={handleBackToRoom}>
                        <ArrowLeft size={18} /> 뒤로가기
                    </button>

                    <div className="sc-chat-title-header">
                        <span>AI Tutor (Room Code: {roomNumber})</span>
                        {selectedQuestion && (
                            <button
                                type="button"
                                onClick={() => setShowPassagePanel(prev => !prev)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '5px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: showPassagePanel ? '#eff6ff' : 'white',
                                    color: showPassagePanel ? '#1d4ed8' : '#334155',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <BookOpen size={14} />
                                {showPassagePanel ? '지문 닫기' : '지문 보기'}
                            </button>
                        )}
                        <button
                            type="button"
                            className="sc-mobile-controls-toggle"
                            onClick={() => setShowMobileSidebar(prev => !prev)}
                        >
                            <SlidersHorizontal size={14} />
                            학습 메뉴
                        </button>
                    </div>

                    {showPassagePanel && selectedQuestion && (
                        <div style={{
                            maxHeight: '220px',
                            overflowY: 'auto',
                            background: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            padding: '14px 24px',
                            color: '#1e293b',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    background: selectedIsTextbook ? '#dcfce7' : '#ede9fe',
                                    color: selectedIsTextbook ? '#166534' : '#5b21b6'
                                }}>
                                    {selectedIsTextbook ? '[교과서]' : '[수능형]'}
                                </span>
                                <span style={{ color: '#1e40af' }}>문항 번호: {selectedQuestion.examCode}</span>
                                <span style={{ color: '#64748b' }}>출처: {selectedQuestion.targetGrade || '-'}</span>
                            </div>
                            <div style={{ fontSize: '14px', lineHeight: 1.75, whiteSpace: 'pre-wrap', color: '#1e293b' }}>
                                {selectedQuestion.passage}
                            </div>
                        </div>
                    )}

                    <div className="sc-chat-desktop-area">
                        {!selectedQuestion && (
                            <div style={{ textAlign: 'center', marginTop: '100px', color: '#64748b' }}>
                                <div style={{ fontSize: '32px', marginBottom: '20px' }}>👉</div>
                                <div>오른쪽(모바일은 상단 학습 메뉴)에서 학생과 문항을 선택해주세요.</div>
                                <button
                                    type="button"
                                    className="sc-mobile-controls-toggle"
                                    onClick={() => setShowMobileSidebar(true)}
                                    style={{ margin: '14px auto 0', padding: '8px 14px' }}
                                >
                                    <SlidersHorizontal size={14} />
                                    학생·문항 선택 열기
                                </button>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`sc-message-row ${msg.role}`}>
                                <div className={`sc-message-bubble ${msg.role === 'user' ? (msg.isGroup ? 'sc-bubble-group' : 'sc-bubble-user') : 'sc-bubble-assistant'}`}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11px', opacity: 0.8 }}>
                                        {msg.role === 'user' ? (
                                            msg.isGroup ? <><Users size={12} /> 모둠</> : <><User size={12} /> 나</>
                                        ) : <><Bot size={12} /> AI</>}
                                        {msg.repeatCount && msg.repeatCount > 1 && (
                                            <span style={{ background: '#e53e3e', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 'bold', marginLeft: '4px' }}>
                                                {msg.repeatCount}회
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ whiteSpace: 'pre-wrap' }}>{formatMessage(msg.content)}</div>
                                </div>
                            </div>
                        ))}
                        {isLoading && <div style={{ textAlign: 'center', color: '#999' }}>답변 생성 중...</div>}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="sc-input-desktop-area" style={{ padding: '16px' }}>
                        <form className="sc-input-form" onSubmit={handleSendMessage}>
                            <input
                                className="sc-input"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="질문을 입력하세요..."
                                disabled={isLoading}
                            />
                            <button type="submit" className="sc-send-btn" disabled={isLoading || !isStudentSelected || !selectedQuestion}>
                                <Send size={20} />
                            </button>
                        </form>
                    </div>
                </div>

                {showMobileSidebar && (
                    <div
                        className="sc-mobile-backdrop"
                        onClick={() => setShowMobileSidebar(false)}
                    />
                )}

                {/* Right: Sidebar Controls - Compact Mode */}
                <div className={`sc-sidebar-panel ${showMobileSidebar ? 'mobile-open' : ''}`} style={{ padding: '12px', gap: '12px' }}>

                    {/* Student Select (Blue) */}
                    <div className="sc-card sc-card-blue" style={{ padding: '16px' }}>
                        <div className="sc-card-title" style={{ color: '#1e40af', marginBottom: '8px', fontSize: '14px' }}>1. 학생 선택</div>

                        <button
                            className="sc-question-btn"
                            style={{ background: '#2563eb', color: 'white', border: 'none', fontSize: '14px', padding: '10px' }}
                            onClick={() => setShowStudentModal(true)}
                        >
                            <Users size={16} style={{ display: 'inline', marginRight: '6px' }} />
                            학생 선택하기 (클릭)
                        </button>

                        <div className="sc-question-display" style={{
                            fontSize: '12px', marginTop: '8px', textAlign: 'center',
                            color: selectedStudents.length > 0 ? '#1e40af' : '#aaa',
                            fontWeight: selectedStudents.length > 0 ? 'bold' : 'normal',
                            maxHeight: '80px', overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: '1.4'
                        }}>
                            {selectedStudents.length === 0 ? '(선택 안됨)' :
                                selectedStudents.map(s =>
                                    `${s.class || s.className || ''} ${s.number}번 ${s.name}`
                                ).join(', ')
                            }
                        </div>
                    </div>

                    {/* Question Select (Pink) */}
                    <div className="sc-card sc-card-pink" style={{ opacity: isStudentSelected ? 1 : 0.5, pointerEvents: isStudentSelected ? 'auto' : 'none', padding: '16px' }}>
                        <div className="sc-card-title" style={{ color: '#be123c', marginBottom: '8px', fontSize: '14px' }}>2. 문항 선택</div>
                        <button className="sc-question-btn" style={{ fontSize: '14px', padding: '10px' }} onClick={() => setShowQuestionModal(true)}>
                            문항 선택
                        </button>
                        <div className="sc-question-display" style={{ fontSize: '12px', lineHeight: 1.5 }}>
                            {selectedQuestion ? (
                                <>
                                    <div style={{ marginBottom: '4px' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '1px 7px',
                                            borderRadius: '999px',
                                            background: selectedIsTextbook ? '#dcfce7' : '#ede9fe',
                                            color: selectedIsTextbook ? '#166534' : '#5b21b6',
                                            fontSize: '11px',
                                            fontWeight: 700
                                        }}>
                                            {selectedIsTextbook ? '[교과서]' : '[수능형]'}
                                        </span>
                                    </div>
                                    <div>문항 번호: {selectedQuestion.examCode}</div>
                                    <div>출처: {selectedQuestion.targetGrade || '-'}</div>
                                </>
                            ) : '(선택 안됨)'}
                        </div>
                    </div>

                    {/* FAQ (Yellow) */}
                    <div className="sc-card sc-card-yellow" style={{ opacity: (isStudentSelected && selectedQuestion) ? 1 : 0.5, pointerEvents: (isStudentSelected && selectedQuestion) ? 'auto' : 'none', padding: '16px' }}>
                        <div className="sc-card-title" style={{ color: '#92400e', marginBottom: '8px', fontSize: '14px' }}>3. 추천 질문</div>
                        <div className="sc-faq-list" style={{ gap: '6px' }}>
                            {(() => {
                                let flatIndex = 0;
                                const isTextbook = isTextbookQuestion(selectedQuestion);
                                return FAQ_ITEMS.map((item, itemIdx) => {
                                    if (item.type === 'single') {
                                        const idx = flatIndex++;
                                        const isTopicQuestion = item.text.includes('우리말 주제');
                                        const isUnavailable = isTopicQuestion && isTextbook;
                                        const isDisabled = isUnavailable || isLoading;
                                        return (
                                            <button
                                                key={itemIdx}
                                                className="sc-faq-item"
                                                disabled={isDisabled}
                                                onClick={() => !isDisabled && handleFAQClick(idx)}
                                                style={{
                                                    padding: '8px 12px',
                                                    fontSize: '12px',
                                                    opacity: isUnavailable ? 0.5 : isLoading ? 0.7 : 1,
                                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                    background: isUnavailable ? '#f1f5f9' : undefined,
                                                    color: isUnavailable ? '#94a3b8' : undefined,
                                                    borderColor: isUnavailable ? '#cbd5e1' : undefined
                                                }}
                                            >
                                                {item.text}
                                                {isUnavailable && <span style={{ fontSize: '10px', marginLeft: '6px', color: '#94a3b8', fontWeight: 'normal' }}>(교과서 지문 미지원)</span>}
                                            </button>
                                        );
                                    } else {
                                        const groupStartIdx = flatIndex;
                                        flatIndex += item.items.length;
                                        const isLogicFlowGroup = item.label.includes('논리적 흐름');
                                        const isMissingFlow = isLogicFlowGroup && !isTextbook && !selectedHasLogicFlow;
                                        const isUnavailable = isLogicFlowGroup && (isTextbook || !selectedHasLogicFlow);
                                        const isDisabled = isUnavailable || isLoading;
                                        return (
                                            <div key={itemIdx} style={{
                                                background: isUnavailable ? '#f8fafc' : '#e8f5e9',
                                                border: isUnavailable ? '1.5px solid #cbd5e1' : '1.5px solid #81c784',
                                                borderRadius: '10px',
                                                padding: '10px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '5px',
                                                opacity: isUnavailable ? 0.55 : 1
                                            }}>
                                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: isUnavailable ? '#94a3b8' : '#2e7d32', marginBottom: '2px', textAlign: 'left' }}>
                                                    {item.label}
                                                    {isTextbook && <span style={{ fontSize: '10px', marginLeft: '6px', color: '#94a3b8', fontWeight: 'normal' }}>(교과서 지문 미지원)</span>}
                                                    {isMissingFlow && <span style={{ fontSize: '10px', marginLeft: '6px', color: '#94a3b8', fontWeight: 'normal' }}>(논리 흐름 미등록)</span>}
                                                </div>
                                                {item.items.map((sub, subIdx) => (
                                                    <button
                                                        key={subIdx}
                                                        className="sc-faq-item"
                                                        disabled={isDisabled}
                                                        onClick={() => !isDisabled && handleFAQClick(groupStartIdx + subIdx)}
                                                        style={{
                                                            padding: '7px 10px',
                                                            fontSize: '12px',
                                                            background: isUnavailable ? '#f1f5f9' : '#f1f8e9',
                                                            border: isUnavailable ? '1px solid #e2e8f0' : '1px solid #a5d6a7',
                                                            color: isUnavailable ? '#94a3b8' : undefined,
                                                            opacity: isLoading && !isUnavailable ? 0.7 : 1,
                                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                            textAlign: 'left'
                                                        }}
                                                    >
                                                        <span style={{ fontWeight: 'bold', color: isUnavailable ? '#94a3b8' : '#2e7d32', marginRight: '6px' }}>Step {subIdx + 1}.</span>
                                                        {sub}
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    }
                                });
                            })()}
                        </div>
                    </div>

                </div>

                {/* Modals */}

                {/* Student Selection Modal */}
                {showStudentModal && (
                    <div className="sc-modal-overlay" onClick={() => setShowStudentModal(false)}>
                        <div className="sc-modal-box" style={{ maxWidth: '600px', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
                            <div className="sc-modal-header">
                                <h3>학생 선택</h3>
                                <button className="sc-modal-close-btn" onClick={() => setShowStudentModal(false)}>&times;</button>
                            </div>
                            <div className="sc-modal-body" style={{ background: '#f8fafc', padding: '20px' }}>
                                {classList.map(cls => (
                                    <div key={cls} style={{ marginBottom: '20px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e40af' }}>{cls}</span>
                                            <button
                                                onClick={() => toggleClassGroup(cls, studentsByClass[cls])}
                                                style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', background: '#eff6ff', color: '#1e40af', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                                            >
                                                {studentsByClass[cls].every(s => selectedStudents.some(sel => sel.id === s.id)) ? '전체 해제' : '전체 선택'}
                                            </button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                                            {studentsByClass[cls].map(s => {
                                                const isSelected = selectedStudents.some(sel => sel.id === s.id);
                                                return (
                                                    <div
                                                        key={s.id}
                                                        onClick={() => toggleStudent(s)}
                                                        style={{
                                                            padding: '10px', borderRadius: '8px', border: '1px solid',
                                                            borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
                                                            background: isSelected ? '#dbeafe' : 'white',
                                                            color: isSelected ? '#1e40af' : '#4b5563',
                                                            fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                                        }}
                                                    >
                                                        {isSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-gray-300" />}
                                                        <span style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>{s.number} {s.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="sc-modal-footer">
                                <button className="sc-modal-confirm-btn" onClick={() => setShowStudentModal(false)}>
                                    선택 완료 ({selectedStudents.length}명)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showQuestionModal && (
                    <div className="sc-modal-overlay" onClick={() => setShowQuestionModal(false)}>
                        <div className="sc-modal-box" onClick={e => e.stopPropagation()}>
                            <div className="sc-modal-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <h3>문항 선택</h3>
                                    <button
                                        type="button"
                                        onClick={() => setQuestionSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                                        title="정렬 순서 전환 (등록순 / 최신순)"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 10px',
                                            borderRadius: '999px',
                                            border: questionSortOrder === 'desc' ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                                            background: questionSortOrder === 'desc' ? '#eff6ff' : 'white',
                                            color: questionSortOrder === 'desc' ? '#1d4ed8' : '#475569',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <ArrowUpDown size={13} />
                                        {questionSortOrder === 'desc' ? '최신순 ↓' : '등록순 ↑'}
                                    </button>
                                </div>
                                <button className="sc-modal-close-btn" onClick={() => setShowQuestionModal(false)}>&times;</button>
                            </div>
                            <div className="sc-modal-body">
                                {[...roomQuestions]
                                    .sort((a, b) => (questionSortOrder === 'desc' ? b.id - a.id : a.id - b.id))
                                    .map(q => {
                                    const qIsTextbook = isTextbookQuestion(q);
                                    return (
                                        <div
                                            key={q.id}
                                            className={`sc-modal-item ${tempQuestion?.id === q.id ? 'selected' : ''}`}
                                            onClick={() => setTempQuestion(q)}
                                            style={{ justifyContent: 'center', textAlign: 'center' }}
                                        >
                                            <div style={{ marginBottom: '6px' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '2px 8px',
                                                    borderRadius: '999px',
                                                    background: qIsTextbook ? '#dcfce7' : '#ede9fe',
                                                    color: qIsTextbook ? '#166534' : '#5b21b6',
                                                    fontSize: '11px',
                                                    fontWeight: 700
                                                }}>
                                                    {qIsTextbook ? '[교과서]' : '[수능형]'}
                                                </span>
                                            </div>
                                            <div style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '16px' }}>문항 번호: {q.examCode}</div>
                                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>출처: {q.targetGrade || '-'}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="sc-modal-footer">
                                <button className="sc-modal-cancel-btn" onClick={() => setShowQuestionModal(false)}>취소</button>
                                <button className="sc-modal-confirm-btn" onClick={handleQuestionConfirm} disabled={!tempQuestion}>선택 완료</button>
                            </div>
                        </div>
                    </div>
                )}
                {showSentenceModal && (
                    <div className="sc-modal-overlay" onClick={() => setShowSentenceModal(false)}>
                        <div className="sc-modal-box" onClick={e => e.stopPropagation()}>
                            <div className="sc-modal-header">
                                <h3>문장 선택</h3>
                                <button className="sc-modal-close-btn" onClick={() => setShowSentenceModal(false)}>&times;</button>
                            </div>
                            <div className="sc-modal-body">
                                {sentences.map((s, i) => (
                                    <div
                                        key={i}
                                        className={`sc-modal-item ${selectedSentenceIndex === i ? 'selected' : ''}`}
                                        onClick={() => setSelectedSentenceIndex(i)}
                                    >
                                        <span style={{ fontWeight: 'bold', color: '#2563eb', marginRight: '8px' }}>{i + 1}</span>
                                        {s}
                                    </div>
                                ))}
                            </div>
                            <div className="sc-modal-footer">
                                <button className="sc-modal-cancel-btn" onClick={() => setShowSentenceModal(false)}>취소</button>
                                <button className="sc-modal-confirm-btn" onClick={handleSentenceSelect} disabled={selectedSentenceIndex === null || isLoading}>분석 요청</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    } // End Chat View

    return null;
}
