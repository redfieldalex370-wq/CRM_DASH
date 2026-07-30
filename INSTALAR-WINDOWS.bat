@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo GREEN CHIMP CRM - INSTALACION PARA WINDOWS
echo ==============================================

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado.
  echo Instala Node.js 20.19 o superior y vuelve a intentar.
  pause
  exit /b 1
)

call npm config set registry https://registry.npmjs.org/
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json

call npm install --registry=https://registry.npmjs.org/
if errorlevel 1 (
  echo.
  echo La instalacion fallo. Revisa tu conexion, antivirus o proxy.
  pause
  exit /b 1
)

call npm run dev
endlocal
