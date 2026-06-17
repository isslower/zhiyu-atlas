@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动行政区划思维导图地图联动网页...
echo.
echo 本地地址：http://127.0.0.1:8080/
echo.
echo 如需停止服务，请在这个窗口按 Ctrl+C。
echo.
node serve.mjs
pause
