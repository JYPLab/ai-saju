/**
 * 정밀 진단서 전체 뷰 (FullReportView.js)
 * 
 * 12페이지 분량의 상세 분석 결과를 웹 기반의 프리미엄 디자인으로 렌더링합니다.
 * PDF 리포트의 모든 섹션을 포함하며, 리드 수집 후에만 노출됩니다.
 */

import bus from '@utils/eventBus.js';

// ──────────────────────────────────────
// 초기화 및 이벤트 바인딩
// ──────────────────────────────────────

export function initFullReportView() {
  bus.on(bus.Events.INTERPRET_COMPLETE, (data) => {
    // 요약 데이터뿐만 아니라 상세 데이터까지 준비된 경우 (detail 존재 시)
    const reportData = data.interpretation?.detail;
    if (reportData) {
      window._fullReportData = reportData;
    }
  });

  // ThankYou 페이지 또는 외부에서 '정밀 진단서 보기' 클릭 시 트리거 (Legacy/Internal 지원)
  bus.on('FULL_REPORT_SHOW', () => {
    const data = window._fullReportData;
    if (!data) {
      console.error('[FullReport] 리포트 데이터가 없습니다.');
      return;
    }

    const container = document.getElementById('full-report-section');
    if (container) {
      container.classList.remove('hidden');
      renderFullReport(container, data);

      // 섹션으로 이동
      container.scrollIntoView({ behavior: 'smooth' });
    }
  });

  console.log('[FullReportView] 모듈 초기화 완료');
}

// ──────────────────────────────────────
// 메인 렌더링 함수 (외부에서 호출 가능하도록 export)
// ──────────────────────────────────────

export function renderFullReport(container, data) {
  const html = `
    <div class="full-report-wrapper">
      ${renderCover(data)}
      ${renderSajuAnalysis(data)}
      ${renderOverall(data)}
      ${renderCategories(data)}
      ${renderMonthly(data)}
      ${renderConsultation(data)}
      ${renderPrescription(data)}
      
      ${renderShareSection()}
      
      <div class="report-footer">
        <p>본 진단서는 명리학 원리를 기반으로 작성되었으며, 참고 자료로만 활용하시기 바랍니다.</p>
        <p>&copy; 2026 병오년 운세 건강 정밀 진단 서비스</p>
      </div>
    </div>
  `;
  container.innerHTML = html;
}

// ──────────────────────────────────────
// 섹션 1: 표지 및 사용자 정보
// ──────────────────────────────────────

function renderCover(data) {
  const bi = data.birthInput || {};
  const genderKr = bi.gender === 'male' ? '남' : '여';
  const hourKr = bi.hour !== undefined ? `${bi.hour}시` : '시간모름';
  const pillars = `${data.pillars.year.pillar} ${data.pillars.month.pillar} ${data.pillars.day.pillar} ${data.pillars.hour.pillar}`;

  return `
    <div class="report-page report-cover">
      <div class="cover-accent"></div>
      <h1 class="cover-title">2026 병오년<br><span>운세 건강 정밀 진단서</span></h1>
      <div class="cover-info-card">
        <h3>분석 대상 사주</h3>
        <p class="info-birth">${bi.year}년 ${bi.month}월 ${bi.day}일 ${hourKr} (${genderKr})</p>
        <p class="info-pillars">${pillars}</p>
      </div>
      <p class="cover-notice">본 진단서는 개인정보 보호를 위해 성명을 노출하지 않습니다.</p>
    </div>
  `;
}

// ──────────────────────────────────────
// 섹션 2: 사주 원국 분석
// ──────────────────────────────────────

