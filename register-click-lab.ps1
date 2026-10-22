$ErrorActionPreference = 'Stop'
$apiBase = 'https://tenslant-id.tenslant44.workers.dev'
$clientId = 'click-lab-standalone'

Write-Host 'Tenslant Click Lab OAuth registration' -ForegroundColor Cyan
Write-Host 'Paste the FULL public URL that opens the game, including its trailing slash or /index.html.'
$gameUrl = (Read-Host 'Public game URL').Trim()
try {
    $parsed = [Uri]$gameUrl
    if ($parsed.Scheme -ne 'https' -or [string]::IsNullOrWhiteSpace($parsed.Host)) { throw 'Use a valid public HTTPS URL.' }
    if ($parsed.Query -or $parsed.Fragment) { throw 'The registered URL must not include a query string or fragment.' }
} catch {
    Write-Error "Invalid game URL: $($_.Exception.Message)"
    exit 1
}
$origin = $parsed.GetLeftPart([System.UriPartial]::Authority)
$redirectUri = $parsed.AbsoluteUri
$secretSecure = Read-Host 'ADMIN_BOOTSTRAP_SECRET (input is hidden)' -AsSecureString
$secretPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretSecure)
try {
    $secret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPtr)
    $body = @{
        id = $clientId
        name = 'Tenslant Click Lab'
        trust_level = 'community'
        origins = @($origin)
        redirect_uris = @($redirectUri)
    } | ConvertTo-Json -Depth 5
    try {
        $result = Invoke-RestMethod -Method Post -Uri "$apiBase/api/admin/games" -Headers @{ 'X-Admin-Secret' = $secret } -ContentType 'application/json' -Body $body
        Write-Host 'Registered successfully:' -ForegroundColor Green
        $result | ConvertTo-Json -Depth 8
    } catch {
        Write-Host 'Registration failed.' -ForegroundColor Red
        if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
        else { Write-Host $_.Exception.Message }
        Write-Host 'If the game ID already exists, use your Tenslant ID admin workflow to add this origin and exact redirect URI to that existing game. Do not create a duplicate ID.'
        exit 1
    }
} finally {
    if ($secretPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPtr) }
    $secret = $null
}
