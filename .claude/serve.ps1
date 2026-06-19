# Minimal HTTP file server for static testing
param([int]$Port = 8765, [string]$Root = $PWD)
[System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root at http://localhost:$Port/"
$mime = @{
  '.html'='text/html; charset=utf-8'; '.htm'='text/html; charset=utf-8';
  '.css'='text/css; charset=utf-8';
  '.js'='application/javascript; charset=utf-8';
  '.mjs'='application/javascript; charset=utf-8';
  '.json'='application/json; charset=utf-8';
  '.svg'='image/svg+xml';
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg';
  '.gif'='image/gif'; '.ico'='image/x-icon';
  '.txt'='text/plain; charset=utf-8';
  '.wasm'='application/wasm'; '.map'='application/json';
}
try {
  while ($listener.IsListening) {
    try {
      $ctx = $listener.GetContext()
    } catch { continue }
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $res.Headers.Add('Access-Control-Allow-Origin','*')
      $path = [System.Uri]::UnescapeDataString($req.Url.LocalPath)
      if ($path -eq '/') { $path = '/index.html' }
      $rel = $path.TrimStart('/').Replace('/','\')
      $file = Join-Path $Root $rel
      if (Test-Path -LiteralPath $file -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($file).ToLower()
        $ct = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $res.StatusCode = 200
        $res.ContentType = $ct
        $res.SendChunked = $true
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404: $path")
        $res.SendChunked = $true
        $res.OutputStream.Write($msg, 0, $msg.Length)
      }
    } catch {
      Write-Host "ERR: $($_.Exception.Message)"
    } finally {
      try { $res.OutputStream.Close() } catch {}
      try { $res.Close() } catch {}
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
