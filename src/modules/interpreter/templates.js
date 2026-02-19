/**
 * 운세 텍스트 템플릿 생성기 (templates.js)
 * 
 * 분석 결과를 기반으로 카테고리별 운세 문장을 조합합니다.
 */

import {
    ELEMENT_KR,
    ELEMENT_SHORT_KR,
    ELEMENT_EMOJI,
    STEM_KR,
    BRANCH_KR,
    FORTUNE_CATEGORIES,
} from '../manseryeok/constants.js';

import {
    YEAR_2026_INFO,
    ELEMENT_YEAR_GUIDE,
    CATEGORY_2026_GUIDE,
    getFireLevel,
    MONTHLY_KEYWORDS_2026,
} from '../manseryeok/yearPillar2026.js';

/**
 * 전체 운세 텍스트를 생성합니다.
 */
export function generateFortune(analysisResult) {
    const { pillars, dayMaster, elements, interactions, strength, yongShen, zodiac } = analysisResult;

    const dmElement = dayMaster.element;
    const fireCount = elements['火']?.count || 0;
    const fireLevel = getFireLevel(fireCount);
    const yearGuide = ELEMENT_YEAR_GUIDE[dmElement] || ELEMENT_YEAR_GUIDE['土'];

    const fortune = {
        // 인사말
        greeting: buildGreeting(pillars, zodiac),

        // 사주 요약
        sajuSummary: buildSajuSummary(pillars, dayMaster, elements, strength),

        // 2026년 총운
        overall: buildOverall(dayMaster, interactions, yearGuide),

        // 카테고리별 운세
        categories: {},

        // 용신 조언
        yongShenAdvice: buildYongShenAdvice(yongShen),

        // 월별 상세 운세 (12개월)
        monthly: buildMonthlyFortune(analysisResult, fireLevel),

        // 월별 키워드 (레거시 호환)
        monthlyKeywords: MONTHLY_KEYWORDS_2026,

        // 행운 정보
        lucky: {
            direction: yearGuide.luckyDirection,
            color: yearGuide.luckyColor,
            element: dmElement === '火' ? '토(흙)' : ELEMENT_KR[dmElement],
            number: yearGuide.luckyNumber || '3, 8',
            gem: yearGuide.luckyGem || '호박(琥珀)',
        },
    };

    // 카테고리별 운세 생성
    FORTUNE_CATEGORIES.forEach((cat) => {
        const categoryGuide = CATEGORY_2026_GUIDE[cat.id];
        fortune.categories[cat.id] = {
            ...cat,
            text: categoryGuide ? categoryGuide[fireLevel] : '',
            detailText: buildCategoryDetail(cat.id, analysisResult, fireLevel),
            warnings: buildWarnings(cat.id, analysisResult, fireLevel),
            remedies: buildRemedies(cat.id, analysisResult, yongShen),
        };
    });

    return fortune;
}

// ──────────────────────────────────────
// 섹션별 텍스트 빌더
// ──────────────────────────────────────

function buildGreeting(pillars, zodiac) {
    const yearStemKr = pillars.year.stemKr;
    const yearBranchKr = pillars.year.branchKr;
    return `${yearStemKr}${yearBranchKr}년생 ${zodiac}띄님, 2026 병오년 운세를 풀어드릴게요.`;
}

function buildSajuSummary(pillars, dayMaster, elements, strength) {
    const lines = [];

    lines.push(`📋 나의 사주팔자: ${pillars.year.pillar} ${pillars.month.pillar} ${pillars.day.pillar} ${pillars.hour.pillar}`);
    lines.push(`🎯 나의 타고난 기운: ${dayMaster.stem}(${dayMaster.stemKr}) — ${ELEMENT_EMOJI[dayMaster.element]} ${ELEMENT_KR[dayMaster.element]}`);

    const strengthText = strength?.level === 'strong' ? '기운이 넓넓한 편 (신강)' :
        strength?.level === 'weak' ? '기운을 보충하면 좋은 편 (신약)' : '균형 쟡힌 편 (중화)';
    lines.push(`⚖️ 나의 기운 상태: ${strengthText}`);

    // 오행 분포
    const dist = Object.entries(elements)
        .filter(([k, v]) => typeof v === 'object' && v.ratio !== undefined)
        .map(([el, data]) => `${ELEMENT_EMOJI[el]}${ELEMENT_SHORT_KR[el]}${data.ratio}%`)
        .join(' ');
    lines.push(`🔮 오행(나무·불·흙·쇠·물) 분포: ${dist}`);

    return lines;
}

