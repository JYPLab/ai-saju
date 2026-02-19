/**
 * 해석 엔진 테스트
 */

import { describe, it, expect } from 'vitest';
import { interpretResult } from '../src/modules/interpreter/engine.js';

describe('해석 엔진', () => {
    const mockAnalysisResult = {
        pillars: {
            year: { stem: '庚', branch: '午', stemKr: '경', branchKr: '오', stemElement: '金', branchElement: '火', pillar: '庚午', name: '년주' },
            month: { stem: '丁', branch: '亥', stemKr: '정', branchKr: '해', stemElement: '火', branchElement: '水', pillar: '丁亥', name: '월주' },
            day: { stem: '壬', branch: '寅', stemKr: '임', branchKr: '인', stemElement: '水', branchElement: '木', pillar: '壬寅', name: '일주' },
            hour: { stem: '甲', branch: '辰', stemKr: '갑', branchKr: '진', stemElement: '木', branchElement: '土', pillar: '甲辰', name: '시주' },
        },
        dayMaster: { stem: '壬', element: '水', stemKr: '임', yinYang: '양' },
        elements: {
            '木': { count: 2, ratio: 25 },
            '火': { count: 2, ratio: 25 },
            '土': { count: 1, ratio: 13 },
            '金': { count: 1, ratio: 13 },
            '水': { count: 2, ratio: 25 },
            strongest: '木',
            weakest: '土',
        },
        interactions: {
            fortuneScore: 70,
            year2026: {
                dayMasterInteraction: { type: '재성(財星)', impact: '재물운이 좋습니다.' },
                elementInteraction: { type: '화조화(火調和)', impact: '적절한 균형.' },
                branchInteractions: [],
                overallImpact: '2026년은 좋은 기회가 열리는 해입니다.',
                impactLevel: 2,
            },
            elementBalance: { balanceScore: 75, interpretation: '오행이 비교적 균형 잡혀 있습니다.' },
        },
        strength: { level: 'strong', score: 65 },
        yongShen: { primary: '土' },
        zodiac: '말',
        birthInput: { year: 1990, month: 6, day: 15, hour: 12, gender: 'male' },
    };

    it('해석 결과 구조 검증', () => {
        const result = interpretResult(mockAnalysisResult);

        expect(result).toBeDefined();
        expect(result.fortune).toBeDefined();
        expect(result.summary).toBeDefined();
        expect(result.detail).toBeDefined();
    });

    it('요약본에 인사말이 있음', () => {
        const result = interpretResult(mockAnalysisResult);

        expect(result.summary.greeting).toBeTruthy();
        expect(typeof result.summary.greeting).toBe('string');
    });

    it('요약본에 전체 공개 카테고리가 있음', () => {
        const result = interpretResult(mockAnalysisResult);

        expect(result.summary.allCategories).toBeDefined();
        expect(Object.keys(result.summary.allCategories).length).toBeGreaterThan(0);

        // 모든 카테고리는 visible: true (전체 공개)
        Object.values(result.summary.allCategories).forEach((cat) => {
            expect(cat.visible).toBe(true);
        });
    });

    it('상세본(PDF)에 모든 카테고리가 있음', () => {
        const result = interpretResult(mockAnalysisResult);

        expect(result.detail.categories).toBeDefined();
        expect(result.detail.title).toBeTruthy();

        // 상세본의 모든 카테고리는 visible: true
        Object.values(result.detail.categories).forEach((cat) => {
            expect(cat.visible).toBe(true);
        });
    });

    it('운세 점수가 표시됨', () => {
        const result = interpretResult(mockAnalysisResult);

        expect(result.summary.fortuneScore).toBe(70);
        expect(result.detail.fortuneScore).toBe(70);
    });
});
