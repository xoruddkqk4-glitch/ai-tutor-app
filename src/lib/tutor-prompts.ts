import type { Question, RoomPublicInfo } from '../types';
import type { ChatApiMessage } from './ai';
import {
    getMacroBlocksDescription,
    getMacroOrderedLabels,
    hasMacroRefinement,
    safeParseLogicFlow,
} from './logic-flow';

export type FAQItem =
    | { type: 'single'; text: string }
    | { type: 'group'; label: string; items: string[] };

export const FAQ_ITEMS: FAQItem[] = [
    { type: 'single', text: '이 글의 우리말 주제는 뭘까?' },
    {
        type: 'group',
        label: '논리적 흐름 분석 (3단계)',
        items: [
            '이 글을 의미 기준으로 나눈다면 몇 부분으로 나눌 수 있어?',
            '의미 기준으로 나눠진 각 부분들의 중심 내용과 논리적 흐름을 정리해줄래?',
            "이 지문에 사용된 '영어 연결어'를 찾아주고, 각 연결어의 논리적 역할을 설명해줘.",
        ],
    },
    { type: 'single', text: '이 글에서 중요한 단어 5개만 뽑아서, 의미와 함께 알려줘.' },
    { type: 'single', text: '구두점 기준으로 n번째 영어 문장을 문법적으로 분석하고 문맥에 맞게 해석해줘.' },
];

export const FLAT_FAQ: { text: string; isSentenceModal: boolean }[] = FAQ_ITEMS.flatMap((item) =>
    item.type === 'single'
        ? [{ text: item.text, isSentenceModal: item.text.startsWith('구두점') }]
        : item.items.map((sub) => ({ text: sub, isSentenceModal: false }))
);

export const DEFAULT_SYSTEM_PROMPT = '너는 친절하고 꼼꼼한 선생님이야.';

export const TUTOR_BASE_RULES =
    `[최우선 지침: 교사 정답 데이터 절대 준수 (STRICT MODE)]\n` +
    `1. 너의 개인적인 분석보다 아래 [문항 정보]에 제공된 교사 데이터가 항상 최우선 정답입니다.\n` +
    `2. 특히 '논리 흐름'의 부분 수와 각 부분의 큰 범주·작은 범주(있는 경우) 라벨을 절대 변경하거나 축약·생략하지 말고, 답변 시 교사가 정한 라벨 형식을 그대로 사용하세요.\n` +
    `3. 지문이 짧거나 내용이 긴밀하게 연결되어 있어도, 교사가 정한 구조를 "나눌 수 없다"거나 "하나의 흐름/주제다"라고 부정하는 것은 엄격히 금지됩니다.\n` +
    `4. 학생이 정답을 직접 요청하거나 4단계 정답 공개 지시가 있기 전에는 교사 데이터의 정답(우리말 주제·논리 흐름·연결어 역할)을 먼저 직접 공개하지 마세요.`;

