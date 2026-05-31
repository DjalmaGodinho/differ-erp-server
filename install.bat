@echo off
echo Instalando dependencias da API...
cd /d "%~dp0"
npm install
echo.
echo Instalando dependencias do frontend...
cd ..
npm install
echo.
echo Pronto! Execute 'vercel --prod' para fazer o deploy.
pause
