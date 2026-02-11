import React, { useState, useEffect, useRef } from 'react';
import type { Student, Question } from '../types';

/**
 * [목 데이터]
 * 백엔드(Supabase) 연동 전 UI 테스트를 위한 더미 데이터입니다.
 */
const MOCK_STUDENTS: Student[] = [
    { id: 1, number: 1, name: '강민지', competency: '상', className: '1반' },
    { id: 2, number: 2, name: '김철수', competency: '중', className: '1반' },
    { id: 3, number: 3, name: '이영희', competency: '하', className: '2반' },
    { id: 4, number: 4, name: '박지성', competency: '상', className: '2반' },
    { id: 5, number: 5, name: '손흥민', competency: '최상', className: '1반' },
];

const MOCK_QUESTIONS: Question[] = [
    {
        id: 1,
        examCode: '2024-1학기-64번',
        topic: '문화적 혁신',
        passage: `이전 아이디어를 기반으로 아웃워치되는 근거는 다른 부분에서 확인할 수 있습니다. "Ideas are worked out as logical implications or consequences of other accepted ideas, and it is in this way that cultural innovations and discoveries are possible.

를 우리말로 해석하면: "아이디어는 다른 받아들여진 아이디어의 논리적 함의나 결과로 발전되며, 이러한 방식으로 문화적 혁신이나 발견이 가능하다는 것입니다. 이해가 어렵다면, 어떤 부분이 더 궁금한지 추가로 알려주세요!`
    },
    {
        id: 2,
        examCode: '2024-1학기-65번',
        topic: 'AI 윤리',
        passage: 'Artificial Intelligence ethics are becoming increasingly important in modern society.'
    },
    {
        id: 3,
        examCode: '2024-1학기-66번',
        topic: '고대 문명',
        passage: 'Ancient civilizations developed complex systems of governance.'
    },
    {
        id: 4,
        examCode: '2024-1학기-67번',
        topic: '환경 보호',
        passage: 'Environmental protection requires collective action from all nations.'
    },
];

const FAQ_QUESTIONS = [
    "이 글의 우리말 주제는 뭘까?",
    "이 글의 논리적 흐름을 정리해줘. 흐름에 연결어를 포함해줘.",
    "이 글에서 중요한 단어 5개만 뽑아서, 의미와 함께 알려줘.",
    "구두점 기준으로 n번째 영어 문장을 문법적으로 분석하고 문맥에 맞게 해석해줘."
];

