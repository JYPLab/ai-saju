/**
 * 출력 포맷터 (formatter.js)
 * 
 * 운세 데이터를 '화면용 전체 공개본'과 '12p 리포트용 상세본'으로
 * 포맷팅합니다.
 * 
 * 전체 공개 방식: 모든 카테고리를 숨김 없이 노출
 */

import { FORTUNE_CATEGORIES } from '../manseryeok/constants.js';

/**
 * 화면 표시용 전체 공개 데이터를 생성합니다.
 * 모든 카테고리를 블러 없이 전체 공개합니다.
 * 
 * @param {Object} fortune - templates.js에서 생성된 운세 데이터
 * @param {Object} analysisResult - 전체 분석 결과
 * @returns {Object} 화면 표시용 데이터
 */
export function formatForDisplay(fortune, analysisResult) {
    const allCategories = {};

    FORTUNE_CATEGORIES.forEach((cat) => {
        const catData = fortune.categories[cat.id];
        if (!catData) return;

        // overall은 별도로 표시하므로 카테고리에서 제외
        if (cat.id === 'overall') return;

        allCategories[cat.id] = {
            ...catData,
            visible: true,
        };
    });

    return {
        greeting: fortune.greeting,
        sajuSummary: fortune.sajuSummary,
        overall: fortune.overall,
        allCategories,
        lucky: fortune.lucky,
        fortuneScore: analysisResult.interactions?.fortuneScore || 50,
    };
}

/**
 * 12페이지 리포트용 상세 데이터를 생성합니다.
 * 모든 카테고리의 상세 해석 + 주의사항 + 처방 포함
 * 
 * @param {Object} fortune - templates.js에서 생성된 운세 데이터
 * @param {Object} analysisResult - 전체 분석 결과
 * @returns {Object} 리포트 생성용 데이터
 */
export function formatForReport(fortune, analysisResult) {
    const allCategories = {};

    FORTUNE_CATEGORIES.forEach((cat) => {
        const catData = fortune.categories[cat.id];
        if (!catData) return;
        allCategories[cat.id] = {
            ...catData,
            visible: true,
        };
    });

    return {
        // 리포트 헤더 정보
        title: '2026 병오년 운세 건강 정밀 진단서',
        subtitle: fortune.greeting,
        generatedAt: new Date().toISOString(),

        // 사주 정보
        sajuSummary: fortune.sajuSummary,
        pillars: analysisResult.pillars,
        dayMaster: analysisResult.dayMaster,
        elements: analysisResult.elements,

        // 총운
        overall: fortune.overall,

        // 전체 카테고리 (상세 텍스트 + warnings + remedies 포함)
        categories: allCategories,

        // 월별 상세 운세 (12개월)
        monthly: fortune.monthly || [],

        // 상호작용 상세
        interactions: analysisResult.interactions,

        // 용신 조언
        yongShenAdvice: fortune.yongShenAdvice,
        yongShen: analysisResult.yongShen,

        // 월별 키워드 (레거시)
        monthlyKeywords: fortune.monthlyKeywords,

        // 행운 정보
        lucky: fortune.lucky,

        // 대운/세운
        majorLuck: analysisResult.majorLuck,
        yearlyLuck: analysisResult.yearlyLuck,

        // 점수
        fortuneScore: analysisResult.interactions?.fortuneScore || 50,

        // 메타 (입력 정보 보존)
        birthInput: analysisResult.birthInput,
    };
}
