/**
 * PDF 한글 폰트 로더 (PdfFontLoader.js)
 * 
 * Noto Sans KR 폰트를 lazy-load하여 jsPDF에 등록합니다.
 * PDF 생성 시에만 폰트를 로드하여 초기 로딩 부담을 줄입니다.
 */

let fontLoaded = false;

/**
 * jsPDF 인스턴스에 한글 폰트를 등록합니다.
 * 최초 호출 시에만 폰트를 fetch하고, 이후에는 캐시를 사용합니다.
 * 
 * @param {jsPDF} doc - jsPDF 인스턴스
 */
const FONTS = [
    { name: 'NotoSerifKR', style: 'normal', file: 'NotoSerifKR-Regular.ttf' },
    { name: 'NotoSerifKR', style: 'bold', file: 'NotoSerifKR-Bold.ttf' },
    { name: 'NotoSansKR', style: 'normal', file: 'NotoSansKR-Regular.ttf' }
];

let loadedFonts = new Set();

/**
 * jsPDF 인스턴스에 필요한 한글 폰트들을 등록합니다.
 * 
 * @param {jsPDF} doc - jsPDF 인스턴스
 */
export async function loadKoreanFont(doc) {
    try {
        for (const font of FONTS) {
            const fontKey = `${font.name}-${font.style}`;

            // 이미 VFS에 있으면 스킵 (인스턴스별로 addFont는 필요할 수 있음)
            if (!doc.getFontList()[font.name]?.includes(font.style)) {
                console.log(`[PdfFont] 폰트 로딩 중: ${font.file}`);
                const response = await fetch(`/fonts/${font.file}`);

                if (!response.ok) {
                    throw new Error(`폰트 로드 실패: ${font.file} (${response.status})`);
                }

                const fontBuffer = await response.arrayBuffer();
                const fontBase64 = arrayBufferToBase64(fontBuffer);

                doc.addFileToVFS(font.file, fontBase64);
                doc.addFont(font.file, font.name, font.style);
            }
        }

        // 기본 폰트 설정
        doc.setFont('NotoSerifKR', 'normal');
        console.log('[PdfFont] 모든 한글 폰트 로딩 및 등록 완료');
    } catch (error) {
        console.error('[PdfFont] 폰트 로딩 오류:', error);
        doc.setFont('helvetica', 'normal');
    }
}

/**
 * ArrayBuffer를 Base64 문자열로 변환합니다.
 */
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
