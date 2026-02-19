/**
 * 공통 유효성 검증 유틸리티
 */

/**
 * 생년월일시 입력 유효성 검증
 * @param {Object} input
 * @param {number} input.year - 출생 연도 (1900–2025)
 * @param {number} input.month - 출생 월 (1–12)
 * @param {number} input.day - 출생 일 (1–31)
 * @param {number} input.hour - 출생 시 (0–23)
 * @param {string} input.gender - 성별 ('male' | 'female')
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBirthInput({ year, month, day, hour, gender }) {
    const errors = [];

    // 연도
    if (!Number.isInteger(year) || year < 1900 || year > 2025) {
        errors.push('출생 연도는 1900~2025 사이여야 합니다.');
    }

    // 월
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        errors.push('출생 월은 1~12 사이여야 합니다.');
    }

    // 일
    if (!Number.isInteger(day) || day < 1 || day > 31) {
        errors.push('출생 일은 1~31 사이여야 합니다.');
    }

    // 해당 월의 마지막 날 검증
    if (year && month && day) {
        const maxDay = new Date(year, month, 0).getDate();
        if (day > maxDay) {
            errors.push(`${year}년 ${month}월은 ${maxDay}일까지입니다.`);
        }
    }

    // 시간
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
        errors.push('출생 시간은 0~23 사이여야 합니다.');
    }

    // 성별
    if (!['male', 'female'].includes(gender)) {
        errors.push('성별을 선택해주세요.');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * 이메일 유효성 검증
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}
