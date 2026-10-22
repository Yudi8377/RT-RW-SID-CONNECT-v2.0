#define AppName "RT/RW-SID-CONNECT Windows Launcher"
#define AppVersion "2.0.1"
#define AppPublisher "RT/RW-SID-CONNECT"
#define AppURL "https://yudi8377.github.io/RT-RW-SID-CONNECT-v2.0/"
#define AppExeName "RT-RW-SID-CONNECT.cmd"

[Setup]
AppId={{C1E7C8B2-1A2A-4D6A-9B2A-7A2D0C4B2020}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
DefaultDirName={localappdata}\Programs\RT-RW-SID-CONNECT
DefaultGroupName=RT-RW-SID-CONNECT
OutputDir=output
OutputBaseFilename=RT-RW-SID-CONNECT-Windows-Launcher-v2.0.1
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
UninstallDisplayName=RT/RW-SID-CONNECT Windows Launcher v2.0.1
DisableProgramGroupPage=yes
Uninstallable=yes

[Files]
Source: "RT-RW-SID-CONNECT.cmd"; DestDir: "{app}"; Flags: ignoreversion
Source: "README-INSTALLER.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\RT-RW-SID-CONNECT"; Filename: "{app}\RT-RW-SID-CONNECT.cmd"; WorkingDir: "{app}"
Name: "{group}\RT-RW-SID-CONNECT"; Filename: "{app}\RT-RW-SID-CONNECT.cmd"; WorkingDir: "{app}"

[Run]
Filename: "{app}\RT-RW-SID-CONNECT.cmd"; Description: "Buka RT/RW-SID CONNECT"; Flags: postinstall nowait skipifsilent
