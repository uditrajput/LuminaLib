<#
.SYNOPSIS
    Deploy the entire LuminaLib stack (backend + frontend + database) via Docker Compose.

.DESCRIPTION
    This script performs pre-flight validation, builds Docker images and starts
    all four services (PostgreSQL, Redis, FastAPI backend, Next.js frontend) in
    detached mode.  It also exposes helpful management commands after a successful
    deployment.

.PARAMETER Down
    When supplied, tears down all running containers instead of deploying.

.PARAMETER Logs
    When supplied, attaches to container log output (docker compose logs -f).

.PARAMETER Rebuild
    Forces a fresh image build even if layers are cached.

.EXAMPLE
    # First-time / normal deploy
    .\deploy.ps1

    # Force a clean rebuild (e.g. after a code change)
    .\deploy.ps1 -Rebuild

    # Stop all containers
    .\deploy.ps1 -Down

    # Stream logs
    .\deploy.ps1 -Logs

.NOTES
    Requires: Docker Desktop (running) with Compose v2 support.
    Run from the repository root that contains docker-compose.yml.
#>

param(
    [switch]$Down,
    [switch]$Logs,
    [switch]$Rebuild
)

$ErrorActionPreference = "Stop"
$ComposeFile = "docker-compose.yml"

# ── Banner ────────────────────────────────────────────────────────────────────
function Write-Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   🌟  LuminaLib Deployment Script    ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step([string]$Step, [string]$Message) {
    Write-Host "  [$Step] $Message" -ForegroundColor Yellow
}

function Write-Success([string]$Message) {
    Write-Host "  ✅ $Message" -ForegroundColor Green
}

function Write-Fail([string]$Message) {
    Write-Host "  ❌ $Message" -ForegroundColor Red
}

Write-Banner

# ── Shortcut: tear-down ───────────────────────────────────────────────────────
if ($Down) {
    Write-Step "STOP" "Stopping all LuminaLib containers..."
    docker compose --file $ComposeFile down
    Write-Success "All containers stopped."
    exit 0
}

# ── Shortcut: stream logs ─────────────────────────────────────────────────────
if ($Logs) {
    docker compose --file $ComposeFile logs -f
    exit 0
}

# ── Pre-flight: Docker running? ───────────────────────────────────────────────
Write-Step "0/4" "Checking Docker daemon..."
try {
    docker info *> $null
    Write-Success "Docker is running."
}
catch {
    Write-Fail "Docker is not running. Start Docker Desktop and try again."
    exit 1
}

# ── Pre-flight: Compose file present? ────────────────────────────────────────
Write-Step "1/4" "Validating project structure..."
if (-not (Test-Path $ComposeFile)) {
    Write-Fail "docker-compose.yml not found. Run this script from the repository root."
    exit 1
}
if (-not (Test-Path ".\Lumina-backend\Dockerfile")) {
    Write-Fail "Lumina-backend\Dockerfile not found."
    exit 1
}
if (-not (Test-Path ".\Lumina-voice\Dockerfile")) {
    Write-Fail "Lumina-voice\Dockerfile not found."
    exit 1
}
if (-not (Test-Path ".\Lumina-frontend\Dockerfile")) {
    Write-Fail "Lumina-frontend\Dockerfile not found."
    exit 1
}
Write-Success "Project structure looks good."

# ── Build & start ─────────────────────────────────────────────────────────────
Write-Step "2/4" "Building Docker images (this may take a few minutes on first run)..."
$buildArgs = @("--file", $ComposeFile, "up", "--build", "-d")
if ($Rebuild) {
    $buildArgs += "--no-cache"
    Write-Host "          --no-cache flag active: forcing fresh build." -ForegroundColor Gray
}

docker compose @buildArgs

if ($LASTEXITCODE -ne 0) {
    Write-Fail "docker compose failed (exit code $LASTEXITCODE). Check the output above."
    exit $LASTEXITCODE
}

# ── Health check: wait for backend ───────────────────────────────────────────
Write-Step "3/4" "Waiting for backend to become healthy..."
$retries = 15
$healthy = $false
for ($i = 1; $i -le $retries; $i++) {
    Start-Sleep -Seconds 3
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($resp.StatusCode -eq 200) {
            $healthy = $true
            break
        }
    }
    catch {
        # ignore error
    }
    Write-Host "          Attempt $i/$retries – waiting..." -ForegroundColor DarkGray
}

if ($healthy) {
    Write-Success "Backend is healthy."
}
else {
    Write-Host "  ⚠  Backend did not respond within the wait window." -ForegroundColor DarkYellow
    Write-Host "     Run '.\deploy.ps1 -Logs' to inspect container output." -ForegroundColor DarkGray
}

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Step "4/4" "Deployment complete."
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🌐  Service URLs                                    ║" -ForegroundColor Cyan
Write-Host "║                                                      ║" -ForegroundColor Cyan
Write-Host "║  Frontend App     →  http://localhost:3000           ║" -ForegroundColor White
Write-Host "║  Grafana Logs     →  http://localhost:3000/grafana   ║" -ForegroundColor White
Write-Host "║  Backend REST API →  http://localhost:8000/api/v1    ║" -ForegroundColor White
Write-Host "║  Voice WS Service →  ws://localhost:8001/voice/ws    ║" -ForegroundColor White
Write-Host "║  Swagger Docs     →  http://localhost:8000/docs      ║" -ForegroundColor White
Write-Host "║  ReDoc            →  http://localhost:8000/redoc     ║" -ForegroundColor White
Write-Host "║  PostgreSQL       →  localhost:5432  (luminalib DB)  ║" -ForegroundColor DarkGray
Write-Host "║  Redis            →  localhost:6379                  ║" -ForegroundColor DarkGray
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor Gray
Write-Host "    View logs    →  .\deploy.ps1 -Logs" -ForegroundColor Gray
Write-Host "    Stop all     →  .\deploy.ps1 -Down" -ForegroundColor Gray
Write-Host "    Force rebuild →  .\deploy.ps1 -Rebuild" -ForegroundColor Gray
Write-Host "    Raw compose  →  docker-compose logs -f backend" -ForegroundColor Gray
Write-Host ""
