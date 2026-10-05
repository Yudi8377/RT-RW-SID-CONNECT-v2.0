#define AppName "RT/RW-SID-CONNECT"
#define AppVersion "2.0.1"
#define AppPublisher "RT/RW-SID-CONNECT"
#define AppURL "https://rtrw-sid-connect-v20.hatchable.site"
#define AppExeName "RT-RW-SID-CONNECT.cmd"

[Setup]
AppId={{C1E7C8B2-1A2A-4D6A-9B2A-RT-RW-SID20}}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
DefaultDirName={autopf}\RT-RW-SID-CONNECT
DefaultGroupName=RT/RW-SID-CONNECT
OutputDir=output
OutputBaseFilename=RT-RW-SID-CONNECT-v2.0.1-Windows-Offline-Installer
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
UninstallDisplayName=RT/RW-SID-CONNECT v2.0.1
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes

[Files]
Source: "RT-RW-SID-CONNECT.cmd"; DestDir: "{app}"; Flags: ignoreversion
Source: "README-INSTALLER.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autodesktop}\RT/RW-SID-CONNECT"; Filename: "{app}\RT-RW-SID-CONNECT.cmd"; WorkingDir: "{app}"
Name: "{group}\RT/RW-SID-CONNECT"; Filename: "{app}\RT-RW-SID-CONNECT.cmd"; WorkingDir: "{app}"

[Code]
var
  PlanPage: TInputOptionWizardPage;
  SelectedPlan: String;

procedure InitializeWizard;
begin
  PlanPage := CreateInputOptionPage(wpSelectDir,
    'Pilih Paket Lisensi',
    'Pilih paket yang akan digunakan pada instalasi ini.',
    'Trial 7 Hari adalah paket evaluasi dengan fitur inti terbatas. Pro dan Enterprise memerlukan aktivasi lisensi setelah instalasi.',
    True, False);
  PlanPage.Add('Trial 7 Hari');
  PlanPage.Add('Pro');
  PlanPage.Add('Enterprise');
  PlanPage.SelectedValueIndex := 0;
end;

function BoolToStr(Value: Boolean): String;
begin
  if Value then Result := '1' else Result := '0';
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ConfigPath: String;
  PlanValue: String;
begin
  if CurStep = ssPostInstall then
  begin
    case PlanPage.SelectedValueIndex of
      0: PlanValue := 'trial';
      1: PlanValue := 'pro';
      2: PlanValue := 'enterprise';
    end;

    ConfigPath := ExpandConstant('{app}\license.ini');
    SaveStringToFile(ConfigPath,
      '[license]' + #13#10 +
      'PLAN=' + PlanValue + #13#10 +
      'STATUS=' + IIf(PlanValue = 'trial', 'active', 'pending_activation') + #13#10 +
      'PRODUCT_VERSION={#AppVersion}' + #13#10 +
      'APP_URL={#AppURL}' + #13#10,
      False);
  end;
end;

function IIf(Condition: Boolean; TruePart, FalsePart: String): String;
begin
  if Condition then Result := TruePart else Result := FalsePart;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = PlanPage.ID then
  begin
    SelectedPlan := '';
    case PlanPage.SelectedValueIndex of
      0: SelectedPlan := 'Trial 7 Hari';
      1: SelectedPlan := 'Pro';
      2: SelectedPlan := 'Enterprise';
    end;
  end;
end;
