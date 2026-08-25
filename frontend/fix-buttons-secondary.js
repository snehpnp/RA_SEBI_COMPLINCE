const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Find all className attributes
  const classNameRegex = /className=(?:(["'])(.*?)\1|\{`([^`]*?)`\})/gs;
  
  content = content.replace(classNameRegex, (match, quote, p2, p3) => {
    let innerClass = p2 !== undefined ? p2 : p3;
    let originalInnerClass = innerClass;
    
    // 1. Fix bad text-white on light backgrounds
    if (innerClass.includes('bg-slate-100') && innerClass.includes('text-white') && !innerClass.includes('text-slate-900')) {
      // It has text-white but a light background. 
      // Let's replace text-white with text-slate-900 dark:text-white
      innerClass = innerClass.replace(/\btext-white\b/g, 'text-slate-900 dark:text-white');
    }
    
    // 2. Fix bad text-slate-900 on dark backgrounds (if any were missed, like hover:bg-slate-700)
    // Actually the previous script already fixed the main ones.

    // 3. Fix missing dark background on bg-slate-100 buttons/elements
    // If it has bg-slate-100 and hover:bg-slate-200 but missing dark variants:
    if (innerClass.includes('bg-slate-100') && !innerClass.includes('dark:bg-')) {
       // if it's a structural element (like a page wrapper min-h-screen) we skip it.
       // We can guess if it's a small button by padding classes px- py- or p-
       if (/\bpx-\d+/.test(innerClass) || /\bp-\d+/.test(innerClass)) {
          if (!innerClass.includes('min-h-screen') && !innerClass.includes('fixed inset-0')) {
             innerClass = innerClass.replace(/\bbg-slate-100\b/g, 'bg-slate-100 dark:bg-white/5');
          }
       }
    }
    
    // 4. Same for hover:bg-slate-100 without dark variant
    if (innerClass.includes('hover:bg-slate-100') && !innerClass.includes('dark:hover:bg-')) {
       innerClass = innerClass.replace(/\bhover:bg-slate-100\b/g, 'hover:bg-slate-100 dark:hover:bg-white/10');
    }
    
    // 5. hover:bg-slate-200 without dark variant
    if (innerClass.includes('hover:bg-slate-200') && !innerClass.includes('dark:hover:bg-')) {
       innerClass = innerClass.replace(/\bhover:bg-slate-200\b/g, 'hover:bg-slate-200 dark:hover:bg-white/10');
    }

    if (innerClass !== originalInnerClass) {
      innerClass = innerClass.replace(/\s+/g, ' ').trim();
    }
    
    if (p2 !== undefined) {
      return `className="${innerClass}"`;
    } else {
      return `className={\`${innerClass}\`}`;
    }
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
}

walkDir('./src', processFile);
console.log('Done fixing secondary button colors!');
