/**
 * 입력 폼 모듈 (InputForm.js)
 * 
 * 사용자 생년월일시 입력을 받아 EventBus로 전달합니다.
 * 양력/음력 전환, 유효성 검증 UI, 로딩 상태 관리 포함.
 * 
 * Independence Axiom: EventBus를 통해서만 외부와 통신
 */

import bus from '@utils/eventBus.js';

// ──────────────────────────────────────
// 시간 매핑 (시진 + 현대 시간)
// ──────────────────────────────────────

const HOUR_OPTIONS = [
  { value: 0, label: '자시(子) 00:00 ~ 00:59' },
  { value: 1, label: '축시(丑) 01:00 ~ 02:59', span: true },
  { value: 3, label: '인시(寅) 03:00 ~ 04:59', span: true },
  { value: 5, label: '묘시(卯) 05:00 ~ 06:59', span: true },
  { value: 7, label: '진시(辰) 07:00 ~ 08:59', span: true },
  { value: 9, label: '사시(巳) 09:00 ~ 10:59', span: true },
  { value: 11, label: '오시(午) 11:00 ~ 12:59', span: true },
  { value: 13, label: '미시(未) 13:00 ~ 14:59', span: true },
  { value: 15, label: '신시(申) 15:00 ~ 16:59', span: true },
  { value: 17, label: '유시(酉) 17:00 ~ 18:59', span: true },
  { value: 19, label: '술시(戌) 19:00 ~ 20:59', span: true },
  { value: 21, label: '해시(亥) 21:00 ~ 22:59', span: true },
  { value: 23, label: '자시(子) 23:00 ~ 23:59' },
];

// ──────────────────────────────────────
// 폼 렌더링
// ──────────────────────────────────────

function renderForm(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="input-container">
      <header class="header">
        <div class="header-badge">
          <span class="badge-icon">🛡️</span>
          <span class="badge-text">전문가 검수 시스템</span>
        </div>
        <h1 class="main-title">
          🔮 2026 병오년(丙午年)<br>
          <span>운세 건강 정밀 검진</span>
        </h1>
        <p class="main-desc">
          단순한 길흉화복을 넘어,<br>
          당신의 사주 에너지를 <strong>'건강 검진'</strong> 해드립니다.
        </p>
      </header>

      <!-- 신뢰 요소 (Trust Section) -->
      <div class="trust-indicators">
        <div class="trust-item">
          <span class="trust-val">12,400+</span>
          <span class="trust-label">누적 검진자</span>
        </div>
        <div class="trust-divider"></div>
        <div class="trust-item">
          <span class="trust-val">98.2%</span>
          <span class="trust-label">사용자 만족도</span>
        </div>
      </div>

      <form id="saju-form" class="saju-form" novalidate>
        <!-- 양력/음력 토글 -->
        <div class="calendar-toggle">
          <button type="button" class="toggle-btn active" data-calendar="solar">☀️ 양력</button>
          <button type="button" class="toggle-btn" data-calendar="lunar">🌙 음력</button>
        </div>

        <!-- 생년월일 -->
        <div class="form-row">
          <div class="form-group">
            <label for="birth-year">태어나신 해</label>
            <input 
              type="number" id="birth-year" 
              min="1920" max="2025" 
              placeholder="1960" 
              inputmode="numeric"
              required 
            />
            <span class="field-error" id="year-error"></span>
          </div>
          <div class="form-group">
            <label for="birth-month">월</label>
            <select id="birth-month" required>
              ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}월</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="birth-day">일</label>
            <select id="birth-day" required>
              ${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}일</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- 시간 + 성별 -->
        <div class="form-row">
          <div class="form-group">
            <label for="birth-hour">태어나신 시간</label>
            <select id="birth-hour" required>
              <option value="" disabled selected>시간 선택</option>
              ${HOUR_OPTIONS.map((h) => `<option value="${h.value}">${h.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="gender">성별</label>
            <select id="gender" required>
              <option value="" disabled selected>선택</option>
              <option value="male">남성 ♂</option>
              <option value="female">여성 ♀</option>
            </select>
          </div>
        </div>

        <!-- 제출 -->
        <button type="submit" class="submit-btn" id="submit-btn">
          <span class="btn-text">✨ 2026년 내 운세 건강 검진받기</span>
          <span class="btn-loading hidden">
            <span class="spinner"></span> 운세를 정밀 분석하고 있어요...
          </span>
        </button>
      </form>
    </div>
  `;

  attachFormHandlers();
}

// ──────────────────────────────────────
// 이벤트 핸들러
// ──────────────────────────────────────

function attachFormHandlers() {
  const form = document.getElementById('saju-form');
  if (!form) return;

  // 양력/음력 토글
  const toggleBtns = form.querySelectorAll('.toggle-btn');
  let isLunar = false;

  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      isLunar = btn.dataset.calendar === 'lunar';
    });
  });

  // 폼 제출
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const year = parseInt(document.getElementById('birth-year').value);
    const month = parseInt(document.getElementById('birth-month').value);
    const day = parseInt(document.getElementById('birth-day').value);
    const hour = parseInt(document.getElementById('birth-hour').value);
    const gender = document.getElementById('gender').value;

    // 유효성 검증
    const errors = validateInput({ year, month, day, hour, gender });
    if (errors.length > 0) {
      showErrors(errors);
      return;
    }

    clearErrors();

    // 로딩 상태
    setLoadingState(true);

    // EventBus로 전파
    bus.emit(bus.Events.INPUT_SUBMIT, {
      year, month, day, hour, gender,
      isLunar,
    });
  });
}

