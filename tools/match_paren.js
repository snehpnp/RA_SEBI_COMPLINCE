const fs = require('fs');
const content = fs.readFileSync('d:/RA_SEBI_COMPLINCE/frontend/src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');

// Find matching closing paren/brace for line 6239
// Line 6239 starts with `              {(isProfileComplete`
let startPos = 0;
for (let i = 0; i < 6238; i++) {
  startPos += lines[i].length + 1;
}

const sliceFrom6239 = content.slice(startPos);
let stack = [];
for (let i = 0; i < sliceFrom6239.length; i++) {
  const ch = sliceFrom6239[i];
  if (ch === '{' || ch === '(') {
    stack.push({ ch, pos: startPos + i });
  } else if (ch === '}' || ch === ')') {
    const last = stack.pop();
    if (stack.length === 0) {
      console.log('Finished stack at pos:', startPos + i);
      // find line number
      const lineNum = content.slice(0, startPos + i).split('\n').length;
      console.log('Matched line number:', lineNum);
      console.log('Line content:', lines[lineNum - 1]);
      break;
    }
  }
}
