param(
    [string]$Root = ".",
    [int]$Port = 8000,
    [string]$BindHost = "127.0.0.1",
    [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

function Resolve-PythonCommand {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @{
            Command = "python"
            Args = @()
        }
    }
    if (Get-Command py -ErrorAction SilentlyContinue) {
        return @{
            Command = "py"
            Args = @("-3")
        }
    }
    throw "python or py is not found. Please install Python 3."
}

$resolvedRoot = (Resolve-Path $Root).Path
$siteIndexPath = Join-Path $resolvedRoot "site/index.html"
$rootIndexPath = Join-Path $resolvedRoot "index.html"

if (-not (Test-Path $siteIndexPath) -and -not (Test-Path $rootIndexPath)) {
    throw "index.html is not found. Check Root: $resolvedRoot"
}

$primaryPath = if (Test-Path $siteIndexPath) { "/site/index.html" } else { "/index.html" }
$primaryUrl = "http://${BindHost}:$Port$primaryPath"

Write-Host "Serving root: $resolvedRoot"
Write-Host "Primary URL: $primaryUrl"
if (Test-Path $siteIndexPath) {
    Write-Host "Alt URL: http://${BindHost}:$Port/index.html"
}
Write-Host "Press Ctrl + C to stop."

if ($OpenBrowser) {
    Start-Process $primaryUrl | Out-Null
}

$python = Resolve-PythonCommand
$args = @($python.Args + @("-m", "http.server", $Port, "--bind", $BindHost))

Push-Location $resolvedRoot
try {
    & $python.Command @args
}
finally {
    Pop-Location
}
