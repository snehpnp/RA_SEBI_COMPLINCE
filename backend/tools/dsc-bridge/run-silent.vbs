Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Check if node is installed and express exists
nodeFound = False
On Error Resume Next
res = WshShell.Run("cmd /c where node", 0, True)
If res = 0 And fso.FolderExists(currentDir & "\node_modules\express") Then
  nodeFound = True
End If
On Error GoTo 0

If nodeFound Then
  WshShell.Run "node """ & currentDir & "\server.js""", 0, False
Else
  WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & currentDir & "\bridge.ps1"" -Port 1620", 0, False
End If
