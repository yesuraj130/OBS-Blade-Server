' OBS Host File Browser Background Launcher
' Starts the File Browser Node.js server silently in the background without a command prompt window

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Get current script folder path
CurrentDirectory = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = CurrentDirectory

' Check if node is available
On Error Resume Next
Set objExec = WshShell.Exec("node -v")
If Err.Number <> 0 Then
    MsgBox "Node.js was not found! Please install Node.js from https://nodejs.org/ to run the File Browser.", vbCritical, "OBS File Browser"
    WScript.Quit 1
End If
On Error GoTo 0

' Start node server.js with 0 = hidden window
WshShell.Run "cmd /c node server.js", 0, False

MsgBox "OBS File Browser Server has started in the background on port 3000." & vbCrLf & _
       "Access URL: http://localhost:3000/" & vbCrLf & vbCrLf & _
       "To stop the service, terminate 'node.exe' in Windows Task Manager.", vbInformation, "OBS File Browser Running"
