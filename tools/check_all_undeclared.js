const fs = require('fs');
const path = require('path');
const parser = require(path.resolve(__dirname, '../frontend_vit/node_modules/@babel/parser'));
const traverse = require(path.resolve(__dirname, '../frontend_vit/node_modules/@babel/traverse')).default;

const globals = new Set([
    'window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'console',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'fetch', 'Headers',
    'Request', 'Response', 'FormData', 'Blob', 'File', 'URL', 'URLSearchParams',
    'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Error',
    'Math', 'JSON', 'Promise', 'Set', 'Map', 'WeakSet', 'WeakMap', 'Intl',
    'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'undefined', 'NaN', 'Infinity',
    'alert', 'confirm', 'prompt', 'atob', 'btoa', 'crypto', 'location', 'history',
    'event', 'Image', 'Audio', 'FileReader', 'import', 'globalThis', 'global',
    'React', 'HTMLElement', 'HTMLInputElement', 'Event', 'CustomEvent', 'MutationObserver',
    'IntersectionObserver', 'ResizeObserver', 'performance', 'process'
]);

function getAllFiles(dir, exts = ['.jsx', '.js']) {
    let files = [];
    for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            if (item !== 'node_modules' && item !== '.git') {
                files = files.concat(getAllFiles(full, exts));
            }
        } else if (exts.includes(path.extname(full))) {
            files.push(full);
        }
    }
    return files;
}

const files = getAllFiles('d:/RA_SEBI_COMPLINCE/frontend_vit/src');
let totalErrors = 0;

for (const file of files) {
    const code = fs.readFileSync(file, 'utf-8');
    let ast;
    try {
        ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript']
        });
    } catch (e) {
        console.error(`Parse error in ${file}:`, e.message);
        totalErrors++;
        continue;
    }

    const undeclared = {};
    traverse(ast, {
        Identifier(p) {
            const name = p.node.name;
            if (globals.has(name)) return;
            if (p.isReferencedIdentifier()) {
                if (!p.scope.hasBinding(name)) {
                    // Check if it's JSX member or component
                    const loc = p.node.loc;
                    const line = loc ? loc.start.line : '?';
                    if (!undeclared[name]) undeclared[name] = [];
                    undeclared[name].push(line);
                }
            }
        }
    });

    const entries = Object.entries(undeclared);
    if (entries.length > 0) {
        console.log(`\nFile: ${path.relative('d:/RA_SEBI_COMPLINCE/frontend_vit', file)}`);
        for (const [name, lines] of entries) {
            console.log(`  - ${name} (lines: ${lines.slice(0, 5).join(', ')}${lines.length > 5 ? '...' : ''})`);
        }
        totalErrors += entries.length;
    }
}

console.log(`\nCompleted check. Total potential undeclared references: ${totalErrors}`);
