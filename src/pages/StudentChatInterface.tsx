import React, { useState, useEffect, useRef } from 'react';
import type { Student, Question, LogicFlowStep } from '../types';

import { fetchRoomData } from '../lib/public-api';
import { Send, User, Bot, Users, ArrowLeft, CheckSquare, Square } from 'lucide-react';

type FAQItem = { type: 'single'; text: string } | { type: 'group'; label: string; items: string[] };

const FAQ_ITEMS: FAQItem[] = [
    { type: 'single', text: '이 글의 우리말 주제는 뭘까?' },
    {
        type: 'group',
        label: '논리적 흐름 분석 (3단계)',
        items: [
            '이 글을 의미 기준으로 나눈다면 몇 부분으로 나눌 수 있어?',
            "의미 기준으로 나눠진 각 부분들의 중심 내용과 논리적 흐름을 정리해줄래?",
            "이 글의 논리적 흐름을 정리해줘. 만약 지문에 '영어 연결어'가 있다면, 논리적 흐름에 맞는 '영어 연결어'를 답변에 포함시켜줘."
        ]
    },
    { type: 'single', text: '이 글에서 중요한 단어 5개만 뽑아서, 의미와 함께 알려줘.' },
    { type: 'single', text: '구두점 기준으로 n번째 영어 문장을 문법적으로 분석하고 문맥에 맞게 해석해줘.' }
];

