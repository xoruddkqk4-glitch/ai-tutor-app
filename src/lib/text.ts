const DOT_PLACEHOLDER = '\u0000';

/**
 * 영어 지문을 문장 단위로 분리합니다.
 * Mr., Dr., e.g., i.e., U.S., 소수점(3.14), 단일 대문자 이니셜 등의 마침표 오분리를 방지합니다.
 */
export function splitEnglishSentences(passage: string): string[] {
    const normalized = passage.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];

    const masked = normalized
        // 다중 마침표 약어 (예: e.g., i.e., a.m., p.m., U.S., U.K.)
        .replace(/\b(?:e\.g|i\.e|a\.m|p\.m|U\.S|U\.K)\./gi, (match) =>
            match.replace(/\./g, DOT_PLACEHOLDER)
        )
        // 일반 약어 (예: Mr., Mrs., Dr., Prof., vs., etc.)
        .replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Mt|vs|etc|Fig|No)\./gi, (match) =>
            match.replace('.', DOT_PLACEHOLDER)
        )
        // 단일 대문자 이니셜 (예: J. K. Rowling)
        .replace(/\b([A-Z])\.(?=\s+[A-Z])/g, `$1${DOT_PLACEHOLDER}`)
        // 소수점 숫자 (예: 3.14, 12.5%)
        .replace(/(\d)\.(\d)/g, `$1${DOT_PLACEHOLDER}$2`);

    return masked
        .split(/(?<=[.!?]["'”’)]?)\s+/)
        .map((sentence) => sentence.replaceAll(DOT_PLACEHOLDER, '.').trim())
        .filter((sentence) => sentence.length > 0);
}
