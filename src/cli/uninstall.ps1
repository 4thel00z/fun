# This script will remove the Fun installation at the location of this
# script, removing it from %PATH%, deleting caches, and removing it from
# the list of installed programs.
param(
  [switch]$PauseOnError = $false
)

$ErrorActionPreference = "Stop"

# These two environment functions are roughly copied from https://github.com/prefix-dev/pixi/pull/692
# They are used instead of `SetEnvironmentVariable` because of unwanted variable expansions.
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
}

function Get-Env {
  param([String] $Key)

  $RegisterKey = Get-Item -Path 'HKCU:'
  $EnvRegisterKey = $RegisterKey.OpenSubKey('Environment')
  $EnvRegisterKey.GetValue($Key, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
}

if (-not (Test-Path "${PSScriptRoot}\bin\fun.exe")) {
  Write-Host "fun.exe not found in ${PSScriptRoot}\bin`n`nRefusing to delete this directory as it may.`n`nIf this uninstallation is still intentional, please just manually delete this folder."
  if ($PauseOnError) { pause }
  exit 1
}

function Stop-Fun {
  try {
    Get-Process -Name fun | Where-Object { $_.Path -eq "${PSScriptRoot}\bin\fun.exe" } | Stop-Process -Force
  } catch [Microsoft.PowerShell.Commands.ProcessCommandException] {
    # ignore
  } catch {
    Write-Host "There are open instances of fun.exe that could not be automatically closed."
    if ($PauseOnError) { pause }
    exit 1
  }
}

# Remove ~\.fun\bin\fun.exe
try {
  Stop-Fun
  Remove-Item "${PSScriptRoot}\bin\fun.exe" -Force
} catch {
  # Try a second time
  Stop-Fun
  Start-Sleep -Seconds 1
  try {
    Remove-Item "${PSScriptRoot}\bin\fun.exe" -Force
  } catch {
    Write-Host $_
    Write-Host "`n`nCould not delete ${PSScriptRoot}\bin\fun.exe."
    Write-Host "Please close all instances of fun.exe and try again."
    if ($PauseOnError) { pause }
    exit 1
  }
}

# Remove ~\.fun
try {
  Remove-Item "${PSScriptRoot}" -Recurse -Force
} catch {
  Write-Host "Could not delete ${PSScriptRoot}."
  if ($PauseOnError) { pause }
  exit 1
}

# Delete some tempdir files. Do not fail if an error happens here
try {
  Remove-Item "${Temp}\fun-*" -Recurse -Force
} catch {}
try {
  Remove-Item "${Temp}\funx-*" -Recurse -Force
} catch {}

# Remove Entry from path
try {
  $Path = Get-Env -Key 'Path'
  $Path = $Path -split ';'
  $Path = $Path | Where-Object { $_ -ne "${PSScriptRoot}\bin" }
  Write-Env -Key 'Path' -Value ($Path -join ';')
} catch  {
  Write-Host "Could not remove ${PSScriptRoot}\bin from PATH."
  Write-Error $_
  if ($PauseOnError) { pause }
  exit 1
}

# Remove Entry from Windows Installer, if it is owned by this installation.
try {
  $item = Get-Item "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Fun";
  $location = $item.GetValue("InstallLocation");
  if ($location -eq "${PSScriptRoot}") {
    Remove-Item "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Fun" -Recurse
  }
} catch {
  # unlucky tbh
}
