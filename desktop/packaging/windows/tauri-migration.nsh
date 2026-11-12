; Moves an install of the Tauri app (NextAI Translator 0.x, tauri-cli 2.8
; NSIS template, currentUser mode) onto the Go app. mygo.json includes this
; file as windows.installerInclude: MyGo's installer runs customInit in
; .onInit and customInstall at the end of its install section.
;
; How Tauri's updater runs this installer (tauri-plugin-updater 2.9.0,
; src/updater.rs, Update::install_inner for Windows): it saves the setup.exe
; named by latest.json, ShellExecutes it with
;   /P /R /UPDATE /ARGS <the app's arguments>
; ("installMode": "passive" in tauri.conf.json; /S instead of /P for
; "quiet") and exits at once. It neither waits for the installer nor starts
; the app again: the installer must do that.
;
; Tauri's installer put the app in $LOCALAPPDATA\NextAI Translator:
;   app.exe            the main binary (MainBinaryName in its uninstall key)
;   uninstall.exe
;   resources\...      the files of src-tauri/resources
; with the keys
;   HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\NextAI Translator
;   HKCU\Software\yetone\NextAI Translator           (default value: the folder)
; the shortcuts $SMPROGRAMS\NextAI Translator.lnk and (optionally)
; $DESKTOP\NextAI Translator.lnk, and, when autostart is on
; (tauri-plugin-autostart), the value "NextAI Translator" of
; HKCU\Software\Microsoft\Windows\CurrentVersion\Run.
;
; The Go app installs into that same folder, so that the folder a user
; knows stays the app's, removes the Tauri files and keys, and carries
; over the shortcuts and the start at login. It never runs Tauri's
; uninstall.exe: that one deletes the Start menu shortcut and the Run value
; the Go app keeps, and removes the shared folder.
;
; The app's data is not in that folder: the Tauri app keeps it in
; %APPDATA%\xyz.yetone.apps.openai-translator (config.json) and
; %LOCALAPPDATA%\xyz.yetone.apps.openai-translator (WebView2 profile), which
; this leaves alone.

!include "LogicLib.nsh"
!include "FileFunc.nsh"

!define TAURI_UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\NextAI Translator"
!define TAURI_PRODUCTKEY "Software\yetone\NextAI Translator"
!define TAURI_RUN_VALUE "NextAI Translator"
; MyGo's own keys and names, from mygo.json: the uninstall key and the Run
; value are named after "identifier", the executable after "name".
!define GO_UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\xyz.yetone.apps.openai-translator"
!define GO_RUN_VALUE "xyz.yetone.apps.openai-translator"
!define GO_EXE "NextAI Translator.exe"
; mygo/login.go: the argument of the Run entry of App.SetOpenAtLogin.
!define GO_LOGIN_ARG "--mygo-opened-at-login"
!define RUN_KEY "Software\Microsoft\Windows\CurrentVersion\Run"
!define APPROVED_RUN_KEY "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run"

Var TauriDir      ; the folder of the Tauri app, "" when there is none
Var TauriExe      ; its main binary, as app.exe
Var RelaunchAfter ; 1 when Tauri's updater passed /R

; TauriDetect sets $TauriDir and $TauriExe from the keys of Tauri's
; installer.
Function TauriDetect
  Push $0
  Push $1
  StrCpy $TauriDir ""
  StrCpy $TauriExe ""
  ReadRegStr $0 HKCU "${TAURI_UNINSTKEY}" "UninstallString"
  ${If} $0 != ""
    ; Tauri writes the folder plain under its product key, and quoted as
    ; InstallLocation.
    ReadRegStr $0 HKCU "${TAURI_PRODUCTKEY}" ""
    ${If} $0 == ""
      ReadRegStr $0 HKCU "${TAURI_UNINSTKEY}" "InstallLocation"
      StrCpy $1 $0 1
      ${If} $1 == '"'
        StrCpy $0 $0 "" 1
        StrCpy $0 $0 -1
      ${EndIf}
    ${EndIf}
    ${If} $0 == ""
      StrCpy $0 "$LOCALAPPDATA\NextAI Translator"
    ${EndIf}
    ReadRegStr $1 HKCU "${TAURI_UNINSTKEY}" "MainBinaryName"
    ${If} $1 == ""
      StrCpy $1 "app.exe"
    ${EndIf}
    StrCpy $TauriDir $0
    StrCpy $TauriExe $1
  ${EndIf}
  Pop $1
  Pop $0
FunctionEnd

