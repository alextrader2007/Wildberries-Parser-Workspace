@echo off
chcp 65001 >nul
title Wildberries Parser — Установка
set ROOT=%~dp0
cd /d "%ROOT%"

set NODE_VERSION=20.18.0
set PYTHON_VERSION=3.12.7

echo ============================================
echo    Wildberries Parser — автоматическая
echo    установка зависимостей и запуск
echo ============================================
echo.

:: ──────────────────────────────────────────────
:: 1. Проверка / установка Node.js 20+
:: ──────────────────────────────────────────────
:check_node
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=1 delims=v" %%a in ('node -v') do set node_ver_full=%%a
    for /f "tokens=1 delims=." %%a in ("%node_ver_full%") do set node_major=%%a
    if %node_major% geq 20 (
        echo [OK] Node.js %node_ver_full%
        goto :check_npm
    )
)

echo [..] Node.js %NODE_VERSION% не найден. Скачивание...
set NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/node-v%NODE_VERSION%-x64.msi
set NODE_MSI=%TEMP%\node-install.msi
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_MSI%' }"
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось скачать Node.js. Проверьте интернет.
    pause
    exit /b 1
)
echo [..] Установка Node.js (окно появится на пару секунд)...
msiexec /i "%NODE_MSI%" /qn /norestart | findstr /C:"success"
del "%NODE_MSI%" 2>nul

:: Обновляем PATH для текущей сессии
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%b;%PATH%"
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не установился. Установите вручную с https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=1 delims=v" %%a in ('node -v') do echo [OK] Node.js установлен: v%%a

:: ──────────────────────────────────────────────
:: 2. npm install
:: ──────────────────────────────────────────────
:check_npm
if exist "node_modules\" (
    echo [OK] npm-зависимости уже установлены
    goto :check_python
)
echo [..] Установка npm-зависимостей...
call npm install
if %errorlevel% neq 0 (
    echo [ОШИБКА] npm install не удался
    pause
    exit /b 1
)
echo [OK] npm-зависимости установлены

:: ──────────────────────────────────────────────
:: 3. Проверка / установка Python 3.10+
:: ──────────────────────────────────────────────
:check_python
where python >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=2" %%a in ('python --version 2^>^&1') do set py_ver=%%a
    for /f "tokens=1 delims=." %%a in ("%py_ver%") do set py_major=%%a
    if %py_major% geq 3 goto :check_selenium
)

echo [..] Python %PYTHON_VERSION% не найден. Скачивание...
set PY_URL=https://www.python.org/ftp/python/%PYTHON_VERSION%/python-%PYTHON_VERSION%-amd64.exe
set PY_EXE=%TEMP%\python-install.exe
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%PY_URL%' -OutFile '%PY_EXE%' }"
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Не удалось скачать Python. Поиск через Selenium будет недоступен.
    echo         Установите вручную с https://python.org и запустите: pip install seleniumbase
    goto :launch
)
echo [..] Установка Python (окно появится на пару секунд)...
start /wait "" "%PY_EXE%" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
del "%PY_EXE%" 2>nul

:: Обновляем PATH
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%b;%PATH%"
set "PATH=%ProgramFiles%\Python312;%ProgramFiles%\Python312\Scripts;%LocalAppData%\Programs\Python\Python312;%LocalAppData%\Programs\Python\Python312\Scripts;%PATH%"

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Python не установился. Поиск через Selenium будет недоступен.
    goto :launch
)
for /f "tokens=2" %%a in ('python --version 2^>^&1') do echo [OK] Python установлен: %%a

:: ──────────────────────────────────────────────
:: 4. pip install seleniumbase
:: ──────────────────────────────────────────────
:check_selenium
python -c "import seleniumbase" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] seleniumbase установлен
    goto :launch
)
echo [..] Установка seleniumbase (Python)...
pip install seleniumbase
if %errorlevel% neq 0 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Ошибка установки seleniumbase. Поиск через Selenium недоступен.
    echo         Запустите вручную: pip install seleniumbase
) else (
    echo [OK] seleniumbase установлен
)

:: ──────────────────────────────────────────────
:: 5. Запуск
:: ──────────────────────────────────────────────
:launch
echo.
echo ============================================
echo    Запуск сервера...
echo    Откройте браузер: http://localhost:3000
echo ============================================
echo.

start http://localhost:3000
npm run dev
pause
