/**
 * Module Isolation Checker (lint:modules)
 * 
 * Independence Axiom 검증 스크립트:
 * src/modules/ 하위의 각 모듈이 다른 모듈을 직접 import하는지 검사합니다.
 * 유일하게 허용되는 외부 import는:
 *   - @utils/ (또는 ../utils, ../../utils)
 *   - npm 패키지 (node_modules)
 *   - 동일 모듈 내부 파일
 * 
 * 사용법: npm run lint:modules
 */

import { readdir, readFile } from 'fs/promises';
import { resolve, relative, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MODULES_DIR = resolve(__dirname, '..', 'src', 'modules');

// 모듈 디렉토리 이름 목록
const MODULE_NAMES = [
    'input',
    'manseryeok',
    'interpreter',
    'display',
    'pdf',
    'lead',
    'ads',
];

// import/from 패턴 매칭
const IMPORT_REGEX = /(?:import\s+.*?\s+from\s+['"](.+?)['"]|import\s*\(\s*['"](.+?)['"]\s*\)|require\s*\(\s*['"](.+?)['"]\s*\))/g;

async function getJsFiles(dir) {
    const files = [];
    try {
        const entries = await readdir(dir, { withFileTypes: true, recursive: true });
        for (const entry of entries) {
            if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
                const fullPath = entry.parentPath
                    ? resolve(entry.parentPath, entry.name)
                    : resolve(dir, entry.name);
                files.push(fullPath);
            }
        }
    } catch {
        // 디렉토리가 아직 없으면 무시
    }
    return files;
}

function getModuleName(filePath) {
    const rel = relative(MODULES_DIR, filePath);
    return rel.split('/')[0];
}

function isViolation(importPath, currentModule) {
    // npm 패키지는 허용
    if (!importPath.startsWith('.') && !importPath.startsWith('@modules')) {
        // @utils는 허용
        if (importPath.startsWith('@utils')) return false;
        // 다른 @ 스코프 패키지는 허용 (npm)
        return false;
    }

    // @modules 경로 직접 참조
    if (importPath.startsWith('@modules/')) {
        const targetModule = importPath.replace('@modules/', '').split('/')[0];
        return targetModule !== currentModule;
    }

    // 상대 경로로 다른 모듈을 참조하는지 확인
    // ../modules/다른모듈 또는 ../../modules/다른모듈 형태
    if (importPath.includes('modules/')) {
        const match = importPath.match(/modules\/(\w+)/);
        if (match && match[1] !== currentModule && MODULE_NAMES.includes(match[1])) {
            return true;
        }
    }

    return false;
}

async function main() {
    let violations = 0;
    let filesChecked = 0;

    console.log('🔍 Module Isolation Check (Independence Axiom)\n');
    console.log(`   Modules directory: ${MODULES_DIR}`);
    console.log(`   Modules: ${MODULE_NAMES.join(', ')}\n`);

    for (const moduleName of MODULE_NAMES) {
        const moduleDir = resolve(MODULES_DIR, moduleName);
        const files = await getJsFiles(moduleDir);

        for (const filePath of files) {
            filesChecked++;
            const content = await readFile(filePath, 'utf-8');
            const relPath = relative(resolve(__dirname, '..'), filePath);
            let match;

            IMPORT_REGEX.lastIndex = 0;
            while ((match = IMPORT_REGEX.exec(content)) !== null) {
                const importPath = match[1] || match[2] || match[3];
                if (isViolation(importPath, moduleName)) {
                    violations++;
                    const lineNumber = content.substring(0, match.index).split('\n').length;
                    console.log(`   ❌ VIOLATION: ${relPath}:${lineNumber}`);
                    console.log(`      Module "${moduleName}" imports from "${importPath}"`);
                    console.log(`      → 모듈 간 직접 import 금지. EventBus를 사용하세요.\n`);
                }
            }
        }
    }

    console.log('─'.repeat(50));
    console.log(`   Files checked: ${filesChecked}`);
    console.log(`   Violations: ${violations}`);
    console.log(violations === 0 ? '\n   ✅ All modules are properly isolated!' : '\n   ⚠️  Fix violations above before committing.');

    process.exit(violations > 0 ? 1 : 0);
}

main().catch(console.error);
