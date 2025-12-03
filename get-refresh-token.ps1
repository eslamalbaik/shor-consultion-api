# PowerShell Script to Get Zoho Refresh Token
# Usage: .\get-refresh-token.ps1

Write-Host "=== Zoho CRM Refresh Token Generator ===" -ForegroundColor Cyan
Write-Host ""

# Get credentials from user
$clientId = Read-Host "Enter your Zoho Client ID"
$clientSecret = Read-Host "Enter your Zoho Client Secret" -AsSecureString
$clientSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret)
)

Write-Host ""
Write-Host "Step 1: Open this URL in your browser and authorize:" -ForegroundColor Yellow
Write-Host ""

$authUrl = "https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&client_id=$clientId&response_type=code&access_type=offline&redirect_uri=http://localhost:5000/auth/zoho/callback"

Write-Host $authUrl -ForegroundColor Green
Write-Host ""

# Open URL in default browser
Start-Process $authUrl

Write-Host "After authorizing, you'll be redirected to:" -ForegroundColor Yellow
Write-Host "http://localhost:5000/auth/zoho/callback?code=XXXXX" -ForegroundColor Green
Write-Host ""
$code = Read-Host "Enter the CODE from the redirect URL"

Write-Host ""
Write-Host "Step 2: Exchanging code for tokens..." -ForegroundColor Yellow

try {
    $body = @{
        grant_type = "authorization_code"
        client_id = $clientId
        client_secret = $clientSecretPlain
        redirect_uri = "http://localhost:5000/auth/zoho/callback"
        code = $code
    }

    $response = Invoke-RestMethod -Uri "https://accounts.zoho.com/oauth/v2/token" -Method Post -Body $body

    Write-Host ""
    Write-Host "=== SUCCESS! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    Write-Host "=== IMPORTANT: Save these values ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Refresh Token:" -ForegroundColor Cyan
    Write-Host $response.refresh_token -ForegroundColor Green
    Write-Host ""
    Write-Host "Scope:" -ForegroundColor Cyan
    Write-Host $response.scope -ForegroundColor Green
    Write-Host ""
    
    if ($response.scope -notlike "*ZohoCRM*") {
        Write-Host "⚠️  WARNING: Scope does not include ZohoCRM!" -ForegroundColor Red
        Write-Host "   The refresh token may not work for CRM API calls." -ForegroundColor Red
        Write-Host "   Make sure to use the correct authorization URL with ZohoCRM scope." -ForegroundColor Yellow
    } else {
        Write-Host "✅ Scope looks correct! (Contains ZohoCRM)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Add this to your server/.env file:" -ForegroundColor Yellow
    Write-Host "ZOHO_REFRESH_TOKEN=$($response.refresh_token)" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "=== ERROR ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. Code expired (codes expire quickly, generate a new one)" -ForegroundColor Yellow
    Write-Host "2. Wrong client_id or client_secret" -ForegroundColor Yellow
    Write-Host "3. Redirect URI mismatch" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