export function buildQuestionContext(q: Question): string {
    const logicFlowParts = safeParseLogicFlow(q.logicFlow);
    const macroRefine = hasMacroRefinement(logicFlowParts);
    const macroLabels = getMacroOrderedLabels(logicFlowParts);
    const macroBlockText = macroRefine
        ? `\n\n[교사 논리 흐름 — 큰 범주(의미 단위)]\n${getMacroBlocksDescription(logicFlowParts)}\n큰 범주 개수: ${macroLabels.length}\n큰 범주 순서: ${macroLabels.map((l) => `[${l}]`).join(' → ')}\n※ 추천 질문 Step 1(「의미 기준으로 몇 부분」): 1~2번째 클릭 시에는 큰 범주 기준으로만 유도하고, 3~4번째 클릭부터는 아래 세부 부분 수·작은 범주 라벨을 정답 기준으로 하세요. 그 외 Step 2·3 및 일반 질문은 항상 세부 구조를 따르세요.\n`
        : '';
    const logicFlowInfo =
        logicFlowParts.length > 0
            ? `\n\n★ 교사 논리 흐름 데이터 — 세부 부분 (총 ${logicFlowParts.length}부분, 세부 정답) ★\n${logicFlowParts
                  .map((step, i) => {
                      const macro = step.macroLabel?.trim() || '미입력';
                      const small = step.role?.trim();
                      const smallPart = small ? ` 작은 범주 [${small}]` : '';
                      return `부분 ${i + 1}: 큰 범주 [${macro}]${smallPart} ${step.content}${step.conjunction ? ` (연결어: ${step.conjunction})` : ''}`;
                  })
                  .join('\n')}`
            : '';
    const topicInfo = q.topic ? `\n우리말 주제: ${q.topic}` : '';
    const structureGuide =
        logicFlowParts.length > 0
            ? `\n\n[구조 강조 지침]\n최종·세부 정답은 위 세부 부분 ${logicFlowParts.length}개, 각 행의 큰 범주·작은 범주(있는 경우)·중심 의미입니다.${macroRefine ? ' 단, 추천 질문 Step 1의 앞 두 번(1~2단계 힌트)에 한해 큰 범주 기준으로 유도할 수 있습니다.' : ''} 학생에게는 상황에 맞게 직접 정답을 말하지 말고, 네 자체 분석으로 부분 수를 바꾸지 마세요.`
            : '';
    return `[문항 정보]\n문항 번호: ${q.examCode}\n출처: ${q.targetGrade || '-'}\n지문: ${q.passage}${topicInfo}${macroBlockText}${logicFlowInfo}${structureGuide}`;
}

/**
 * 매 턴 반복되는 앞부분(공통 튜터 규칙 + 교사 시스템 프롬프트 + 문항 정보)을 항상 동일한 순서와 문자열로 생성합니다.
 * 프롬프트 캐시 적중을 위해 입력이 같으면 바이트 단위로 동일한 메시지를 반환해야 합니다.
 */
export function buildPrefixMessages(roomInfo: RoomPublicInfo | null, q: Question): ChatApiMessage[] {
    const teacherPrompt = roomInfo?.system_prompt?.trim() || DEFAULT_SYSTEM_PROMPT;
    return [
        {
            role: 'system',
            content: `${TUTOR_BASE_RULES}\n\n[교사 기본 지침]\n${teacherPrompt}`,
        },
        {
            role: 'system',
            content: buildQuestionContext(q),
        },
    ];
}

export function buildSocraticStrictForPartCount(partCount: number, repeatNotice: string): string {
    return `\n\n[답변 방식 - 절대 준수 사항]\n너는 교사가 제공한 데이터(우리말 주제, 논리 흐름)의 정답을 이미 알고 있는 튜터야. 하지만 학생은 정답을 모르는 상태야. 너의 역할은 학생이 스스로 정답을 찾아낼 수 있도록 유도하는 것이야.\n\n[최우선 규칙 - 교사 데이터 절대 준수 (STRICT ENFORCEMENT)]\n★ 이 지문이 너의 사견으로 '나눌 부분이 없다'거나 '하나의 흐름이다'라고 판단되더라도, 절대 그렇게 답변하지 마세요. 이는 중대한 오류로 간주됩니다.\n★ 반드시 교사가 설정한 ${partCount}부분 구조가 존재한다고 전제하고 답변하세요.\n★ 네가 지문을 자체적으로 분석해서 다른 부분 수나 다른 구조를 만들어내면 절대 안 돼.\n★ 교사 데이터가 ${partCount}부분이면 반드시 '${partCount}부분'으로 답변해야 해. (구조가 모호하다거나 하나라고 답하지 마)\n★ 네 자체 판단을 교사 데이터보다 우선시하지 마.\n\n기타 규칙:\n1. 교사 데이터의 정답을 직접 말하지 마 (4단계 제외).\n2. 학생이 정답에 접근하도록 지문의 특정 부분을 짚어주거나 유도 질문을 던져.\n3. 위의 [힌트 수준] 지시를 반드시 따라. 각 단계의 구체성 수준을 정확히 지켜.${repeatNotice}`;
}

