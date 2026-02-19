/**
 * 12페이지 PDF 리포트 빌더 (PdfReportBuilder.js)
 * 
 * jsPDF를 사용하여 맞춤형 운세 리포트 PDF를 생성합니다.
 * 폰트 로딩 → 12페이지 순차 렌더링 → PDF Blob 반환
 * 
 * Independence Axiom: EventBus를 통해서만 외부와 통신
 */

import bus from '@utils/eventBus.js';
import { loadKoreanFont } from './PdfFontLoader.js';

// ──────────────────────────────────────
// PDF 페이지 설정
// ──────────────────────────────────────

const PAGE = {
    width: 210,            // A4 mm
    height: 297,
    marginX: 22,           // 조금 더 여유있게
    marginTop: 25,
    marginBottom: 20,
    contentWidth: 166,     // 210 - margins
    lineHeight: 8,         // 시니어 가독성 (기존 6 -> 8)
};

const COLORS = {
    gold: [180, 150, 50],
    darkBg: [20, 20, 40],
    darkCard: [30, 30, 55],
    white: [255, 255, 255],
    lightGray: [200, 200, 210],
    muted: [150, 150, 170],
    accent: [255, 107, 53],
    green: [46, 204, 113],
    red: [231, 76, 60],
    blue: [52, 152, 219],
};

const SCORES = {
    excellent: { label: '최상', color: COLORS.gold },
    good: { label: '양호', color: COLORS.green },
    average: { label: '보통', color: COLORS.blue },
    caution: { label: '주의', color: COLORS.accent },
    warning: { label: '위험', color: COLORS.red },
};

function getScoreGrade(score) {
    if (score >= 80) return SCORES.excellent;
    if (score >= 65) return SCORES.good;
    if (score >= 45) return SCORES.average;
    if (score >= 30) return SCORES.caution;
    return SCORES.warning;
}

// ──────────────────────────────────────
// 메인 진입점
// ──────────────────────────────────────

let _reportData = null;

/**
 * 리포트 데이터를 저장합니다 (나중에 PDF 생성 시 사용).
 */
export function setReportData(data) {
    _reportData = data;
    console.log('[PdfReport] 리포트 데이터 설정 완료');
}

/**
 * 저장된 데이터로 PDF를 생성하고 다운로드합니다.
 */
export async function generateAndDownload() {
    if (!_reportData) {
        console.error('[PdfReport] 리포트 데이터가 없습니다.');
        return;
    }

    try {
        bus.emit(bus.Events.PDF_GENERATE_START, { status: 'generating' });

        const blob = await generateReport(_reportData);
        downloadBlob(blob);

        bus.emit(bus.Events.PDF_GENERATE_COMPLETE, { status: 'done' });
    } catch (error) {
        console.error('[PdfReport] PDF 생성 오류:', error);
        bus.emit(bus.Events.PDF_GENERATE_COMPLETE, { status: 'error', error: error.message });
    }
}

/**
 * PDF 리포트를 생성합니다.
 * 
 * @param {Object} reportData - formatForReport()에서 생성된 데이터
 * @returns {Blob} PDF Blob
 */
export async function generateReport(reportData) {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // 한글 폰트 로드
    await loadKoreanFont(doc);

    // 12페이지 렌더링
    renderCoverPage(doc, reportData);         // p1

    doc.addPage();
    renderSajuAnalysis(doc, reportData);      // p2

    doc.addPage();
    renderOverallFortune(doc, reportData);    // p3

    // 카테고리 페이지 (p4~p9)
    const categories = ['wealth', 'love', 'health', 'career', 'study', 'family'];
    categories.forEach((catId) => {
        doc.addPage();
        renderCategoryPage(doc, catId, reportData);
    });

    // 월별 운세 (p10~p11)
    const monthly = reportData.monthly || [];
    doc.addPage();
    renderMonthlyPage(doc, monthly.slice(0, 6), 1, reportData);
    doc.addPage();
    renderMonthlyPage(doc, monthly.slice(6, 12), 7, reportData);

    // 종합 처방전 (p12)
    doc.addPage();
    renderPrescriptionPage(doc, reportData);

    // 파일명 설정 (ASCII 안전)
    const filename = `2026_Self_Health_Diagnostics_${Date.now()}.pdf`;

    // jsPDF 결과를 DataURI로 변환 (Blob보다 파일명 보존에 더 유리한 경우가 있음)
    const dataUri = doc.output('datauristring');

    // 다운로드 트리거
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = dataUri;
    a.download = filename;
    document.body.appendChild(a);

    // 마우스 이벤트로 더 확실하게 트리거 (일부 브라우저 호환성)
    const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
    });
    a.dispatchEvent(clickEvent);

    // 정리
    setTimeout(() => {
        document.body.removeChild(a);
        console.log('[PdfReport] PDF 다운로드 트리거 및 정리 완료');
    }, 1000);

    return true;
}


