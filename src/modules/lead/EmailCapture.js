/**
 * 맞춤 상담 폼 모듈 (EmailCapture.js)
 * 
 * 운세 건강 진단서 확인 후, 사용자가 더 구체적인 고민을
 * 전문가에게 의뢰할 수 있는 상담 폼을 렌더링합니다.
 * 
 * - 고민 분야 선택 (버튼형)
 * - 고민 내용 (Textarea) + 답변 받을 이메일
 * - LEAD_INQUIRY 이벤트로 데이터 전파
 * - 시니어 특화: 큰 폰트, 명조체, 따뜻한 문구
 * 
 * Independence Axiom: EventBus를 통해서만 외부와 통신
 */

import bus from '@utils/eventBus.js';

// ──────────────────────────────────────
// 고민 분야 카테고리
// ──────────────────────────────────────

const CONCERN_CATEGORIES = [
  { id: 'children', emoji: '👨‍👩‍👧', label: '자녀·혼사' },
  { id: 'property', emoji: '🏠', label: '부동산·재산' },
  { id: 'health', emoji: '🏥', label: '건강·수명' },
  { id: 'business', emoji: '💼', label: '사업·직장' },
  { id: 'finance', emoji: '💰', label: '재물·투자' },
  { id: 'family', emoji: '🤝', label: '가족 관계' },
  { id: 'other', emoji: '📋', label: '기타' },
];

// ──────────────────────────────────────
// 상담 폼 렌더링
// ──────────────────────────────────────

function renderInquiryForm(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="inquiry-card" id="inquiry-form-card">
      <div class="inquiry-icon">📋</div>
      <h3 class="inquiry-title">맞춤형 비방(秘方) 리포트 신청</h3>
      <p class="inquiry-desc">
        전체 흐름은 위에서 확인하셨습니다.<br>
        하지만 <strong>자녀의 혼사, 부동산 매매</strong> 등<br>
        당신만의 더 구체적인 고민이 있으신가요?<br><br>
        내용을 남겨주시면 <strong>12페이지 분량</strong>의<br>
        '맞춤형 비방 리포트'를 이메일로 보내드립니다.
      </p>

      <div class="inquiry-form" id="inquiry-form">
        <!-- 고민 분야 선택 (버튼형) -->
        <div class="inquiry-category-group">
          <span class="inquiry-category-label">🔍 어떤 고민이신가요?</span>
          <div class="category-buttons" id="category-buttons">
            ${CONCERN_CATEGORIES.map(cat => `
              <button type="button" 
                class="category-btn" 
                data-category="${cat.id}"
              >${cat.emoji} ${cat.label}</button>
            `).join('')}
          </div>
        </div>

        <!-- 고민 내용 입력 -->
        <label class="inquiry-label" for="inquiry-question">✍️ 고민 내용을 적어주세요</label>
        <textarea 
          id="inquiry-question" 
          class="inquiry-textarea" 
          rows="5"
          placeholder="예) 아들이 내년에 결혼을 하려는데 시기가 괜찮은지, 올해 아파트를 팔아도 되는지 등 자유롭게 적어주세요."
        ></textarea>

        <!-- 이메일 입력 -->
        <label class="inquiry-label" for="inquiry-email">📧 리포트 받으실 이메일</label>
        <input 
          type="email"
          id="inquiry-email"
          class="inquiry-input"
          placeholder="이메일 주소를 넣어주세요"
          autocomplete="email"
        />

        <!-- 제출 버튼 -->
        <button type="button" class="inquiry-btn" id="inquiry-submit-btn">
          📜 12페이지 맞춤 리포트 신청하기
        </button>
      </div>

      </div>
    </div>
  `;

  attachCategoryHandlers();
  attachInquiryHandler();
}

// ──────────────────────────────────────
// 고민 분야 토글 핸들러
// ──────────────────────────────────────

let selectedCategories = new Set();

function attachCategoryHandlers() {
  const buttons = document.querySelectorAll('.category-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      if (selectedCategories.has(cat)) {
        selectedCategories.delete(cat);
        btn.classList.remove('selected');
      } else {
        selectedCategories.add(cat);
        btn.classList.add('selected');
      }
    });
  });
}

// ──────────────────────────────────────
// 제출 핸들러
// ──────────────────────────────────────

function attachInquiryHandler() {
  const submitBtn = document.getElementById('inquiry-submit-btn');
  const emailInput = document.getElementById('inquiry-email');
  const questionInput = document.getElementById('inquiry-question');

  if (!submitBtn || !emailInput || !questionInput) return;

  submitBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const question = questionInput.value.trim();
    const categories = Array.from(selectedCategories);

    // 이메일 검증
    if (!email || !email.includes('@')) {
      emailInput.style.borderColor = '#e74c3c';
      emailInput.setAttribute('placeholder', '이메일 주소를 다시 확인해주세요');
      emailInput.focus();
      return;
    }

    // 질문 검증
    if (!question) {
      questionInput.style.borderColor = '#e74c3c';
      questionInput.setAttribute('placeholder', '고민 내용을 적어주세요');
      questionInput.focus();
      return;
    }

    // EventBus로 전파
    bus.emit(bus.Events.LEAD_INQUIRY, { email, question, categories });

    // ── 접수 완료 UI ──
    const card = document.getElementById('inquiry-form-card');
    if (card) {
      card.innerHTML = `
        <div class="inquiry-success">
          <div class="inquiry-success-icon">✅</div>
          <h3 class="inquiry-success-title">신청이 접수되었어요!</h3>
          <p class="inquiry-success-desc">
            전문가가 <strong>12페이지 맞춤형 비방 리포트</strong>와 함께<br>
            고민에 대한 상세 답변을 이메일로 보내드릴게요.
          </p>
          <p class="inquiry-success-email">📧 ${email}</p>
        </div>
      `;
    }

    console.log('[InquiryForm] 맞춤 리포트 신청 접수:', { email, categories, questionLength: question.length });
  });
}

// ──────────────────────────────────────
// EventBus 이벤트 핸들러 등록
// ──────────────────────────────────────

export function initEmailCapture() {
  // 운세 결과가 표시되면 상담 폼 렌더링
  bus.on(bus.Events.DISPLAY_SUMMARY, () => {
    // 약간 딜레이를 줘서 SummaryView 렌더링 후에 실행
    setTimeout(() => {
      selectedCategories = new Set(); // 상태 초기화
      const leadArea = document.getElementById('lead-capture-area');
      renderInquiryForm(leadArea);
    }, 100);
  });

  console.log('[InquiryForm] 맞춤 상담 모듈 초기화 완료');
}
