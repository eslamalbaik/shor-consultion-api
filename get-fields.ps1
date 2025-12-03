# PowerShell Script to Get Zoho CRM Fields
# Usage: .\get-fields.ps1

Write-Host "=== Zoho CRM Fields Viewer ===" -ForegroundColor Cyan
Write-Host ""

# Get access token (you need to have refresh token configured)
$clientId = Read-Host "Enter your Zoho Client ID"
$clientSecret = Read-Host "Enter your Zoho Client Secret" -AsSecureString
$clientSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret)
)
$refreshToken = Read-Host "Enter your Zoho Refresh Token"

Write-Host ""
Write-Host "Getting access token..." -ForegroundColor Yellow

try {
    # Get access token
    $tokenBody = @{
        refresh_token = $refreshToken
        client_id = $clientId
        client_secret = $clientSecretPlain
        grant_type = 'refresh_token'
    }

    $tokenResponse = Invoke-RestMethod -Uri "https://accounts.zoho.com/oauth/v2/token" -Method Post -Body $tokenBody
    
    if (-not $tokenResponse.access_token) {
        Write-Host "❌ Failed to get access token" -ForegroundColor Red
        exit
    }

    $accessToken = $tokenResponse.access_token
    Write-Host "✅ Access token obtained" -ForegroundColor Green
    Write-Host ""

    Write-Host "Fetching Fields from Zoho CRM..." -ForegroundColor Yellow
    Write-Host ""

    # Get fields
    $headers = @{
        'Authorization' = "Zoho-oauthtoken $accessToken"
        'Content-Type' = 'application/json'
    }

    $fieldsResponse = Invoke-RestMethod -Uri "https://www.zohoapis.com/crm/v3/settings/fields?module=Leads" -Method Get -Headers $headers

    Write-Host "=== CUSTOM FIELDS ===" -ForegroundColor Cyan
    Write-Host ""

    $customFields = $fieldsResponse.fields | Where-Object { $_.custom_field -eq $true }

    if ($customFields.Count -eq 0) {
        Write-Host "No custom fields found." -ForegroundColor Yellow
    } else {
        foreach ($field in $customFields) {
            Write-Host "Field Label: $($field.display_label)" -ForegroundColor Green
            Write-Host "  API Name: $($field.api_name)" -ForegroundColor Cyan
            Write-Host "  Data Type: $($field.data_type)" -ForegroundColor Yellow
            Write-Host "  Required: $($field.required)" -ForegroundColor Gray
            Write-Host ""
        }
    }

    Write-Host ""
    Write-Host "=== ALL FIELDS (Custom + Standard) ===" -ForegroundColor Cyan
    Write-Host ""

    foreach ($field in $fieldsResponse.fields) {
        $customFlag = if ($field.custom_field) { "[CUSTOM]" } else { "[STANDARD]" }
        Write-Host "$customFlag $($field.display_label) → API: $($field.api_name)" -ForegroundColor $(if ($field.custom_field) { 'Green' } else { 'Gray' })
    }

    Write-Host ""
    Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
    Write-Host "Total Fields: $($fieldsResponse.fields.Count)" -ForegroundColor Green
    Write-Host "Custom Fields: $($customFields.Count)" -ForegroundColor Green
    Write-Host "Standard Fields: $($fieldsResponse.fields.Count - $customFields.Count)" -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Host "=== ERROR ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
