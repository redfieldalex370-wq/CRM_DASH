@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo CONSTRUIR GREEN CHIMP CRM PARA PRODUCCION
echo ==============================================

if not exist .env.production (
  echo ERROR: No se encontro .env.production
  pause
  exit /b 1
)

call npm install --registry=https://registry.npmjs.org/
if errorlevel 1 exit /b 1

call npm run build
if errorlevel 1 exit /b 1

echo.
echo LISTO. Sube el contenido de la carpeta dist a Hostinger.
pause
endlocal
