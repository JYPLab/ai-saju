/**
 * 합·충·형·파·해 상호작용 분석 (interactions.js)
 * 
 * @gracefullight/saju의 analyzeRelations 결과를 확장하여
 * 한국어 해석과 2026년 병오년 기운 상호작용을 분석합니다.
 * 
 * Independence Axiom: EventBus를 통해서만 외부와 통신
 */

import bus from '@utils/eventBus.js';
import {
    STEM_TO_ELEMENT,
    BRANCH_TO_ELEMENT,
    ELEMENT_GENERATES,
    ELEMENT_OVERCOMES,
    ELEMENT_KR,
    ELEMENT_SHORT_KR,
    STEM_KR,
    BRANCH_KR,
} from './constants.js';

// ──────────────────────────────────────
// 상호작용 한국어 해석
// ──────────────────────────────────────

const RELATION_DESCRIPTIONS = {
    combination: {
        name: '합(合)',
        description: '조화와 합일의 기운',
        positive: '협력, 화합, 새로운 기회',
        negative: '우유부단, 의존성',
    },
    clash: {
        name: '충(沖)',
        description: '대립과 변화의 기운',
        positive: '변화, 도전, 새로운 시작',
        negative: '갈등, 충돌, 불안정',
    },
    harm: {
        name: '해(害)',
        description: '방해와 손실의 기운',
        positive: '경계심, 신중함',
        negative: '배신, 방해, 소인',
    },
    punishment: {
        name: '형(刑)',
        description: '시련과 정화의 기운',
        positive: '단련, 성장, 정화',
        negative: '구설수, 법적 문제, 고통',
    },
    destruction: {
        name: '파(破)',
        description: '파괴와 재건의 기운',
        positive: '기존 틀 파괴, 혁신',
        negative: '손실, 파탄, 실패',
    },
};

// ──────────────────────────────────────
// 2026 병오년 특수 상호작용 매핑
// ──────────────────────────────────────

const YEAR_2026 = {
    stem: '丙',        // 천간: 병(丙) = 양화(陽火)
    branch: '午',      // 지지: 오(午) = 양화(陽火)
    element: '火',     // 주 오행: 화(火)
    pillar: '丙午',
};

/**
 * 사주 분석 결과를 기반으로 상호작용을 정밀 분석합니다.
 * 
 * @param {Object} sajuResult - calculator.js에서 생성된 사주 결과
 * @returns {Object} 상호작용 분석 결과
 */
export function analyzeInteractions(sajuResult) {
    const { pillars, relations, elements, dayMaster } = sajuResult;

    // 1. 라이브러리 관계 분석 결과를 한국어로 정리
    const formattedRelations = formatRelations(relations);

    // 2. 2026 병오년과의 상호작용 분석
    const year2026Analysis = analyzeWith2026(pillars, dayMaster, elements);

    // 3. 오행 밸런스 평가
    const elementBalance = evaluateElementBalance(elements, dayMaster);

    // 4. 종합 길흉 점수 산출
    const fortuneScore = calculateFortuneScore(year2026Analysis, elementBalance, formattedRelations);

    return {
        relations: formattedRelations,
        year2026: year2026Analysis,
        elementBalance,
        fortuneScore,
    };
}

/**
 * 라이브러리 관계 분석 결과를 한국어로 포맷팅합니다.
 */
function formatRelations(relations) {
    if (!relations) return { combinations: [], clashes: [], harms: [], punishments: [] };

    const format = (items, type) => {
        if (!items || !Array.isArray(items)) return [];
        return items.map((item) => ({
            ...item,
            typeInfo: RELATION_DESCRIPTIONS[type],
            description: `${item.pair ? item.pair.join('–') : ''} ${RELATION_DESCRIPTIONS[type].name}`,
        }));
    };

    return {
        combinations: format(relations.combinations, 'combination'),
        clashes: format(relations.clashes, 'clash'),
        harms: format(relations.harms, 'harm'),
        punishments: format(relations.punishments, 'punishment'),
        hasSignificant: (relations.clashes?.length > 0) || (relations.punishments?.length > 0),
    };
}

/**
 * 2026 병오년 화(火) 기운과 사주의 상호작용을 분석합니다.
 */
