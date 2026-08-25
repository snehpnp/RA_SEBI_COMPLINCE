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

  // We want to find any className="..." or className={`...`} that contains a dark solid bg color
  // and text-slate-900 (with or without dark:text-white) and replace it with text-white
  const darkBgs = ['bg-primary-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-rose-600', 'bg-slate-700', 'bg-slate-800'];
  
  // Find all className attributes
  const classNameRegex = /className=(?:(["'])(.*?)\1|\{`([^`]*?)`\})/gs;
  
  content = content.replace(classNameRegex, (match, quote, p2, p3) => {
    let innerClass = p2 !== undefined ? p2 : p3;
    
    let hasDarkBg = darkBgs.some(bg => innerClass.includes(bg));
    
    if (hasDarkBg) {
      // It's a dark solid button/element, so we need text-white
      innerClass = innerClass.replace(/\btext-slate-900\b/g, 'text-white');
      innerClass = innerClass.replace(/\bdark:text-white\b/g, ''); // Not needed if we have text-white
      
      // Secondary fix: Sometimes hover states invert.
      // If it has bg-primary-600, it usually has hover:bg-primary-500. This is fine.
      
      // Clean up multiple spaces
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
console.log('Done fixing primary button colors!');
