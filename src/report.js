/**
 * 정밀 진단서 전용 엔트리 (report.js)
 * 
 * sessionStorage에서 데이터를 복구하여 FullReportView를 독립적으로 렌더링합니다.
 */

import './styles/index.css';
import { renderFullReport } from '@modules/display/FullReportView.js';

const SHEET_URL = import.meta.env.VITE_SHEET_URL;

async function initReport() {
    console.log('📜 정밀 진단서 페이지 초기화 중...');

    const reportRoot = document.getElementById('report-root');
    if (!reportRoot) return;

    // URL 파라미터에서 ID 확인
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');

    try {
        let reportData = null;

        if (sessionId) {
            // 1. URL ID가 있으면 서버에서 데이터 가져오기 (가장 확실한 방법)
            console.log(`[Report] 서버에서 데이터 조회 시도 (ID: ${sessionId})`);
            reportRoot.innerHTML = '<div class="loading-report">📡 분석 데이터를 불러오고 있습니다...</div>';

            const response = await fetch(`${SHEET_URL}?id=${sessionId}`);
            const result = await response.json();

            if (result.ok && result.data) {
                reportData = result.data;
                console.log('[Report] 서버 데이터 복구 성공');
            } else {
                throw new Error(result.error || '데이터를 찾을 수 없습니다.');
            }
        } else {
            // 2. ID가 없으면 sessionStorage 확인 (로컬 테스트 및 즉시 보기용)
            const rawData = sessionStorage.getItem('fullReportData');
            if (rawData) {
                reportData = JSON.parse(rawData);
                console.log('[Report] 로컬 데이터 복구 성공');
            }
        }

        if (!reportData) {
            console.error('[Report] 복구할 데이터가 없습니다.');
            reportRoot.innerHTML = `
                <div class="report-error">
                    <h2>죄송합니다. 진단서를 찾을 수 없습니다.</h2>
                    <p>메인 페이지에서 다시 검진을 진행하시거나, 이메일의 링크를 다시 확인해주세요.</p>
                    <button class="thankyou-action-btn primary" onclick="location.href='./index.html'">메인으로 이동</button>
                </div>
            `;
            return;
        }

        // 3. 리포트 렌더링
        renderFullReport(reportRoot, reportData);

        // 4. 브라우저 인쇄 지원을 위한 팁
        console.log('💡 팁: 브라우저 인쇄 기능을 사용해 PDF로 저장할 수 있습니다.');

    } catch (error) {
        console.error('[Report] 초기화 오류:', error);
        reportRoot.innerHTML = `
            <div class="report-error">
                <h2>오류가 발생했습니다</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()">새로고침</button>
            </div>
        `;
    }
}

// 실행
document.addEventListener('DOMContentLoaded', initReport);
