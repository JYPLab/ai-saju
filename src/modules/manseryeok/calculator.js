/**
 * 만세력 계산기 (calculator.js)
 * 
 * @gracefullight/saju 라이브러리를 래핑하여
 * 생년월일시 → 사주팔자 변환을 수행합니다.
 * 
 * Independence Axiom: EventBus를 통해서만 외부와 통신
 */

import { DateTime } from 'luxon';
import { createLuxonAdapter } from '@gracefullight/saju/adapters/luxon';
import {
    getSaju,
    getFourPillars,
    analyzeTenGods,
    analyzeStrength,
    analyzeRelations,
    analyzeYongShen,
    STANDARD_PRESET,
} from '@gracefullight/saju';
import bus from '@utils/eventBus.js';
import {
    STEM_TO_ELEMENT,
    BRANCH_TO_ELEMENT,
    STEM_KR,
    BRANCH_KR,
    ELEMENT_EN,
    ELEMENT_EN_REVERSE,
    BRANCH_ZODIAC,
    BRANCH_HOUR_RANGE,
    STEM_YIN_YANG,
} from './constants.js';

// ──────────────────────────────────────
// Adapter 초기화 (싱글톤)
// ──────────────────────────────────────
let _adapter = null;

async function getAdapter() {
    if (!_adapter) {
        _adapter = await createLuxonAdapter();
    }
    return _adapter;
}

// ──────────────────────────────────────
// 사주 계산 메인 함수
// ──────────────────────────────────────

/**
 * 생년월일시로부터 사주팔자 전체 분석을 수행합니다.
 * 
 * @param {Object} input
 * @param {number} input.year - 출생 연도
 * @param {number} input.month - 출생 월 (1-12)
 * @param {number} input.day - 출생 일
 * @param {number} input.hour - 출생 시 (0-23)
 * @param {string} input.gender - 'male' | 'female'
 * @param {boolean} [input.isLunar=false] - 음력 여부
 * @returns {Promise<Object>} 사주 분석 결과
 */
export async function calculateSaju({ year, month, day, hour, gender, isLunar = false }) {
    const adapter = await getAdapter();

    // DateTime 생성 (한국 표준시)
    const birthDateTime = DateTime.fromObject(
        { year, month, day, hour, minute: 0 },
        { zone: 'Asia/Seoul' }
    );

    // 전체 사주 분석 (pillars + tenGods + strength + relations + yongshen + majorLuck + yearlyLuck)
    const sajuResult = getSaju(birthDateTime, {
        adapter,
        gender,
        longitudeDeg: 126.9778, // 서울 기준
        preset: STANDARD_PRESET,
        yearlyLuckRange: { from: 2025, to: 2030 },
    });

    // 결과 정제
    const result = enrichResult(sajuResult, { year, month, day, hour, gender });

    return result;
}

/**
 * 라이브러리 결과를 서비스용으로 정제/확장합니다.
 */
function enrichResult(sajuResult, birthInput) {
    const { pillars, tenGods, strength, relations, yongShen, majorLuck, yearlyLuck, solarTerms } = sajuResult;

    // 각 기둥(pillar) 파싱
    const parsedPillars = parsePillars(pillars);

    // 오행 분포 계산
    const elementDistribution = calculateElementDistribution(parsedPillars);

    // 일간(Day Master) 정보
    const dayMaster = parsedPillars.day.stem;
    const dayMasterElement = STEM_TO_ELEMENT[dayMaster];

    // 2026년 운 (yearlyLuck에서 추출)
    const luck2026 = yearlyLuck?.find((yl) => yl.year === 2026) || null;

    return {
        // 원본 데이터
        raw: sajuResult,

        // 파싱된 사주
        pillars: parsedPillars,

        // 일간 정보
        dayMaster: {
            stem: dayMaster,
            stemKr: STEM_KR[dayMaster],
            element: dayMasterElement,
            elementKr: ELEMENT_EN_REVERSE[dayMasterElement] || dayMasterElement,
            yinYang: STEM_YIN_YANG[dayMaster],
        },

        // 오행 분포
        elements: elementDistribution,

        // 십신 (Ten Gods)
        tenGods,

        // 신강/신약 (Strength)
        strength: {
            level: strength?.level || 'unknown',
            score: strength?.score || 0,
            details: strength,
        },

        // 관계 분석 (합충형파해)
        relations,

        // 용신 (Yongshen)
        yongShen,

        // 대운
        majorLuck,

        // 세운 (연도별)
        yearlyLuck,
        luck2026,

        // 절기 정보
        solarTerms,

        // 띠
        zodiac: BRANCH_ZODIAC[parsedPillars.year.branch] || '',

        // 메타
        birthInput,
    };
}

/**
 * 사주 기둥 문자열을 파싱합니다.
 * 예: "甲子" → { stem: "甲", branch: "子", stemKr: "갑", ... }
 */
function parsePillars(pillars) {
    const parse = (pillarStr, name) => {
        if (!pillarStr || pillarStr.length < 2) {
            return { stem: '', branch: '', stemKr: '', branchKr: '', element: '', pillar: pillarStr || '', name };
        }
        const stem = pillarStr[0];
        const branch = pillarStr[1];
        return {
            stem,
            branch,
            stemKr: STEM_KR[stem] || stem,
            branchKr: BRANCH_KR[branch] || branch,
            stemElement: STEM_TO_ELEMENT[stem] || '',
            branchElement: BRANCH_TO_ELEMENT[branch] || '',
            pillar: pillarStr,
            name,
        };
    };

    return {
        year: parse(pillars.year, '년주'),
        month: parse(pillars.month, '월주'),
        day: parse(pillars.day, '일주'),
        hour: parse(pillars.hour, '시주'),
    };
}

/**
 * 오행 분포를 계산합니다.
 * 천간 4개 + 지지 4개 = 8개 글자의 오행 비율
 */
function calculateElementDistribution(parsedPillars) {
    const counts = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
    const total = 8;

    ['year', 'month', 'day', 'hour'].forEach((pos) => {
        const p = parsedPillars[pos];
        if (p.stemElement && counts[p.stemElement] !== undefined) {
            counts[p.stemElement]++;
        }
        if (p.branchElement && counts[p.branchElement] !== undefined) {
            counts[p.branchElement]++;
        }
    });

    // 비율 계산
    const distribution = {};
    for (const [element, count] of Object.entries(counts)) {
        distribution[element] = {
            count,
            ratio: Math.round((count / total) * 100),
        };
    }

    // 가장 강한/약한 오행
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    distribution.strongest = sorted[0][0];
    distribution.weakest = sorted[sorted.length - 1][0];

    return distribution;
}

// ──────────────────────────────────────
// EventBus 이벤트 핸들러 등록
// ──────────────────────────────────────

/**
 * 모듈 초기화 — EventBus에 리스너 등록
 */
export function initCalculator() {
    bus.on(bus.Events.INPUT_SUBMIT, async (payload) => {
        try {
            bus.emit(bus.Events.CALC_START, { status: 'calculating' });

            const result = await calculateSaju(payload);

            bus.emit(bus.Events.CALC_PILLARS_READY, result);
        } catch (error) {
            console.error('[Calculator] 사주 계산 오류:', error);
            bus.emit(bus.Events.ERROR, {
                source: 'calculator',
                message: '사주 계산 중 오류가 발생했습니다.',
                error: error.message,
            });
        }
    });

    console.log('[Calculator] 모듈 초기화 완료');
}
