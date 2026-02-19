/**
 * 만세력 변환 정확도 테스트
 */

import { describe, it, expect } from 'vitest';
import { calculateSaju } from '../src/modules/manseryeok/calculator.js';

describe('만세력 사주 계산', () => {
    // 테스트 케이스: 알려진 생년월일과 기대 사주
    const testCases = [
        {
            name: '2000년 1월 1일 18시 남성',
            input: { year: 2000, month: 1, day: 1, hour: 18, gender: 'male' },
            expected: {
                yearPillar: '己卯',  // 1999년 기묘년 (입춘 전)
            },
        },
        {
            name: '1990년 6월 15일 12시 여성',
            input: { year: 1990, month: 6, day: 15, hour: 12, gender: 'female' },
            expected: {
                hasResult: true,
            },
        },
        {
            name: '1985년 5월 15일 14시 남성',
            input: { year: 1985, month: 5, day: 15, hour: 14, gender: 'male' },
            expected: {
                hasResult: true,
            },
        },
        {
            name: '1970년 12월 25일 6시 여성',
            input: { year: 1970, month: 12, day: 25, hour: 6, gender: 'female' },
            expected: {
                hasResult: true,
            },
        },
        {
            name: '2010년 2월 14일 0시 남성',
            input: { year: 2010, month: 2, day: 14, hour: 0, gender: 'male' },
            expected: {
                hasResult: true,
            },
        },
    ];

    testCases.forEach(({ name, input, expected }) => {
        it(`${name} — 사주팔자 생성 성공`, async () => {
            const result = await calculateSaju(input);

            // 기본 구조 검증
            expect(result).toBeDefined();
            expect(result.pillars).toBeDefined();
            expect(result.pillars.year).toBeDefined();
            expect(result.pillars.month).toBeDefined();
            expect(result.pillars.day).toBeDefined();
            expect(result.pillars.hour).toBeDefined();

            // 각 기둥에 stem과 branch가 있는지
            ['year', 'month', 'day', 'hour'].forEach((pos) => {
                expect(result.pillars[pos].stem).toBeTruthy();
                expect(result.pillars[pos].branch).toBeTruthy();
                expect(result.pillars[pos].stemKr).toBeTruthy();
                expect(result.pillars[pos].branchKr).toBeTruthy();
            });

            // 일간 정보
            expect(result.dayMaster).toBeDefined();
            expect(result.dayMaster.element).toBeTruthy();

            // 오행 분포
            expect(result.elements).toBeDefined();
            expect(result.elements['木']).toBeDefined();
            expect(result.elements['火']).toBeDefined();
            expect(result.elements['土']).toBeDefined();
            expect(result.elements['金']).toBeDefined();
            expect(result.elements['水']).toBeDefined();

            // 특정 기대값 확인
            if (expected.yearPillar) {
                expect(result.pillars.year.pillar).toBe(expected.yearPillar);
            }
        });
    });

    it('오행 분포 합이 100%', async () => {
        const result = await calculateSaju({
            year: 1990, month: 1, day: 1, hour: 12, gender: 'male',
        });

        const totalRatio = ['木', '火', '土', '金', '水'].reduce((sum, el) => {
            return sum + (result.elements[el]?.ratio || 0);
        }, 0);

        // 반올림으로 인해 약간의 오차 허용
        expect(totalRatio).toBeGreaterThanOrEqual(95);
        expect(totalRatio).toBeLessThanOrEqual(105);
    });

    it('zodiac(띠) 정보가 있음', async () => {
        const result = await calculateSaju({
            year: 2000, month: 6, day: 1, hour: 12, gender: 'male',
        });

        expect(result.zodiac).toBeTruthy();
        expect(typeof result.zodiac).toBe('string');
    });
});
