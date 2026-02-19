/**
 * 분석 유틸리티 — GA4 + UTM 추적
 * Phase 4에서 본격 구현, 현재는 스텁
 */

/**
 * 이벤트 추적
 * @param {string} eventName
 * @param {Object} params
 */
export function trackEvent(eventName, params = {}) {
    if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
    }

    // 개발 모드 로깅
    if (import.meta.env.DEV) {
        console.log(`[Analytics] ${eventName}`, params);
    }
}

/**
 * UTM 파라미터 추출
 * @returns {Object} UTM 파라미터 객체
 */
export function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || '',
    };
}
