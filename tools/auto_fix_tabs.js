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

// Read AdminContext keys
const adminCode = fs.readFileSync('d:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/admin/AdminContext.jsx', 'utf-8');
const adminAst = parser.parse(adminCode, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
const adminContextKeys = new Set();
traverse(adminAst, {
    VariableDeclarator(p) {
        if (p.node.id?.name === 'contextValue' && p.node.init?.type === 'ObjectExpression') {
            for (const prop of p.node.init.properties) {
                const k = prop.key?.name || prop.key?.value;
                if (k) adminContextKeys.add(k);
            }
        }
    }
});

console.log(`AdminContext exports ${adminContextKeys.size} keys.`);

const tabsDir = 'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/admin/tabs';
for (const file of fs.readdirSync(tabsDir)) {
    if (!file.endsWith('.jsx')) continue;
    const fullPath = path.join(tabsDir, file);
    let code = fs.readFileSync(fullPath, 'utf-8');

    let ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
    const undeclared = new Set();

    traverse(ast, {
        Identifier(p) {
            const name = p.node.name;
            if (globals.has(name)) return;
            if (p.isReferencedIdentifier() && !p.scope.hasBinding(name)) {
                undeclared.add(name);
            }
        }
    });

    if (undeclared.size === 0) {
        console.log(`Tab ${file}: Already Clean`);
        continue;
    }

    console.log(`Tab ${file} has ${undeclared.size} undeclared:`, Array.from(undeclared).join(', '));

    // Handle CKEditor imports if ClassicEditor is undeclared
    if (undeclared.has('ClassicEditor')) {
        if (!code.includes('@ckeditor/ckeditor5-build-classic')) {
            code = `import ClassicEditor from '@ckeditor/ckeditor5-build-classic';\nimport { CKEditor } from '@ckeditor/ckeditor5-react';\n` + code;
        }
        undeclared.delete('ClassicEditor');
    }

    if (undeclared.has('base_ra_url')) {
        if (!code.includes('@/utils/config')) {
            code = `import { base_ra_url } from '@/utils/config';\n` + code;
        }
        undeclared.delete('base_ra_url');
    }

    // Filter which ones come from adminContext
    const fromAdmin = Array.from(undeclared).filter(k => adminContextKeys.has(k));
    const stillUnknown = Array.from(undeclared).filter(k => !adminContextKeys.has(k));

    if (stillUnknown.length > 0) {
        console.log(`  WARNING: tab ${file} has unknown identifiers not in adminContext:`, stillUnknown.join(', '));
    }

    if (fromAdmin.length > 0) {
        // Find "const admin = useAdmin();" or "const { ... } = admin || {};"
        // Let's replace or add to the destructuring block
        const destructureRegex = /const\s*\{\s*([\s\S]*?)\s*\}\s*=\s*(?:admin\s*\|\|\s*\{\}|useAdmin\(\));/;
        const match = code.match(destructureRegex);

        if (match) {
            const existingVars = match[1].split(',').map(s => s.trim()).filter(Boolean).filter(v => !v.startsWith('...'));
            const combined = Array.from(new Set([...existingVars, ...fromAdmin]));
            const newDestructure = `const {\n    ${combined.join(',\n    ')}\n  } = admin || {};`;
            code = code.replace(match[0], newDestructure);
        } else {
            const adminMatch = /const\s+admin\s*=\s*useAdmin\(\);/;
            if (code.match(adminMatch)) {
                const newDestructure = `const admin = useAdmin();\n  const {\n    ${fromAdmin.join(',\n    ')}\n  } = admin || {};`;
                code = code.replace(adminMatch, newDestructure);
            }
        }

        fs.writeFileSync(fullPath, code, 'utf-8');
        console.log(`  Updated ${file} with ${fromAdmin.length} destructured variables.`);
    }
}