function analyzeWith2026(pillars, dayMaster, elements) {
    const analysis = {
        yearInfo: YEAR_2026,
        dayMasterInteraction: null,
        elementInteraction: null,
        branchInteractions: [],
        overallImpact: '',
        impactLevel: 0, // -3 ~ +3
        advice: [],
    };

    const dmElement = dayMaster.element;

    // 1. 일간(Day Master)과 병오년 火의 관계
    if (dmElement === '火') {
        analysis.dayMasterInteraction = {
            type: '비겁(比劫)',
            description: '같은 오행으로 힘이 강화됩니다.',
            impact: '자신감과 추진력이 높아지나, 과도한 경쟁심에 주의가 필요합니다.',
            level: 1,
        };
    } else if (ELEMENT_GENERATES['火'] === dmElement) {
        // 화생토: 火가 일간(土)을 생해줌
        analysis.dayMasterInteraction = {
            type: '인성(印星)',
            description: '병오년의 화 기운이 당신을 생(生)해줍니다.',
            impact: '학업, 자격증, 윗사람의 도움이 활발한 해입니다.',
            level: 2,
        };
    } else if (ELEMENT_GENERATES[dmElement] === '火') {
        // 일간이 火를 생: 식상(食傷)
        analysis.dayMasterInteraction = {
            type: '식상(食傷)',
            description: '당신의 기운이 병오년을 향해 발산됩니다.',
            impact: '표현력과 창의력이 극대화되지만 에너지 소모에 유의하세요.',
            level: 1,
        };
    } else if (ELEMENT_OVERCOMES[dmElement] === '火') {
        // 일간이 火를 극: 재성(財星)
        analysis.dayMasterInteraction = {
            type: '재성(財星)',
            description: '병오년이 당신에게 재물의 기회입니다.',
            impact: '재물운과 사업 기회가 열리지만, 무리한 투자에 주의하세요.',
            level: 2,
        };
    } else if (ELEMENT_OVERCOMES['火'] === dmElement) {
        // 火가 일간을 극: 관성(官星)
        analysis.dayMasterInteraction = {
            type: '관성(官星)',
            description: '병오년의 화 기운이 당신을 압박합니다.',
            impact: '직장, 시험, 규율 관련 변화가 예상됩니다. 건강에 유의하세요.',
            level: -1,
        };
    }

    analysis.impactLevel += analysis.dayMasterInteraction?.level || 0;

    // 2. 사주 전체 오행과 화(火)의 밸런스 영향
    const fireCount = elements['火']?.count || 0;
    if (fireCount >= 3) {
        analysis.elementInteraction = {
            type: '화과다(火過多)',
            description: '이미 화 기운이 강한 사주에 병오년이 더해집니다.',
            impact: '과열 주의. 감정 조절과 심장/혈압 건강에 신경 쓰세요.',
            level: -2,
        };
    } else if (fireCount === 0) {
        analysis.elementInteraction = {
            type: '화보충(火補充)',
            description: '부족한 화 기운을 병오년이 채워줍니다.',
            impact: '활력과 열정이 살아나는 시기입니다. 적극적으로 행동하세요.',
            level: 2,
        };
    } else {
        analysis.elementInteraction = {
            type: '화조화(火調和)',
            description: '적절한 화 기운이 더해져 균형을 이룹니다.',
            impact: '안정적이면서도 발전적인 에너지를 받는 해입니다.',
            level: 1,
        };
    }

    analysis.impactLevel += analysis.elementInteraction?.level || 0;

    // 3. 지지(午)와 사주 지지들의 충·합 관계
    const userBranches = [
        { pos: '년', branch: pillars.year?.branch },
        { pos: '월', branch: pillars.month?.branch },
        { pos: '일', branch: pillars.day?.branch },
        { pos: '시', branch: pillars.hour?.branch },
    ].filter((b) => b.branch);

    // 午와의 관계
    const branchRelations = {
        '子': { type: 'clash', name: '자오충(子午沖)', impact: -2, desc: '강한 충돌 — 변동과 갈등이 예상됩니다.' },
        '丑': { type: 'harm', name: '축오해(丑午害)', impact: -1, desc: '미세한 방해 — 소인을 조심하세요.' },
        '未': { type: 'combination', name: '오미합(午未合)', impact: 2, desc: '좋은 합— 조력자를 만날 수 있습니다.' },
        '寅': { type: 'combination', name: '인오합(寅午合)', impact: 2, desc: '삼합 화국 — 목표 달성의 기운이 강합니다.' },
        '戌': { type: 'combination', name: '오술합(午戌合)', impact: 2, desc: '삼합 화국 — 큰 성취가 가능합니다.' },
        '卯': { type: 'destruction', name: '묘오파(卯午破)', impact: -1, desc: '파(破)— 기존 계획에 차질이 생길 수 있습니다.' },
        '午': { type: 'self-punishment', name: '오오자형(午午自刑)', impact: -1, desc: '자형— 자기 과시를 경계하세요.' },
    };

    userBranches.forEach(({ pos, branch }) => {
        const rel = branchRelations[branch];
        if (rel) {
            analysis.branchInteractions.push({
                position: `${pos}주`,
                branch,
                branchKr: BRANCH_KR[branch],
                ...rel,
            });
            analysis.impactLevel += rel.impact;
        }
    });

    // 4. 종합 영향 텍스트
    const clampedLevel = Math.max(-3, Math.min(3, analysis.impactLevel));
    const impactTexts = {
        '-3': '2026년은 상당한 도전의 해입니다. 신중하게 행동하세요.',
        '-2': '2026년은 변화와 적응이 필요한 해입니다.',
        '-1': '2026년은 소소한 장애물이 있지만 극복 가능합니다.',
        '0': '2026년은 비교적 평탄한 해입니다.',
        '1': '2026년은 작지만 확실한 성장의 해입니다.',
        '2': '2026년은 좋은 기회가 열리는 해입니다.',
        '3': '2026년은 크게 도약할 수 있는 최고의 해입니다!',
    };

    analysis.overallImpact = impactTexts[String(clampedLevel)];
    analysis.impactLevel = clampedLevel;

    return analysis;
}

