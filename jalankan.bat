@echo off
title Hino OPF Monitoring & Tracking Dashboard
echo ========================================================
echo   MENJALANKAN HINO OPF MONITORING DASHBOARD (LOCAL)
echo ========================================================
echo.
echo Memeriksa dependensi dan menyalakan server...
npm install
npm run build
start http://localhost:3000
npm start
pause
