param(
  [ValidateRange(1, 65535)]
  [int]$Port = 8080
)

$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "."))
$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".webp" = "image/webp"
  ".svg"  = "image/svg+xml"
  ".fbx"  = "application/octet-stream"
  ".mp3"  = "audio/mpeg"
}

function Get-SafeFilePath {
  param([string]$requestPath)

  $relativePath = [System.Uri]::UnescapeDataString($requestPath.TrimStart('/'))
  if ([string]::IsNullOrWhiteSpace($relativePath)) {
    $relativePath = "index.html"
  }

  $candidate = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))
  if (-not $candidate.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }
  return $candidate
}

function Write-Response {
  param(
    [Parameter(Mandatory = $true)]$Context,
    [int]$StatusCode,
    [byte[]]$Body = @(),
    [string]$ContentType = "text/plain; charset=utf-8"
  )

  $Context.Response.StatusCode = $StatusCode
  $Context.Response.ContentType = $ContentType
  $Context.Response.ContentLength64 = $Body.Length
  if ($Body.Length -gt 0) {
    $Context.Response.OutputStream.Write($Body, 0, $Body.Length)
  }
}

function Serve-Request {
  param([Parameter(Mandatory = $true)]$Context)

  try {
    $filePath = Get-SafeFilePath -requestPath $Context.Request.Url.LocalPath
    if (-not $filePath) {
      $body = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
      Write-Response -Context $Context -StatusCode 403 -Body $body
      return
    }

    if (-not (Test-Path $filePath -PathType Leaf)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
      Write-Response -Context $Context -StatusCode 404 -Body $body
      return
    }

    $ext = ([System.IO.Path]::GetExtension($filePath)).ToLowerInvariant()
    $mime = $mimeTypes[$ext]
    if (-not $mime) {
      $mime = "application/octet-stream"
    }

    $buffer = [System.IO.File]::ReadAllBytes($filePath)
    Write-Response -Context $Context -StatusCode 200 -Body $buffer -ContentType $mime
  } catch {
    $body = [System.Text.Encoding]::UTF8.GetBytes("500 Internal Server Error")
    Write-Response -Context $Context -StatusCode 500 -Body $body
    Write-Warning $_
  } finally {
    try { $Context.Response.Close() } catch {}
  }
}

$prefix = "http://localhost:$Port/"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  Write-Host "Failed to start server at $prefix" -ForegroundColor Red
  Write-Host "Possible reasons: port is already in use, insufficient permission, or another local service is conflicting." -ForegroundColor Yellow
  Write-Host "Try another port, for example: .\server.ps1 -Port 8081" -ForegroundColor Cyan
  throw
}
Write-Host "Server running at $prefix"
Write-Host "Serving root: $root"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    Serve-Request -Context $context
  }
} finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}