function buildOverall(dayMaster, interactions, yearGuide) {
    const parts = [];

    parts.push(YEAR_2026_INFO.description);
    parts.push('');
    parts.push(`💫 나의 타고난 기운 ${dayMaster.stem}(${ELEMENT_KR[dayMaster.element]})과 병오년의 관계:`);
    parts.push(`  ${yearGuide.relationship}`);
    parts.push('');
    parts.push(`✨ ${yearGuide.overall}`);

    if (interactions?.year2026?.dayMasterInteraction) {
        parts.push('');
        parts.push(`🔍 ${interactions.year2026.dayMasterInteraction.impact}`);
    }

    if (interactions?.year2026?.elementInteraction) {
        parts.push(`🌡️ ${interactions.year2026.elementInteraction.impact}`);
    }

    // 지지 상호작용
    if (interactions?.year2026?.branchInteractions?.length > 0) {
        parts.push('');
        parts.push('📌 올해의 띄와 내 띄의 관계:');
        interactions.year2026.branchInteractions.forEach((bi) => {
            const icon = bi.impact > 0 ? '✅' : '⚠️';
            parts.push(`  ${icon} ${bi.position} ${bi.name}: ${bi.desc}`);
        });
    }

    parts.push('');
    parts.push(`🎯 종합적으로: ${interactions?.year2026?.overallImpact || '안정적이고 편안한 한 해가 될 것입니다.'}`);

    return parts;
}

function buildYongShenAdvice(yongShen) {
    if (!yongShen) return '보약 같은 기운 분석 데이터가 없습니다.';

    const parts = [];
    if (yongShen.primary) {
        const el = yongShen.primary.hanja || yongShen.primary;
        parts.push(`🌟 보약 같은 기운(용신): ${ELEMENT_EMOJI[el] || ''} ${ELEMENT_KR[el] || yongShen.primary.korean || el}`);
        parts.push('용신은 내 사주에서 가장 필요한 오행이에요.');
        parts.push('이 기운을 보충하면 건강과 운이 더 좋아져요.');
    }
    return parts;
}

function buildCategoryDetail(categoryId, analysisResult, fireLevel) {
    const guide = CATEGORY_2026_GUIDE[categoryId];
    if (!guide) return '';

    const parts = [];
    parts.push(guide[fireLevel] || '');

    const score = analysisResult.interactions?.fortuneScore || 50;
    if (score > 70) {
        parts.push('올해는 전반적으로 기운이 좋은 해예요. 자신감을 가지고 움직여보세요!');
    } else if (score < 30) {
        parts.push('올해는 조심하며 느긋하게 보내는 것이 좋아요. 큰 결정은 가족과 상의하세요.');
    }

    return parts.join(' ');
}

// ──────────────────────────────────────
// 월별 상세 운세 빌더 (12개월)
// ──────────────────────────────────────

const MONTHLY_DETAIL_2026 = {
    1: { theme: '새해 준비', good: '계획 수립, 가족 모임', bad: '무리한 투자, 과음', health: '관절·허리 주의' },
    2: { theme: '입춘 기운', good: '새 취미 시작, 건강검진', bad: '다툼, 보증', health: '감기·호흡기 주의' },
    3: { theme: '봄 기운 상승', good: '소규모 투자, 외출', bad: '큰 계약, 이사', health: '알레르기 주의' },
    4: { theme: '활동의 달', good: '사회 활동, 봉사', bad: '과로, 무리한 약속', health: '혈압 관리' },
    5: { theme: '안정과 성장', good: '저축, 가족 여행', bad: '도박, 충동 구매', health: '소화기 관리' },
    6: { theme: '화기 최고조', good: '인맥 관리, 학습', bad: '짜증, 다툼', health: '심장·혈관 주의' },
    7: { theme: '더위 속 지혜', good: '휴식, 재충전', bad: '무리한 일정', health: '열사병·탈수 주의' },
    8: { theme: '추석 준비', good: '가족 화합, 감사 표현', bad: '재산 분쟁', health: '수면 관리' },
    9: { theme: '가을 수확', good: '투자 회수, 결실', bad: '새 사업 시작', health: '피부·건조 주의' },
    10: { theme: '내실 다지기', good: '정리정돈, 건강관리', bad: '불필요한 지출', health: '면역력 관리' },
    11: { theme: '겨울 준비', good: '절약, 계획 점검', bad: '연말 과소비', health: '관절·냉증 주의' },
    12: { theme: '한 해 마무리', good: '감사, 가족 시간', bad: '후회, 조급함', health: '우울감·체력 관리' },
};

function buildMonthlyFortune(analysisResult, fireLevel) {
    const score = analysisResult.interactions?.fortuneScore || 50;
    const monthly = [];

    for (let m = 1; m <= 12; m++) {
        const base = MONTHLY_KEYWORDS_2026[m] || {};
        const detail = MONTHLY_DETAIL_2026[m] || {};

        // 월별 점수 변동 (기본 점수 ± 랜덤 범위)
        const variation = ((m * 7 + score) % 21) - 10; // -10 ~ +10 결정론적 변동
        const monthScore = Math.max(20, Math.min(95, score + variation));

        monthly.push({
            month: m,
            score: monthScore,
            keyword: base.keyword || detail.theme,
            theme: detail.theme,
            advice: base.advice || '',
            good: detail.good,
            bad: detail.bad,
            health: detail.health,
        });
    }

    return monthly;
}

