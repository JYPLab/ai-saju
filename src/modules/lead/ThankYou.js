/**
 * Thank You 페이지 모듈 (ThankYou.js)
 * 
 * 상담 폼 제출 후 전체 화면 감사 오버레이를 표시합니다.
 * - 접수 확인 + 예상 소요 시간
 * - 카카오톡 공유 버튼
 * - 다른 사람 운세 보기 (재검진)
 * - 결과 다시 보기 (스크롤 복귀)
 * 
 * Independence Axiom: EventBus를 통해서만 외부와 통신
 */

import bus from '@utils/eventBus.js';

// ──────────────────────────────────────
// Thank You 오버레이 렌더링
// ──────────────────────────────────────

function renderThankYou(email) {
  // 기존 오버레이 제거
  const existing = document.getElementById('thankyou-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'thankyou-overlay';
  overlay.className = 'thankyou-overlay';

  overlay.innerHTML = `
    <div class="thankyou-container">
      <!-- 상단: 축하 아이콘 + 타이틀 -->
      <div class="thankyou-header">
        <div class="thankyou-sparkle">🎊</div>
        <h2 class="thankyou-title">진단서가 준비되었어요!</h2>
        <p class="thankyou-subtitle">
          12페이지 맞춤형 운세 진단서를<br>
          지금 바로 받아보세요
        </p>
      </div>

      <!-- PDF 다운로드 버튼 (메인 CTA) -->
      <div class="thankyou-pdf-section">
        <button class="thankyou-action-btn pdf" id="thankyou-pdf-btn">
          📄 12페이지 진단서 PDF 다운로드
        </button>
        <p class="thankyou-pdf-note">무료 · 바로 다운로드</p>
      </div>

      <!-- 구분선 -->
      <div class="thankyou-divider"></div>

      <!-- 이메일 안내 (전문가 상담) -->
      <div class="thankyou-email-card">
        <span class="thankyou-email-icon">💬</span>
        <div class="thankyou-email-info">
          <span class="thankyou-email-label">전문가 상담 답변 수신</span>
          <span class="thankyou-email-address">${email}</span>
        </div>
      </div>

      <!-- 구분선 -->
      <div class="thankyou-divider"></div>

      <!-- 공유 섹션 -->
      <div class="thankyou-share-section">
        <p class="thankyou-share-text">가족·친구에게도 운세 검진을 선물하세요 🎁</p>
        <div class="thankyou-share-buttons">
          <button class="thankyou-share-btn kakao" id="thankyou-kakao-btn">
            💬 카카오톡 공유
          </button>
          <button class="thankyou-share-btn copy" id="thankyou-copy-btn">
            🔗 링크 복사
          </button>
        </div>
      </div>

      <!-- 하단 액션 -->
      <div class="thankyou-actions">
        <button class="thankyou-action-btn primary" id="thankyou-new-btn">
          🔮 다른 사람 운세 검진하기
        </button>
        <button class="thankyou-action-btn secondary" id="thankyou-back-btn">
          ← 내 진단서 다시 보기
        </button>
      </div>
    </div>
    `;

  document.body.appendChild(overlay);

  // 등장 애니메이션
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
  });

  // 이벤트 핸들러 연결
  attachThankYouHandlers(overlay);
}

// ──────────────────────────────────────
// 이벤트 핸들러
// ──────────────────────────────────────