// ──────────────────────────────────────
// 공통 유틸리티
// ──────────────────────────────────────

function setColor(doc, rgb) {
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function setFillColor(doc, rgb) {
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function setDrawColor(doc, rgb) {
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function drawPageBackground(doc) {
    setFillColor(doc, COLORS.darkBg);
    doc.rect(0, 0, PAGE.width, PAGE.height, 'F');
}

function addPageHeader(doc, title, pageNum) {
    // 상단 금색 라인
    setDrawColor(doc, COLORS.gold);
    doc.setLineWidth(0.5);
    doc.line(PAGE.marginX, 15, PAGE.width - PAGE.marginX, 15);

    // 제목
    doc.setFont('NotoSansKR', 'normal'); // 헤더는 고딕 유지
    doc.setFontSize(9);
    setColor(doc, COLORS.muted);
    doc.text('2026 병오년 운세 건강 정밀 진단서', PAGE.marginX, 12);

    // 페이지 번호
    doc.text(`${pageNum} / 12`, PAGE.width - PAGE.marginX, 12, { align: 'right' });
    doc.setFont('NotoSerifKR', 'normal'); // 다시 명조로 복구
}

function addPageFooter(doc) {
    setDrawColor(doc, COLORS.gold);
    doc.setLineWidth(0.3);
    doc.line(PAGE.marginX, PAGE.height - 15, PAGE.width - PAGE.marginX, PAGE.height - 15);

    doc.setFontSize(7);
    setColor(doc, COLORS.muted);
    doc.text('본 진단서는 명리학 원리를 기반으로 작성되었으며, 참고 자료로만 활용하시기 바랍니다.', PAGE.width / 2, PAGE.height - 10, { align: 'center' });
}

function drawCard(doc, x, y, w, h, opts = {}) {
    const { fill = COLORS.darkCard, border = COLORS.gold, radius = 4 } = opts;
    setFillColor(doc, fill);
    setDrawColor(doc, border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, radius, radius, 'FD');
}

function drawProgressBar(doc, x, y, w, h, score) {
    const grade = getScoreGrade(score);

    // 배경
    setFillColor(doc, [40, 40, 60]);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');

    // 채운 부분
    const fillWidth = (w * Math.min(score, 100)) / 100;
    setFillColor(doc, grade.color);
    doc.roundedRect(x, y, fillWidth, h, 2, 2, 'F');

    // 점수 텍스트
    doc.setFontSize(8);
    setColor(doc, COLORS.white);
    doc.text(`${score}점 (${grade.label})`, x + w + 3, y + h - 1);
}

/**
 * 긴 텍스트를 줄바꿈하여 출력합니다.
 * @returns {number} 출력 후 Y 좌표
 */
function wrapText(doc, text, x, y, maxWidth, lineHeight = PAGE.lineHeight) {
    if (!text) return y;
    const lines = doc.splitTextToSize(String(text), maxWidth);
    lines.forEach((line) => {
        if (y > PAGE.height - PAGE.marginBottom - 10) return; // 페이지 넘김 방지
        doc.text(line, x, y);
        y += lineHeight;
    });
    return y;
}

// ──────────────────────────────────────
// PAGE 1: 표지
// ──────────────────────────────────────

function renderCoverPage(doc, data) {
    drawPageBackground(doc);

    const cx = PAGE.width / 2;
    let y = 60;

    // 타이틀 장식 라인
    setDrawColor(doc, COLORS.gold);
    doc.setLineWidth(1);
    doc.line(50, y, 160, y);
    y += 15;

    // 메인 타이틀
    doc.setFont('NotoSerifKR', 'bold');
    doc.setFontSize(32);
    setColor(doc, COLORS.gold);
    doc.text('2026 병오년', cx, y, { align: 'center' });
    y += 18;

    doc.setFontSize(36);
    doc.text('운세 건강 진단서', cx, y, { align: 'center' });
    y += 25;

    // 구분 장식
    setDrawColor(doc, COLORS.gold);
    doc.setLineWidth(0.5);
    doc.line(cx - 15, y, cx + 15, y);
    y += 15;

    // 서브 타이틀
    doc.setFont('NotoSerifKR', 'normal');
    doc.setFontSize(14);
    setColor(doc, COLORS.lightGray);
    doc.text('당신의 건강과 운의 흐름을 분석한', cx, y, { align: 'center' });
    y += 8;
    doc.text('12페이지 맞춤형 정밀 리포트입니다.', cx, y, { align: 'center' });
    y += 40;

    // 사용자 정보 카드
    drawCard(doc, PAGE.marginX + 10, y, PAGE.contentWidth - 20, 65);
    y += 15;

    doc.setFontSize(12);
    setColor(doc, COLORS.gold);
    doc.text('분석 대상 사주', cx, y, { align: 'center' });
    y += 15;

    doc.setFontSize(14);
    setColor(doc, COLORS.white);
    const bi = data.birthInput || {};
    const genderKr = bi.gender === 'male' ? '남' : '여';
    const hourKr = bi.hour !== undefined ? `${bi.hour}시` : '시간모름';
    const birthInfo = `${bi.year}년 ${bi.month}월 ${bi.day}일 ${hourKr} (${genderKr})`;
    doc.text(birthInfo, cx, y, { align: 'center' });
    y += 12;

    doc.setFontSize(16);
    setColor(doc, COLORS.gold);
    const pillars = `${data.pillars.year.pillar} ${data.pillars.month.pillar} ${data.pillars.day.pillar} ${data.pillars.hour.pillar}`;
    doc.text(pillars, cx, y, { align: 'center' });
    y += 40;

    // 안내
    doc.setFontSize(11);
    setColor(doc, COLORS.muted);
    doc.text('본 진단서는 개인정보 보호를 위해 성명을 노출하지 않습니다.', cx, y, { align: 'center' });

    // 발행일
    y = PAGE.height - 50;
    doc.setFontSize(9);
    setColor(doc, COLORS.muted);
    const today = new Date();
    doc.text(`발행일: ${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`, cx, y, { align: 'center' });
}

// ──────────────────────────────────────
// PAGE 2: 사주 원국 분석
// ──────────────────────────────────────

function renderSajuAnalysis(doc, data) {
    drawPageBackground(doc);
    addPageHeader(doc, '사주 원국 분석', 2);

    let y = PAGE.marginTop + 5;

    // 제목
    doc.setFontSize(22);
    setColor(doc, COLORS.gold);
    doc.text('사주 원국 분석', PAGE.marginX, y);
    y += 15;

    // 사주팔자 표
    const pillars = data.pillars;
    if (pillars) {
        const colW = PAGE.contentWidth / 4;
        const tableX = PAGE.marginX;
        const labels = ['시주(時)', '일주(日)', '월주(月)', '년주(年)'];
        const pillarOrder = ['hour', 'day', 'month', 'year'];

        // 헤더
        drawCard(doc, tableX, y, PAGE.contentWidth, 14);
        doc.setFontSize(11);
        setColor(doc, COLORS.gold);
        pillarOrder.forEach((_, i) => {
            doc.text(labels[i], tableX + colW * i + colW / 2, y + 9, { align: 'center' });
        });
        y += 18;

        // 천간
        drawCard(doc, tableX, y, PAGE.contentWidth, 22, { fill: [35, 35, 60] });
        doc.setFontSize(18);
        setColor(doc, COLORS.white);
        pillarOrder.forEach((key, i) => {
            const p = pillars[key];
            if (p) {
                doc.text(p.stem || '', tableX + colW * i + colW / 2, y + 14, { align: 'center' });
            }
        });
        y += 24;

        // 지지
        drawCard(doc, tableX, y, PAGE.contentWidth, 22, { fill: [35, 35, 60] });
        setColor(doc, COLORS.lightGray);
        pillarOrder.forEach((key, i) => {
            const p = pillars[key];
            if (p) {
                doc.text(p.branch || '', tableX + colW * i + colW / 2, y + 14, { align: 'center' });
            }
        });
        y += 24;

        // 한글 읽기
        doc.setFontSize(11);
        setColor(doc, COLORS.muted);
        pillarOrder.forEach((key, i) => {
            const p = pillars[key];
            if (p) {
                doc.text(`${p.stemKr || ''}${p.branchKr || ''}`, tableX + colW * i + colW / 2, y + 5, { align: 'center' });
            }
        });
        y += 18;
    }

    // 일주(日主) 설명
    y += 5;
    doc.setFontSize(15);
    setColor(doc, COLORS.gold);
    doc.text('일주(日主) — 나의 타고난 기운', PAGE.marginX, y);
    y += 10;

    doc.setFontSize(12);
    setColor(doc, COLORS.white);
    if (data.dayMaster) {
        const dm = data.dayMaster;
        y = wrapText(doc, `${dm.stem}(${dm.stemKr}) — 오행: ${dm.element}`, PAGE.marginX, y, PAGE.contentWidth);
        y += 4;
    }

    // 오행 분포
    y += 8;
    doc.setFontSize(15);
    setColor(doc, COLORS.gold);
    doc.text('오행(五行) 분포', PAGE.marginX, y);
    y += 12;

    if (data.elements) {
        const elements = Object.entries(data.elements)
            .filter(([, v]) => typeof v === 'object' && v.ratio !== undefined);

        const barWidth = 100;
        const barHeight = 10;
        const elementEmojis = { '木': '🌳', '火': '🔥', '土': '🏔️', '金': '🪙', '水': '💧' };
        const elementColors = {
            '木': [76, 175, 80],
            '火': [244, 67, 54],
            '土': [255, 193, 7],
            '金': [224, 224, 224],
            '水': [33, 150, 243],
        };

        elements.forEach(([el, elData]) => {
            doc.setFontSize(12);
            setColor(doc, COLORS.white);
            doc.text(`${elementEmojis[el] || ''} ${el}`, PAGE.marginX, y + 7);

            // 바
            setFillColor(doc, [40, 40, 60]);
            doc.roundedRect(PAGE.marginX + 28, y, barWidth, barHeight, 2, 2, 'F');

            const fillW = (barWidth * (elData.ratio || 0)) / 100;
            setFillColor(doc, elementColors[el] || COLORS.blue);
            if (fillW > 0) {
                doc.roundedRect(PAGE.marginX + 28, y, fillW, barHeight, 2, 2, 'F');
            }

            doc.setFontSize(10);
            setColor(doc, COLORS.lightGray);
            doc.text(`${elData.ratio || 0}% (${elData.count || 0}개)`, PAGE.marginX + 28 + barWidth + 4, y + 7);

            y += 15;
        });
    }

    // 용신
    if (data.yongShen?.primary) {
        y += 5;
        doc.setFontSize(13);
        setColor(doc, COLORS.gold);
        doc.text('용신(用神) — 보약 같은 기운', PAGE.marginX, y);
        y += 9;

        const primaryEl = data.yongShen.primary;
        const elName = primaryEl?.korean || primaryEl?.hanja || primaryEl;
        const elHanja = primaryEl?.hanja || '';

        doc.setFontSize(10);
        setColor(doc, COLORS.white);
        y = wrapText(doc, `나에게 가장 필요한 오행: ${elName}${elHanja ? `(${elHanja})` : ''}`, PAGE.marginX, y, PAGE.contentWidth);

        if (data.yongShen.secondary) {
            const secEl = data.yongShen.secondary;
            const secName = secEl?.korean || secEl?.hanja || secEl;
            y = wrapText(doc, `보조 기운: ${secName}${secEl?.hanja ? `(${secEl.hanja})` : ''}`, PAGE.marginX, y, PAGE.contentWidth);
        }

        if (data.yongShen.reasoning) {
            y += 3;
            setColor(doc, COLORS.lightGray);
            y = wrapText(doc, data.yongShen.reasoning, PAGE.marginX, y, PAGE.contentWidth);
            setColor(doc, COLORS.white);
        }

        if (data.yongShenAdvice && Array.isArray(data.yongShenAdvice)) {
            data.yongShenAdvice.forEach((line) => {
                y = wrapText(doc, String(line), PAGE.marginX, y, PAGE.contentWidth);
            });
        }
    }

    addPageFooter(doc);
}

// ──────────────────────────────────────
// PAGE 3: 2026년 총운
// ──────────────────────────────────────

function renderOverallFortune(doc, data) {
    drawPageBackground(doc);
    addPageHeader(doc, '2026년 총운', 3);

    let y = PAGE.marginTop + 5;

    // 제목 + 종합 점수
    doc.setFontSize(22);
    setColor(doc, COLORS.gold);
    doc.text('2026년 총운', PAGE.marginX, y);
    y += 15;

    // 점수 카드
    const score = data.fortuneScore || 50;
    const grade = getScoreGrade(score);
    drawCard(doc, PAGE.marginX, y, PAGE.contentWidth, 35, { radius: 8 });

    doc.setFontSize(42);
    setColor(doc, grade.color);
    doc.text(`${score}`, PAGE.marginX + 20, y + 24);

    doc.setFontSize(14);
    doc.text(`점 — ${grade.label}`, PAGE.marginX + 48, y + 24);

    // 점수 바
    drawProgressBar(doc, PAGE.marginX + 82, y + 14, 72, 10, score);
    y += 45;

    // 총운 상세 텍스트
    doc.setFontSize(12);
    setColor(doc, COLORS.white);

    if (Array.isArray(data.overall)) {
        data.overall.forEach((line) => {
            if (!line) { y += 5; return; }
            y = wrapText(doc, line, PAGE.marginX, y, PAGE.contentWidth);
        });
    } else if (typeof data.overall === 'string') {
        y = wrapText(doc, data.overall, PAGE.marginX, y, PAGE.contentWidth);
    }

    addPageFooter(doc);
}

// ──────────────────────────────────────
// PAGE 4~9: 카테고리별 운세
// ──────────────────────────────────────

const CATEGORY_META = {
    wealth: { name: '재물·살림운', emoji: '💰', pageNum: 4 },
    love: { name: '가족·인연운', emoji: '🤝', pageNum: 5 },
    health: { name: '건강·몸 관리운', emoji: '🩺', pageNum: 6 },
    career: { name: '재물·노후운', emoji: '🏦', pageNum: 7 },
    study: { name: '자식·손주운', emoji: '👨‍👩‍👧‍👦', pageNum: 8 },
    family: { name: '가정·화목운', emoji: '🏡', pageNum: 9 },
};

function renderCategoryPage(doc, catId, data) {
    drawPageBackground(doc);
    const meta = CATEGORY_META[catId];
    addPageHeader(doc, meta.name, meta.pageNum);

    let y = PAGE.marginTop + 5;

    // 카테고리 타이틀
    doc.setFontSize(22);
    setColor(doc, COLORS.gold);
    doc.text(`${meta.emoji} ${meta.name}`, PAGE.marginX, y);
    y += 18;

    const catData = data.categories?.[catId];
    if (!catData) {
        doc.setFontSize(12);
        setColor(doc, COLORS.muted);
        doc.text('데이터가 없습니다.', PAGE.marginX, y);
        addPageFooter(doc);
        return;
    }

    // 카테고리 요약 텍스트
    doc.setFontSize(13);
    setColor(doc, COLORS.white);
    y = wrapText(doc, catData.text || '', PAGE.marginX, y, PAGE.contentWidth);
    y += 8;

    // 상세 해석
    if (catData.detailText) {
        doc.setFontSize(15);
        setColor(doc, COLORS.gold);
        doc.text('상세 해석', PAGE.marginX, y);
        y += 12;

        doc.setFontSize(12);
        setColor(doc, COLORS.lightGray);
        y = wrapText(doc, catData.detailText, PAGE.marginX, y, PAGE.contentWidth);
        y += 12;
    }

    // 주의사항 (warnings)
    const warnings = catData.warnings || [];
    if (warnings.length > 0) {
        drawCard(doc, PAGE.marginX, y, PAGE.contentWidth, 10 + warnings.length * 10, { fill: [50, 30, 30], border: COLORS.red });
        y += 10;

        doc.setFontSize(13);
        setColor(doc, COLORS.red);
        doc.text('주의사항', PAGE.marginX + 5, y);
        y += 10;

        doc.setFontSize(11);
        setColor(doc, COLORS.lightGray);
        warnings.forEach((w) => {
            doc.text(`  • ${w}`, PAGE.marginX + 5, y);
            y += 9;
        });
        y += 8;
    }

    // 처방 (remedies)
    const remedies = catData.remedies || [];
    if (remedies.length > 0) {
        drawCard(doc, PAGE.marginX, y, PAGE.contentWidth, 10 + remedies.length * 10, { fill: [30, 50, 30], border: COLORS.green });
        y += 10;

        doc.setFontSize(13);
        setColor(doc, COLORS.green);
        doc.text('맞춤 처방', PAGE.marginX + 5, y);
        y += 10;

        doc.setFontSize(11);
        setColor(doc, COLORS.lightGray);
        remedies.forEach((r) => {
            doc.text(`  • ${r}`, PAGE.marginX + 5, y);
            y += 9;
        });
    }

    addPageFooter(doc);
}

// ──────────────────────────────────────
// PAGE 10~11: 월별 운세
// ──────────────────────────────────────

function renderMonthlyPage(doc, months, startMonth, data) {
    drawPageBackground(doc);
    const pageNum = startMonth === 1 ? 10 : 11;
    addPageHeader(doc, '월별 운세', pageNum);

    let y = PAGE.marginTop + 5;

    doc.setFontSize(22);
    setColor(doc, COLORS.gold);
    doc.text(`월별 운세 (${startMonth}~${startMonth + 5}월)`, PAGE.marginX, y);
    y += 18;

    months.forEach((m) => {
        if (y > PAGE.height - 65) return; // 페이지 넘김 방지

        const grade = getScoreGrade(m.score);

        // 월별 카드
        drawCard(doc, PAGE.marginX, y, PAGE.contentWidth, 42, { radius: 6 });

        // 월 + 점수
        doc.setFontSize(16);
        setColor(doc, COLORS.gold);
        doc.text(`${m.month}월`, PAGE.marginX + 8, y + 12);

        // 점수 바
        drawProgressBar(doc, PAGE.marginX + 32, y + 5, 50, 8, m.score);

        // 테마
        doc.setFontSize(11);
        setColor(doc, COLORS.white);
        doc.text(`테마: ${m.theme || m.keyword || ''}`, PAGE.marginX + 95, y + 12);

        // 좋은 일 / 나쁜 일
        doc.setFontSize(10);
        setColor(doc, COLORS.green);
        doc.text(`좋은 일: ${m.good || ''}`, PAGE.marginX + 8, y + 24);

        setColor(doc, COLORS.red);
        doc.text(`나쁜 일: ${m.bad || ''}`, PAGE.marginX + 8, y + 32);

        setColor(doc, COLORS.blue);
        const healthText = `건강: ${m.health || ''}`;
        doc.text(healthText, PAGE.width - PAGE.marginX - 10, y + 24, { align: 'right' });

        y += 48;
    });

    addPageFooter(doc);
}

// ──────────────────────────────────────
// PAGE 12: 종합 처방전
// ──────────────────────────────────────

function renderPrescriptionPage(doc, data) {
    drawPageBackground(doc);
    addPageHeader(doc, '종합 처방전', 12);

    let y = PAGE.marginTop + 5;

    doc.setFontSize(22);
    setColor(doc, COLORS.gold);
    doc.text('종합 처방전', PAGE.marginX, y);
    y += 16;

    // 행운 정보 카드
    const lucky = data.lucky || {};
    drawCard(doc, PAGE.marginX, y, PAGE.contentWidth, 65, { radius: 8 });
    y += 12;

    doc.setFontSize(15);
    setColor(doc, COLORS.gold);
    doc.text('2026년 행운의 요소', PAGE.marginX + 10, y);
    y += 14;

    const luckyItems = [
        ['행운의 방위', lucky.direction || '-'],
        ['행운의 색', lucky.color || '-'],
        ['행운의 오행', lucky.element || '-'],
        ['행운의 숫자', lucky.number || '-'],
        ['행운의 보석', lucky.gem || '-'],
    ];

    doc.setFontSize(12);
    luckyItems.forEach(([label, value]) => {
        setColor(doc, COLORS.muted);
        doc.text(label, PAGE.marginX + 15, y);
        setColor(doc, COLORS.white);
        doc.text(value, PAGE.marginX + 70, y);
        y += 9;
    });

    y += 18;

    // 용신 조언
    if (data.yongShenAdvice) {
        doc.setFontSize(15);
        setColor(doc, COLORS.gold);
        doc.text('용신(用神) 생활 처방', PAGE.marginX, y);
        y += 12;

        doc.setFontSize(12);
        setColor(doc, COLORS.white);
        const advice = Array.isArray(data.yongShenAdvice) ? data.yongShenAdvice : [data.yongShenAdvice];
        advice.forEach((line) => {
            y = wrapText(doc, line, PAGE.marginX, y, PAGE.contentWidth);
        });
        y += 12;
    }

    // 마무리 인사
    y += 10;
    drawCard(doc, PAGE.marginX, y, PAGE.contentWidth, 60, { border: COLORS.gold, radius: 8 });
    y += 14;

    doc.setFontSize(15);
    setColor(doc, COLORS.gold);
    doc.text('마무리 인사', PAGE.width / 2, y, { align: 'center' });
    y += 12;

    doc.setFontSize(11.5);
    setColor(doc, COLORS.lightGray);
    const closingLines = [
        '2026 병오년은 뜨거운 불의 기운이 가득한 해입니다.',
        '이 진단서가 한 해를 지혜롭게 보내시는 데 도움이 되길 바랍니다.',
        '',
        '건강하시고, 가족과 함께 행복한 한 해 되세요.',
        '감사합니다.',
    ];
    closingLines.forEach((line) => {
        if (!line) { y += 6; return; }
        doc.text(line, PAGE.width / 2, y, { align: 'center' });
        y += 9;
    });

    addPageFooter(doc);
}

// ──────────────────────────────────────
// EventBus 초기화
// ──────────────────────────────────────

export function initPdfReport() {
    // INTERPRET_COMPLETE 시 리포트 데이터 저장
    bus.on(bus.Events.INTERPRET_COMPLETE, (data) => {
        const reportData = data.interpretation?.detail;
        if (reportData) {
            setReportData(reportData);
        }
    });

    // ThankYou 페이지에서 PDF 생성 요청 시
    bus.on(bus.Events.PDF_GENERATE_START, async (payload) => {
        if (!_reportData) {
            console.error('[PdfReport] 리포트 데이터가 없습니다.');
            bus.emit(bus.Events.PDF_GENERATE_COMPLETE, { status: 'error', error: '데이터 없음' });
            return;
        }

        try {
            console.log('[PdfReport] PDF 생성 및 저장 시작...');
            await generateReport(_reportData);
            bus.emit(bus.Events.PDF_GENERATE_COMPLETE, { status: 'done' });
        } catch (error) {
            console.error('[PdfReport] PDF 생성 오류:', error);
            bus.emit(bus.Events.PDF_GENERATE_COMPLETE, { status: 'error', error: error.message });
        }
    });

    console.log('[PdfReport] PDF 리포트 모듈 초기화 완료');
}
