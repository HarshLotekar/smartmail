# SmartMail Deployment Script for Windows
# Run this after making changes to deploy updates

Write-Host "🚀 SmartMail Deployment Helper" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Run this from the project root directory" -ForegroundColor Red
    exit 1
}

# Show current git status
Write-Host "📊 Current Git Status:" -ForegroundColor Yellow
git status --short
Write-Host ""

# Ask for commit message
$commitMsg = Read-Host "Enter commit message"

if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    Write-Host "❌ Commit message required" -ForegroundColor Red
    exit 1
}

# Stage all changes
Write-Host "📦 Staging changes..." -ForegroundColor Yellow
git add .

# Commit
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
git commit -m $commitMsg

# Push to GitHub (triggers auto-deploy)
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⏳ Deployment Status:" -ForegroundColor Cyan
    Write-Host "   Render will automatically deploy in ~2-3 minutes" -ForegroundColor White
    Write-Host ""
    Write-Host "📍 Check deployment status at:" -ForegroundColor Cyan
    Write-Host "   https://dashboard.render.com/" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 Your app will be live at:" -ForegroundColor Cyan
    Write-Host "   Frontend: https://smartmail-frontend.onrender.com" -ForegroundColor White
    Write-Host "   Backend: https://smartmail-backend.onrender.com" -ForegroundColor White
} else {
    Write-Host "❌ Push failed. Check error messages above." -ForegroundColor Red
    exit 1
}
