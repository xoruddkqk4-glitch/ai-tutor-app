import React, { useState, useEffect, useRef } from 'react';
import type { Student, Question } from '../types';

import { fetchRoomData } from '../lib/public-api';
import { Send, User, Bot, Users, ArrowLeft, CheckSquare, Square } from 'lucide-react';

const FAQ_QUESTIONS = [
    "이 글의 우리말 주제는 뭘까?",
    "이 글의 논리적 흐름을 정리해줘. 흐름에 연결어를 포함해줘.",
    "이 글에서 중요한 단어 5개만 뽑아서, 의미와 함께 알려줘.",
    "구두점 기준으로 n번째 영어 문장을 문법적으로 분석하고 문맥에 맞게 해석해줘."
];

export default function StudentChatInterface() {
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
    type RoomInfo = {
        id: number;
        class_name: string;
        drive_folder_id?: string;
        google_script_url?: string;
        api_key?: string;
        system_prompt?: string;
    };
    const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [roomQuestions, setRoomQuestions] = useState<Question[]>([]);

    // Selected User Info (Multi-Select)
    const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);

    // Chat State
    // Chat State
    type Message = { role: 'user' | 'assistant' | 'system'; content: string; isGroup?: boolean; context?: string };
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Modals
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showSentenceModal, setShowSentenceModal] = useState(false);

    // Sentence Modal (FAQ 4)
    const [sentences, setSentences] = useState<string[]>([]);
    const [selectedSentenceIndex, setSelectedSentenceIndex] = useState<number | null>(null);

    // Temporary selections
    const [tempQuestion, setTempQuestion] = useState<Question | null>(null);

    // Track if this is a new session for Google Docs header
    const isNewDocSession = useRef(true);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Split passage
    useEffect(() => {
        if (selectedQuestion) {
            const sentenceArray = selectedQuestion.passage
                .split(/(?<=[.!?])\s+/)
                .filter(s => s.trim().length > 0);
            setSentences(sentenceArray);
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
            console.log('Room Data:', data);

            if (!data.room) throw new Error('방 정보를 찾을 수 없습니다.');

            setRoomInfo(data.room);
            setAllStudents(data.students || []);
            setRoomQuestions(data.questions || []);

            setStep('chat');
        } catch (error: any) {
            console.error(error);
            alert('입장 중 오류가 발생했습니다: ' + error.message);
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

        // Define context
        const contextString = `[문항 정보]\n번호: ${selectedQuestion.examCode}\n주제: ${selectedQuestion.topic}\n지문: ${selectedQuestion.passage}`;

        setMessages(prev => [...prev, { role: 'user', content: userMessage, isGroup: isGroupMsg, context: contextString }]);
        setIsLoading(true);

        if (!roomInfo?.api_key) {
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ API 키 미설정' }]);
            setIsLoading(false);
            return;
        }

        try {
            const apiMessages = [
                { role: 'system', content: roomInfo.system_prompt || '너는 친절하고 꼼꼼한 선생님이야.' },
                ...messages.map(m => ({
                    role: m.role,
                    content: m.context ? `${m.context}\n\n${m.content}` : m.content
                })),
                { role: 'user', content: `${contextString}\n\n질문: ${userMessage}` }
            ];

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${roomInfo.api_key}` },
                body: JSON.stringify({ model: 'gpt-4o', messages: apiMessages, temperature: 0.7 })
            });

            const data = await response.json();
            const aiContent = data.choices?.[0]?.message?.content || "응답 오류";
            const aiMsg: Message = { role: 'assistant', content: aiContent };
            setMessages(prev => [...prev, aiMsg]);

            // Real-time save
            saveTurnToGAS(userMessage, aiMsg, isGroupMsg);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `오류: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const saveTurnToGAS = async (userMsgText: string, aiMsg: Message, isGroup: boolean) => {
        if (!roomInfo?.google_script_url || selectedStudents.length === 0) return;

        try {
            const userMsgObj: Message = { role: 'user', content: userMsgText, isGroup };

            const savePromises = selectedStudents.map(student => {
                const fileName = `[${(student as any).class || student.className || roomInfo.class_name}] ${student.number}번 ${student.name}`;
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
        if (selectedStudents.length === 0) {
            alert('학생을 먼저 선택해주세요.');
            return;
        }
        if (!selectedQuestion) {
            alert('문항을 먼저 선택해주세요!');
            return;
        }

        if (index === 3) {
            setShowSentenceModal(true);
        } else {
            const questionText = FAQ_QUESTIONS[index];
            const isGroupMsg = selectedStudents.length > 1;
            const contextString = `[문항 정보]\n번호: ${selectedQuestion.examCode}\n지문: ${selectedQuestion.passage}`;

            setMessages(prev => [...prev, { role: 'user', content: questionText, isGroup: isGroupMsg, context: contextString }]);
            setIsLoading(true);

            if (!roomInfo?.api_key) return;

            try {
                const apiMessages = [
                    { role: 'system', content: roomInfo.system_prompt || '너는 친절하고 꼼꼼한 선생님이야.' },
                    ...messages.map(m => ({
                        role: m.role,
                        content: m.context ? `${m.context}\n\n${m.content}` : m.content
                    })),
                    { role: 'user', content: `${contextString}\n\n질문: ${questionText}` }
                ];
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${roomInfo.api_key}` },
                    body: JSON.stringify({ model: 'gpt-4o', messages: apiMessages, temperature: 0.7 })
                });
                const data = await response.json();
                const aiContent = data.choices?.[0]?.message?.content || "응답 오류";
                const aiMsg: Message = { role: 'assistant', content: aiContent };
                setMessages(prev => [...prev, aiMsg]);

                // Real-time save
                saveTurnToGAS(questionText, aiMsg, isGroupMsg);
            } catch (error: any) {
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSentenceSelect = async () => {
        if (selectedSentenceIndex === null || !selectedQuestion) return;
        const sentence = sentences[selectedSentenceIndex];
        const questionText = `구두점 기준으로 ${selectedSentenceIndex + 1}번째 영어 문장을 문법적으로 분석하고 문맥에 맞게 해석해줘: "${sentence}"`;
        const isGroupMsg = selectedStudents.length > 1;
        const contextString = `[문항 정보]\n번호: ${selectedQuestion.examCode}\n지문: ${selectedQuestion.passage}`;

        setMessages(prev => [...prev, { role: 'user', content: questionText, isGroup: isGroupMsg, context: contextString }]);
        setShowSentenceModal(false);
        setSelectedSentenceIndex(null);
        setIsLoading(true);

        if (!roomInfo?.api_key) return;
        try {
            const apiMessages = [
                { role: 'system', content: roomInfo.system_prompt || '너는 친절하고 꼼꼼한 선생님이야.' },
                ...messages.map(m => ({
                    role: m.role,
                    content: m.context ? `${m.context}\n\n${m.content}` : m.content
                })),
                { role: 'user', content: `${contextString}\n\n요청: ${questionText}` }
            ];
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${roomInfo.api_key}` },
                body: JSON.stringify({ model: 'gpt-4o', messages: apiMessages, temperature: 0.7 })
            });
            const data = await response.json();
            const aiMsg: Message = { role: 'assistant', content: data.choices[0].message.content };
            setMessages(prev => [...prev, aiMsg]);

            // Real-time save
            saveTurnToGAS(questionText, aiMsg, isGroupMsg);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
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
        isNewDocSession.current = true; // Reset session flag
    };

    const handleQuestionConfirm = () => {
        if (tempQuestion) {
            setSelectedQuestion(tempQuestion);
            // Reset history for the new question
            setMessages([{
                role: 'assistant',
                content: `"${tempQuestion.examCode}" 문항이 선택되었습니다.`
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
                    onClick={() => window.location.href = '/'}
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
                <div style={{ background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏫</div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>AI Tutor 교실</h1>
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
            const cls = (student as any).class || student.className || '기타';
            if (!acc[cls]) acc[cls] = [];
            acc[cls].push(student);
            return acc;
        }, {} as Record<string, Student[]>);
        const classList = Object.keys(studentsByClass).sort();

        // Check if student selected
        const isStudentSelected = selectedStudents.length > 0;

        return (
            <div className="sc-desktop-layout">
                {/* Left: Chat Panel */}
                <div className="sc-main-panel">
                    <button className="sc-save-exit-btn" onClick={handleBackToRoom}>
                        <ArrowLeft size={18} /> 뒤로가기
                    </button>

                    <div className="sc-chat-title-header">
                        <span>AI Tutor (Room Code: {roomNumber})</span>
                    </div>

                    <div className="sc-chat-desktop-area">
                        {!selectedQuestion && (
                            <div style={{ textAlign: 'center', marginTop: '100px', color: '#aaa' }}>
                                <div style={{ fontSize: '32px', marginBottom: '20px' }}>👉</div>
                                <div>오른쪽에서 학생과 문항을 선택해주세요.</div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`sc-message-row ${msg.role}`}>
                                <div className={`sc-message-bubble ${msg.role === 'user' ? (msg.isGroup ? 'sc-bubble-group' : 'sc-bubble-user') : 'sc-bubble-assistant'}`}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11px', opacity: 0.8 }}>
                                        {msg.role === 'user' ? (
                                            msg.isGroup ? <><Users size={12} /> 모둠</> : <><User size={12} /> 나</>
                                        ) : <><Bot size={12} /> AI</>}
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

                {/* Right: Sidebar Controls - Compact Mode */}
                <div className="sc-sidebar-panel" style={{ padding: '12px', gap: '12px' }}>

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
                        <div className="sc-question-display" style={{ fontSize: '12px' }}>
                            {selectedQuestion ? `${selectedQuestion.examCode}` : '(선택 안됨)'}
                        </div>
                    </div>

                    {/* FAQ (Yellow) */}
                    <div className="sc-card sc-card-yellow" style={{ opacity: (isStudentSelected && selectedQuestion) ? 1 : 0.5, pointerEvents: (isStudentSelected && selectedQuestion) ? 'auto' : 'none', padding: '16px' }}>
                        <div className="sc-card-title" style={{ color: '#92400e', marginBottom: '8px', fontSize: '14px' }}>3. 추천 질문</div>
                        <div className="sc-faq-list" style={{ gap: '6px' }}>
                            {FAQ_QUESTIONS.map((q, i) => (
                                <button key={i} className="sc-faq-item" onClick={() => handleFAQClick(i)} style={{ padding: '8px 12px', fontSize: '12px' }}>
                                    {q}
                                </button>
                            ))}
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
                                <h3>문항 선택</h3>
                                <button className="sc-modal-close-btn" onClick={() => setShowQuestionModal(false)}>&times;</button>
                            </div>
                            <div className="sc-modal-body">
                                {roomQuestions.map(q => (
                                    <div
                                        key={q.id}
                                        className={`sc-modal-item ${tempQuestion?.id === q.id ? 'selected' : ''}`}
                                        onClick={() => setTempQuestion(q)}
                                    >
                                        <div style={{ fontWeight: 'bold', color: '#2563eb' }}>{q.examCode}</div>
                                        <div style={{ fontSize: '13px', color: '#555' }}>{q.topic}</div>
                                    </div>
                                ))}
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
                                <button className="sc-modal-confirm-btn" onClick={handleSentenceSelect} disabled={selectedSentenceIndex === null}>분석 요청</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    } // End Chat View

    return null;
}
