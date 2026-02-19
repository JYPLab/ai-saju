/**
 * Google Sheets 데이터 동기화 모듈 (SheetSync.js)
 * 
 * EventBus 이벤트를 수신하여 Google Apps Script 웹앱으로
 * 세션 데이터를 전송합니다.
 * 
 * Independence Axiom: EventBus를 통해서만 외부와 통신
 */

import bus from '@utils/eventBus.js';

// ──────────────────────────────────────
// 설정
// ──────────────────────────────────────

const SHEET_URL = import.meta.env.VITE_SHEET_URL || '';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ──────────────────────────────────────
// 세션 관리
// ──────────────────────────────────────

let _sessionId = null;
let _sessionData = null;

function getSessionId() {
    if (!_sessionId) {
        // 기존 세션 확인
        _sessionId = sessionStorage.getItem('saju_session_id');

        if (!_sessionId) {
            _sessionId = crypto.randomUUID();
            sessionStorage.setItem('saju_session_id', _sessionId);
        }
    }
    return _sessionId;
}

function resetSession() {
    _sessionId = crypto.randomUUID();
    _sessionData = null;
    sessionStorage.setItem('saju_session_id', _sessionId);
}

// ──────────────────────────────────────
// 데이터 전송
// ──────────────────────────────────────

async function postToSheet(payload) {
    if (!SHEET_URL) {
        console.log('[SheetSync] VITE_SHEET_URL 미설정 — 콘솔에만 기록합니다.');
        console.log('[SheetSync] 데이터:', JSON.stringify(payload, null, 2));
        bus.emit(bus.Events.DATA_SYNC_SUCCESS, { mode: 'console', sessionId: payload.session_id });
        return { ok: true, mode: 'console' };
    }

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Google Apps Script는 CORS preflight를 지원하지 않으므로
            // text/plain으로 보내 simple request로 처리 (preflight 회피)
            const response = await fetch(SHEET_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                redirect: 'follow',
            });

            // Apps Script는 302 리다이렉트 후 응답을 반환함
            let result;
            try {
                result = await response.json();
            } catch {
                // 응답이 JSON이 아닌 경우 (opaque response 등)
                result = { ok: true, status: response.status };
            }

            console.log(`[SheetSync] 전송 성공 (시도 ${attempt}):`, result);
            bus.emit(bus.Events.DATA_SYNC_SUCCESS, { sessionId: payload.session_id, result });
            return result;

        } catch (error) {
            lastError = error;
            console.warn(`[SheetSync] 전송 실패 (시도 ${attempt}/${MAX_RETRIES}):`, error.message);

            if (attempt < MAX_RETRIES) {
                await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
            }
        }
    }

    // 모든 재시도 실패
    console.error('[SheetSync] 최종 전송 실패:', lastError);
    bus.emit(bus.Events.DATA_SYNC_ERROR, {
        sessionId: payload.session_id,
        error: lastError?.message || 'Unknown error',
    });
    return { ok: false, error: lastError?.message };
}

// ──────────────────────────────────────
// 세션 데이터 빌드 (검진 완료 시)
// ──────────────────────────────────────

function buildSessionPayload(interpretData) {
    const sessionId = getSessionId();
    const { summary, detail } = interpretData.interpretation || {};
    const birthInput = interpretData.birthInput || detail?.birthInput || {};

    const payload = {
        type: 'session',
        session_id: sessionId,
        created_at: new Date().toISOString(),
        status: 'free_viewed',

        // 입력 정보
        birth_year: birthInput.year,
        birth_month: birthInput.month,
        birth_day: birthInput.day,
        birth_hour: birthInput.hour,
        gender: birthInput.gender,
        is_lunar: birthInput.isLunar || false,

        // 결과 요약 (세션 탭용)
        fortune_score: summary?.fortuneScore || 0,
        four_pillars: summary?.sajuSummary?.[0] || '',
        categories_summary: Object.values(summary?.allCategories || {})
            .map((c) => `${c.emoji || ''} ${c.name}: ${(c.text || '').slice(0, 30)}`)
            .join(' | '),

        // 상세 결과 JSON (별도 탭용)
        result_json: JSON.stringify(detail || {}),
    };

    _sessionData = payload;
    return payload;
}

// ──────────────────────────────────────
// 상담 데이터 빌드 (폼 제출 시)
// ──────────────────────────────────────

function buildInquiryPayload(inquiryData) {
    return {
        type: 'inquiry',
        session_id: getSessionId(),
        email: inquiryData.email,
        concern_categories: (inquiryData.categories || []).join(', '),
        question_text: inquiryData.question,
        submitted_at: new Date().toISOString(),
    };
}

// ──────────────────────────────────────
// EventBus 이벤트 핸들러 등록
// ──────────────────────────────────────

export function initSheetSync() {
    // 검진 완료 시 → 세션 데이터 전송
    bus.on(bus.Events.INTERPRET_COMPLETE, (data) => {
        try {
            const payload = buildSessionPayload(data);
            postToSheet(payload);
        } catch (error) {
            console.error('[SheetSync] 세션 데이터 빌드 오류:', error);
        }
    });

    // 상담 폼 제출 시 → 상담 데이터 전송
    bus.on(bus.Events.LEAD_INQUIRY, (data) => {
        try {
            const payload = buildInquiryPayload(data);
            postToSheet(payload);
        } catch (error) {
            console.error('[SheetSync] 상담 데이터 빌드 오류:', error);
        }
    });

    // 새 검진 시 세션 초기화
    bus.on(bus.Events.INPUT_SUBMIT, () => {
        resetSession();
    });

    console.log('[SheetSync] 모듈 초기화 완료');
}
