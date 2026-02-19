/**
 * 오행 분포 도넛 차트 (ChartVisual.js)
 * 
 * 순수 SVG 기반 — 외부 라이브러리 없이 경량 구현
 * 애니메이션, 그라데이션, 호버 인터랙션 포함
 * 
 * Independence Axiom: EventBus를 통해서만 외부와 통신
 */

import bus from '@utils/eventBus.js';

// ──────────────────────────────────────
// 오행 차트 설정 상수
// ──────────────────────────────────────

const CHART_CONFIG = {
  size: 280,
  strokeWidth: 36,
  innerRadius: 70,
  animationDuration: 1200,
  hoverScale: 1.04,
};

const ELEMENT_CHART_DATA = {
  '木': { label: '목(木)', color: '#43b581', gradient: ['#2ecc71', '#27ae60'], emoji: '🌳', order: 0 },
  '火': { label: '화(火)', color: '#ff6b6b', gradient: ['#ff6b35', '#e74c3c'], emoji: '🔥', order: 1 },
  '土': { label: '토(土)', color: '#f9ca24', gradient: ['#f1c40f', '#f39c12'], emoji: '🌍', order: 2 },
  '金': { label: '금(金)', color: '#a8a8c8', gradient: ['#bdc3c7', '#95a5a6'], emoji: '⚔️', order: 3 },
  '水': { label: '수(水)', color: '#74b9ff', gradient: ['#3498db', '#2980b9'], emoji: '💧', order: 4 },
};

// ──────────────────────────────────────
// SVG 도넛 차트 렌더러
// ──────────────────────────────────────

/**
 * 오행 분포 도넛 차트를 생성합니다.
 * 
 * @param {HTMLElement} container - 차트를 삽입할 DOM 요소
 * @param {Object} elements - 오행 분포 데이터 { '木': { count, ratio }, ... }
 * @param {Object} [options] - 추가 옵션 
 */
export function renderDonutChart(container, elements, options = {}) {
  if (!container || !elements) return;

  const size = options.size || CHART_CONFIG.size;
  const strokeWidth = options.strokeWidth || CHART_CONFIG.strokeWidth;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // 차트 데이터 준비 (0% 요소 제외, 최소 표시용 2%로 보정)
  const chartSegments = prepareSegments(elements, circumference);

  // 고유 ID (여러 차트 인스턴스 대응)
  const chartId = `donut-${Date.now()}`;

  const html = `
    <div class="chart-visual" id="${chartId}">
      <div class="chart-wrapper">
        <!-- SVG 도넛 -->
        <svg 
          class="donut-svg" 
          viewBox="0 0 ${size} ${size}" 
          width="${size}" 
          height="${size}"
          role="img"
          aria-label="나의 오행 분포 차트"
        >
          <defs>
            ${chartSegments.map((seg) => `
              <linearGradient id="${chartId}-grad-${seg.key}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${seg.gradient[0]}" />
                <stop offset="100%" stop-color="${seg.gradient[1]}" />
              </linearGradient>
            `).join('')}
            <filter id="${chartId}-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <!-- 배경 원 -->
          <circle
            cx="${center}" cy="${center}" r="${radius}"
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            stroke-width="${strokeWidth}"
          />

          <!-- 세그먼트 -->
          ${chartSegments.map((seg) => `
            <circle
              class="donut-segment"
              data-element="${seg.key}"
              cx="${center}" cy="${center}" r="${radius}"
              fill="none"
              stroke="url(#${chartId}-grad-${seg.key})"
              stroke-width="${strokeWidth}"
              stroke-dasharray="0 ${circumference}"
              stroke-dashoffset="0"
              stroke-linecap="round"
              transform="rotate(${seg.startAngle} ${center} ${center})"
              style="
                transition: stroke-width 0.3s ease, filter 0.3s ease;
                cursor: pointer;
              "
            />
          `).join('')}

          <!-- 중심 텍스트 -->
          <text x="${center}" y="${center - 12}" text-anchor="middle" class="center-label">오행</text>
          <text x="${center}" y="${center + 16}" text-anchor="middle" class="center-sublabel">五行</text>
        </svg>

        <!-- 호버 툴팁 -->
        <div class="chart-tooltip" id="${chartId}-tooltip"></div>
      </div>

      <!-- 범례 -->
      <div class="chart-legend">
        ${chartSegments.map((seg) => `
          <div class="legend-item" data-element="${seg.key}">
            <span class="legend-dot" style="background: linear-gradient(135deg, ${seg.gradient[0]}, ${seg.gradient[1]})"></span>
            <span class="legend-emoji">${seg.emoji}</span>
            <span class="legend-label">${seg.label}</span>
            <span class="legend-value">${seg.ratio}%</span>
            <span class="legend-count">(${seg.count}개)</span>
          </div>
        `).join('')}
      </div>

      <!-- 밸런스 인디케이터 -->
      ${renderBalanceBar(elements)}
    </div>
  `;

  container.innerHTML = html;

  // 애니메이션 시작
  requestAnimationFrame(() => {
    animateSegments(chartId, chartSegments, circumference);
    attachInteractions(chartId, chartSegments);
  });
}