// ──────────────────────────────────────
// 카테고리별 주의사항 빌더
// ──────────────────────────────────────

const CATEGORY_WARNINGS = {
    wealth: {
        fire_high: ['충동적 큰 지출 주의', '보증·대출 절대 금물', '6~8월 재물 손실 위험'],
        fire_mid: ['계획 없는 투자 자제', '가족 간 금전 거래 주의'],
        fire_low: ['너무 아끼기만 하면 기회를 놓쳐요', '세금·보험 점검 필요'],
    },
    love: {
        fire_high: ['감정 기복으로 인한 다툼 주의', '참을성을 가지세요'],
        fire_mid: ['오해가 생기기 쉬워요, 대화를 많이 하세요'],
        fire_low: ['너무 혼자 지내지 마세요, 모임에 나가보세요'],
    },
    health: {
        fire_high: ['심장·혈압 정기 검진 필수', '과로·수면 부족 주의', '여름철 과열 조심'],
        fire_mid: ['정기 건강검진 꼭 받으세요', '스트레스 관리가 중요해요'],
        fire_low: ['체력 저하 주의, 가벼운 운동 시작하세요', '면역력 관리'],
    },
    career: {
        fire_high: ['무리한 사업 확장 주의', '동업·투자 제안 신중히'],
        fire_mid: ['현재 하는 일에 집중하세요', '욕심내면 오히려 손해'],
        fire_low: ['노후 자금 점검 시기', '안정적인 저축 우선'],
    },
    study: {
        fire_high: ['자녀와 갈등 주의, 대화가 중요해요', '참견보다는 응원을'],
        fire_mid: ['자녀의 결정을 존중해주세요'],
        fire_low: ['손주·자녀와 함께하는 시간을 늘리세요'],
    },
    family: {
        fire_high: ['가족 간 말다툼 주의', '집안 분쟁 소지 있어요'],
        fire_mid: ['평화를 유지하려면 양보가 필요해요'],
        fire_low: ['가족 모임을 자주 만드세요'],
    },
};

function buildWarnings(categoryId, analysisResult, fireLevel) {
    const catWarnings = CATEGORY_WARNINGS[categoryId];
    if (!catWarnings) return [];
    return catWarnings[fireLevel] || catWarnings['fire_mid'] || [];
}

// ──────────────────────────────────────
// 카테고리별 처방(비방) 빌더
// ──────────────────────────────────────

const CATEGORY_REMEDIES = {
    wealth: {
        '木': ['초록색 지갑 사용', '동쪽 방향 재물 운 좋음'],
        '火': ['차분한 소비 습관 기르기', '노란색 소품으로 안정감'],
        '土': ['부동산 관련 운 좋음', '중앙이나 남서쪽에 재물 보관'],
        '金': ['귀금속·금 관련 투자 유망', '서쪽 방향에 행운'],
        '水': ['유동적 자산 관리 유리', '북쪽 방향에서 재물 들어옴'],
    },
    health: {
        '木': ['산책·등산 등 자연 속 운동 추천', '간·담 건강 체크'],
        '火': ['수영·물 관련 운동 추천', '심장·소장 건강 주의'],
        '土': ['규칙적인 식사가 보약', '소화기·위장 관리'],
        '金': ['호흡 운동·요가 추천', '폐·대장 건강 체크'],
        '水': ['따뜻한 차 자주 마시기', '신장·방광 건강 관리'],
    },
    love: {
        default: ['가족에게 감사 표현 자주 하기', '함께 식사하는 시간 늘리기', '옛 친구에게 먼저 연락하기'],
    },
    career: {
        default: ['현재 하시는 일에 감사하기', '노후 재무 설계 점검', '평생 교육 프로그램 참여해보기'],
    },
    study: {
        default: ['자녀에게 응원의 말 자주 하기', '손주와 놀아주는 시간 늘리기', '가족 사진 정리해보기'],
    },
    family: {
        default: ['월 1회 가족 모임 만들기', '배우자와 산책 시간 갖기', '집안 정리로 기운 새로 하기'],
    },
};

function buildRemedies(categoryId, analysisResult, yongShen) {
    const catRemedies = CATEGORY_REMEDIES[categoryId];
    if (!catRemedies) return [];

    // 용신 기반 맞춤 처방
    const yongElement = yongShen?.primary?.hanja || yongShen?.primary;
    if (yongElement && catRemedies[yongElement]) {
        return catRemedies[yongElement];
    }

    // 기본 처방
    return catRemedies['default'] || catRemedies['土'] || [];
}
