# Zero-Dependency Native PowerShell SEBI Hardware DSC Bridge
param(
  [int]$Port = 1620
)

$ErrorActionPreference = 'SilentlyContinue'

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:${Port}/")
$listener.Prefixes.Add("http://localhost:${Port}/")

try {
  $listener.Start()
  Write-Host "==========================================================" -ForegroundColor Green
  Write-Host "  SEBI Hardware DSC Bridge (Native PowerShell)" -ForegroundColor Green
  Write-Host "  URL: http://127.0.0.1:${Port}" -ForegroundColor Green
  Write-Host "  Zero external dependencies. Works on every Windows PC." -ForegroundColor Green
  Write-Host "==========================================================" -ForegroundColor Green
} catch {
  Write-Host "Error starting listener on port ${Port}: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

function Set-CorsHeaders($response) {
  $response.Headers.Add("Access-Control-Allow-Origin", "*")
  $response.Headers.Add("Access-Control-Allow-Credentials", "true")
  $response.Headers.Add("Access-Control-Allow-Private-Network", "true")
  $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
  $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, x-tenant-id, Access-Control-Request-Private-Network, Sec-Fetch-Mode, Sec-Fetch-Site")
}

function Send-JsonResponse($response, $obj, [int]$statusCode = 200) {
  Set-CorsHeaders $response
  $response.StatusCode = $statusCode
  $response.ContentType = "application/json; charset=utf-8"
  $json = $obj | ConvertTo-Json -Compress -Depth 10
  $json = $json.Replace('"certificates":{}', '"certificates":[]')
  $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
  $response.ContentLength64 = $buffer.Length
  $response.OutputStream.Write($buffer, 0, $buffer.Length)
  $response.OutputStream.Close()
}

function Get-HardwareCerts {
  $now = Get-Date
  $certs = Get-ChildItem Cert:\CurrentUser\My, Cert:\LocalMachine\My -ErrorAction SilentlyContinue | Where-Object { 
    $_.NotAfter -gt $now -and 
    $_.Subject -notmatch 'trust_' -and 
    $_.Subject -notmatch 'CN=[0-9a-fA-F-]{36}' 
  }
  $names = @()
  foreach ($c in $certs) {
    if ($c.Subject -match 'CN=([^,]+)') {
      $name = $Matches[1].Trim()
      if ($names -notcontains $name) { $names += $name }
    }
  }
  return $names
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $path = $request.Url.AbsolutePath.ToLower().TrimEnd('/')
    $method = $request.HttpMethod.ToUpper()

    if ($method -eq 'OPTIONS') {
      Set-CorsHeaders $response
      $response.StatusCode = 204
      $response.OutputStream.Close()
      continue
    }

    if ($path -eq '' -or $path -eq '/ping') {
      $data = [ordered]@{
        status = 'ok'
        service = 'SEBI Hardware DSC Bridge (Native PowerShell)'
        version = '1.0.0'
        port = $Port
        timestamp = (Get-Date).ToString('o')
      }
      Send-JsonResponse $response $data
      continue
    }

    if ($path -eq '/token-status') {
      $certList = Get-HardwareCerts
      $hasDetected = ($certList.Count -gt 0)
      $firstCert = if ($hasDetected) { $certList[0] } else { $null }
      $data = [ordered]@{
        success = $true
        detected = $hasDetected
        certificates = if ($hasDetected) { @($certList) } else { @() }
        detectedSignerName = $firstCert
        smartCardServiceActive = $true
        details = if ($hasDetected) { 'Hardware DSC Token detected via Windows store.' } else { 'No hardware token detected in Windows Personal store.' }
      }
      Send-JsonResponse $response $data
      continue
    }

    if ($path -eq '/sign-pdf' -and $method -eq 'POST') {
      $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
      $bodyText = $reader.ReadToEnd()
      $reader.Close()

      # Forward to Cloud Backend for PDF Stamping
      $cloudUrl = "https://portal.thinkupresearch.com/backend/api/v1/dsc-bridge/sign-pdf"
      try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $headers = @{ "Content-Type" = "application/json" }
        if ($request.Headers["Authorization"]) {
          $headers["Authorization"] = $request.Headers["Authorization"]
        }
        if ($request.Headers["x-tenant-id"]) {
          $headers["x-tenant-id"] = $request.Headers["x-tenant-id"]
        }
        $res = Invoke-RestMethod -Uri $cloudUrl -Method Post -Body $bodyText -Headers $headers -TimeoutSec 15
        Send-JsonResponse $response $res
      } catch {
        $errData = @{
          success = $false
          message = "DSC Sign error: " + $_.Exception.Message
        }
        Send-JsonResponse $response $errData 500
      }
      continue
    }

    # 404 for other endpoints
    $err404 = @{ success = $false; message = "Endpoint not found: $path" }
    Send-JsonResponse $response $err404 404
  }
} finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
}