/**
 * 오행 밸런스를 평가합니다.
 */
function evaluateElementBalance(elements, dayMaster) {
    const total = 8;
    const idealRatio = 20; // 각 오행 20% 가 이상적

    const deviations = {};
    let totalDeviation = 0;

    for (const [element, data] of Object.entries(elements)) {
        if (typeof data === 'object' && data.ratio !== undefined) {
            const deviation = Math.abs(data.ratio - idealRatio);
            deviations[element] = {
                ratio: data.ratio,
                deviation,
                status: data.ratio > 30 ? '과다' : data.ratio < 10 ? '부족' : '적정',
            };
            totalDeviation += deviation;
        }
    }

    const balanceScore = Math.max(0, 100 - totalDeviation);

    return {
        deviations,
        balanceScore,
        interpretation: balanceScore > 70
            ? '오행이 비교적 균형 잡혀 있습니다.'
            : balanceScore > 40
                ? '일부 오행의 불균형이 있습니다. 보완이 필요합니다.'
                : '오행 불균형이 강합니다. 용신(用神)의 활용이 중요합니다.',
    };
}

/**
 * 종합 길흉 점수 산출 (0-100)
 */
function calculateFortuneScore(year2026, elementBalance, relations) {
    let score = 50; // 기본 점수

    // 2026년 영향 반영 (impactLevel: -3 ~ +3)
    score += year2026.impactLevel * 8;

    // 오행 밸런스 반영
    score += (elementBalance.balanceScore - 50) * 0.2;

    // 충돌 여부 반영
    if (relations.hasSignificant) {
        score -= 5;
    }

    // 합이 있으면 보너스
    if (relations.combinations?.length > 0) {
        score += relations.combinations.length * 3;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
}

// ──────────────────────────────────────
// EventBus 이벤트 핸들러 등록
// ──────────────────────────────────────

export function initInteractions() {
    bus.on(bus.Events.CALC_PILLARS_READY, (sajuResult) => {
        try {
            const interactionResult = analyzeInteractions(sajuResult);

            // 분석 결과를 사주 결과에 합침
            const enrichedResult = {
                ...sajuResult,
                interactions: interactionResult,
            };

            bus.emit(bus.Events.ANALYSIS_COMPLETE, enrichedResult);
        } catch (error) {
            console.error('[Interactions] 상호작용 분석 오류:', error);
            bus.emit(bus.Events.ERROR, {
                source: 'interactions',
                message: '상호작용 분석 중 오류가 발생했습니다.',
                error: error.message,
            });
        }
    });

    console.log('[Interactions] 모듈 초기화 완료');
}
