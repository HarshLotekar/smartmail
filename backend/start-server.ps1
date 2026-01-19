# SmartMail Server Startup Script

Write-Host "🚀 Starting SmartMail Backend Server..." -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
Set-Location "d:\smartmail\backend"

# Verify we're in the right directory
$currentDir = Get-Location
Write-Host "📁 Current directory: $currentDir" -ForegroundColor Blue

# Check if package.json exists
if (Test-Path "package.json") {
    Write-Host "✅ package.json found" -ForegroundColor Green
} else {
    Write-Host "❌ package.json not found!" -ForegroundColor Red
    exit 1
}

# Check if src/index.js exists
if (Test-Path "src/index.js") {
    Write-Host "✅ src/index.js found" -ForegroundColor Green
} else {
    Write-Host "❌ src/index.js not found!" -ForegroundColor Red
    exit 1
}

# Check if database exists
if (Test-Path "database/smartmail.db") {
    Write-Host "✅ Database found" -ForegroundColor Green
} else {
    Write-Host "❌ Database not found!" -ForegroundColor Red
    Write-Host "ℹ️  Run: npm run init-db to create database" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🔥 Starting server with Node.js..." -ForegroundColor Yellow
Write-Host "🌐 Server will be available at: http://localhost:3001" -ForegroundColor Cyan
Write-Host "📊 API endpoints: http://localhost:3001/api/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the server
node src/index.js