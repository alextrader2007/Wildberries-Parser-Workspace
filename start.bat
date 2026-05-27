@echo off
chcp 65001 >nul
title Wildberries Parser

set ROOT=%~dp0
cd /d "%ROOT%"

echo ^============================================^
echo ^|      Wildberries Parser - Установка        ^|
echo ^============================================^
echo.

:: Проверка Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден. Установите Node.js 20+ с https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js найден

:: Проверка npm-зависимостей
if not exist "node_modules\" (
    echo [..] Установка npm-зависимостей...
    call npm install
    if %errorlevel% neq 0 (
        echo [ОШИБКА] npm install не удался
        pause
        exit /b 1
    )
    echo [OK] npm-зависимости установлены
)

:: Проверка Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Python не найден. Поиск через Selenium будет недоступен.
    echo         Установите Python 3.10+ с https://python.org и запустите:
    echo         pip install seleniumbase
) else (
    :: Проверка seleniumbase
    python -c "import seleniumbase" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [..] Установка seleniumbase (Python)...
        pip install seleniumbase
        if %errorlevel% neq 0 (
            echo [ПРЕДУПРЕЖДЕНИЕ] Ошибка установки seleniumbase
        ) else (
            echo [OK] seleniumbase установлен
        )
    ) else (
        echo [OK] seleniumbase найден
    )
)

:: === Запуск ===
echo.
echo ^============================================^
echo ^|      Запуск сервера...                     ^|
echo ^|      Откройте браузер:                     ^|
echo ^|      http://localhost:3000                ^|
echo ^============================================^
echo.

start http://localhost:3000
npm run dev