export interface BuildFaqUserPromptParams {
    questionText: string;
    question: Question;
    currentCount: number;
    messages: { role: string; content: string }[];
}

export function buildFaqUserPrompt({
    questionText,
    question,
    currentCount,
    messages,
}: BuildFaqUserPromptParams): string {
    const logicFlowParts = safeParseLogicFlow(question.logicFlow);

    let repeatNotice = '';
    if (currentCount === 1) {
        repeatNotice = `\n\n[힌트 수준: 1단계 - 방향 제시]\n첫 번째 질문이야. 넓고 일반적인 유도 질문만 해. "이 글이 전체적으로 무엇에 대해 이야기하고 있다고 생각해?" 같은 큰 그림 질문만 던져. 구체적인 문장 인용이나 상세한 단서는 절대 주지 마.`;
    } else if (currentCount === 2) {
        repeatNotice = `\n\n[힌트 수준: 2단계 - 범위 좁히기] (2번째 질문)\n1단계보다 한 단계 더 구체적으로. 지문의 특정 단락이나 부분을 지목해서 "이 부분을 다시 읽어볼래?" 식으로 범위를 좁혀줘. 하지만 아직 핵심 문장이나 키워드를 직접 인용하지는 마.`;
    } else if (currentCount === 3) {
        repeatNotice = `\n\n[힌트 수준: 3단계 - 핵심 단서 제공] (3번째 질문)\n이전 답변과 확실히 다른 수준으로 답변해. 지문에서 정답과 직접 관련된 핵심 문장이나 표현을 직접 인용해서 보여주고, "이 문장의 핵심 키워드가 뭐라고 생각해?" 같이 정답에 거의 근접한 단서를 줘.`;
    } else {
        repeatNotice = `\n\n[힌트 수준: 4단계 - 정답 공개 + 칭찬] (${currentCount}번째 질문)\n학생이 여러 번 노력했어. 먼저 학생의 끈기와 노력을 진심으로 칭찬해줘. 그 다음 교사 데이터의 정답을 교사 데이터의 형식 그대로 학생에게 보여줘. 교사 데이터에 있는 큰 범주·작은 범주·중심 의미를 그대로 사용해서 정리해줘. 정답을 설명한 후, "잘 했어! 이제 다음 질문으로 넘어가볼까?" 라고 다른 질문을 시도하도록 자연스럽게 유도해.`;
    }

    const socraticInstruction = buildSocraticStrictForPartCount(logicFlowParts.length, repeatNotice);

    // FAQ 0: 우리말 주제
    if (questionText === FLAT_FAQ[0]?.text) {
        let topicLevelGuide = '';
        if (currentCount === 1) {
            topicLevelGuide = `\n1단계 안내: "글 전체에서 가장 중요하게 다루는 대상이 무엇인지 생각해볼까?" 처럼 아주 넓은 범위에서 질문해. 키워드나 주제의 핵심 내용은 절대 언급하지 마.`;
        } else if (currentCount === 2) {
            topicLevelGuide = `\n2단계 안내: 주제와 관련된 핵심 키워드 중 하나를 살짝 언급하며 "이 키워드와 관련해서 필자가 하고 싶은 말이 무엇일까?" 라고 유도해.`;
        } else if (currentCount === 3) {
            topicLevelGuide = `\n3단계 안내: 주제문의 위치를 알려주거나(예: 첫 번째 문장 등), 주제의 절반 정도를 완성해서 보여주고 나머지를 채우게 해.`;
        } else {
            topicLevelGuide = `\n4단계 안내: 학생의 노력을 칭찬해줘. 그리고 교사 데이터의 정답('우리말 주제')을 그대로 보여준 후, "정말 잘 찾아냈어! 이제 다음 단계로 가볼까?" 라고 다음 질문을 시도하도록 자연스럽게 유도해.`;
        }

        return `${questionText}\n\n[교사 데이터 - 우리말 주제]\n${question.topic || '없음'}\n\n위의 주제 데이터를 기반으로 답변해줘.${topicLevelGuide}${socraticInstruction}`;
    }

    // Step 1: 몇 부분으로 나눌 수 있는지
    if (questionText === FLAT_FAQ[1]?.text && logicFlowParts.length > 0) {
        const macroLayerActive = hasMacroRefinement(logicFlowParts);
        const macroLabels = getMacroOrderedLabels(logicFlowParts);
        const macroCount = macroLabels.length;
        const detailCount = logicFlowParts.length;
        const useMacroPhase = macroLayerActive && currentCount <= 2;
        const strictCount = useMacroPhase ? macroCount : detailCount;

        let step1LevelGuide = '';
        if (useMacroPhase) {
            if (currentCount === 1) {
                step1LevelGuide = `\n1단계 안내 (큰 범주 기준): 글의 의미 흐름이 크게 바뀌는 지점을 떠올리게만 유도해. 아직 '몇 부분'이라는 숫자, 큰 범주 이름, 작은 범주 라벨(예: 설명1)은 직접 말하지 마. (부분이 없다고 말하는 것은 금지, 나눌 수 있음을 암시)`;
            } else {
                step1LevelGuide = `\n2단계 안내 (큰 범주 기준): 지문을 큰 의미 덩어리로 보면 대략 ${macroCount}개 전후의 흐름으로 나눌 수 있다는 뉘앙스만 줄여. 작은 범주 라벨은 아직 말하지 마.`;
            }
        } else if (currentCount === 1) {
            step1LevelGuide = `\n1단계 안내: "글의 흐름이 바뀌는 부분이 어디인지 지문을 다시 한번 읽어볼까?" 라고만 해. 부분 수를 절대 직접 언급하지 마. (단, 부분이 없다고 말하는 것은 절대 금지이며, 나누어지는 부분이 존재함을 암시하세요)`;
        } else if (currentCount === 2) {
            step1LevelGuide = `\n2단계 안내: "지문을 크게 두 부분 혹은 세 부분 이상으로 나눌 수 있을 것 같아. 다시 한번 살펴볼래?" 처럼 대략적인 범위를 줘.`;
        } else if (currentCount === 3) {
            step1LevelGuide = `\n3단계 안내: "이 글은 ${detailCount - 1}부분일까, 아니면 ${detailCount}부분일까?" 처럼 정답에 근접한 보기를 줘.`;
        } else {
            const actualLabels = logicFlowParts
                .map((s) => {
                    const sm = s.role?.trim();
                    if (sm) return `[${sm}]`;
                    const mac = s.macroLabel?.trim();
                    return mac ? `[${mac}]` : '[미지정]';
                })
                .join(', ');
            step1LevelGuide = `\n4단계 안내: 학생의 노력을 칭찬해줘. 그리고 정답으로 정확한 부분 수(${detailCount}개)와 각 부분을 식별하는 라벨(${actualLabels})만 알려줘. (작은 범주가 비어 있으면 큰 범주 라벨을 쓰면 됨)\n★★ 절대 금지: 각 부분의 중심 내용(content)은 이 단계에서 절대 알려주지 마. 중심 내용은 다음 질문(Step 2)에서 다룰 거야.\n"잘 했어! 이제 각 부분의 중심 내용을 알아보러 가볼까?" 라고 Step 2로 넘어가도록 유도해.`;
        }

        const step1Socratic = buildSocraticStrictForPartCount(strictCount, repeatNotice);
        const step1Core = useMacroPhase
            ? `[최우선 지침: 교사 데이터 강제 준수]\n이번 답변에서는 **큰 범주** 기준으로 지문이 정확히 ${macroCount}개의 의미 덩어리로 나뉜다고 전제하세요. "나눌 수 없다"거나 "하나다"라고 하는 것은 오답입니다.\n세부 행은 총 ${detailCount}개이나, 지금(1~2단계)은 큰 범주 라벨만 기준으로 유도하고 작은 범주 이름(예: 설명1)은 학생에게 직접 말하지 마세요.\n\n[교사 데이터 - 논리 흐름 요약 (이번 유도: 큰 범주만)]\n큰 범주 수: ${macroCount}\n큰 범주 구조: ${macroLabels.map((l) => `[${l}]`).join(' -> ')}\n\n[이 질문의 범위 제한]\n★ 부분 수·라벨은 위 큰 범주만 기준으로 말하세요.\n★ 작은 범주 라벨과 중심 내용(content)은 이번 답변에서 언급하지 마세요.\n`
            : `[최우선 지침: 교사 데이터 강제 준수]\n이 지문은 교사 데이터에 따라 정확히 ${detailCount}부분(세부)으로 나뉩니다. "나눌 수 없다"거나 "하나다"라고 하는 것은 오답입니다. 반드시 이 구조를 인정하고 유도하세요.${macroLayerActive ? `\n(참고: 앞 단계에서는 큰 범주 ${macroCount}덩어리로 유도했으며, 지금부터는 반드시 세부 ${detailCount}부분 기준입니다.)` : ''}\n\n[교사 데이터 - 논리 흐름 요약 (세부)]\n부분 수: ${detailCount}\n구조(작은 범주가 있으면 작은 범주, 없으면 큰 범주): ${logicFlowParts.map((s) => `[${s.role?.trim() || s.macroLabel?.trim() || '미지정'}]`).join(' -> ')}\n\n[이 질문의 범위 제한 - 절대 준수]\n★ 이 질문(Step 1)은 '부분 수'와 각 행 식별 라벨(작은 범주 우선, 없으면 큰 범주)만 다루는 단계입니다.\n★ 각 부분의 '중심 내용(content)'은 다음 질문(Step 2)에서 다루므로, 이 답변에서는 절대 언급하지 마세요.\n★ 4단계(정답 공개)에서도 부분 수와 위 라벨만 공개하고, 중심 내용은 포함하지 마세요.\n`;

        return `${questionText}\n\n${step1Core}\n위 데이터를 기반으로 답변해줘.${step1LevelGuide}${step1Socratic}`;
    }

    // Step 2: 중심 내용과 논리적 흐름
    if (questionText === FLAT_FAQ[2]?.text && logicFlowParts.length > 0) {
        let step2LevelGuide = '';
        if (currentCount === 1) {
            step2LevelGuide = `\n1단계 안내: "각 부분이 어떤 역할을 하고 있다고 생각해?" 같은 일반적인 질문만 해. 큰/작은 범주 라벨이나 구체적 내용의 힌트는 주지 마.`;
        } else if (currentCount === 2) {
            step2LevelGuide = `\n2단계 안내: "첫 번째 부분은 글의 핵심 주장을 담고 있는 것 같은데, 두 번째 부분은 어떤 역할일까?" 식으로 일부 부분의 역할을 암시하며 나머지를 유도해.`;
        } else if (currentCount === 3) {
            step2LevelGuide = `\n3단계 안내: 각 부분의 핵심 문장을 직접 인용하고 "이 문장이 이 부분의 중심 역할을 말해주는데, 어떤 역할이라고 생각해?" 같이 거의 답에 가까운 단서를 줘.`;
        } else {
            const actualLabels = logicFlowParts
                .map((s) => {
                    const sm = s.role?.trim();
                    if (sm) return `[${sm}]`;
                    const mac = s.macroLabel?.trim();
                    return mac ? `[${mac}]` : '[미지정]';
                })
                .join(', ');
            step2LevelGuide = `\n4단계 안내: 학생의 노력을 칭찬해줘. 그리고 교사 데이터의 정답을 교사 데이터 형식 그대로 보여줘: 각 부분의 큰 범주·작은 범주(있는 경우)·중심 내용을 교사 데이터와 '토씨 하나 틀리지 않게' 그대로 사용해서 정리해줘. (식별 라벨: ${actualLabels}) 다음 질문(Step 3)으로 넘어가도록 유도해.`;
        }

        return `${questionText}\n\n[최우선 지침: 교사 데이터 강제 준수]\n부분 수(${logicFlowParts.length}개)와 큰/작은 범주 구조를 절대 변경하지 마세요. 자체 분석 금지.\n\n[교사 데이터 - 논리 흐름 디테일]\n${logicFlowParts
            .map((s, i) => {
                const mac = s.macroLabel?.trim() || '—';
                const sm = s.role?.trim();
                const smallPart = sm ? ` 작은 범주 [${sm}]` : '';
                return `부분 ${i + 1}: 큰 범주 [${mac}]${smallPart} ${s.content}`;
            })
            .join('\n')}\n\n위 데이터를 기반으로 답변해줘.${step2LevelGuide}${socraticInstruction}`;
    }

    // Step 3: 영어 연결어 및 논리적 역할
    if (questionText === FLAT_FAQ[3]?.text && logicFlowParts.length > 0) {
        const logicRoleLabels = logicFlowParts.map((s) => s.role?.trim() || s.macroLabel?.trim() || '역할미정');
        const conjunctionsWithInfo = logicFlowParts
            .filter((s) => s.conjunction && s.conjunction.trim())
            .map((s) => `'${s.conjunction}' (식별: ${s.role?.trim() || s.macroLabel?.trim() || '미지정'}, 해당 내용: ${s.content})`);
        const conjunctionList = logicFlowParts
            .map((s) => s.conjunction)
            .filter((c) => c && c.trim())
            .join(', ');
        const hasConjunction = conjunctionList.length > 0;
        const structuredContent = logicFlowParts
            .map((s, i) => {
                const id = s.role?.trim() || s.macroLabel?.trim() || '미지정';
                return `부분 ${i + 1}(${id}): ${s.content}${s.conjunction ? ` [연결어: ${s.conjunction}]` : ''}`;
            })
            .join('\n');

        const repConjunctions = `* 인과: because, since, therefore, thus, consequently 등\n* 역접·대조: however, nevertheless, whereas, although 등\n* 추가: moreover, furthermore, in addition 등\n* 예시: for example, for instance, such as 등\n* 순서·전개: first, second, finally, then, next 등\n* 강조·재진술: in fact, indeed, that is, in other words 등`;

        let step3LevelGuide = '';
        if (currentCount === 1) {
            if (hasConjunction) {
                step3LevelGuide = `\n\n[힌트 수준: 1단계 - 연결어 위치 안내 및 역할 유도]\n★ 최우선 지시: 교사 데이터에 있는 연결어(${conjunctionList})가 지문의 어느 문장(또는 어느 위치)에 등장하는지 학생에게 먼저 친절하게 알려줘. 예: "지문의 두 번째 문장 시작 부분에 '${conjunctionList.split(', ')[0]}'이라는 단어가 있어." 처럼 구체적으로 짚어줘.\n그 다음, 아래 '대표적인 영어 연결어' 분류표를 학생에게 보여주면서, 이 연결어가 어떤 논리적 역할(인과? 역접? 등)을 하는지 스스로 생각해보게 질문해.\n\n[대표적인 영어 연결어]\n${repConjunctions}\n\n★ 연결어의 논리적 역할(정답)은 아직 직접 말하지 마. 위치만 알려주고 역할은 학생이 추론하게 해.`;
            } else {
                step3LevelGuide = `\n\n[힌트 수준: 1단계 - 연결어 부재 시 숨은 논리 탐색 유도]\n이 지문에는 교사 데이터 기준 명시적인 영어 연결어가 없어. 학생에게 이 사실을 알려주고, "영어 연결어가 없더라도, 문장과 문장 사이에 '숨은 논리 관계'가 있을 수 있어. 각 부분의 내용을 읽어보면서, 서로 어떤 논리적 관계(예: 인과, 예시, 역접 등)인지 생각해볼 수 있을까?" 라고 유도해.\n아래 분류를 참고로 학생에게 제공해줘.\n\n[대표적인 논리적 연결 관계]\n${repConjunctions}`;
            }
        } else if (currentCount === 2) {
            if (hasConjunction) {
                step3LevelGuide = `\n\n[힌트 수준: 2단계 - 역할 추론 범위 축소]\n연결어 '${conjunctionList}'의 앞뒤 문맥을 다시 한번 짚어주면서, "이 연결어 앞의 내용과 뒷 내용을 비교해보면, 서로 반대되는 이야기일까, 아니면 원인과 결과 관계일까?" 처럼 두 가지 정도의 구체적인 보기를 제시하며 역할을 좁혀가도록 유도해.`;
            } else {
                step3LevelGuide = `\n\n[힌트 수준: 2단계 - 숨은 논리 추론 범위 축소]\n"이전 부분에서 말한 내용과 다음 부분에서 말한 내용을 비교해보면, 서로 대조/반전되는 이야기일까, 아니면 앞 내용을 뒷받침하는 구체적인 예시일까?" 처럼 두 가지 정도의 구체적인 보기를 제시하며 유도해.`;
            }
        } else if (currentCount === 3) {
            step3LevelGuide = `\n\n[힌트 수준: 3단계 - 거의 정답 수준 단서 제공]\n교사 데이터의 부분 식별 라벨(${logicRoleLabels.join(', ')})을 일부 공개하면서, "이 연결어(또는 논리적 흐름)는 '${logicRoleLabels.length > 1 ? logicRoleLabels[1] : logicRoleLabels[0]}' 역할을 하는 것 같은데, 어떻게 생각해?" 라고 정답에 거의 가깝게 유도해.`;
        } else {
            step3LevelGuide = `\n\n[힌트 수준: 4단계 - 완전한 정답 공개]\n학생의 노력을 진심으로 칭찬해줘. 그리고 교사 데이터에 따른 정확한 연결어 정보와 논리적 역할을 완전히 공개해.\n\n[정답 요약]\n- 사용된 연결어: ${conjunctionList || '없음'}\n- 각 연결어의 논리적 역할:\n${structuredContent}\n\n위 정보를 명료하게 정리해줘. "잘 했어! 완벽하게 이해했네!" 라고 마무리해.`;
        }

        return `${questionText}\n\n[교사 데이터 - 연결어 및 논리 구조 (STRICT)]\n역할 순서: ${logicRoleLabels.join(' → ')}\n사용된 연결어: ${conjunctionList || '없음'}\n연결어 상세 정보: ${hasConjunction ? conjunctionsWithInfo.join(' | ') : '없음'}\n각 부분별 내용:\n${structuredContent}\n\n위 데이터를 바탕으로 답변해줘. 네가 역할을 새로 정의하지 마.${step3LevelGuide}${socraticInstruction}`;
    }

    // FAQ 4: 중요 단어 5개 (중복 누적 제외)
    if (questionText === FLAT_FAQ[4]?.text) {
        if (currentCount === 1) {
            return `${questionText}\n\n[답변 방식]\n지문에서 중요한 영단어 5개를 뽑아 각 단어의 의미(뜻)와 함께 알려줘.`;
        }

        const vocabQuestion = FLAT_FAQ[4]?.text ?? '';
        const prevVocabAnswers: string[] = [];
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].role === 'user' && messages[i].content === vocabQuestion) {
                if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
                    prevVocabAnswers.push(messages[i + 1].content);
                }
            }
        }
        const allPrevVocab = prevVocabAnswers
            .map((ans, idx) => `[${idx + 1}회차 답변]\n${ans}`)
            .join('\n\n');
        return `${questionText}\n\n[중복 금지 - 최우선 준수]\n이 질문은 ${currentCount}번째 반복이야. 아래 이전 어휘 답변 목록에 등장한 모든 단어를 누적해서 절대 반복하지 말고, 지문에서 아직 다루지 않은 새로운 중요 단어 5개를 뽑아 의미와 함께 알려줘.\n\n[이전 어휘 답변 전체 누적 목록]\n${allPrevVocab}\n\n위의 모든 회차 답변에 등장한 단어는 빠짐없이 제외하고, 새 단어 5개만 선정해줘.`;
    }

    return questionText;
}

export function buildSentenceUserPrompt(questionText: string): string {
    return `요청: ${questionText}`;
}
