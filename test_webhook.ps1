$url = Read-Host -Prompt 'Enter your Vercel Deployment URL (e.g., https://atreus.vercel.app)'
$endpoint = "$url/api/webhooks/apify"

$payload = @(
    @{
        title = "Machine Learning Engineer"
        company = "Scale AI"
        description = "We are looking for an ML Engineer with 3+ years of experience in Python, PyTorch, and LLM fine-tuning. Base salary $160,000 - $210,000. Remote work available."
        url = "https://linkedin.com/jobs/view/987654"
    },
    @{
        title = "Data Scientist"
        company = "Spotify"
        description = "Join our analytics team. Must have 2 years of experience with SQL, Python, and A/B testing frameworks."
        url = "https://linkedin.com/jobs/view/123456"
    }
) | ConvertTo-Json -Depth 5 -Compress

# Wrap in array if ConvertTo-Json didn't (Powershell sometimes unwraps single items, but here we have an array)
# Actually ConvertTo-Json with @() usually works fine for arrays.

Write-Host "Sending payload to $endpoint..."
try {
    $response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $payload -ContentType "application/json"
    Write-Host "Success!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response Body: $($reader.ReadToEnd())"
    }
}
