/**
 * 합·충·형·파·해 상호작용 테스트
 */

import { describe, it, expect } from 'vitest';
import { analyzeInteractions } from '../src/modules/manseryeok/interactions.js';

describe('상호작용 분석', () => {
    // Mock 사주 데이터
    const createMockSaju = (overrides = {}) => ({
        pillars: {
            year: { stem: '甲', branch: '子', stemKr: '갑', branchKr: '자', stemElement: '木', branchElement: '水', pillar: '甲子', name: '년주' },
            month: { stem: '丙', branch: '寅', stemKr: '병', branchKr: '인', stemElement: '火', branchElement: '木', pillar: '丙寅', name: '월주' },
            day: { stem: '辛', branch: '巳', stemKr: '신', branchKr: '사', stemElement: '金', branchElement: '火', pillar: '辛巳', name: '일주' },
            hour: { stem: '戊', branch: '戌', stemKr: '무', branchKr: '술', stemElement: '土', branchElement: '土', pillar: '戊戌', name: '시주' },
        },
        dayMaster: { stem: '辛', element: '金', stemKr: '신', yinYang: '음' },
        elements: {
            '木': { count: 1, ratio: 13 },
            '火': { count: 2, ratio: 25 },
            '土': { count: 2, ratio: 25 },
            '金': { count: 1, ratio: 13 },
            '水': { count: 2, ratio: 25 },
            strongest: '火',
            weakest: '木',
        },
        relations: {
            combinations: [],
            clashes: [{ pair: ['巳', '亥'], positions: ['day', 'hour'] }],
            harms: [],
            punishments: [],
        },
        ...overrides,
    });

    it('기본 분석 구조 검증', () => {
        const result = analyzeInteractions(createMockSaju());

        expect(result).toBeDefined();
        expect(result.relations).toBeDefined();
        expect(result.year2026).toBeDefined();
        expect(result.elementBalance).toBeDefined();
        expect(result.fortuneScore).toBeDefined();
    });

    it('2026 병오년 분석이 포함됨', () => {
        const result = analyzeInteractions(createMockSaju());

        expect(result.year2026.yearInfo.pillar).toBe('丙午');
        expect(result.year2026.yearInfo.element).toBe('火');
        expect(result.year2026.dayMasterInteraction).toBeDefined();
        expect(result.year2026.elementInteraction).toBeDefined();
    });

    it('일간이 金일 때 화극금(火克金) 관계', () => {
        const result = analyzeInteractions(createMockSaju());

        // 金 일간은 火(병오년)에게 극을 당함 → 관성
        expect(result.year2026.dayMasterInteraction.type).toBe('관성(官星)');
        // impactLevel은 개별 관성(-1)이지만 지지 합/충 합산으로 전체 값은 달라질 수 있음
        expect(result.year2026.impactLevel).toBeGreaterThanOrEqual(-3);
        expect(result.year2026.impactLevel).toBeLessThanOrEqual(3);
    });

    it('子(자)가 있으면 子午沖 감지', () => {
        const result = analyzeInteractions(createMockSaju());

        // 년주에 子가 있으므로 午(2026)와 충돌
        const hasCziWuClash = result.year2026.branchInteractions.some(
            (bi) => bi.name === '자오충(子午沖)'
        );
        expect(hasCziWuClash).toBe(true);
    });

    it('戌(술)이 있으면 午戌合 감지', () => {
        const result = analyzeInteractions(createMockSaju());

        const hasWuXuCombination = result.year2026.branchInteractions.some(
            (bi) => bi.name === '오술합(午戌合)'
        );
        expect(hasWuXuCombination).toBe(true);
    });

    it('순운 점수가 0-100 범위', () => {
        const result = analyzeInteractions(createMockSaju());

        expect(result.fortuneScore).toBeGreaterThanOrEqual(0);
        expect(result.fortuneScore).toBeLessThanOrEqual(100);
    });

    it('오행 밸런스 점수 계산', () => {
        const result = analyzeInteractions(createMockSaju());

        expect(result.elementBalance.balanceScore).toBeGreaterThanOrEqual(0);
        expect(result.elementBalance.balanceScore).toBeLessThanOrEqual(100);
        expect(result.elementBalance.interpretation).toBeTruthy();
    });

    it('火가 과다한 사주 — fire_high 감지', () => {
        const highFireSaju = createMockSaju({
            elements: {
                '木': { count: 0, ratio: 0 },
                '火': { count: 4, ratio: 50 },
                '土': { count: 2, ratio: 25 },
                '金': { count: 1, ratio: 13 },
                '水': { count: 1, ratio: 13 },
                strongest: '火',
                weakest: '木',
            },
        });

        const result = analyzeInteractions(highFireSaju);
        expect(result.year2026.elementInteraction.type).toBe('화과다(火過多)');
    });
});
