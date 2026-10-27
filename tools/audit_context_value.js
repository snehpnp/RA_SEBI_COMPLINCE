const fs = require('fs');
const path = require('path');
const parser = require(path.resolve(__dirname, '../frontend_vit/node_modules/@babel/parser'));
const traverse = require(path.resolve(__dirname, '../frontend_vit/node_modules/@babel/traverse')).default;

const code = fs.readFileSync('d:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/admin/AdminContext.jsx', 'utf-8');
const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
});

let providerScope = null;
let contextValueKeys = new Set();

traverse(ast, {
    FunctionDeclaration(p) {
        if (p.node.id && p.node.id.name === 'AdminProvider') {
            providerScope = p.scope;
        }
    },
    VariableDeclarator(p) {
        if (p.node.id && p.node.id.name === 'contextValue' && p.node.init && p.node.init.type === 'ObjectExpression') {
            for (const prop of p.node.init.properties) {
                if (prop.type === 'ObjectProperty' && prop.key && prop.key.name) {
                    contextValueKeys.add(prop.key.name);
                } else if (prop.type === 'ObjectProperty' && prop.key && prop.key.value) {
                    contextValueKeys.add(prop.key.value);
                }
            }
        }
    }
});

if (providerScope) {
    const allBindings = Object.keys(providerScope.bindings);
    console.log(`Total bindings in AdminProvider: ${allBindings.length}`);
    console.log(`Total keys in contextValue: ${contextValueKeys.size}`);

    const missingInContext = allBindings.filter(b => !contextValueKeys.has(b));
    console.log(`Bindings NOT in contextValue (${missingInContext.length}):`);
    console.log(missingInContext.slice(0, 30));
}
