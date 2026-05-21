#!/usr/bin/env pwsh
param(
  [String]$Version = "latest",
  # Forces installing the baseline build regardless of what CPU you are actually using.
  [Switch]$ForceBaseline = $false,
  # Skips adding the fun.exe directory to the user's %PATH%
  [Switch]$NoPathUpdate = $false,
  # Skips adding the fun to the list of installed programs
  [Switch]$NoRegisterInstallation = $false,
  # Skips installing powershell completions to your profile
  [Switch]$NoCompletions = $false,

  # Debugging: Always download with 'Invoke-RestMethod' instead of 'curl.exe'
  [Switch]$DownloadWithoutCurl = $false
);

# Detect real CPU architecture from registry — works even under x64 emulation on ARM64.
# Win32_ComputerSystem.SystemType can be unreliable under WoW64.
$Arch = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment').PROCESSOR_ARCHITECTURE
if (-not ($Arch -eq "AMD64" -or $Arch -eq "ARM64")) {
  Write-Output "Install Failed:"
  Write-Output "Fun for Windows is only available for x86 64-bit and ARM64 Windows.`n"
  return 1
}

# This corresponds to .win10_rs5 in build.zig
$MinBuild = 17763;
$MinBuildName = "Windows 10 1809 / Windows Server 2019"

$WinVer = [System.Environment]::OSVersion.Version
if ($WinVer.Major -lt 10 -or ($WinVer.Major -eq 10 -and $WinVer.Build -lt $MinBuild)) {
  Write-Warning "Fun requires at ${MinBuildName} or newer.`n`nThe install will still continue but it may not work.`n"
  return 1
}

$ErrorActionPreference = "Stop"

