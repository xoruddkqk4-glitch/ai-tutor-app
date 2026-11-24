const DOT_PLACEHOLDER = '\u0000';

/**
 * 영어 지문을 문장 단위로 분리합니다.
 * Mr., Dr., e.g., i.e., U.S., 소수점(3.14), 단일 대문자 이니셜 등의 마침표 오분리를 방지합니다.
 */
export function splitEnglishSentences(passage: string): string[] {
    const normalized = passage.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];

    const masked = normalized
        // 다중 마침표 약어 (예: e.g., i.e., a.m., p.m.)
        .replace(/\b(?:e\.g|i\.e|a\.m|p\.m)\./gi, (match) =>
            match.replace(/\./g, DOT_PLACEHOLDER)
        )
        // U.S. / U.K.: 내부 마침표는 항상 유지하고, 문장 끝(뒤에 대문자 시작 문장)일 때만 끝 마침표로 분리
        .replace(/\b(U)\.(S|K)\.(?=["'”’)]?\s+[A-Z])/g, `$1${DOT_PLACEHOLDER}$2.`)
        .replace(/\b(U)\.(S|K)\./g, `$1${DOT_PLACEHOLDER}$2${DOT_PLACEHOLDER}`)
        // 대소문자 구분 일반 약어·직함 (예: Mr., Mrs., Dr., Prof., St., Mt., Fig.)
        .replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Mt|Fig)\./g, (match) =>
            match.replace('.', DOT_PLACEHOLDER)
        )
        // No.는 뒤에 숫자가 오는 번호 표기(예: No. 5)일 때만 약어로 처리
        .replace(/\bNo\.(?=\s*\d)/gi, (match) =>
            match.replace('.', DOT_PLACEHOLDER)
        )
        // vs.
        .replace(/\bvs\./gi, (match) => match.replace('.', DOT_PLACEHOLDER))
        // etc. 뒤에 대문자로 시작하는 새 문장이 오면 문장 경계 허용
        .replace(/\betc\.(?!["'”’)]?\s+[A-Z])/gi, (match) =>
            match.replace('.', DOT_PLACEHOLDER)
        )
        // 단일 대문자 이니셜 (예: J. K. Rowling — U\0S. 같은 다중 마침표 약어 끝 글자는 제외)
        .replace(/(^|[\s(["'“‘])([A-Z])\.(?=\s+[A-Z])/g, `$1$2${DOT_PLACEHOLDER}`)
        // 소수점 숫자 (예: 3.14, 12.5%)
        .replace(/(\d)\.(\d)/g, `$1${DOT_PLACEHOLDER}$2`);

    return masked
        .split(/(?<=[.!?]["'”’)]?)\s+/)
        .map((sentence) => sentence.replaceAll(DOT_PLACEHOLDER, '.').trim())
        .filter((sentence) => sentence.length > 0);
}
