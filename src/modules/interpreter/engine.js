/**
 * AI 해석 엔진 (engine.js)
 * 
 * 만세력 분석 결과를 사람이 읽을 수 있는 
 * 한국어 운세 텍스트로 변환합니다.
 * 
 * Independence Axiom: EventBus를 통해서만 외부와 통신
 */

import bus from '@utils/eventBus.js';
import { generateFortune } from './templates.js';
import { formatForDisplay, formatForReport } from './formatter.js';

/**
 * 분석 결과를 해석하여 운세 텍스트를 생성합니다.
 * 
 * @param {Object} analysisResult - ANALYSIS_COMPLETE 이벤트에서 받은 전체 분석 결과
 * @returns {Object} 해석된 운세 데이터
 */
export function interpretResult(analysisResult) {
    const { pillars, dayMaster, elements, interactions, strength, yongShen, luck2026, zodiac, birthInput } = analysisResult;

    // 1. 카테고리별 운세 텍스트 생성
    const fortune = generateFortune(analysisResult);

    // 2. 요약본 / 상세본 분리
    const summaryData = formatForDisplay(fortune, analysisResult);
    const detailData = formatForReport(fortune, analysisResult);

    return {
        fortune,
        summary: summaryData,
        detail: detailData,
    };
}

// ──────────────────────────────────────
// EventBus 이벤트 핸들러 등록
// ──────────────────────────────────────

export function initInterpreter() {
    bus.on(bus.Events.ANALYSIS_COMPLETE, (analysisResult) => {
        try {
            bus.emit(bus.Events.INTERPRET_START, { status: 'interpreting' });

            const interpretation = interpretResult(analysisResult);

            bus.emit(bus.Events.INTERPRET_COMPLETE, {
                ...analysisResult,
                interpretation,
            });

            // 병렬로 요약본·상세본 데이터를 각각 발행
            bus.emit(bus.Events.DISPLAY_SUMMARY, interpretation.summary);
            bus.emit(bus.Events.DISPLAY_CHART, {
                elements: analysisResult.elements,
                pillars: analysisResult.pillars,
                score: analysisResult.interactions?.fortuneScore,
            });

        } catch (error) {
            console.error('[Interpreter] 해석 오류:', error);
            bus.emit(bus.Events.ERROR, {
                source: 'interpreter',
                message: '운세 해석 중 오류가 발생했습니다.',
                error: error.message,
            });
        }
    });

    console.log('[Interpreter] 모듈 초기화 완료');
}
