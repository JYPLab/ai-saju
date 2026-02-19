/**
 * 운세 결과 요약 뷰 (SummaryView.js)
 * 
 * '운세 건강 정밀 진단서' 컨셉으로 결과를 표시합니다.
 * 
 * - 헤드라인: "2026년 병오년(丙午年), 당신의 '운세 건강' 정밀 진단서"
 * - 총운 상단 1개로 통합
 * - 재물💰/가족👨‍👩‍👧/건강🏥/명예🏅 아이콘 매핑
 * - 전체 공개: 모든 카테고리를 가림 없이 노출
 * 
 * Independence Axiom: EventBus를 통해서만 외부와 통신
 */

import bus from '@utils/eventBus.js';

// ──────────────────────────────────────
// 카테고리 아이콘 매핑
// ──────────────────────────────────────

const CATEGORY_ICONS = {
  '재물운': '💰',
  '가족운': '👨‍👩‍👧',
  '건강운': '🏥',
  '명예운': '🏅',
  '사업운': '💼',
  '연애운': '💕',
  '직장운': '🏢',
  '학업운': '📚',
};

function getCategoryIcon(name) {
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (name && name.includes(key.replace('운', ''))) return icon;
  }
  return '📋';
}

// ──────────────────────────────────────
// 점수 등급 & 색상 매핑
// ──────────────────────────────────────

function getScoreGrade(score) {
  if (score >= 80) return { label: '매우 건강 (大吉)', color: '#ffd700', emoji: '🌟' };
  if (score >= 60) return { label: '양호 (吉)', color: '#43b581', emoji: '✨' };
  if (score >= 40) return { label: '보통 (中)', color: '#f9ca24', emoji: '🌤️' };
  if (score >= 20) return { label: '주의 필요 (小凶)', color: '#ff8c42', emoji: '🌥️' };
  return { label: '위기 신호 (凶)', color: '#e74c3c', emoji: '⚠️' };
}

// ──────────────────────────────────────
// 결과 뷰 렌더링
// ──────────────────────────────────────

function renderSummary(container, data) {
  if (!container || !data) return;

  const grade = getScoreGrade(data.fortuneScore);

  const html = `
    <div class="result-container">
      <!-- 진단서 헤드라인 -->
      <h2 class="result-title">
        📜 2026년 병오년(丙午年)<br>
        당신의 '운세 건강' 정밀 진단서
      </h2>

      <!-- 사주 요약 카드 -->
      <div class="saju-summary-card">
        ${(data.sajuSummary || []).map((line) => `<p>${line}</p>`).join('')}
      </div>

      <!-- 종합 운세 점수 -->
      <div class="score-card">
        <div class="score-ring" style="--score-color: ${grade.color}">
          <svg class="score-ring-svg" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8" />
            <circle 
              class="score-ring-fill" 
              cx="60" cy="60" r="52" 
              fill="none" 
              stroke="${grade.color}" 
              stroke-width="8"
              stroke-dasharray="0 327"
              stroke-dashoffset="0"
              stroke-linecap="round"
              transform="rotate(-90 60 60)"
              data-target="${(data.fortuneScore / 100) * 327}"
            />
          </svg>
          <div class="score-inner">
            <span class="score-number">${data.fortuneScore}</span>
            <span class="score-unit">점</span>
          </div>
        </div>
        <p class="score-grade" style="color: ${grade.color}">${grade.emoji} ${grade.label}</p>
        <p class="score-desc">2026 병오년 운세 건강 종합 점수예요</p>
      </div>

      <!-- 총운 (하나로 통합) -->
      <div class="fortune-card overall-card">
        <h3>🌟 올해의 운세 건강 총평</h3>
        <div class="fortune-text">
          ${(data.overall || []).map((line) => `<p>${line}</p>`).join('')}
        </div>
      </div>

      <!-- 4대 영역 운세 (가림 없이 전부 공개) -->
      ${renderCategories(data.allCategories)}

      <!-- 행운 처방 정보 -->
      ${renderLuckyCard(data.lucky)}
    </div>
  `;

  container.innerHTML = html;

  // 점수 링 애니메이션
  requestAnimationFrame(() => {
    animateScoreRing();
  });
}

