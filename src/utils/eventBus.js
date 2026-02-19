/**
 * EventBus — 중앙 이벤트 버스 (Pub/Sub)
 * 
 * Independence Axiom 핵심 인프라:
 * 모든 모듈은 이 EventBus를 통해서만 통신하며,
 * 다른 모듈을 직접 import하는 것을 금지합니다.
 * 
 * 이벤트 네이밍 컨벤션: "모듈명:액션"
 * 예: "input:submit", "analysis:complete", "display:summary"
 */

class EventBus {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this._listeners = new Map();
        /** @type {Map<string, any>} */
        this._lastPayloads = new Map();

        // 등록된 이벤트 타입 상수
        this.Events = Object.freeze({
            // ① 입력 모듈
            INPUT_SUBMIT: 'input:submit',
            INPUT_RESET: 'input:reset',

            // ② 만세력 연산 모듈
            CALC_START: 'calc:start',
            CALC_PILLARS_READY: 'calc:pillars_ready',
            ANALYSIS_COMPLETE: 'analysis:complete',

            // ③ AI 해석 모듈
            INTERPRET_START: 'interpret:start',
            INTERPRET_COMPLETE: 'interpret:complete',

            // ④ 화면 표시 모듈
            DISPLAY_SUMMARY: 'display:summary',
            DISPLAY_CHART: 'display:chart',

            // ⑤ PDF 생성 모듈
            PDF_GENERATE_START: 'pdf:generate_start',
            PDF_GENERATE_COMPLETE: 'pdf:generate_complete',

            // ⑥ 리드 수집 모듈 (전문가 질문)
            LEAD_INQUIRY: 'lead:inquiry',
            LEAD_CAPTURED: 'lead:captured',
            LEAD_ERROR: 'lead:error',

            // 로딩 상태
            LOADING_END: 'loading:end',

            // ⑦ 광고 모듈
            ADS_LOAD: 'ads:load',

            // ⑧ 데이터 동기화
            DATA_SYNC_SUCCESS: 'data:sync_success',
            DATA_SYNC_ERROR: 'data:sync_error',

            // 시스템
            ERROR: 'system:error',
        });
    }

    /**
     * 이벤트 구독
     * @param {string} event - 이벤트 이름
     * @param {Function} callback - 콜백 함수
     * @returns {Function} 구독 해제 함수
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);

        // 구독 해제 함수 반환 (cleanup 용도)
        return () => this.off(event, callback);
    }

    /**
     * 일회성 이벤트 구독
     * @param {string} event - 이벤트 이름
     * @param {Function} callback - 콜백 함수
     * @returns {Function} 구독 해제 함수
     */
    once(event, callback) {
        const wrapper = (payload) => {
            this.off(event, wrapper);
            callback(payload);
        };
        return this.on(event, wrapper);
    }

    /**
     * 이벤트 구독 해제
     * @param {string} event - 이벤트 이름
     * @param {Function} callback - 제거할 콜백 함수
     */
    off(event, callback) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this._listeners.delete(event);
            }
        }
    }

    /**
     * 이벤트 발행
     * @param {string} event - 이벤트 이름
     * @param {*} payload - 전달할 데이터
     */
    emit(event, payload) {
        this._lastPayloads.set(event, payload);

        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.forEach((callback) => {
                try {
                    callback(payload);
                } catch (error) {
                    console.error(`[EventBus] Error in listener for "${event}":`, error);
                    this.emit(this.Events.ERROR, {
                        source: event,
                        error: error.message,
                    });
                }
            });
        }
    }

    /**
     * 마지막으로 발행된 이벤트 데이터 조회
     * @param {string} event - 이벤트 이름
     * @returns {*} 마지막 페이로드
     */
    getLastPayload(event) {
        return this._lastPayloads.get(event);
    }

    /**
     * 특정 이벤트의 모든 리스너 제거
     * @param {string} event - 이벤트 이름
     */
    clearEvent(event) {
        this._listeners.delete(event);
        this._lastPayloads.delete(event);
    }

    /**
     * 모든 이벤트와 리스너 초기화
     */
    reset() {
        this._listeners.clear();
        this._lastPayloads.clear();
    }

    /**
     * 디버깅: 현재 등록된 리스너 수 조회
     * @returns {Object} 이벤트 이름별 리스너 수
     */
    debug() {
        const stats = {};
        this._listeners.forEach((listeners, event) => {
            stats[event] = listeners.size;
        });
        return stats;
    }
}

// 싱글톤 인스턴스 — 앱 전체에서 하나만 사용
const bus = new EventBus();
export default bus;
export { EventBus };
