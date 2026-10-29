Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
serverPath = currentDir & "\server.js"
WshShell.CurrentDirectory = currentDir
WshShell.Run """C:\Program Files\nodejs\node.exe"" """ & serverPath & """", 0, False
