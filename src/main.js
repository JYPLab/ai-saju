/**
 * 메인 부트스트랩 (main.js)
 * 
 * 모든 독립 모듈을 초기화하고 EventBus를 통해 연결합니다.
 * 각 모듈은 EventBus의 이벤트만으로 통신하며,
 * main.js는 오케스트레이터(지휘자) 역할만 합니다.
 */

import './styles/index.css';
import bus from '@utils/eventBus.js';

// ──────────────────────────────────────
// 모듈 초기화
// ──────────────────────────────────────

async function bootstrap() {
    console.log('🔮 운세 건강 검진 서비스 부팅 중...');

    try {
        // Phase 1: 핵심 엔진 모듈
        const { initCalculator } = await import('@modules/manseryeok/calculator.js');
        const { initInteractions } = await import('@modules/manseryeok/interactions.js');

        // Phase 2: 해석 + UI 모듈
        const { initInterpreter } = await import('@modules/interpreter/engine.js');
        const { initChartVisual } = await import('@modules/display/ChartVisual.js');
        const { initSummaryView } = await import('@modules/display/SummaryView.js');
        const { initFullReportView } = await import('@modules/display/FullReportView.js');
        const { initInputForm } = await import('@modules/input/InputForm.js');

        // Phase 3: 리드 수집 + PDF
        const { initEmailCapture } = await import('@modules/lead/EmailCapture.js');
        const { initThankYou } = await import('@modules/lead/ThankYou.js');
        const { initPdfReport } = await import('@modules/pdf/PdfReportBuilder.js');

        // Phase 4: 데이터 동기화
        const { initSheetSync } = await import('@modules/data/SheetSync.js');

        // 모듈 초기화 순서: 하류(downstream)부터 → 상류(upstream)
        // 1. 화면 표시 (가장 하류)
        initSummaryView();
        initFullReportView();
        initChartVisual();
        initEmailCapture();
        initThankYou();

        // 2. 데이터 동기화 (하류)
        initSheetSync();

        // 3. 해석 엔진 (중간)
        initInterpreter();

        // 4. 만세력 연산 (상류)
        initInteractions();
        initCalculator();

        // 5. 입력 폼 (최상류 — 마지막에 렌더링)
        initInputForm();

        console.log('✅ 모든 모듈 초기화 완료');
        console.log('📊 EventBus 상태:', bus.debug());

    } catch (error) {
        console.error('❌ 부팅 실패:', error);
        document.getElementById('input-section').innerHTML = `
            <div class="input-container">
                <h1 class="main-title">🔮 2026 병오년 운세 건강 검진</h1>
                <p class="sub-title" style="color: #ff6b6b;">
                    잠시 문제가 생겼어요. 페이지를 새로고침해주세요.
                </p>
            </div>
        `;
    }
}

// ──────────────────────────────────────
// 앱 시작
// ──────────────────────────────────────

bootstrap();