function renderSajuAnalysis(data) {
  const p = data.pillars;
  const elements = data.elements || {};
  const yongShen = data.yongShen || {};

  const colNames = ['시주(時)', '일주(日)', '월주(月)', '년주(年)'];
  const keys = ['hour', 'day', 'month', 'year'];

  const elementColors = {
    '木': '#4caf50', '火': '#f44336', '土': '#ffc107', '金': '#e0e0e0', '水': '#2196f3'
  };

  return `
    <div class="report-page">
      <h2 class="section-title">📜 사주 원국 분석</h2>
      
      <div class="saju-table">
        <div class="saju-row header">
          ${colNames.map(name => `<div>${name}</div>`).join('')}
        </div>
        <div class="saju-row stem">
          ${keys.map(k => `<div style="color: ${elementColors[p[k]?.element] || '#fff'}">${p[k]?.stem || ''}</div>`).join('')}
        </div>
        <div class="saju-row branch">
          ${keys.map(k => `<div style="color: ${elementColors[p[k]?.branchElement] || '#fff'}">${p[k]?.branch || ''}</div>`).join('')}
        </div>
        <div class="saju-row reading">
          ${keys.map(k => `<div>${p[k]?.stemKr || ''}${p[k]?.branchKr || ''}</div>`).join('')}
        </div>
      </div>

      <div class="element-analysis">
        <h3 class="sub-title">오행(五行) 분포 분석</h3>
        <div class="element-grid">
          ${Object.entries(elements).filter(([_, v]) => v.ratio !== undefined).map(([el, d]) => `
            <div class="element-item">
              <span class="el-label">${el}</span>
              <div class="el-bar-bg">
                <div class="el-bar-fill" style="width: ${d.ratio}%; background: ${elementColors[el]}"></div>
              </div>
              <span class="el-value">${d.ratio}%</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="yong-shen-card">
        <h3 class="sub-title">용신(用神) — 나를 돕는 기운</h3>
        <p class="yong-shen-main">필요한 기운: <strong>${yongShen.primary?.korean || yongShen.primary || '-'}</strong></p>
        <p class="yong-shen-desc">${yongShen.reasoning || ''}</p>
        <div class="yong-shen-advice">
          ${(data.yongShenAdvice || []).map(line => `<p>• ${line}</p>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// ──────────────────────────────────────
// 섹션 3: 총운
// ──────────────────────────────────────

function renderOverall(data) {
  const score = data.fortuneScore || 0;
  let gradeClass = 'grade-normal';
  if (score >= 80) gradeClass = 'grade-best';
  else if (score >= 60) gradeClass = 'grade-good';
  else if (score < 40) gradeClass = 'grade-warning';

  return `
    <div class="report-page">
      <h2 class="section-title">🌟 2026년 종합 총평</h2>
      <div class="overall-score-banner ${gradeClass}">
        <span class="score-val">${score}</span>
        <span class="score-unit">점</span>
        <p class="score-summary">${data.overallSummary || '올해는 전반적으로 안정적인 흐름이 예상됩니다.'}</p>
      </div>
      <div class="overall-text-content">
        ${(data.overall || []).map(line => `<p>${line}</p>`).join('')}
      </div>
    </div>
  `;
}

// ──────────────────────────────────────
// 섹션 4-9: 카테고별 운세
// ──────────────────────────────────────

function renderCategories(data) {
  const cats = data.categories || {};
  const meta = {
    wealth: { name: '재물·살림운', icon: '💰' },
    love: { name: '가족·인연운', icon: '🤝' },
    health: { name: '건강·몸 관리운', icon: '🩺' },
    career: { name: '재물·노후운', icon: '🏦' },
    study: { name: '자식·손주운', icon: '👨‍👩‍👧‍👦' },
    family: { name: '가정·화목운', icon: '🏡' },
  };

  return Object.entries(meta).map(([id, m]) => {
    const d = cats[id];
    if (!d) return '';
    return `
      <div class="report-page">
        <h2 class="section-title">${m.icon} ${m.name}</h2>
        <div class="cat-summary-box">${d.text || ''}</div>
        
        <div class="cat-detail-section">
          <h4>상세 해석</h4>
          <p>${d.detailText || ''}</p>
        </div>

        ${d.warnings?.length ? `
          <div class="cat-alert warning">
            <h4>⚠️ 주의사항</h4>
            <ul>${d.warnings.map(w => `<li>${w}</li>`).join('')}</ul>
          </div>
        ` : ''}

        ${d.remedies?.length ? `
          <div class="cat-alert remedy">
            <h4>🍀 맞춤 처방</h4>
            <ul>${d.remedies.map(r => `<li>${r}</li>`).join('')}</ul>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// ──────────────────────────────────────
// 섹션 10-11: 월별 운세
// ──────────────────────────────────────

function renderMonthly(data) {
  const months = data.monthly || [];
  if (!months.length) return '';

  const renderMonthCard = (m) => `
    <div class="month-card">
      <div class="month-head">
        <span class="month-num">${m.month}월</span>
        <span class="month-theme">${m.theme || ''}</span>
      </div>
      <div class="month-details">
        <p class="m-good"><span>좋음</span> ${m.good || '-'}</p>
        <p class="m-bad"><span>주의</span> ${m.bad || '-'}</p>
        <p class="m-health"><span>건강</span> ${m.health || '-'}</p>
      </div>
    </div>
  `;

  return `
    <div class="report-page">
      <h2 class="section-title">📅 2026년 월별 흐름</h2>
      <div class="monthly-grid">
        ${months.map(renderMonthCard).join('')}
      </div>
    </div>
  `;
}

// ──────────────────────────────────────
// 섹션 12: 종합 처방전
// ──────────────────────────────────────

function renderPrescription(data) {
  const lucky = data.lucky || {};
  return `
    <div class="report-page last-page">
      <h2 class="section-title">🏥 종합 운세 처방전</h2>
      
      <div class="lucky-elements-card">
        <h3>2026년 나의 행운 요소</h3>
        <div class="lucky-list">
          <div class="lucky-row"><span>행운의 방향</span> <strong>${lucky.direction || '-'}</strong></div>
          <div class="lucky-row"><span>행운의 색상</span> <strong>${lucky.color || '-'}</strong></div>
          <div class="lucky-row"><span>행운의 숫자</span> <strong>${lucky.number || '-'}</strong></div>
          <div class="lucky-row"><span>행운의 보석</span> <strong>${lucky.gem || '-'}</strong></div>
        </div>
      </div>

      <div class="final-closing">
        <p>2026 병오년은 뜨거운 불의 기운이 가득한 해입니다.</p>
        <p>이 진단서가 한 해를 지혜롭게 보내시는 데 도움이 되길 바랍니다.</p>
        <div class="signature">
          <p>건강하시고, 가족과 함께 행복한 한 해 되세요.</p>
          <p class="team-name">병오년 운세 건강 검진 팀 드림</p>
        </div>
      </div>
    </div>
  `;
}
// ──────────────────────────────────────
// 섹션 13: [NEW] 전문가 고민 맞춤 상담 (Phase 8)
// ──────────────────────────────────────

function renderConsultation(data) {
  const inquiry = data.inquiry || {};
  const category = inquiry.category || 'general';
  const question = inquiry.question || '내년 전반적인 운세가 궁금합니다.';

  // 용신(用神) 기반 오행 추출 (Object/String 대응)
  const ysRaw = data.yongShen?.primary;
  const yongShen = typeof ysRaw === 'object' ? (ysRaw.korean || '') : (ysRaw || '');
  const yongShenElement = yongShen.charAt(0); // '목', '화', '토', '금', '수'

  const prescription = getExpertPrescription(category, yongShenElement);

  const categoryNames = {
    wealth: '재물·사업',
    health: '건강·수명',
    love: '인연·부부',
    career: '사회·명예',
    study: '학업·자식',
    family: '가정·화목',
    general: '종합 운세'
  };

  return `
    <div class="report-page consultation-section">
      <h2 class="section-title">✍️ 전문가 분석 및 비방(秘方)</h2>
      
      <div class="specialist-letter">
        <div class="letter-header">
          <span class="letter-title">심층 분석 소견서</span>
          <div class="letter-stamp">
            병오년<br>검수완료
          </div>
        </div>
        
        <div class="user-concern-original">
          <strong>대기 중인 고민 내용:</strong><br>
          "${question}"
        </div>
        
        <div class="expert-opinion-content">
          귀하의 사주 원국과 2026년 병오(丙午)년의 강한 화(火) 기운을 정밀 대조한 결과입니다.
          
          고민하신 <strong>${categoryNames[category] || '종합'}</strong> 분야에 대해 분석한 결과, 
          올해는 귀하의 내면에 잠재된 기운이 외부의 운과 강하게 충돌하거나 합을 이루는 중요한 전환점에 서 있습니다.
          
          특히 ${yongShen}의 기운이 귀하에게 가장 필요한 핵심 요소(用神)로 작용하므로, 
          일상생활에서 아래의 비방을 실천하여 나쁜 기운을 막고 복을 부르시기 바랍니다.
        </div>
        
        <div class="prescription-card">
          <h4>🍀 ${categoryNames[category] || '종합'} 담당 전문가 맞춤 비방 처방전</h4>
          <div class="prescription-item">
            <span class="p-icon">📍</span>
            <p>${prescription.action}</p>
          </div>
          <div class="prescription-item">
            <span class="p-icon">🌈</span>
            <p>${prescription.tip}</p>
          </div>
        </div>
        
        <div class="letter-footer">
          <div class="expert-signature">
            <p>2026 병오년 운세 정밀 진단 시스템</p>
            <p><strong>수석 분석가 최종 검수필</strong></p>
          </div>
          <div class="official-seal">正密</div>
        </div>
      </div>
    </div>
    `;
}

/**
 * 카테고리별 x 용신별 맞춤 처방 데이터 매핑
 */
function getExpertPrescription(cat, el) {
  const dataMap = {
    wealth: {
      '목': { action: '동쪽 방향에 청색 계열의 물건을 두거나 화분을 배치하여 재운의 발복을 꾀하십시오.', tip: '목재 재질의 지갑이나 소품을 활용하면 자금 흐름이 원활해집니다.' },
      '화': { action: '붉은색 지갑이나 밝은 조명을 활용하여 정체된 금전운을 깨우는 처방을 드립니다.', tip: '중요한 계약 시 붉은색 넥타이나 스카프를 착용하십시오.' },
      '토': { action: '거실 중앙이나 침실에 노란색 계열의 도자기나 흙 소재 소품을 두어 재물을 저장하십시오.', tip: '안정적인 부동산 투자나 저축이 횡재수보다 유리한 해입니다.' },
      '금': { action: '서쪽 방향에 금속 장식품이나 흰색 액자를 두어 결단력 있는 투자를 도모하십시오.', tip: '시계나 귀금속을 착용하여 금(金)의 기운을 몸에 지니는 것이 좋습니다.' },
      '수': { action: '북쪽 방향에 어두운 색상의 소품이나 물 이미지를 배치하여 재물이 새지 않게 하십시오.', tip: '유동성이 큰 투자보다는 현금을 확보하는 지혜가 필요합니다.' }
    },
    health: {
      '목': { action: '간 건강을 위해 새벽 산책을 즐기시고, 초록색 의복이 생기를 돋우는 데 도움을 줍니다.', tip: '동쪽으로 머리를 두고 취침하며 신맛이 나는 과일을 섭취하십시오.' },
      '화': { action: '심혈관 건강에 각별히 유의하시고, 쓴맛이 나는 차를 통해 몸의 열기를 다스리십시오.', tip: '한낮의 무리한 활동보다는 조용한 명상과 수면이 필수입니다.' },
      '토': { action: '비위(위장) 기능을 보강하기 위해 흙을 밟는 맨발 걷기나 황토 찜질을 추천합니다.', tip: '단맛이 나는 단호박이나 뿌리 채소를 섭취하여 기력을 보충하십시오.' },
      '금': { action: '호흡기와 대장 건강을 위해 흰색 침구류를 사용하시고 실내 공기 정화에 힘쓰십시오.', tip: '매운맛이 나는 음식을 적절히 섭취하여 폐 기능을 활성화하십시오.' },
      '수': { action: '신장과 방광 기운을 위해 물을 자주 마시고 검은색 콩이나 깨를 즐겨 보십시오.', tip: '밤늦게까지 활동하기보다 일찍 잠자리에 들어 수(水)의 기운을 보존하십시오.' }
    }
  };

  // 카테고리 매핑 (없을 경우 wealth/wealth-like로 대응)
  const categoryGroup = dataMap[cat] || dataMap.wealth;

  return categoryGroup[el] || {
    action: '주변 환경을 청결히 하고 밝은 기운을 유지하여 들어오는 복을 맞이하십시오.',
    tip: '매일 아침 10분간의 명상이 전체적인 운의 흐름을 개선합니다.'
  };
}

// ──────────────────────────────────────
// 섹션 14: [NEW] 친구 공유 및 재검진 (Phase 9)
// ──────────────────────────────────────

function renderShareSection() {
  return `
    <div class="report-page share-section-page">
      <div class="thankyou-share-section">
        <h2 class="section-title">🎁 행운을 나누면 복이 됩니다</h2>
        <p class="thankyou-share-text">가족·친구에게도 운세 건강 리포트를 선물해보세요.</p>
        <div class="thankyou-share-buttons" style="margin-bottom: 2rem;">
          <button class="thankyou-share-btn kakao" id="report-kakao-btn">
            💬 카카오톡 공유
          </button>
          <button class="thankyou-share-btn copy" id="report-copy-btn">
            🔗 링크 복사
          </button>
        </div>
        
        <div class="thankyou-divider"></div>
        
        <div class="thankyou-actions" style="margin-top: 2rem;">
          <p class="thankyou-share-text">다른 사람의 운세도 궁금하신가요?</p>
          <button class="thankyou-action-btn primary" id="report-home-btn">
            🔮 새로운 운세 검진하기
          </button>
        </div>
      </div>
    </div>
  `;
}
