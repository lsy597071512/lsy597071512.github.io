$root = "e:\AIgame\game\game"
$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "application/javascript"
  ".css"  = "text/css"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".fbx"  = "application/octet-stream"
  ".mp3"  = "audio/mpeg"
}

function ServeFile($ctx) {
    try {
        $path = $ctx.Request.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        $filePath = Join-Path $root $path.Substring(1)
        $ext = ([System.IO.Path]::GetExtension($filePath)).ToLower()
        $mime = $mimeTypes[$ext]
        if (-not $mime) { $mime = "application/octet-stream" }
        if (Test-Path $filePath -PathType Leaf) {
            $buf = [System.IO.File]::ReadAllBytes($filePath)
            $ctx.Response.ContentLength64 = $buf.Length
            $ctx.Response.ContentType = $mime
            $ctx.Response.OutputStream.Write($buf, 0, $buf.Length)
        } else {
            $ctx.Response.StatusCode = 404
        }
    } catch {} finally { 
        try { $ctx.Response.Close() } catch {} 
    }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Host "Server running at http://localhost:8080/"

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    Start-Job -ScriptBlock {
        param($ctxParam, $rootParam, $mimeTypesParam)
        [System.Reflection.Assembly]::LoadWithPartialName("System.Net") | Out-Null
        try {
            $path = $ctxParam.Request.Url.LocalPath
            if ($path -eq "/") { $path = "/index.html" }
            $filePath = Join-Path $rootParam $path.Substring(1)
            $ext = ([System.IO.Path]::GetExtension($filePath)).ToLower()
            $mime = $mimeTypesParam[$ext]
            if (-not $mime) { $mime = "application/octet-stream" }
            if (Test-Path $filePath -PathType Leaf) {
                $buf = [System.IO.File]::ReadAllBytes($filePath)
                $ctxParam.Response.ContentLength64 = $buf.Length
                $ctxParam.Response.ContentType = $mime
                $ctxParam.Response.OutputStream.Write($buf, 0, $buf.Length)
            } else {
                $ctxParam.Response.StatusCode = 404
            }
        } catch {} finally {
            try { $ctxParam.Response.Close() } catch {}
        }
    } -ArgumentList $ctx, $root, $mimeTypes | Out-Null
}
