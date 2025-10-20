$signtoolPath = Get-Command "signtool.exe" -ErrorAction SilentlyContinue
if (!$signtoolPath) {
    Write-Host "signtool.exe not found in PATH, searching in Windows SDK..."
    
    $sdkBasePath = "C:\Program Files (x86)\Windows Kits\10\bin"
    
    if (Test-Path $sdkBasePath) {
        $latestSDK = Get-ChildItem $sdkBasePath -Directory | 
                    Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' } | 
                    Sort-Object Name -Descending | 
                    Select-Object -First 1
        
        if ($latestSDK) {
            $signtoolFullPath = Join-Path $latestSDK.FullName "x64\signtool.exe"
            
            if (Test-Path $signtoolFullPath) {
                Write-Host "Found signtool.exe at: $signtoolFullPath"
                $signtoolPath = Get-Command $signtoolFullPath
            }
        }
    }
    
    if (!$signtoolPath) {
        Write-Error "ERROR: signtool.exe not found!"
        Write-Host "Please install Windows 10 SDK from: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/"
        exit 1
    }
}

$msixFile = "deploy\Huly-windows-0.6.0.msix"

& $signtoolPath sign /f DebugCertificate.pfx /p poiuytrewq0987654321POIUYTREWQ /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 $msixFile
& $signtoolPath verify /pa $msixFile
