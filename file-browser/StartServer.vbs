' OBS Host File Browser Background Launcher
' Verifies Node.js & dependencies, rotates logs, starts server.js silently, and verifies health.

Option Explicit

Dim WshShell, FSO, CurrentDirectory, ServerPort, LogPath
Dim ExitCode, InstallCode, IsOnline, Attempt

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

CurrentDirectory = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = CurrentDirectory
LogPath = CurrentDirectory & "\server.log"

ServerPort = WshShell.ExpandEnvironmentStrings("%PORT%")
If ServerPort = "" Or ServerPort = "%PORT%" Then
    ServerPort = "3000"
End If

Function ProbeServer(port)
    On Error Resume Next
    Dim req
    Set req = CreateObject("WinHttp.WinHttpRequest.5.1")
    If Err.Number <> 0 Then
        Err.Clear
        Set req = CreateObject("MSXML2.XMLHTTP")
    End If
    req.SetTimeouts 400, 600, 600, 800
    Err.Clear
    req.Open "GET", "http://127.0.0.1:" & port & "/api/status", False
    req.Send
    If Err.Number = 0 And req.Status = 200 Then
        ProbeServer = True
    Else
        ProbeServer = False
    End If
    On Error GoTo 0
End Function

' 1. Check if already running
If ProbeServer(ServerPort) Then
    MsgBox "OBS File Browser Server is already running on port " & ServerPort & "." & vbCrLf & _
           "Access URL: http://localhost:" & ServerPort & "/", vbInformation, "OBS File Browser"
    WScript.Quit 0
End If

' 2. Check if Node.js is available (silently, no console flash)
ExitCode = WshShell.Run("cmd /c node -v >nul 2>&1", 0, True)
If ExitCode <> 0 Then
    MsgBox "Node.js was not found in PATH! Please install Node.js from https://nodejs.org/ to run the File Browser.", vbCritical, "OBS File Browser"
    WScript.Quit 1
End If

' 3. Rotate log if larger than 1 MB to keep disk usage bounded
If FSO.FileExists(LogPath) Then
    On Error Resume Next
    If FSO.GetFile(LogPath).Size > 1048576 Then
        FSO.DeleteFile LogPath, True
    End If
    On Error GoTo 0
End If

' 4. Auto-install production dependencies on first run
If Not FSO.FolderExists(CurrentDirectory & "\node_modules") Then
    InstallCode = WshShell.Run("cmd /c npm install --omit=dev --no-audit --no-fund >> """ & LogPath & """ 2>&1", 0, True)
    If InstallCode <> 0 Then
        MsgBox "Failed to install Node dependencies (npm install exited with code " & InstallCode & ")." & vbCrLf & _
               "Check server.log for details.", vbCritical, "OBS File Browser"
        WScript.Quit 1
    End If
End If

' 5. Start node server.js silently with output logged
WshShell.Run "cmd /c node server.js >> """ & LogPath & """ 2>&1", 0, False

' 6. Verify the server actually started and responds
IsOnline = False
For Attempt = 1 To 20
    WScript.Sleep 300
    If ProbeServer(ServerPort) Then
        IsOnline = True
        Exit For
    End If
Next

If IsOnline Then
    MsgBox "OBS File Browser Server is running in the background on port " & ServerPort & "." & vbCrLf & _
           "Access URL: http://localhost:" & ServerPort & "/" & vbCrLf & vbCrLf & _
           "To stop the service, terminate the 'node.exe' process running server.js in Task Manager.", vbInformation, "OBS File Browser Running"
Else
    MsgBox "OBS File Browser Server failed to respond on port " & ServerPort & " within 6 seconds." & vbCrLf & _
           "Please check server.log in this folder for error details.", vbCritical, "OBS File Browser Startup Failed"
    WScript.Quit 1
End If
