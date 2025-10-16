#Requires -Version 5.1

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

$appxBuild = $null

try {
    Write-Host "Getting version from show_version.js..."
    $versionOutput = & node "..\common\scripts\show_version.js"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to get version from show_version.js"
    }
    
    $version = $versionOutput -replace '"', ''
    
    Write-Host "========================================"
    Write-Host "Building MSIX package for Huly Desktop"
    Write-Host "Version: $version"
    Write-Host "========================================"
    
    if (!(Test-Path "deploy\win-unpacked")) {
        Write-Error "ERROR: deploy\win-unpacked folder not found!"
        Write-Host "Please build the Windows app first using: rushx dist-mac-win"
        exit 1
    }
    
    $makeappxPath = Get-Command "makeappx.exe" -ErrorAction SilentlyContinue
    if (!$makeappxPath) {
        Write-Error "ERROR: makeappx.exe not found!"
        Write-Host "Please install Windows 10 SDK from: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/"
        exit 1
    }
    
    $appxBuild = "deploy\__appx-build"
    if (Test-Path $appxBuild) {
        Remove-Item $appxBuild -Recurse -Force
    }
    New-Item -ItemType Directory -Path $appxBuild -Force | Out-Null
    
    Write-Host ""
    Write-Host "Step 1: Copying application files..."
    Copy-Item "deploy\win-unpacked\*" -Destination $appxBuild -Recurse -Force
    
    Write-Host "Step 2: Copying manifest and assets..."
    Copy-Item "windows-store-assets\AppxManifest.xml" -Destination "$appxBuild\AppxManifest.xml" -Force
    
    $assetsPath = "$appxBuild\Assets"
    if (!(Test-Path $assetsPath)) {
        New-Item -ItemType Directory -Path $assetsPath -Force | Out-Null
    }
    
    $pngFiles = Get-ChildItem "windows-store-assets\*.png" -ErrorAction SilentlyContinue
    if ($pngFiles) {
        Copy-Item $pngFiles -Destination $assetsPath -Force
    }
    
    Write-Host "Step 3: Updating manifest version..."
    $manifestPath = "$appxBuild\AppxManifest.xml"
    $manifestContent = Get-Content $manifestPath -Raw
    $manifestContent = $manifestContent -replace '(<Identity[^>]*Version=")[0-9.]+(")', "`${1}$version.0`${2}"
    Set-Content -Path $manifestPath -Value $manifestContent -NoNewline
    
    Write-Host "Step 4: Fixing asset paths in manifest..."
    $manifestContent = Get-Content $manifestPath -Raw
    $manifestContent = $manifestContent -replace 'windows_store_assets\\', 'Assets\'
    Set-Content -Path $manifestPath -Value $manifestContent -NoNewline
    
    Write-Host "Step 5: Creating MSIX package..."
    $appxOutput = "deploy\Huly-windows-$version.msix"
    if (Test-Path $appxOutput) {
        Remove-Item $appxOutput -Force
    }
    
    $makeappxArgs = @("pack", "/d", $appxBuild, "/p", $appxOutput, "/overwrite")
    & makeappx.exe $makeappxArgs
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create MSIX package!"
    }
    
    Write-Host ""
    Write-Host "========================================"
    Write-Host "SUCCESS! MSIX package created:"
    Write-Host $appxOutput
    Write-Host "========================================"
    Write-Host ""
    Write-Host "Note: The package is unsigned. To sign it, run:"
    Write-Host "signtool sign /fd SHA256 /a /f YourCertificate.pfx /p YourPassword `"$appxOutput`""
    Write-Host ""
    
} catch {
    Write-Error "Build failed: $_"
    exit 1
} finally {
    if ($null -ne $appxBuild -and (Test-Path $appxBuild)) {
        Remove-Item $appxBuild -Recurse -Force -ErrorAction SilentlyContinue
    }
}