!macro customInit
  Push $0
  Push $1
  ${GetParameters} $0
  ; Tauri's updater asks for a passive install (/P) of an update (/UPDATE):
  ; the user already chose to update, so this one asks nothing either.
  ClearErrors
  ${GetOptions} $0 "/UPDATE" $1
  ${IfNot} ${Errors}
    SetSilent silent
  ${EndIf}
  ClearErrors
  ${GetOptions} $0 "/P" $1
  ${IfNot} ${Errors}
    SetSilent silent
  ${EndIf}
  StrCpy $RelaunchAfter 0
  ClearErrors
  ${GetOptions} $0 "/R" $1
  ${IfNot} ${Errors}
    StrCpy $RelaunchAfter 1
  ${EndIf}
  ClearErrors

  Call TauriDetect
  ; Install where the Tauri app is, unless the Go app is installed already
  ; (its InstallLocation, which InstallDirRegKey read into $INSTDIR).
  ${If} $TauriDir != ""
    ReadRegStr $1 HKCU "${GO_UNINSTKEY}" "InstallLocation"
    ${If} $1 == ""
      StrCpy $INSTDIR $TauriDir
    ${EndIf}
  ${EndIf}
  Pop $1
  Pop $0
!macroend

; TauriDeleteExe deletes the Tauri app's binary, trying again for 10 s
; while the process that ran the updater exits, and else at the next
; reboot.
Function TauriDeleteExe
  Push $0
  StrCpy $0 100
  retry:
    ClearErrors
    Delete "$TauriDir\$TauriExe"
    IfErrors 0 done
    IntOp $0 $0 - 1
    IntCmp $0 0 later
    Sleep 100
    Goto retry
  later:
    Delete /REBOOTOK "$TauriDir\$TauriExe"
  done:
  ClearErrors
  Pop $0
FunctionEnd

Function TauriCleanup
  Push $0
  ${If} $TauriExe != "${GO_EXE}"
    Call TauriDeleteExe
  ${EndIf}
  ; The Go app's files never include a resources folder: MyGo copies the
  ; entries of desktop/resources next to the executable.
  RMDir /r "$TauriDir\resources"
  ; Uninstall.exe is the Go app's own when both share the folder (file
  ; names are case-insensitive).
  ${If} $TauriDir != $INSTDIR
    Delete "$TauriDir\uninstall.exe"
    RMDir "$TauriDir"
  ${EndIf}

  DeleteRegKey HKCU "${TAURI_UNINSTKEY}"
  DeleteRegKey HKCU "${TAURI_PRODUCTKEY}"
  DeleteRegKey /ifempty HKCU "Software\yetone"

  ; The Start menu shortcut has the same name, which MyGo's install section
  ; made again for the new executable. The others only change target.
  SetOutPath "$INSTDIR"
  ${If} ${FileExists} "$DESKTOP\NextAI Translator.lnk"
    CreateShortCut "$DESKTOP\NextAI Translator.lnk" "$INSTDIR\${GO_EXE}"
  ${EndIf}
  ${If} ${FileExists} "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\NextAI Translator.lnk"
    CreateShortCut "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\NextAI Translator.lnk" "$INSTDIR\${GO_EXE}"
  ${EndIf}

  ; Start at login: the Go app's entry (App.SetOpenAtLogin) is named after
  ; the identifier, Tauri's after the product.
  ReadRegStr $0 HKCU "${RUN_KEY}" "${TAURI_RUN_VALUE}"
  ${If} $0 != ""
    WriteRegStr HKCU "${RUN_KEY}" "${GO_RUN_VALUE}" '"$INSTDIR\${GO_EXE}" ${GO_LOGIN_ARG}'
    DeleteRegValue HKCU "${RUN_KEY}" "${TAURI_RUN_VALUE}"
    DeleteRegValue HKCU "${APPROVED_RUN_KEY}" "${TAURI_RUN_VALUE}"
  ${EndIf}
  ClearErrors
  Pop $0
FunctionEnd

!macro customInstall
  ${If} $TauriDir != ""
    Call TauriCleanup
  ${EndIf}
!macroend

; MyGo's uninstaller leaves the start at login entry, which TauriCleanup or
; App.SetOpenAtLogin wrote, pointing at the executable it deletes.
!macro customUnInstall
  DeleteRegValue HKCU "${RUN_KEY}" "${GO_RUN_VALUE}"
  DeleteRegValue HKCU "${APPROVED_RUN_KEY}" "${GO_RUN_VALUE}"
  ClearErrors
!macroend

; Tauri's updater passes /R for the installer to start the app again, as
; Tauri's own installer does in .onInstSuccess. MyGo's installer defines no
; .onInstSuccess; its finish page offers to run the app, but a silent
; install shows none.
Function .onInstSuccess
  ${If} $RelaunchAfter == 1
  ${AndIf} ${Silent}
    Exec '"$INSTDIR\${GO_EXE}"'
  ${EndIf}
FunctionEnd