export default function StudentChatInterface() {
    // --- State Management ---
    const [step, setStep] = useState<'room' | 'chat'>('room');
    const [roomNumber, setRoomNumber] = useState('');

    const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);

    // Chat
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Modals
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showSentenceModal, setShowSentenceModal] = useState(false);

    // Sentence Modal
    const [sentences, setSentences] = useState<string[]>([]);
    const [selectedSentenceIndex, setSelectedSentenceIndex] = useState<number | null>(null);

    // Temporary selections for modals
    const [tempStudents, setTempStudents] = useState<Student[]>([]);
    const [tempQuestion, setTempQuestion] = useState<Question | null>(null);

    // Get unique classes from students
    const uniqueClasses = Array.from(new Set(MOCK_STUDENTS.map(s => s.className || '기타'))).sort();

    // Get students for selected class
    const classStudents = selectedClass
        ? MOCK_STUDENTS.filter(s => (s.className || '기타') === selectedClass)
        : [];

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Split passage into sentences when question is selected
    useEffect(() => {
        if (selectedQuestion) {
            const sentenceArray = selectedQuestion.passage
                .split(/(?<=[.!?])\s+/)
                .filter(s => s.trim().length > 0);
            setSentences(sentenceArray);
        }
    }, [selectedQuestion]);

    // --- Handlers ---
    const handleRoomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomNumber.trim()) {
            setStep('chat');
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        // Simulate AI response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '이 부분에 대해 더 자세히 설명해드리겠습니다. 어떤 부분이 궁금하신가요?'
            }]);
            setIsLoading(false);
        }, 1000);
    };

    const handleFAQClick = (index: number) => {
        if (index === 3) {
            // FAQ 4: Open sentence modal
            setShowSentenceModal(true);
        } else {
            // FAQ 1-3: Send question directly
            const question = FAQ_QUESTIONS[index];
            setMessages(prev => [...prev, { role: 'user', content: question }]);
            setIsLoading(true);

            setTimeout(() => {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `"${question}"에 대한 답변입니다...`
                }]);
                setIsLoading(false);
            }, 1000);
        }
    };

    const handleSentenceSelect = () => {
        if (selectedSentenceIndex === null) return;

        const sentence = sentences[selectedSentenceIndex];
        const question = `구두점 기준으로 ${selectedSentenceIndex + 1}번째 영어 문장을 문법적으로 분석하고 문맥에 맞게 해석해줘: "${sentence}"`;

        setMessages(prev => [...prev, { role: 'user', content: question }]);
        setShowSentenceModal(false);
        setSelectedSentenceIndex(null);
        setIsLoading(true);

        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `${selectedSentenceIndex + 1}번째 문장에 대한 문법 분석과 해석입니다...`
            }]);
            setIsLoading(false);
        }, 1000);
    };

    const handleClassClick = (className: string) => {
        setSelectedClass(className);
        setTempStudents([]);
        setShowStudentModal(true);
    };

    const handleStudentToggle = (student: Student) => {
        setTempStudents(prev => {
            const exists = prev.find(s => s.id === student.id);
            if (exists) {
                return prev.filter(s => s.id !== student.id);
            } else {
                return [...prev, student];
            }
        });
    };

    const handleStudentConfirm = () => {
        if (tempStudents.length > 0) {
            setSelectedStudents(tempStudents);
            setShowStudentModal(false);
            setTempStudents([]);
        }
    };

    const handleQuestionConfirm = () => {
        if (tempQuestion) {
            setSelectedQuestion(tempQuestion);
            setShowQuestionModal(false);
            setTempQuestion(null);
        }
    };

    const getStudentDisplayText = () => {
        if (selectedStudents.length === 0) return '';
        return selectedStudents.map(s => `${s.number}번 ${s.name}`).join(', ');
    };

    // Room Number Input Step
    if (step === 'room') {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '20px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    padding: '48px',
                    maxWidth: '500px',
                    width: '100%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        fontSize: '48px',
                        textAlign: 'center',
                        marginBottom: '16px'
                    }}>
                        🏫
                    </div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 900,
                        textAlign: 'center',
                        marginBottom: '12px',
                        color: '#222'
                    }}>
                        AI 챗봇
                    </h1>
                    <p style={{
                        textAlign: 'center',
                        color: '#666',
                        marginBottom: '32px',
                        fontSize: '15px'
                    }}>
                        선생님이 알려주신 Room Number를 입력하세요
                    </p>
                    <form onSubmit={handleRoomSubmit}>
                        <input
                            type="text"
                            value={roomNumber}
                            onChange={(e) => setRoomNumber(e.target.value)}
                            placeholder="Room Number 입력"
                            style={{
                                width: '100%',
                                padding: '16px',
                                fontSize: '16px',
                                border: '2px solid #ddd',
                                borderRadius: '12px',
                                marginBottom: '16px',
                                fontFamily: 'inherit',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                            onBlur={(e) => e.target.style.borderColor = '#ddd'}
                        />
                        <button
                            type="submit"
                            disabled={!roomNumber.trim()}
                            style={{
                                width: '100%',
                                padding: '16px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                background: roomNumber.trim() ? '#fee500' : '#eee',
                                color: roomNumber.trim() ? '#222' : '#aaa',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: roomNumber.trim() ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s'
                            }}
                        >
                            입장하기
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="student-layout">
            {/* Left Panel: Chat Only */}
            <div className="student-left-panel">
                {/* Chat Area */}
                <div style={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'white'
                }}>
                    <div className="student-chat-messages" style={{ flex: 1, padding: '16px' }}>
                        {messages.length === 0 && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: '#999',
                                fontSize: '15px'
                            }}>
                                오른쪽에서 학생을 먼저 선택한 후, 질문하고자 하는 문항을 선택하세요
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                marginBottom: '12px'
                            }}>
                                <div style={{
                                    maxWidth: '70%',
                                    padding: '12px 16px',
                                    borderRadius: '18px',
                                    background: msg.role === 'user' ? '#fee500' : '#f2f2f2',
                                    color: msg.role === 'user' ? '#222' : '#333',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                                }}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{
                                    background: '#f2f2f2',
                                    padding: '12px 16px',
                                    borderRadius: '18px',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                                }}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <div style={{ width: '6px', height: '6px', background: '#999', borderRadius: '50%' }}></div>
                                        <div style={{ width: '6px', height: '6px', background: '#999', borderRadius: '50%' }}></div>
                                        <div style={{ width: '6px', height: '6px', background: '#999', borderRadius: '50%' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="student-chat-input-area">
                        <form onSubmit={handleSendMessage} className="student-chat-input-form">
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="질문을 입력하세요. Enter는 전송, Shift+Enter는 줄바꿈"
                                className="student-chat-input"
                                disabled={isLoading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="student-chat-send-button"
                            >
                                전송
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Right Panel: Controls + FAQ */}
            <div className="student-right-panel">
                {/* Student Selector */}
                <div className="student-selector-section" style={{ background: '#dbeafe' }}>
                    <div className="student-selector-title" style={{ textAlign: 'center' }}>
                        챗봇을 사용하는 학생을 선택해 주세요.
                    </div>
                    <div className="student-selector-buttons">
                        {uniqueClasses.map(className => (
                            <button
                                key={className}
                                onClick={() => handleClassClick(className)}
                                className="student-selector-button"
                            >
                                {className}
                            </button>
                        ))}
                    </div>
                    {selectedStudents.length > 0 && (
                        <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            background: 'white',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#222',
                            textAlign: 'center'
                        }}>
                            {getStudentDisplayText()}
                        </div>
                    )}
                </div>

                {/* Question Selector */}
                <div className="student-selector-section" style={{ background: '#ffe4e6' }}>
                    <div className="student-selector-title" style={{ textAlign: 'center' }}>
                        질문하고 싶은 문항을 선택해 주세요.
                    </div>
                    <button
                        onClick={() => setShowQuestionModal(true)}
                        disabled={selectedStudents.length === 0}
                        className="student-question-button"
                        style={{
                            background: selectedStudents.length === 0 ? '#eee' : 'white',
                            border: '2px solid #ddd',
                            color: selectedStudents.length === 0 ? '#aaa' : '#222',
                            cursor: selectedStudents.length === 0 ? 'not-allowed' : 'pointer',
                            opacity: selectedStudents.length === 0 ? 0.6 : 1
                        }}
                    >
                        문항 선택
                    </button>
                    {selectedQuestion && (
                        <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            background: 'white',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#222',
                            textAlign: 'center'
                        }}>
                            {selectedQuestion.examCode}
                        </div>
                    )}
                </div>

                {/* FAQ Section */}
                <div className="faq-section">
                    <div className="faq-title">FAQ</div>
                    <div className="faq-buttons">
                        {FAQ_QUESTIONS.map((question, index) => (
                            <button
                                key={index}
                                onClick={() => handleFAQClick(index)}
                                className="faq-button"
                                disabled={!selectedQuestion}
                                style={{
                                    opacity: selectedQuestion ? 1 : 0.5,
                                    cursor: selectedQuestion ? 'pointer' : 'not-allowed'
                                }}
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Student Selection Modal */}
            {showStudentModal && (
                <div className="sentence-modal-overlay" onClick={() => setShowStudentModal(false)}>
                    <div className="sentence-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="sentence-modal-header">
                            <div className="sentence-modal-title">학생 선택</div>
                            <div className="sentence-modal-subtitle">
                                {selectedClass} - 복수 선택 가능
                            </div>
                        </div>

                        <div className="sentence-list">
                            {classStudents.map((student) => (
                                <button
                                    key={student.id}
                                    onClick={() => handleStudentToggle(student)}
                                    className={`sentence-item ${tempStudents.find(s => s.id === student.id) ? 'selected' : ''}`}
                                >
                                    {student.number}번 {student.name}
                                </button>
                            ))}
                        </div>

                        <div className="sentence-modal-footer">
                            <button
                                onClick={() => {
                                    setShowStudentModal(false);
                                    setTempStudents([]);
                                }}
                                className="sentence-modal-button sentence-modal-button-cancel"
                            >
                                닫기
                            </button>
                            <button
                                onClick={handleStudentConfirm}
                                disabled={tempStudents.length === 0}
                                className="sentence-modal-button sentence-modal-button-confirm"
                            >
                                선택 완료 ({tempStudents.length}명)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Question Selection Modal */}
            {showQuestionModal && (
                <div className="sentence-modal-overlay" onClick={() => setShowQuestionModal(false)}>
                    <div className="sentence-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="sentence-modal-header">
                            <div className="sentence-modal-title">문항 선택</div>
                        </div>

                        <div className="sentence-list">
                            {MOCK_QUESTIONS.map((question) => (
                                <button
                                    key={question.id}
                                    onClick={() => setTempQuestion(question)}
                                    className={`sentence-item ${tempQuestion?.id === question.id ? 'selected' : ''}`}
                                >
                                    {question.examCode}
                                </button>
                            ))}
                        </div>

                        <div className="sentence-modal-footer">
                            <button
                                onClick={() => {
                                    setShowQuestionModal(false);
                                    setTempQuestion(null);
                                }}
                                className="sentence-modal-button sentence-modal-button-cancel"
                            >
                                닫기
                            </button>
                            <button
                                onClick={handleQuestionConfirm}
                                disabled={tempQuestion === null}
                                className="sentence-modal-button sentence-modal-button-confirm"
                            >
                                선택 완료
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sentence Selection Modal */}
            {showSentenceModal && (
                <div className="sentence-modal-overlay" onClick={() => setShowSentenceModal(false)}>
                    <div className="sentence-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="sentence-modal-header">
                            <div className="sentence-modal-title">문장 선택</div>
                            <div className="sentence-modal-subtitle">
                                구두점 기준으로 n번째 영어 문장을 분석하고 문맥에 맞게 해석해줘.
                            </div>
                        </div>

                        <div className="sentence-list">
                            {sentences.map((sentence, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedSentenceIndex(index)}
                                    className={`sentence-item ${selectedSentenceIndex === index ? 'selected' : ''}`}
                                >
                                    <span className="sentence-number">{index + 1}번째 문장</span>
                                    {sentence}
                                </button>
                            ))}
                        </div>

                        <div className="sentence-modal-footer">
                            <button
                                onClick={() => {
                                    setShowSentenceModal(false);
                                    setSelectedSentenceIndex(null);
                                }}
                                className="sentence-modal-button sentence-modal-button-cancel"
                            >
                                닫기
                            </button>
                            <button
                                onClick={handleSentenceSelect}
                                disabled={selectedSentenceIndex === null}
                                className="sentence-modal-button sentence-modal-button-confirm"
                            >
                                선택
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
