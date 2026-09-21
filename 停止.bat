@echo off
chcp 65001 >nul
title 译尘翻译工具 - 停止器

cd /d "%~dp0"

:: 检查是否有 node 进程在跑
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [提示] 未检测到 Node.js，服务应未运行。
    pause
    exit /b 0
)

:: 查找监听 3000 端口的进程并关闭
set PORT=3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    echo [停止] 关闭占用端口 %PORT% 的进程 (PID %%a) ...
    taskkill /f /pid %%a >nul 2>nul
)

:: 兜底：关闭所有 node 进程（仅本机只跑本服务时安全）
taskkill /f /im node.exe >nul 2>nul

echo [完成] 翻译服务已停止。
echo 按任意键退出...
pause >nul