// ──────────────────────────────────────
// 유효성 검증
// ──────────────────────────────────────

function validateInput({ year, month, day, hour, gender }) {
  const errors = [];

  if (!year || year < 1920 || year > 2025) {
    errors.push({ field: 'year', message: '1920~2025 사이의 해를 넣어주세요' });
  }

  if (isNaN(hour)) {
    errors.push({ field: 'hour', message: '태어나신 시간을 선택해주세요' });
  }

  if (!gender) {
    errors.push({ field: 'gender', message: '성별을 선택해주세요' });
  }

  // 월별 최대 일수 체크
  const maxDays = new Date(year || 2000, month, 0).getDate();
  if (day > maxDays) {
    errors.push({ field: 'day', message: `${month}월은 ${maxDays}일까지입니다` });
  }

  return errors;
}

function showErrors(errors) {
  clearErrors();
  errors.forEach(({ field, message }) => {
    const el = document.getElementById(`${field}-error`);
    if (el) {
      el.textContent = message;
      el.classList.add('visible');
    }

    // 필드 하이라이트
    const input = document.getElementById(
      field === 'year' ? 'birth-year' :
        field === 'hour' ? 'birth-hour' :
          field === 'gender' ? 'gender' : `birth-${field}`
    );
    if (input) input.classList.add('input-error');
  });
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach((el) => {
    el.textContent = '';
    el.classList.remove('visible');
  });
  document.querySelectorAll('.input-error').forEach((el) => {
    el.classList.remove('input-error');
  });
}

// ──────────────────────────────────────
// 로딩 상태
// ──────────────────────────────────────

function setLoadingState(isLoading) {
  const btnText = document.querySelector('.btn-text');
  const btnLoading = document.querySelector('.btn-loading');
  const submitBtn = document.getElementById('submit-btn');

  if (isLoading) {
    btnText?.classList.add('hidden');
    btnLoading?.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = true;
  } else {
    btnText?.classList.remove('hidden');
    btnLoading?.classList.add('hidden');
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ──────────────────────────────────────
// EventBus 이벤트 핸들러 등록
// ──────────────────────────────────────

export function initInputForm() {
  // 폼 렌더링
  const inputSection = document.getElementById('input-section');
  renderForm(inputSection);

  // 분석 완료 시 로딩 해제
  bus.on(bus.Events.LOADING_END, () => {
    setLoadingState(false);
  });

  // 에러 발생 시 로딩 해제
  bus.on(bus.Events.ERROR, (error) => {
    setLoadingState(false);
    // 에러 토스트 표시
    showErrorToast(error.message || '알 수 없는 문제가 생겼어요. 다시 시도해주세요.');
  });

  console.log('[InputForm] 모듈 초기화 완료');
}

// ──────────────────────────────────────
// 에러 토스트
// ──────────────────────────────────────

function showErrorToast(message) {
  // 기존 토스트 제거
  const existing = document.querySelector('.error-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.innerHTML = `
    <span class="toast-icon">⚠️</span>
    <span class="toast-message">${message}</span>
  `;
  document.body.appendChild(toast);

  // 애니메이션
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  // 3초 후 자동 닫기
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
