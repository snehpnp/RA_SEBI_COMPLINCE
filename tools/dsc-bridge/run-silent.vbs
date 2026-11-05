Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

nodeExe = "node"
If fso.FileExists(currentDir & "\node.exe") Then
    nodeExe = """" & currentDir & "\node.exe"""
ElseIf fso.FileExists(WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\SEBI-DSC-Bridge\node.exe") Then
    nodeExe = """" & WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\SEBI-DSC-Bridge\node.exe"""
ElseIf fso.FileExists(WshShell.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe") Then
    nodeExe = """" & WshShell.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"""
ElseIf fso.FileExists(WshShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\nodejs\node.exe") Then
    nodeExe = """" & WshShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\nodejs\node.exe"""
End If

WshShell.Run nodeExe & " """ & currentDir & "\server.js""", 0, False
