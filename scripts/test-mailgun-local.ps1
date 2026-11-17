[CmdletBinding(DefaultParameterSetName = 'Plain')]
param(
  [Parameter(ParameterSetName = 'Synthetic')][switch]$Registration,
  [Parameter(ParameterSetName = 'Queue')][switch]$Queue,
  [Parameter(ParameterSetName = 'Queue')][switch]$Staging
)

$ErrorActionPreference = 'Stop'
if ($Staging) { $Queue = $true }

function Invoke-LocalOutbox {
  param([string[]]$Arguments)
  $prefix = 'TGV_OUTBOX_RESULT='
  if ($Staging) { $Arguments = @('--staging') + $Arguments }
  $outputLines = & node --experimental-strip-types (Join-Path $PSScriptRoot 'local-outbox.mjs') @Arguments
  if ($LASTEXITCODE -ne 0) { throw 'Local outbox command failed.' }
  $resultLines = @($outputLines | Where-Object { $_.StartsWith($prefix, [StringComparison]::Ordinal) })
  if ($resultLines.Count -ne 1) { throw 'Local outbox returned an invalid response.' }
  $json = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($resultLines[0].Substring($prefix.Length)))
  $json | ConvertFrom-Json
}

$username = (Read-Host 'Mailgun sandbox SMTP username (postmaster@...)').Trim()
if ($username -notmatch '^postmaster@sandbox[a-z0-9]+\.mailgun\.org$') {
  throw 'Enter the full Mailgun sandbox postmaster address. No email was sent.'
}
$recipient = (Read-Host 'Your verified Mailgun sandbox recipient address').Trim()
if ($recipient -notmatch '^[^\s<>,;@]+@[^\s<>,;@]+\.[^\s<>,;@]+$') {
  throw 'Enter one email address. No email was sent.'
}
$recipientAddress = [System.Net.Mail.MailAddress]::new($recipient)
$subject = 'Tilburg Goes Vegan - Mailgun sandbox test'
$body = 'This is a local test email. It contains no registration data.'
if ($Registration) {
  $payload = & node --experimental-transform-types (Join-Path $PSScriptRoot 'prepare-registration-mail-test.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Could not prepare the synthetic registration. No email was sent.' }
  $confirmation = $payload | ConvertFrom-Json
  $subject = $confirmation.subject
  $body = $confirmation.body
}
Write-Host "Destination: $recipient. Use the replacement SMTP password."
$password = Read-Host 'SMTP password (hidden; not saved)' -AsSecureString
try {
  if ($password.Length -eq 0) { throw 'No password entered. No email was sent.' }
  $client = [System.Net.Mail.SmtpClient]::new('smtp.mailgun.org', 587)
  try {
    $client.EnableSsl = $true # Require STARTTLS before authenticating.
    $client.UseDefaultCredentials = $false
    $client.Credentials = [System.Net.NetworkCredential]::new($username, $password)
    $client.Timeout = 15000
    $claim = $null
    $html = $null
    if ($Queue) {
      try { $claim = Invoke-LocalOutbox -Arguments @('claim', $recipient) }
      catch { throw 'Could not read the queue result. No SMTP send was attempted.' }
      if (!$claim) { Write-Host 'No eligible queued confirmation for this address. No email was sent.'; return }
      if ($claim.blocked) { throw 'The management link could not be verified. The confirmation was held; no email was sent.' }
      $subject = $claim.subject
      $body = $claim.body
      $html = $claim.html
    }
    $message = [System.Net.Mail.MailMessage]::new([System.Net.Mail.MailAddress]::new($username), $recipientAddress)
    try {
      $message.Subject = $subject
      $message.Body = $body
      $message.SubjectEncoding = [System.Text.Encoding]::UTF8
      $message.BodyEncoding = [System.Text.Encoding]::UTF8
      if ($html) {
        $message.AlternateViews.Add([System.Net.Mail.AlternateView]::CreateAlternateViewFromString($html, [System.Text.Encoding]::UTF8, 'text/html'))
      }
      $message.Headers.Add('X-Mailgun-Track-Clicks', 'no')
      $message.Headers.Add('X-Mailgun-Track-Opens', 'no')
      $outcome = 'uncertain'
      $diagnostics = @()
      try { $client.Send($message); $outcome = 'accepted' }
      catch {
        $cause = $_.Exception
        while ($cause) {
          if ($cause -is [System.Net.Mail.SmtpException]) {
            $code = [int]$cause.StatusCode
            $diagnostics += "SMTP status $code"
            if ($code -in 421, 450, 451, 452, 454) { $outcome = 'temporary' }
            elseif ($code -ge 500 -and $code -lt 600) { $outcome = 'permanent' }
          } elseif ($cause -is [System.Net.Sockets.SocketException]) {
            $diagnostics += "Network error $($cause.SocketErrorCode)"
          } else {
            $diagnostics += $cause.GetType().Name
          }
          $cause = $cause.InnerException
        }
        Write-Warning ($diagnostics -join ' / ')
      }
      if ($claim) {
        try { $result = Invoke-LocalOutbox -Arguments @('finish', $claim.id, [string]$claim.attempts, $outcome) }
        catch { $result = $null }
        if (!$result) {
          throw 'Could not record the SMTP outcome. Check Mailgun logs; do not reset or resend the held message.'
        }
        if ($result -eq 'pending') {
          Write-Host 'Mailgun temporarily rejected the message. Run this command again after the retry delay.'
          return
        }
      }
      if ($outcome -ne 'accepted') {
        throw "Mailgun did not confirm acceptance ($outcome). Check Mailgun logs before retrying."
      }
      Write-Host 'Mailgun accepted the message. Check your inbox and spam folder.'
    } finally { $message.Dispose() }
  } finally { $client.Dispose() }
} finally { $password.Dispose() }
