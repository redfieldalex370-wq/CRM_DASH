$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "CRM Kanban - instalación limpia" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js no está instalado o no está disponible en PATH. Instala Node.js 20.19 o superior."
}

Write-Host "Node: $(node -v)"
Write-Host "npm:  $(npm -v)"

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

if (Test-Path "node_modules") {
    Write-Host "Eliminando node_modules anterior..."
    Remove-Item "node_modules" -Recurse -Force
}

npm cache verify
npm config set registry https://registry.npmjs.org/

Write-Host "Instalando dependencias..." -ForegroundColor Yellow
npm install --registry=https://registry.npmjs.org/

Write-Host "Iniciando CRM..." -ForegroundColor Green
npm run dev