# These three environment functions are roughly copied from https://github.com/prefix-dev/pixi/pull/692
# They are used instead of `SetEnvironmentVariable` because of unwanted variable expansions.
function Publish-Env {
  if (-not ("Win32.NativeMethods" -as [Type])) {
    Add-Type -Namespace Win32 -Name NativeMethods -MemberDefinition @"
[DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
public static extern IntPtr SendMessageTimeout(
    IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
    uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
"@
  }
  $HWND_BROADCAST = [IntPtr] 0xffff
  $WM_SETTINGCHANGE = 0x1a
  $result = [UIntPtr]::Zero
  [Win32.NativeMethods]::SendMessageTimeout($HWND_BROADCAST,
    $WM_SETTINGCHANGE,
    [UIntPtr]::Zero,
    "Environment",
    2,
    5000,
    [ref] $result
  ) | Out-Null
}

function Write-Env {
  param([String]$Key, [String]$Value)

  $RegisterKey = Get-Item -Path 'HKCU:'

  $EnvRegisterKey = $RegisterKey.OpenSubKey('Environment', $true)
  if ($null -eq $Value) {
    $EnvRegisterKey.DeleteValue($Key)
  } else {
    $RegistryValueKind = if ($Value.Contains('%')) {
      [Microsoft.Win32.RegistryValueKind]::ExpandString
    } elseif ($EnvRegisterKey.GetValue($Key)) {
      $EnvRegisterKey.GetValueKind($Key)
    } else {
      [Microsoft.Win32.RegistryValueKind]::String
    }
    $EnvRegisterKey.SetValue($Key, $Value, $RegistryValueKind)
  }

  Publish-Env
}

function Get-Env {
  param([String] $Key)

  $RegisterKey = Get-Item -Path 'HKCU:'
  $EnvRegisterKey = $RegisterKey.OpenSubKey('Environment')
  $EnvRegisterKey.GetValue($Key, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
}

# The installation of fun is it's own function so that in the unlikely case the $IsBaseline check fails, we can do a recursive call.
# There are also lots of sanity checks out of fear of anti-virus software or other weird Windows things happening.
function Install-Fun {
  param(
    [string]$Version,
    [bool]$ForceBaseline = $False
  );

  # if a semver is given, we need to adjust it to this format: fun-v0.0.0
  if ($Version -match "^\d+\.\d+\.\d+$") {
    $Version = "fun-v$Version"
  }
  elseif ($Version -match "^v\d+\.\d+\.\d+$") {
    $Version = "fun-$Version"
  }

  $IsARM64 = $Arch -eq "ARM64"
  $FunArch = if ($IsARM64) { "aarch64" } else { "x64" }
  $IsBaseline = $false
  if (-not $IsARM64) {
    $IsBaseline = $ForceBaseline
    if (!$IsBaseline) {
      $IsBaseline = !( `
        Add-Type -MemberDefinition '[DllImport("kernel32.dll")] public static extern bool IsProcessorFeaturePresent(int ProcessorFeature);' `
          -Name 'Kernel32' -Namespace 'Win32' -PassThru `
      )::IsProcessorFeaturePresent(40);
    }
  }

  $FunRoot = if ($env:FUN_INSTALL) { $env:FUN_INSTALL } else { "${Home}\.fun" }
  $FunBin = mkdir -Force "${FunRoot}\bin"

  try {
    Remove-Item "${FunBin}\fun.exe" -Force
  } catch [System.Management.Automation.ItemNotFoundException] {
    # ignore
  } catch [System.UnauthorizedAccessException] {
    $openProcesses = Get-Process -Name fun | Where-Object { $_.Path -eq "${FunBin}\fun.exe" }
    if ($openProcesses.Count -gt 0) {
      Write-Output "Install Failed - An older installation exists and is open. Please close open Fun processes and try again."
      return 1
    }
    Write-Output "Install Failed - An unknown error occurred while trying to remove the existing installation"
    Write-Output $_
    return 1
  } catch {
    Write-Output "Install Failed - An unknown error occurred while trying to remove the existing installation"
    Write-Output $_
    return 1
  }

  $Target = "fun-windows-$FunArch"
  if ($IsBaseline) {
    $Target = "fun-windows-$FunArch-baseline"
  }
  $BaseURL = "https://github.com/underdoc-org/fun/releases"
  $URL = "$BaseURL/$(if ($Version -eq "latest") { "latest/download" } else { "download/$Version" })/$Target.zip"

  $ZipPath = "${FunBin}\$Target.zip"

  $DisplayVersion = $(
    if ($Version -eq "latest") { "Fun" }
    elseif ($Version -eq "canary") { "Fun Canary" }
    elseif ($Version -match "^fun-v\d+\.\d+\.\d+$") { "Fun $($Version.Substring(4))" }
    else { "Fun tag='${Version}'" }
  )

  $null = mkdir -Force $FunBin
  Remove-Item -Force $ZipPath -ErrorAction SilentlyContinue

  # curl.exe is faster than PowerShell 5's 'Invoke-WebRequest'
  # note: 'curl' is an alias to 'Invoke-WebRequest'. so the exe suffix is required
  if (-not $DownloadWithoutCurl) {
    curl.exe "-#SfLo" "$ZipPath" "$URL" 
  }
  if ($DownloadWithoutCurl -or ($LASTEXITCODE -ne 0)) {
    Write-Warning "The command 'curl.exe $URL -o $ZipPath' exited with code ${LASTEXITCODE}`nTrying an alternative download method..."
    try {
      # Use Invoke-RestMethod instead of Invoke-WebRequest because Invoke-WebRequest breaks on
      # some machines, see 
      Invoke-RestMethod -Uri $URL -OutFile $ZipPath
    } catch {
      Write-Output "Install Failed - could not download $URL"
      Write-Output "The command 'Invoke-RestMethod $URL -OutFile $ZipPath' exited with code ${LASTEXITCODE}`n"
      return 1
    }
  }

  if (!(Test-Path $ZipPath)) {
    Write-Output "Install Failed - could not download $URL"
    Write-Output "The file '$ZipPath' does not exist. Did an antivirus delete it?`n"
    return 1
  }

  try {
    $lastProgressPreference = $global:ProgressPreference
    $global:ProgressPreference = 'SilentlyContinue';
    Expand-Archive "$ZipPath" "$FunBin" -Force
    $global:ProgressPreference = $lastProgressPreference
    if (!(Test-Path "${FunBin}\$Target\fun.exe")) {
      throw "The file '${FunBin}\$Target\fun.exe' does not exist. Download is corrupt or intercepted Antivirus?`n"
    }
  } catch {
    Write-Output "Install Failed - could not unzip $ZipPath"
    Write-Error $_
    return 1
  }

  Move-Item "${FunBin}\$Target\fun.exe" "${FunBin}\fun.exe" -Force

  Remove-Item "${FunBin}\$Target" -Recurse -Force
  Remove-Item $ZipPath -Force

  $FunRevision = "$(& "${FunBin}\fun.exe" --revision)"
  if ($LASTEXITCODE -eq 1073741795) { # STATUS_ILLEGAL_INSTRUCTION
    if ($IsBaseline) {
      Write-Output "Install Failed - fun.exe (baseline) is not compatible with your CPU.`n"
      Write-Output "Please open a GitHub issue with your CPU model:`nhttps://github.com/underdoc-org/fun/issues/new/choose`n"
      return 1
    }

    Write-Output "Install Failed - fun.exe is not compatible with your CPU. This should have been detected before downloading.`n"
    Write-Output "Attempting to download fun.exe (baseline) instead.`n"

    Install-Fun -Version $Version -ForceBaseline $True
    return 1
  }
  # '-1073741515' was spotted in the wild, but not clearly documented as a status code:
  # https://discord.com/channels/876711213126520882/1149339379446325248/1205194965383250081
  # http://community.sqlbackupandftp.com/t/error-1073741515-solved/1305
  if (($LASTEXITCODE -eq 3221225781) -or ($LASTEXITCODE -eq -1073741515)) # STATUS_DLL_NOT_FOUND
  { 
    # TODO: as of July 2024, Fun has no external dependencies.
    # I want to keep this error message in for a few months to ensure that
    # if someone somehow runs into this, it can be reported.
    Write-Output "Install Failed - You are missing a DLL required to run fun.exe"
    $VCRedistUrl = if ($IsARM64) { "https://aka.ms/vs/17/release/vc_redist.arm64.exe" } else { "https://aka.ms/vs/17/release/vc_redist.x64.exe" }
    Write-Output "This can be solved by installing the Visual C++ Redistributable from Microsoft:`nSee https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist`nDirect Download -> ${VCRedistUrl}`n`n"
    Write-Output "The error above should be unreachable as Fun does not depend on this library. Please comment in https://github.com/underdoc-org/fun/issues/8598 or open a new issue.`n`n"
    Write-Output "The command '${FunBin}\fun.exe --revision' exited with code ${LASTEXITCODE}`n"
    return 1
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Output "Install Failed - could not verify fun.exe"
    Write-Output "The command '${FunBin}\fun.exe --revision' exited with code ${LASTEXITCODE}`n"
    return 1
  }

  try {
    $env:IS_FUN_AUTO_UPDATE = "1"
    # TODO: When powershell completions are added, make this switch actually do something
    if ($NoCompletions) {
      $env:FUN_NO_INSTALL_COMPLETIONS = "1"
    }
    # This completions script in general will install some extra stuff, mainly the `funx` link.
    # It also installs completions.
    $output = "$(& "${FunBin}\fun.exe" completions 2>&1)"
    if ($LASTEXITCODE -ne 0) {
      Write-Output $output
      Write-Output "Install Failed - could not finalize installation"
      Write-Output "The command '${FunBin}\fun.exe completions' exited with code ${LASTEXITCODE}`n"
      return 1
    }
  } catch {
    # it is possible on powershell 5 that an error happens, but it is probably fine?
  }
  $env:IS_FUN_AUTO_UPDATE = $null
  $env:FUN_NO_INSTALL_COMPLETIONS = $null

  $DisplayVersion = if ($FunRevision -like "*-canary.*") {
    "${FunRevision}"
  } else {
    "$(& "${FunBin}\fun.exe" --version)"
  }

  $C_RESET = [char]27 + "[0m"
  $C_GREEN = [char]27 + "[1;32m"

  Write-Output "${C_GREEN}Fun ${DisplayVersion} was installed successfully!${C_RESET}"
  Write-Output "The binary is located at ${FunBin}\fun.exe`n"

  $hasExistingOther = $false;
  try {
    $existing = Get-Command fun -ErrorAction
    if ($existing.Source -ne "${FunBin}\fun.exe") {
      Write-Warning "Note: Another fun.exe is already in %PATH% at $($existing.Source)`nTyping 'fun' in your terminal will not use what was just installed.`n"
      $hasExistingOther = $true;
    }
  } catch {}

  if (-not $NoRegisterInstallation) {
    $rootKey = $null
    try {
      $RegistryKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Fun"  
      $rootKey = New-Item -Path $RegistryKey -Force
      New-ItemProperty -Path $RegistryKey -Name "DisplayName" -Value "Fun" -PropertyType String -Force | Out-Null
      New-ItemProperty -Path $RegistryKey -Name "InstallLocation" -Value "${FunRoot}" -PropertyType String -Force | Out-Null
      New-ItemProperty -Path $RegistryKey -Name "DisplayIcon" -Value $FunBin\fun.exe -PropertyType String -Force | Out-Null
      New-ItemProperty -Path $RegistryKey -Name "UninstallString" -Value "powershell -c `"& `'$FunRoot\uninstall.ps1`' -PauseOnError`" -ExecutionPolicy Bypass" -PropertyType String -Force | Out-Null
    } catch {
      if ($rootKey -ne $null) {
        Remove-Item -Path $RegistryKey -Force
      }
    }
  }

  if(!$hasExistingOther) {
    # Only try adding to path if there isn't already a fun.exe in the path
    $Path = (Get-Env -Key "Path") -split ';'
    if ($Path -notcontains $FunBin) {
      if (-not $NoPathUpdate) {
        $Path += $FunBin
        Write-Env -Key 'Path' -Value ($Path -join ';')
        $env:PATH = $Path -join ';'
      } else {
        Write-Output "Skipping adding '${FunBin}' to the user's %PATH%`n"
      }
    }

    Write-Output "To get started, restart your terminal/editor, then type `"fun`"`n"
  }

  $LASTEXITCODE = 0;
}

Install-Fun -Version $Version -ForceBaseline $ForceBaseline