function attachThankYouHandlers(overlay) {
  // 정밀 진단서 상태 보드 (기존 버튼 대체)
  const pdfSection = document.querySelector('.thankyou-pdf-section');
  if (pdfSection) {
    const eta = calculateETA();
    const etaStr = `${eta.getHours()}:${String(eta.getMinutes()).padStart(2, '0')}`;
    const dateStr = (eta.getDate() !== new Date().getDate()) ? '내일 ' : '오늘 ';

    pdfSection.innerHTML = `
      <div class="analysis-status-card">
        <span class="status-label">
          <span class="status-pulse"></span>
          정밀 분석 및 검수 진행 중
        </span>
        <div class="progress-container">
          <div class="progress-fill"></div>
        </div>
        <div class="eta-box">
          <span class="eta-label">진단서 도착 예정</span>
          <span class="eta-time">${dateStr}${etaStr}</span>
        </div>
        <p class="status-note">
          전문가의 정밀 대조 및 비방 처방을 거쳐<br>
          상세 진단서가 곧 도착할 예정입니다.
        </p>
      </div>
    `;
  }

  // 카카오톡 공유
  const kakaoBtn = document.getElementById('thankyou-kakao-btn');
  if (kakaoBtn) {
    kakaoBtn.addEventListener('click', () => {
      shareKakao();
    });
  }

  // 링크 복사
  const copyBtn = document.getElementById('thankyou-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyLink(copyBtn);
    });
  }

  // 다른 사람 운세 보기 (새 검진)
  const newBtn = document.getElementById('thankyou-new-btn');
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      closeOverlay(overlay);
      // 페이지 최상단으로 스크롤 + 결과 숨김
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const resultSection = document.getElementById('result-section');
      if (resultSection) resultSection.classList.add('hidden');
      const inputSection = document.getElementById('input-section');
      if (inputSection) inputSection.classList.remove('hidden');
    });
  }

  // 진단서 다시 보기
  const backBtn = document.getElementById('thankyou-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      closeOverlay(overlay);
      const summaryArea = document.getElementById('summary-area');
      if (summaryArea) {
        summaryArea.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

/**
 * 예상 리포트 완료 시각 계산
 * - 업무 시간: 07:00 ~ 21:00 (접수 마감 18:00)
 * - 딜레이: 3시간
 */
function calculateETA() {
  const now = new Date();
  const currentHour = now.getHours();
  // 주중/주말 관계없이 매일 운영 기준

  const eta = new Date(now.getTime());

  if (currentHour >= 7 && currentHour < 18) {
    // 당일 발송 가능 (오전 7시 ~ 오후 6시 사이 접수)
    eta.setHours(eta.getHours() + 3);
  } else {
    // 다음 영업일 발송 (오후 6시 이후 혹은 새벽 접수)
    if (currentHour >= 18) {
      eta.setDate(eta.getDate() + 1);
    }
    eta.setHours(10, 0, 0, 0); // 오전 7시 + 3시간 = 10시
  }
  return eta;
}

// ──────────────────────────────────────
// 카카오톡 공유 (Web Share API 폴백)
// ──────────────────────────────────────

function shareKakao() {
  const shareData = {
    title: '🔮 2026 병오년 운세 건강 검진',
    text: '사주로 보는 2026년 건강·재물·가족운! 무료로 검진받아보세요 🎊',
    url: window.location.origin,
  };

  // Web Share API (모바일에서 카카오톡 포함 네이티브 공유)
  if (navigator.share) {
    navigator.share(shareData).catch(() => {
      // 사용자가 공유 취소 — 무시
    });
  } else {
    // 데스크탑 폴백: 카카오톡 공유 URL
    const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(shareData.url)}`;
    window.open(kakaoUrl, '_blank', 'width=600,height=400');
  }
}

// ──────────────────────────────────────
// 링크 복사
// ──────────────────────────────────────

function copyLink(btn) {
  const url = window.location.origin;
  navigator.clipboard.writeText(url).then(() => {
    const original = btn.textContent;
    btn.textContent = '✅ 복사 완료!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    // 클립보드 API 실패 시 폴백
    prompt('아래 주소를 복사하세요:', url);
  });
}

// ──────────────────────────────────────
// 오버레이 닫기
// ──────────────────────────────────────

function closeOverlay(overlay) {
  overlay.classList.remove('visible');
  setTimeout(() => {
    overlay.remove();
  }, 400);
}

// ──────────────────────────────────────
// EventBus 초기화
// ──────────────────────────────────────

export function initThankYou() {
  bus.on(bus.Events.LEAD_INQUIRY, (data) => {
    // 약간의 딜레이 후 오버레이 표시 (폼 접수 처리 완료 후)
    setTimeout(() => {
      renderThankYou(data.email);
    }, 800);
  });

  console.log('[ThankYou] 감사 페이지 모듈 초기화 완료');
}
