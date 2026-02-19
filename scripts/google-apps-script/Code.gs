/**
 * 운세 건강 검진 — Google Apps Script 웹앱
 * 
 * 프론트엔드 SheetSync.js에서 POST 요청을 받아
 * Google Sheets에 데이터를 기록합니다.
 * 
 * ──────────────────────────────────────
 * 설정 방법:
 * 1. Google Sheets 새 스프레드시트 생성
 * 2. 확장 프로그램 → Apps Script 클릭
 * 3. 이 코드를 Code.gs에 붙여넣기
 * 4. SPREADSHEET_ID를 스프레드시트 URL에서 복사한 ID로 교체
 * 5. 배포 → 새 배포 → 웹 앱 → 
 *    - 실행 사용자: 나
 *    - 액세스: 모든 사용자
 * 6. 배포된 URL을 .env의 VITE_SHEET_URL에 설정
 * ──────────────────────────────────────
 */

// ⚠️ 아래 ID를 본인의 스프레드시트 ID로 바꾸세요
const SPREADSHEET_ID = '14pDIwzlMpL2FRJMRvvQH3iadW5FRbqsBXxu34QSoiMM';
const MAX_ROWS_PER_TAB = 300;

// ──────────────────────────────────────
// POST 핸들러
// ──────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    let result;

    if (data.type === 'session') {
      result = handleSession(ss, data);
    } else if (data.type === 'inquiry') {
      result = handleInquiry(ss, data);
    } else {
      result = { ok: false, error: 'Unknown type: ' + data.type };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// CORS 대응 및 데이터 조회 (GET)
function doGet(e) {
  if (e.parameter.id) {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sessionId = e.parameter.id;

      // 1. 상세결과 탭에서 JSON 가져오기
      const detailSheet = findSheetByPrefix(ss, '상세결과', sessionId);
      const detailRow = findRowBySessionId(detailSheet, sessionId);

      // 2. 세션 탭에서 문의 내용 가져오기
      const sessionSheet = findSessionTab(ss, sessionId);
      const sessionRow = findRowBySessionId(sessionSheet, sessionId);

      if (detailRow && sessionRow) {
        const resultData = JSON.parse(detailRow[2]);
        // 문의 내용(이메일, 카테고리, 질문) 병합
        resultData.inquiry = {
          email: sessionRow[12],
          category: sessionRow[13],
          question: sessionRow[14]
        };

        return ContentService
          .createTextOutput(JSON.stringify({ ok: true, data: resultData }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Data not found for ID: ' + sessionId }))
        .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: '운세 건강 검진 API 정상 작동 중' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 특정 세션 ID에 해당하는 행 데이터 찾기
 */
function findRowBySessionId(sheet, sessionId) {
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionId) {
      return data[i];
    }
  }
  return null;
}

/**
 * 프리픽스로 시작하는 탭들 중 세션 ID가 포함된 탭 찾기
 */
function findSheetByPrefix(ss, prefix, sessionId) {
  const sheets = ss.getSheets().filter(s => s.getName().startsWith(prefix));
  for (let i = sheets.length - 1; i >= 0; i--) {
    const sheet = sheets[i];
    const data = sheet.getDataRange().getValues();
    for (let r = 1; r < data.length; r++) {
      if (data[r][0] === sessionId) {
        return sheet;
      }
    }
  }
  return null;
}

// ──────────────────────────────────────
// 세션 데이터 처리 (검진 완료 시)
// ──────────────────────────────────────

function handleSession(ss, data) {
  // 세션 탭 가져오기 (없으면 생성)
  const sessionSheet = getOrCreateTab(ss, '세션', getSessionHeaders());

  // 세션 행 추가
  sessionSheet.appendRow([
    data.session_id,
    data.created_at,
    data.status || 'free_viewed',
    data.birth_year,
    data.birth_month,
    data.birth_day,
    data.birth_hour,
    data.gender,
    data.is_lunar ? '음력' : '양력',
    data.fortune_score,
    data.four_pillars,
    data.categories_summary,
    '', // email (상담 시 업데이트)
    '', // concern_categories
    '', // question_text
    '', // submitted_at
  ]);

  // 상세 결과 탭에 JSON 저장
  const detailSheet = getOrCreateTab(ss, '상세결과', ['session_id', 'created_at', 'result_json']);
  detailSheet.appendRow([
    data.session_id,
    data.created_at,
    data.result_json || '',
  ]);

  return { ok: true, session_id: data.session_id, tab: sessionSheet.getName() };
}

// ──────────────────────────────────────
// 상담 데이터 처리 (폼 제출 시)
// ──────────────────────────────────────

function handleInquiry(ss, data) {
  // 세션 탭에서 해당 session_id 찾아서 업데이트
  const sessionSheet = findSessionTab(ss, data.session_id);
  const scheduledTime = calculateETAGAS();

  if (sessionSheet) {
    const sessionIdCol = 1; // A열
    const dataRange = sessionSheet.getDataRange();
    const values = dataRange.getValues();

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.session_id) {
        // M~R열 업데이트 (13~18번째 열)
        sessionSheet.getRange(i + 1, 3).setValue('inquiry_submitted'); // status
        sessionSheet.getRange(i + 1, 13).setValue(data.email);
        sessionSheet.getRange(i + 1, 14).setValue(data.concern_categories);
        sessionSheet.getRange(i + 1, 15).setValue(data.question_text);
        sessionSheet.getRange(i + 1, 16).setValue(data.submitted_at);
        sessionSheet.getRange(i + 1, 17).setValue(scheduledTime); // scheduled_at
        sessionSheet.getRange(i + 1, 18).setValue('no'); // is_sent

        return { ok: true, session_id: data.session_id, updated: true, scheduled_at: scheduledTime };
      }
    }
  }

  // 세션을 못 찾으면 별도 행으로 추가
  const fallbackSheet = getOrCreateTab(ss, '세션', getSessionHeaders());
  fallbackSheet.appendRow([
    data.session_id,
    data.submitted_at,
    'inquiry_submitted',
    '', '', '', '', '', '', '', '', '',
    data.email,
    data.concern_categories,
    data.question_text,
    data.submitted_at,
    scheduledTime,
    'no'
  ]);

  return { ok: true, session_id: data.session_id, updated: false, fallback: true, scheduled_at: scheduledTime };
}

/**
 * 예상 리포트 발송 시각 계산 (GAS 서버 시간 기준)
 */
function calculateETAGAS() {
  const now = new Date();
  const currentHour = now.getHours();
  
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

/**
 * 예약된 리포트 발송 (시간 기반 트리거용)
 */
function sendScheduledReports() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets().filter(s => s.getName().startsWith('세션'));
  const now = new Date();

  sheets.forEach(sheet => {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[2];
      const email = row[12];
      const scheduledAt = row[16];
      const isSent = row[17];

      if (status === 'inquiry_submitted' && isSent === 'no' && scheduledAt && new Date(scheduledAt) <= now) {
        try {
          sendReportEmail(email, row[0]); // email, session_id
          sheet.getRange(i + 1, 18).setValue('yes');
          sheet.getRange(i + 1, 3).setValue('report_sent');
          Logger.log('발송 완료: ' + email);
        } catch (e) {
          Logger.log('발송 실패: ' + email + ' - ' + e.message);
        }
      }
    }
  });
}

/**
 * 리포트 이메일 발송 템플릿
 */
function sendReportEmail(email, sessionId) {
  // 실제 배포된 웹 앱의 URL 또는 리포트 전용 URL
  const reportUrl = 'https://ai-saju-2026.web.app/report.html'; // 예시 URL
  const signedUrl = reportUrl + '?id=' + sessionId;

  const subject = '[병오년 운세 검진] 정밀 진단서 분석이 완료되었습니다.';
  const body = `
    신청하신 2026 병오년 운세 건강 정밀 진단 시스템의 분석이 완료되었습니다.
    전문가의 정밀 대조와 비방 처방이 포함된 12페이지 분량의 진단서를 아래 링크에서 확인하실 수 있습니다.
    
    진단서 확인하기: ${signedUrl}
    
    * 본 메일은 발신 전용입니다.
  `;
  
  MailApp.sendEmail(email, subject, body);
}

// ──────────────────────────────────────
// 탭 관리 (300행 자동 분리)
// ──────────────────────────────────────

function getOrCreateTab(ss, prefix, headers) {
  const sheets = ss.getSheets();

  // 기존 탭 중 prefix로 시작하는 마지막 탭 찾기
  const matchingSheets = sheets.filter(s => s.getName().startsWith(prefix));

  if (matchingSheets.length > 0) {
    const lastSheet = matchingSheets[matchingSheets.length - 1];
    const rowCount = lastSheet.getLastRow();

    // 300행 미만이면 그대로 사용
    if (rowCount < MAX_ROWS_PER_TAB) {
      return lastSheet;
    }

    // 300행 이상이면 새 탭 생성
    const nextNum = matchingSheets.length + 1;
    const padded = String(nextNum).padStart(3, '0');
    const newSheet = ss.insertSheet(prefix + '_' + padded);

    // 헤더 추가
    if (headers && headers.length > 0) {
      newSheet.appendRow(headers);
      formatHeaderRow(newSheet);
    }

    return newSheet;
  }

  // 첫 탭 생성
  const firstSheet = ss.insertSheet(prefix + '_001');

  if (headers && headers.length > 0) {
    firstSheet.appendRow(headers);
    formatHeaderRow(firstSheet);
  }

  return firstSheet;
}

function findSessionTab(ss, sessionId) {
  const sheets = ss.getSheets();
  const sessionSheets = sheets.filter(s => s.getName().startsWith('세션'));

  // 역순으로 검색 (최신 탭부터)
  for (let i = sessionSheets.length - 1; i >= 0; i--) {
    const sheet = sessionSheets[i];
    const data = sheet.getDataRange().getValues();

    for (let r = 1; r < data.length; r++) {
      if (data[r][0] === sessionId) {
        return sheet;
      }
    }
  }

  return null;
}

// ──────────────────────────────────────
// 헤더 정의
// ──────────────────────────────────────

function getSessionHeaders() {
  return [
    'session_id',      // A
    'created_at',      // B
    'status',          // C
    'birth_year',      // D
    'birth_month',     // E
    'birth_day',       // F
    'birth_hour',      // G
    'gender',          // H
    'calendar',        // I (양력/음력)
    'fortune_score',   // J
    'four_pillars',    // K
    'categories_summary', // L
    'email',           // M
    'concern_categories', // N
    'question_text',   // O
    'submitted_at',    // P
    'scheduled_at',    // Q
    'is_sent',         // R
  ];
}

// ──────────────────────────────────────
// 스타일링
// ──────────────────────────────────────

function formatHeaderRow(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1a1a2e');
  headerRange.setFontColor('#ffd700');
  sheet.setFrozenRows(1);
}

// ──────────────────────────────────────
// 초기 설정 (최초 1회 실행)
// ──────────────────────────────────────

function setupSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 기본 시트 삭제 (Sheet1)
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('시트1');
  
  // 세션 탭 생성
  getOrCreateTab(ss, '세션', getSessionHeaders());

  // 상세결과 탭 생성  
  getOrCreateTab(ss, '상세결과', ['session_id', 'created_at', 'result_json']);

  // 기본 시트 삭제 (탭이 2개 이상일 때만)
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  Logger.log('✅ 초기 설정 완료!');
}
