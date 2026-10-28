const path = require('path');
const ts = require(path.resolve('backend/node_modules/typescript'));
const fs = require('fs');
const configPath = './backend/tsconfig.json';
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedCommandLine = ts.parseJsonConfigFileContent(configFile.config, ts.sys, './backend');
const program = ts.createProgram(parsedCommandLine.fileNames, parsedCommandLine.options);
const emitResult = program.emit();
const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
const errors = allDiagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
console.log('Backend Error count:', errors.length);
errors.slice(0, 5).forEach(d => {
  const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
  console.log(d.file ? d.file.fileName + ': ' + message : message);
});