// ──────────────────────────────────────
// 데이터 준비
// ──────────────────────────────────────

function prepareSegments(elements, circumference) {
  const segments = [];
  let currentAngle = -90; // 12시 방향에서 시작

  const orderedKeys = Object.keys(ELEMENT_CHART_DATA)
    .sort((a, b) => ELEMENT_CHART_DATA[a].order - ELEMENT_CHART_DATA[b].order);

  orderedKeys.forEach((key) => {
    const elData = elements[key];
    if (!elData || typeof elData !== 'object') return;

    const ratio = elData.ratio || 0;
    const count = elData.count || 0;

    // 0%라도 범례에는 표시하되 아크는 그리지 않음
    const displayRatio = ratio;
    const arcLength = (ratio / 100) * circumference;
    const gap = ratio > 0 ? 4 : 0; // 세그먼트 간 갭

    segments.push({
      key,
      ...ELEMENT_CHART_DATA[key],
      ratio: displayRatio,
      count,
      arcLength: Math.max(0, arcLength - gap),
      startAngle: currentAngle,
      circumference,
    });

    currentAngle += (ratio / 100) * 360;
  });

  return segments;
}

// ──────────────────────────────────────
// 애니메이션
// ──────────────────────────────────────

function animateSegments(chartId, segments, circumference) {
  const svgCircles = document.querySelectorAll(`#${chartId} .donut-segment`);

  svgCircles.forEach((circle, index) => {
    const seg = segments[index];
    if (!seg || seg.arcLength <= 0) return;

    const targetDash = `${seg.arcLength} ${circumference - seg.arcLength}`;

    // 약간의 딜레이를 두고 순차 애니메이션
    setTimeout(() => {
      circle.style.transition = `stroke-dasharray ${CHART_CONFIG.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      circle.setAttribute('stroke-dasharray', targetDash);
    }, index * 150);
  });
}

// ──────────────────────────────────────
// 인터랙션 (호버, 클릭)
// ──────────────────────────────────────

function attachInteractions(chartId, segments) {
  const chartEl = document.getElementById(chartId);
  if (!chartEl) return;

  const tooltip = document.getElementById(`${chartId}-tooltip`);
  const svgCircles = chartEl.querySelectorAll('.donut-segment');
  const legendItems = chartEl.querySelectorAll('.legend-item');

  // 세그먼트 호버
  svgCircles.forEach((circle, index) => {
    const seg = segments[index];
    if (!seg) return;

    circle.addEventListener('mouseenter', () => {
      highlightElement(chartId, seg.key, svgCircles, legendItems);
      showTooltip(tooltip, seg, circle);
    });

    circle.addEventListener('mouseleave', () => {
      resetHighlight(svgCircles, legendItems);
      hideTooltip(tooltip);
    });
  });

  // 범례 호버
  legendItems.forEach((item) => {
    const elementKey = item.dataset.element;

    item.addEventListener('mouseenter', () => {
      highlightElement(chartId, elementKey, svgCircles, legendItems);
    });

    item.addEventListener('mouseleave', () => {
      resetHighlight(svgCircles, legendItems);
      hideTooltip(tooltip);
    });
  });
}

function highlightElement(chartId, elementKey, circles, legendItems) {
  circles.forEach((c) => {
    if (c.dataset.element === elementKey) {
      c.style.strokeWidth = `${CHART_CONFIG.strokeWidth + 6}px`;
      c.style.filter = `url(#${chartId}-glow)`;
    } else {
      c.style.opacity = '0.3';
    }
  });

  legendItems.forEach((item) => {
    if (item.dataset.element === elementKey) {
      item.classList.add('legend-active');
    } else {
      item.style.opacity = '0.4';
    }
  });
}

function resetHighlight(circles, legendItems) {
  circles.forEach((c) => {
    c.style.strokeWidth = '';
    c.style.filter = '';
    c.style.opacity = '';
  });

  legendItems.forEach((item) => {
    item.classList.remove('legend-active');
    item.style.opacity = '';
  });
}

function showTooltip(tooltip, seg, circle) {
  if (!tooltip) return;
  tooltip.innerHTML = `
    <span class="tooltip-emoji">${seg.emoji}</span>
    <strong>${seg.label}</strong>
    <span class="tooltip-value">${seg.ratio}% (${seg.count}개)</span>
  `;
  tooltip.classList.add('visible');
}

function hideTooltip(tooltip) {
  if (!tooltip) return;
  tooltip.classList.remove('visible');
}

// ──────────────────────────────────────
// 밸런스 바
// ──────────────────────────────────────

function renderBalanceBar(elements) {
  // 오행 균형도 계산 (이상적 = 각 20%)
  const deviations = Object.entries(ELEMENT_CHART_DATA).map(([key]) => {
    const ratio = elements[key]?.ratio || 0;
    return Math.abs(ratio - 20);
  });
  const totalDeviation = deviations.reduce((sum, d) => sum + d, 0);
  const balanceScore = Math.max(0, 100 - totalDeviation);

  const barColor =
    balanceScore >= 70 ? '#43b581' :
      balanceScore >= 40 ? '#f9ca24' :
        '#ff6b6b';

  const label =
    balanceScore >= 70 ? '조화로워요' :
      balanceScore >= 40 ? '조금 치우쳐 있어요' :
        '기운이 치우쳐 있어요';

  return `
    <div class="balance-section">
      <div class="balance-header">
        <span class="balance-title">⚖️ 나의 오행 조화도</span>
        <span class="balance-score" style="color: ${barColor}">${balanceScore}점 · ${label}</span>
      </div>
      <div class="balance-track">
        <div 
          class="balance-fill" 
          style="width: 0%; background: linear-gradient(90deg, ${barColor}, ${barColor}88)"
          data-target-width="${balanceScore}%"
        ></div>
      </div>
      <div class="balance-markers">
        <span>치우침</span>
        <span>조화</span>
      </div>
    </div>
  `;
}

// ──────────────────────────────────────
// 밸런스 바 애니메이션 (차트 렌더 후 호출)
// ──────────────────────────────────────

function animateBalanceBar() {
  const fill = document.querySelector('.balance-fill');
  if (!fill) return;

  const targetWidth = fill.dataset.targetWidth;
  setTimeout(() => {
    fill.style.transition = `width ${CHART_CONFIG.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    fill.style.width = targetWidth;
  }, 600);
}

// ──────────────────────────────────────
// EventBus 이벤트 핸들러 등록
// ──────────────────────────────────────

export function initChartVisual() {
  bus.on(bus.Events.DISPLAY_CHART, (payload) => {
    try {
      const container = document.getElementById('chart-area');
      if (!container) {
        console.warn('[ChartVisual] #chart-area 요소를 찾을 수 없습니다.');
        return;
      }

      const { elements, pillars, score } = payload;

      renderDonutChart(container, elements);

      // 밸런스 바 애니메이션
      requestAnimationFrame(() => {
        animateBalanceBar();
      });

      console.log('[ChartVisual] 차트 렌더링 완료');
    } catch (error) {
      console.error('[ChartVisual] 차트 렌더링 오류:', error);
      bus.emit(bus.Events.ERROR, {
        source: 'chartVisual',
        message: '차트 렌더링 중 오류가 발생했습니다.',
        error: error.message,
      });
    }
  });

  console.log('[ChartVisual] 모듈 초기화 완료');
}
