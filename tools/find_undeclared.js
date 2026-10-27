const fs = require('fs');
const path = require('path');
const parser = require(path.resolve(__dirname, '../frontend_vit/node_modules/@babel/parser'));
const traverse = require(path.resolve(__dirname, '../frontend_vit/node_modules/@babel/traverse')).default;

const code = fs.readFileSync('d:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/admin/AdminContext.jsx', 'utf-8');

const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
});

const declared = new Set();
const globals = new Set([
    'window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'console',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'fetch', 'Headers',
    'Request', 'Response', 'FormData', 'Blob', 'File', 'URL', 'URLSearchParams',
    'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Error',
    'Math', 'JSON', 'Promise', 'Set', 'Map', 'WeakSet', 'WeakMap', 'Intl',
    'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'undefined', 'NaN', 'Infinity',
    'alert', 'confirm', 'prompt', 'atob', 'btoa', 'crypto', 'location', 'history',
    'event', 'Image', 'Audio', 'FileReader'
]);

const undeclared = {};

traverse(ast, {
    Identifier(path) {
        const name = path.node.name;
        if (globals.has(name)) return;
        
        if (path.isReferencedIdentifier()) {
            if (!path.scope.hasBinding(name)) {
                const loc = path.node.loc;
                const line = loc ? loc.start.line : '?';
                if (!undeclared[name]) undeclared[name] = [];
                undeclared[name].push(line);
            }
        }
    }
});

for (const [name, lines] of Object.entries(undeclared)) {
    console.log(`${name}: lines [${lines.join(', ')}]`);
}

