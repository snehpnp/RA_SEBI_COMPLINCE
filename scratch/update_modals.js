const fs = require('fs');

function updateModal(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the setup block
  const oldSnippetRegex = /<div className="p-3\.5 bg-amber-50 dark:bg-amber-950\/40 rounded-xl border border-amber-200 dark:border-amber-800\/60 space-y-2\.5">[\s\S]*?<\/ol>\s*<\/div>/;
  
  const newSnippet = `<div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-amber-600 shrink-0" /> Setup DSC Bridge on this PC
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href="/downloads/sebi-dsc-bridge-setup.exe"
                        download="sebi-dsc-bridge-setup.exe"
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shadow-sm transition"
                        title="Download single-file installer (No ZIP extraction needed)"
                      >
                        <Zap className="w-3 h-3" /> 1-Click Setup (.exe)
                      </a>
                      <a
                        href="/downloads/sebi-dsc-bridge.zip"
                        download="sebi-dsc-bridge.zip"
                        className="px-2 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] inline-flex items-center gap-1 transition"
                        title="Download ZIP for manual setup"
                      >
                        ZIP
                      </a>
                    </div>
                  </div>
                  <ol className="text-[11px] text-amber-800 dark:text-amber-300 list-decimal pl-4 space-y-1">
                    <li>Click <b>1-Click Setup (.exe)</b> to download (Single file, no unzipping!).</li>
                    <li>Click the downloaded file to run — it configures auto-start &amp; runs port 1620.</li>
                    <li>Insert physical USB DSC Token &amp; click <b>Retry Bridge Check</b> below.</li>
                  </ol>
                </div>`;

  if (oldSnippetRegex.test(content)) {
    content = content.replace(oldSnippetRegex, newSnippet);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`Pattern not matched in ${filePath}`);
  }
}

updateModal('frontend/src/components/ReportPreviewModal.tsx');
updateModal('frontend/src/components/UploadSignConfirmModal.tsx');