// Flatten FAQ items for click handling: returns { text, isSentenceModal }
function getFlatFAQIndex(): { text: string; isSentenceModal: boolean }[] {
    const flat: { text: string; isSentenceModal: boolean }[] = [];
    for (const item of FAQ_ITEMS) {
        if (item.type === 'single') {
            flat.push({ text: item.text, isSentenceModal: item.text.startsWith('구두점') });
        } else {
            for (const sub of item.items) {
                flat.push({ text: sub, isSentenceModal: false });
            }
        }
    }
    return flat;
}
const FLAT_FAQ = getFlatFAQIndex();

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
    type Message = { role: 'user' | 'assistant' | 'system'; content: string; isGroup?: boolean; context?: string; repeatCount?: number };
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [faqClickCounts, setFaqClickCounts] = useState<Record<string, number>>({});
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

    const getContextString = (q: Question) => {
        const logicFlowParts = safeParseLogicFlow(q.logicFlow);
        const logicFlowInfo = logicFlowParts.length > 0
            ? `\n\n★ 교사 논리 흐름 데이터 (총 ${logicFlowParts.length}부분 - 이 부분 수가 유일한 정답) ★\n${logicFlowParts.map((step, i) => `부분 ${i + 1}: [${step.role || '역할미정'}] ${step.content}${step.conjunction ? ` (연결어: ${step.conjunction})` : ''}`).join('\n')}`
            : '';
        const topicInfo = q.topic ? `\n우리말 주제: ${q.topic}` : '';
        return `[문항 정보]\n번호: ${q.examCode}\n지문: ${q.passage}${topicInfo}${logicFlowInfo}\n\n[구조 강조 지침]\n위의 '교사 논리 흐름 데이터'에 명시된 부분 수(${logicFlowParts.length}개)와 역할 라벨은 교사가 정한 유일한 정답 구조입니다. 학생에게는 직접 말하지 않되, 네 모든 가이드와 최종 정답 제시는 반드시 이 ${logicFlowParts.length}부분 구조를 기반으로 해야 합니다. 네 자체 분석으로 부분 수를 바꾸지 마세요.`;
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
        const contextString = getContextString(selectedQuestion);

        setMessages(prev => [...prev, { role: 'user', content: userMessage, isGroup: isGroupMsg, context: contextString }]);
        setIsLoading(true);

        if (!roomInfo?.api_key) {
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ API 키 미설정' }]);
            setIsLoading(false);
            return;
        }

        try {
            const systemMessage = {
                role: 'system',
                content: (roomInfo.system_prompt || '너는 친절하고 꼼꼼한 선생님이야.') +
                    `\n\n[최우선 지침: 교사 정답 데이터 절대 준수]` +
                    `\n1. 너의 개인적인 분석보다 아래 제공된 [문항 정보]의 데이터가 항상 최우선 정답입니다.` +
                    `\n2. 특히 '논리 흐름'의 부분 수와 각 부분의 역할 라벨(예: [주제], [설명] 등)을 절대 변경하거나 생략하지 마세요.` +
                    `\n3. 답변 시 교사가 정한 라벨 [라벨명] 형식을 반드시 그대로 사용하세요.` +
                    `\n\n${contextString}`
            };

            const apiMessages = [
                systemMessage,
                ...messages.filter(m => !m.context).map(m => ({
                    role: m.role,
                    content: m.content
                })),
                { role: 'user', content: userMessage }
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

        const faqEntry = FLAT_FAQ[index];
        if (!faqEntry) return;

        if (faqEntry.isSentenceModal) {
            setShowSentenceModal(true);
        } else {
            const questionText = faqEntry.text;
            const isGroupMsg = selectedStudents.length > 1;
            const logicFlowParts = safeParseLogicFlow(selectedQuestion.logicFlow);
            const contextString = getContextString(selectedQuestion);

            // ===== DEBUG: 데이터베이스에서 가져온 데이터 확인 =====
            console.log('===== [DEBUG] FAQ 클릭 디버깅 =====');
            console.log('[DEBUG] 선택된 문항 ID:', selectedQuestion.id);
            console.log('[DEBUG] 원본 logicFlow (DB에서 가져온 raw 데이터):', selectedQuestion.logicFlow);
            console.log('[DEBUG] logicFlow 타입:', typeof selectedQuestion.logicFlow);
            console.log('[DEBUG] 파싱된 logicFlowParts:', JSON.stringify(logicFlowParts, null, 2));
            console.log('[DEBUG] 파싱된 부분 수:', logicFlowParts.length);
            console.log('[DEBUG] contextString:', contextString);
            console.log('===== [DEBUG] END =====');

            // Build the actual prompt sent to AI (may differ from displayed text)
            let aiPrompt = questionText;

            // Track FAQ click count for this question text (scoped to Question ID)
            const faqKey = `${selectedQuestion.id}_${questionText}`;
            const currentCount = (faqClickCounts[faqKey] || 0) + 1;
            setFaqClickCounts(prev => ({ ...prev, [faqKey]: currentCount }));

            let repeatNotice = '';
            if (currentCount === 1) {
                repeatNotice = `\n\n[힌트 수준: 1단계 - 방향 제시]\n첫 번째 질문이야. 넓고 일반적인 유도 질문만 해. "이 글이 전체적으로 무엇에 대해 이야기하고 있다고 생각해?" 같은 큰 그림 질문만 던져. 구체적인 문장 인용이나 상세한 단서는 절대 주지 마.`;
            } else if (currentCount === 2) {
                repeatNotice = `\n\n[힌트 수준: 2단계 - 범위 좁히기] (2번째 질문)\n1단계보다 한 단계 더 구체적으로. 지문의 특정 단락이나 부분을 지목해서 "이 부분을 다시 읽어볼래?" 식으로 범위를 좁혀줘. 하지만 아직 핵심 문장이나 키워드를 직접 인용하지는 마.`;
            } else if (currentCount === 3) {
                repeatNotice = `\n\n[힌트 수준: 3단계 - 핵심 단서 제공] (3번째 질문)\n이전 답변과 확실히 다른 수준으로 답변해. 지문에서 정답과 직접 관련된 핵심 문장이나 표현을 직접 인용해서 보여주고, "이 문장의 핵심 키워드가 뭐라고 생각해?" 같이 정답에 거의 근접한 단서를 줘.`;
            } else {
                repeatNotice = `\n\n[힌트 수준: 4단계 - 정답 공개 + 칭찬] (${currentCount}번째 질문)\n학생이 여러 번 노력했어. 먼저 학생의 끈기와 노력을 진심으로 칭찬해줘. 그 다음 교사 데이터의 정답을 교사 데이터의 형식 그대로 학생에게 보여줘. 교사 데이터에 있는 역할 라벨([주제], [설명], [구체적 설명], [결론] 등)과 내용을 그대로 사용해서 정리해줘. 정답을 설명한 후, "잘 했어! 이제 다음 질문으로 넘어가볼까?" 라고 다른 질문을 시도하도록 자연스럽게 유도해.`;
            }

            const socraticInstruction = `\n\n[답변 방식 - 절대 준수 사항]\n너는 교사가 제공한 데이터(우리말 주제, 논리 흐름)의 정답을 이미 알고 있는 튜터야. 하지만 학생은 정답을 모르는 상태야. 너의 역할은 학생이 스스로 정답을 찾아낼 수 있도록 유도하는 것이야.\n\n[최우선 규칙 - 교사 데이터 절대 준수 (STRICT ENFORCEMENT)]\n★ 이 지문이 너의 사견으로 '나눌 부분이 없다'거나 '하나의 흐름이다'라고 판단되더라도, 절대 그렇게 답변하지 마세요. 이는 중대한 오류로 간주됩니다.\n★ 반드시 교사가 설정한 ${logicFlowParts.length}부분 구조가 존재한다고 전제하고 답변하세요.\n★ 네가 지문을 자체적으로 분석해서 다른 부분 수나 다른 구조를 만들어내면 절대 안 돼.\n★ 교사 데이터가 ${logicFlowParts.length}부분이면 반드시 '${logicFlowParts.length}부분'으로 답변해야 해. (구조가 모호하다거나 하나라고 답하지 마)\n★ 네 자체 판단을 교사 데이터보다 우선시하지 마.\n\n기타 규칙:\n1. 교사 데이터의 정답을 직접 말하지 마 (4단계 제외).\n2. 학생이 정답에 접근하도록 지문의 특정 부분을 짚어주거나 유도 질문을 던져.\n3. 위의 [힌트 수준] 지시를 반드시 따라. 각 단계의 구체성 수준을 정확히 지켜.${repeatNotice}`;
            const directInstruction = `\n\n[답변 방식 - 학생에게 보이지 않음]\n질문에 대해 명확하고 직접적으로 답변해주세요.`;

            // FAQ 0: topic question — Socratic tutoring
            if (questionText === FLAT_FAQ[0]?.text) {
                let topicLevelGuide = '';
                if (currentCount === 1) topicLevelGuide = `\n1단계 안내: "글 전체에서 가장 중요하게 다루는 대상이 무엇인지 생각해볼까?" 처럼 아주 넓은 범위에서 질문해. 키워드나 주제의 핵심 내용은 절대 언급하지 마.`;
                else if (currentCount === 2) topicLevelGuide = `\n2단계 안내: 주제와 관련된 핵심 키워드 중 하나를 살짝 언급하며 "이 키워드와 관련해서 필자가 하고 싶은 말이 무엇일까?" 라고 유도해.`;
                else if (currentCount === 3) topicLevelGuide = `\n3단계 안내: 주제문의 위치를 알려주거나(예: 첫 번째 문장 등), 주제의 절반 정도를 완성해서 보여주고 나머지를 채우게 해.`;
                else topicLevelGuide = `\n4단계 안내: 학생의 노력을 칭찬해줘. 그리고 교사 데이터의 정답('우리말 주제')을 그대로 보여준 후, "정말 잘 찾아냈어! 이제 다음 단계로 가볼까?" 라고 다음 질문을 시도하도록 자연스럽게 유도해.`;

                aiPrompt = `${questionText}\n\n[교사 데이터 - 우리말 주제]\n${selectedQuestion.topic || '없음'}\n\n위의 주제 데이터를 기반으로 답변해줘.${topicLevelGuide}${socraticInstruction}`;
            }
            // Step 1: initial part count — Socratic tutoring
            else if (questionText === FLAT_FAQ[1]?.text && selectedQuestion.logicFlow) {
                let step1LevelGuide = '';
                if (currentCount === 1) {
                    step1LevelGuide = `\n1단계 안내: "글의 흐름이 바뀌는 부분이 어디인지 지문을 다시 한번 읽어볼까?" 라고만 해. 부분 수를 절대 직접 언급하지 마. (단, 부분이 없다고 말하는 것은 절대 금지이며, 나누어지는 부분이 존재함을 암시하세요)`;
                } else if (currentCount === 2) {
                    step1LevelGuide = `\n2단계 안내: "지문을 크게 두 부분 혹은 세 부분 이상으로 나눌 수 있을 것 같아. 다시 한번 살펴볼래?" 처럼 대략적인 범위를 줘.`;
                } else if (currentCount === 3) {
                    step1LevelGuide = `\n3단계 안내: "이 글은 ${logicFlowParts.length - 1}부분일까, 아니면 ${logicFlowParts.length}부분일까?" 처럼 정답에 근접한 보기를 줘.`;
                } else {
                    const actualLabels = logicFlowParts.map(s => `[${s.role}]`).join(', ');
                    step1LevelGuide = `\n4단계 안내: 학생의 노력을 칭찬해줘. 그리고 교사 데이터의 정답을 교사 데이터 형식 그대로 보여줘: 정확한 부분 수(${logicFlowParts.length}개)와 각 부분의 역할 라벨(${actualLabels})을 포함해서 알려줘. 다음 질문(Step 2)으로 넘어가도록 유도해.`;
                }
                aiPrompt = `${questionText}\n\n[최우선 지침: 교사 데이터 강제 준수]\n이 지문은 교사 데이터에 따라 정확히 ${logicFlowParts.length}부분으로 나뉩니다. "나눌 수 없다"거나 "하나다"라고 하는 것은 오답입니다. 반드시 이 구조를 인정하고 유도하세요.\n\n[교사 데이터 - 논리 흐름 요약]\n부분 수: ${logicFlowParts.length}\n구조: ${logicFlowParts.map(s => `[${s.role}]`).join(' -> ')}\n\n위 데이터를 기반으로 답변해줘.${step1LevelGuide}${socraticInstruction}`;
            }
            // Step 2: central content and logical flow — Socratic tutoring with level-specific guidance
            else if (questionText === FLAT_FAQ[2]?.text && selectedQuestion.logicFlow) {
                let step2LevelGuide = '';
                if (currentCount === 1) {
                    step2LevelGuide = `\n1단계 안내: "각 부분이 어떤 역할을 하고 있다고 생각해?" 같은 일반적인 질문만 해. 역할 라벨이나 구체적 내용의 힌트는 주지 마.`;
                } else if (currentCount === 2) {
                    step2LevelGuide = `\n2단계 안내: "첫 번째 부분은 글의 핵심 주장을 담고 있는 것 같은데, 두 번째 부분은 어떤 역할일까?" 식으로 일부 부분의 역할을 암시하며 나머지를 유도해.`;
                } else if (currentCount === 3) {
                    step2LevelGuide = `\n3단계 안내: 각 부분의 핵심 문장을 직접 인용하고 "이 문장이 이 부분의 중심 역할을 말해주는데, 어떤 역할이라고 생각해?" 같이 거의 답에 가까운 단서를 줘.`;
                } else {
                    const actualLabels = logicFlowParts.map(s => `[${s.role}]`).join(', ');
                    step2LevelGuide = `\n4단계 안내: 학생의 노력을 칭찬해줘. 그리고 교사 데이터의 정답을 교사 데이터 형식 그대로 보여줘: 각 부분의 역할 라벨(${actualLabels})과 중심 내용을 교사 데이터와 '토씨 하나 틀리지 않게' 그대로 사용해서 정리해줘. 다음 질문(Step 3)으로 넘어가도록 유도해.`;
                }
                aiPrompt = `${questionText}\n\n[최우선 지침: 교사 데이터 강제 준수]\n부분 수(${logicFlowParts.length}개)와 역할 구조를 절대 변경하지 마세요. 자체 분석 금지.\n\n[교사 데이터 - 논리 흐름 디테일]\n${logicFlowParts.map((s, i) => `부분 ${i + 1}: [${s.role}] ${s.content}`).join('\n')}\n\n위 데이터를 기반으로 답변해줘.${step2LevelGuide}${socraticInstruction}`;
            }
            // Step 3: logical flow summary (Role + Conjunction) - Direct
            else if (questionText === FLAT_FAQ[3]?.text && selectedQuestion.logicFlow) {
                const logicRoleLabels = logicFlowParts.map(s => s.role || '역할미정');
                const conjunctionList = logicFlowParts
                    .map(s => s.conjunction)
                    .filter(c => c && c.trim())
                    .join(', ');
                const structuredContent = logicFlowParts.map((s, i) => `부분 ${i + 1}(${s.role}): ${s.content}`).join('\n');
                aiPrompt = `${questionText}\n\n[교사 데이터 - 요약 대상 (STRICT)]\n논리적 역할 순서: ${logicRoleLabels.join(' -> ')}\n사용된 주요 연결어: ${conjunctionList || '없음'}\n각 부분별 중심 내용:\n${structuredContent}\n\n위의 교사 데이터에 '완벽히' 기반하여 요약해줘. 네가 역할을 새로 정의하지 마.`;
            }
            // FAQ 4: Vocabulary - Direct
            else if (questionText === FLAT_FAQ[4]?.text) {
                aiPrompt = `${questionText}${directInstruction}`;
            }

            setMessages(prev => [...prev, { role: 'user', content: questionText, isGroup: isGroupMsg, context: contextString, repeatCount: currentCount > 1 ? currentCount : undefined }]);
            setIsLoading(true);

            if (!roomInfo?.api_key) return;

            try {
                const systemMessage = {
                    role: 'system',
                    content: `[최우선 지침: 교사 정답 데이터 절대 준수 (STRICT MODE)]\n${contextString}\n\n` +
                        (roomInfo.system_prompt || '너는 친절하고 꼼꼼한 선생님이야.') +
                        `\n\n[주의: 데이터 부정 금지]\n1. 지문의 길이가 짧거나 내용이 긴밀하게 연결되어 있어도, 반드시 위 [문항 정보]에 명시된 부분 수와 구조에 따라 답변해야 합니다.\n2. "나눌 수 없다", "하나의 주제다" 등의 이유로 교사가 정한 구조를 부정하는 것은 엄격히 금지됩니다.\n3. 역할 라벨([주제], [설명1] 등)을 축약하거나 임의로 변경하지 마세요.`
                };

                const apiMessages = [
                    systemMessage,
                    ...messages.filter(m => !m.context).map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    { role: 'user', content: aiPrompt }
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
            setFaqClickCounts({}); // Reset FAQ click counts for new question
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
                            {(() => {
                                let flatIndex = 0;
                                return FAQ_ITEMS.map((item, itemIdx) => {
                                    if (item.type === 'single') {
                                        const idx = flatIndex++;
                                        return (
                                            <button key={itemIdx} className="sc-faq-item" onClick={() => handleFAQClick(idx)} style={{ padding: '8px 12px', fontSize: '12px' }}>
                                                {item.text}
                                            </button>
                                        );
                                    } else {
                                        const groupStartIdx = flatIndex;
                                        flatIndex += item.items.length;
                                        return (
                                            <div key={itemIdx} style={{
                                                background: '#e8f5e9',
                                                border: '1.5px solid #81c784',
                                                borderRadius: '10px',
                                                padding: '10px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '5px'
                                            }}>
                                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '2px', textAlign: 'left' }}>
                                                    {item.label}
                                                </div>
                                                {item.items.map((sub, subIdx) => (
                                                    <button
                                                        key={subIdx}
                                                        className="sc-faq-item"
                                                        onClick={() => handleFAQClick(groupStartIdx + subIdx)}
                                                        style={{
                                                            padding: '7px 10px',
                                                            fontSize: '12px',
                                                            background: '#f1f8e9',
                                                            border: '1px solid #a5d6a7',
                                                            textAlign: 'left'
                                                        }}
                                                    >
                                                        <span style={{ fontWeight: 'bold', color: '#2e7d32', marginRight: '6px' }}>Step {subIdx + 1}.</span>
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
                                <h3>문항 선택</h3>
                                <button className="sc-modal-close-btn" onClick={() => setShowQuestionModal(false)}>&times;</button>
                            </div>
                            <div className="sc-modal-body">
                                {roomQuestions.map(q => (
                                    <div
                                        key={q.id}
                                        className={`sc-modal-item ${tempQuestion?.id === q.id ? 'selected' : ''}`}
                                        onClick={() => setTempQuestion(q)}
                                        style={{ justifyContent: 'center', textAlign: 'center' }}
                                    >
                                        <div style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '16px' }}>{q.examCode}</div>
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