// ──────────────────────────────────────
// 카테고리 카드 렌더링 (전체 공개, 아이콘 매핑)
// ──────────────────────────────────────

function renderCategories(categories) {
  if (!categories || Object.keys(categories).length === 0) return '';

  return Object.values(categories).map((cat, index) => {
    const delay = `style="animation-delay: ${index * 0.08}s"`;
    const icon = cat.emoji || getCategoryIcon(cat.name);

    return `
      <div class="fortune-card" ${delay}>
        <h3>${icon} ${cat.name}</h3>
        <p>${cat.text || ''}</p>
      </div>
    `;
  }).join('');
}

// ──────────────────────────────────────
// 행운 처방 카드
// ──────────────────────────────────────

function renderLuckyCard(lucky) {
  if (!lucky) return '';

  return `
    <div class="lucky-card">
      <h3>🍀 운세 처방 — 나의 행운 정보</h3>
      <div class="lucky-grid">
        <div class="lucky-item">
          <span class="lucky-icon">🧭</span>
          <span class="lucky-label">행운의 방향</span>
          <span class="lucky-value">${lucky.direction || '-'}</span>
        </div>
        <div class="lucky-item">
          <span class="lucky-icon">🎨</span>
          <span class="lucky-label">행운의 색</span>
          <span class="lucky-value">${lucky.color || '-'}</span>
        </div>
        <div class="lucky-item">
          <span class="lucky-icon">🔢</span>
          <span class="lucky-label">행운의 숫자</span>
          <span class="lucky-value">${lucky.number || '-'}</span>
        </div>
        <div class="lucky-item">
          <span class="lucky-icon">💎</span>
          <span class="lucky-label">행운의 보석</span>
          <span class="lucky-value">${lucky.gem || '-'}</span>
        </div>
      </div>
    </div>
  `;
}

// ──────────────────────────────────────
// 점수 링 애니메이션
// ──────────────────────────────────────

function animateScoreRing() {
  const ring = document.querySelector('.score-ring-fill');
  if (!ring) return;

  const target = parseFloat(ring.dataset.target);
  setTimeout(() => {
    ring.style.transition = 'stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
    ring.setAttribute('stroke-dasharray', `${target} ${327 - target}`);
  }, 300);
}

// ──────────────────────────────────────
// EventBus 이벤트 핸들러 등록
// ──────────────────────────────────────

export function initSummaryView() {
  bus.on(bus.Events.DISPLAY_SUMMARY, (summaryData) => {
    try {
      const resultSection = document.getElementById('result-section');
      const summaryArea = document.getElementById('summary-area');

      if (!resultSection || !summaryArea) {
        console.warn('[SummaryView] 결과 영역을 찾을 수 없습니다.');
        return;
      }

      // 결과 섹션 표시
      resultSection.classList.remove('hidden');

      // 요약 렌더링
      renderSummary(summaryArea, summaryData);

      // 결과로 스크롤
      resultSection.scrollIntoView({ behavior: 'smooth' });

      // 버튼 로딩 상태 복원
      bus.emit(bus.Events.LOADING_END, { source: 'summaryView' });

      console.log('[SummaryView] 운세 건강 진단서 렌더링 완료');
    } catch (error) {
      console.error('[SummaryView] 렌더링 오류:', error);
      bus.emit(bus.Events.ERROR, {
        source: 'summaryView',
        message: '결과 표시 중 문제가 생겼습니다. 다시 시도해주세요.',
        error: error.message,
      });
    }
  });

  console.log('[SummaryView] 모듈 초기화 완료');
}
