@echo off
chcp 65001 >nul 2>&1
title Wildberries Parser
setlocal enabledelayedexpansion

set ROOT=%~dp0
cd /d "%ROOT%"

set NODE_VERSION=20.18.0
set PYTHON_VERSION=3.12.7

echo ============================================
echo    Wildberries Parser
echo    Automatic setup and launch
echo ============================================
echo.

:: --------------------------------------------------
:: 1. Check / install Node.js 20+
:: --------------------------------------------------
:check_node
where node >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=1 delims=v" %%a in ('node -v') do set "node_raw=%%a"
    for /f "tokens=1 delims=." %%a in ("!node_raw!") do set "node_major=%%a"
    if defined node_major if !node_major! geq 20 (
        echo [OK] Node.js v!node_raw!
        goto :check_npm
    )
)

echo [..] Node.js %NODE_VERSION% not found. Downloading...
set "NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/node-v%NODE_VERSION%-x64.msi"
set "NODE_MSI=%TEMP%\node-install.msi"
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_MSI%' }"
if !errorlevel! neq 0 (
    echo [ERROR] Failed to download Node.js. Check your internet.
    pause
    exit /b 1
)

echo [..] Installing Node.js...
msiexec /i "%NODE_MSI%" /qn /norestart

:: Refresh PATH
set "NODE_PATHS=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%LocalAppData%\Programs\nodejs;%AppData%\npm;%USERPROFILE%\AppData\Roaming\npm"
set "PATH=%NODE_PATHS%;%PATH%"
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%b;%PATH%"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "PATH=%%b;%PATH%"

where node >nul 2>&1
if !errorlevel! equ 0 goto :node_ok

:: Retry with admin elevation
echo [..] Requesting admin rights for Node.js install...
echo Start-Process msiexec -ArgumentList '/i "%NODE_MSI%" /qn /norestart' -Wait -Verb RunAs > "%TEMP%\install_node.ps1"
powershell -ExecutionPolicy Bypass -File "%TEMP%\install_node.ps1" >nul 2>&1
del "%TEMP%\install_node.ps1" 2>nul
del "%NODE_MSI%" 2>nul

:: Refresh PATH again
set "PATH=%NODE_PATHS%;%PATH%"
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%b;%PATH%"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "PATH=%%b;%PATH%"

where node >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Node.js did not install.
    echo         Try installing manually from https://nodejs.org
    echo         or run this batch as Administrator.
    pause
    exit /b 1
)

:node_ok
for /f "tokens=1 delims=v" %%a in ('node -v') do echo [OK] Node.js installed: v%%a

:: --------------------------------------------------
:: 2. npm install
:: --------------------------------------------------
:check_npm
if exist "node_modules\" (
    echo [OK] npm packages already installed
    goto :check_python
)
echo [..] Installing npm packages (may take 1-2 minutes)...
call npm install
if !errorlevel! neq 0 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
)
echo [OK] npm packages installed

:: --------------------------------------------------
:: 3. Check / install Python 3.10+
:: --------------------------------------------------
:check_python
:: Проверяем, что python — не Microsoft Store заглушка
where python >nul 2>&1
if !errorlevel! equ 0 (
    python -c "print(1)" >nul 2>&1
    if !errorlevel! equ 0 (
        for /f "tokens=2" %%a in ('python --version 2^>^&1') do set "py_ver=%%a"
        for /f "tokens=1 delims=." %%a in ("!py_ver!") do set "py_major=%%a"
        if defined py_major if !py_major! geq 3 (
            for /f "delims=" %%p in ('where python') do (
                echo %%p | find /i "windowsapps" >nul
                if !errorlevel! neq 0 (
                    echo %%p > "%TEMP%\.python-path"
                )
            )
            goto :check_selenium
        )
    )
)

:: Fallback: проверяем py -3 (Python Launcher, не зависит от App Execution Aliases)
where py >nul 2>&1
if !errorlevel! equ 0 (
    py -3 -c "print(1)" >nul 2>&1
    if !errorlevel! equ 0 (
        py -3 -c "import sys; print(sys.executable)" > "%TEMP%\.python-path"
        for /f "tokens=2" %%a in ('py -3 --version 2^>^&1') do echo [OK] Python found via py launcher: %%a
        goto :check_selenium
    )
)

echo [..] Python %PYTHON_VERSION% not found. Downloading...
set "PY_URL=https://www.python.org/ftp/python/%PYTHON_VERSION%/python-%PYTHON_VERSION%-amd64.exe"
set "PY_EXE=%TEMP%\python-install.exe"
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%PY_URL%' -OutFile '%PY_EXE%' }"
if !errorlevel! neq 0 (
    echo [WARNING] Failed to download Python. Selenium search will be unavailable.
    echo           Install manually from https://python.org
    goto :launch
)
echo [..] Installing Python (silent, window may flash)...
start /wait "" "%PY_EXE%" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
del "%PY_EXE%" 2>nul

:: Refresh PATH
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%b;%PATH%"
set "PATH=%ProgramFiles%\Python313;%ProgramFiles%\Python313\Scripts;%ProgramFiles%\Python312;%ProgramFiles%\Python312\Scripts;%LocalAppData%\Programs\Python\Python313;%LocalAppData%\Programs\Python\Python313\Scripts;%LocalAppData%\Programs\Python\Python312;%LocalAppData%\Programs\Python\Python312\Scripts;%PATH%"

:: Проверяем python (отсекаем Microsoft Store stub)
set "PYTHON_OK=0"
where python >nul 2>&1
if !errorlevel! equ 0 (
    python -c "print(1)" >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_OK=1"
        for /f "tokens=2" %%a in ('python --version 2^>^&1') do echo [OK] Python installed: %%a
        for /f "delims=" %%p in ('where python') do (
            echo %%p | find /i "windowsapps" >nul
            if !errorlevel! neq 0 (
                echo %%p > "%TEMP%\.python-path"
            )
        )
    )
)

if !PYTHON_OK! equ 0 (
    where py >nul 2>&1
    if !errorlevel! equ 0 (
        py -3 -c "print(1)" >nul 2>&1
        if !errorlevel! equ 0 (
            py -3 -c "import sys; print(sys.executable)" > "%TEMP%\.python-path"
            set /p PYTHON_PATH= < "%TEMP%\.python-path"
            for /f "tokens=2" %%a in ('py -3 --version 2^>^&1') do echo [OK] Python installed via py: %%a ^(at !PYTHON_PATH!^)
            set "PYTHON_OK=1"
        )
    )
    if !PYTHON_OK! equ 0 (
        echo [WARNING] Python did not install. Selenium search will be unavailable.
        goto :launch
    )
)

:: --------------------------------------------------
:: 4. pip install seleniumbase
:: --------------------------------------------------
:check_selenium
set "PY_CMD=python"
if exist "%TEMP%\.python-path" (
    set /p PY_CMD= < "%TEMP%\.python-path"
)

"!PY_CMD!" -c "import seleniumbase" >nul 2>&1
if !errorlevel! equ 0 (
    echo [OK] seleniumbase installed
    goto :shortcut
)
echo [..] Installing seleniumbase (Python)...
"!PY_CMD!" -m ensurepip --upgrade >nul 2>&1
"!PY_CMD!" -m pip install seleniumbase
if !errorlevel! neq 0 (
    echo [WARNING] seleniumbase install failed. Selenium search unavailable.
    echo           Run manually: "!PY_CMD!" -m pip install seleniumbase
) else (
    echo [OK] seleniumbase installed
)

:: --------------------------------------------------
:: 5. Desktop shortcut with icon (one-time)
:: --------------------------------------------------
:shortcut
if exist "wb.ico" (
    if not exist "%USERPROFILE%\Desktop\Wildberries Parser.lnk" (
        powershell -Command "& { $WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Wildberries Parser.lnk'); $Shortcut.TargetPath = '%~dp0start.bat'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.IconLocation = '%~dp0wb.ico,0'; $Shortcut.Description = 'Wildberries Parser'; $Shortcut.Save(); }" >nul 2>&1
        if !errorlevel! equ 0 echo [OK] Icon ^& shortcut created on Desktop
    )
)

:: --------------------------------------------------
:: 6. Start server
:: --------------------------------------------------
:launch
echo.
echo ============================================
echo    Starting server...
echo ============================================
echo.

:: Start server in background, write log
start /b "" cmd /c "npm run dev > server.log 2>&1"

:: Wait for port 3000 to be listening
echo [..] Waiting for server on port 3000...
set /a wait_count=0

:wait_loop
ping -n 2 127.0.0.1 >nul
set /a wait_count+=1
netstat -an 2>nul | findstr ":3000 " | findstr "LISTENING" >nul
if not errorlevel 1 goto :server_ready
if !wait_count! gtr 30 (
    echo.
    echo [ERROR] Server did not start within 60 seconds.
    echo         Check server.log in the project folder.
    type server.log 2>nul
    echo.
    pause
    exit /b 1
)
echo    ... waiting (!wait_count! * 2s)
goto :wait_loop

:server_ready
echo [OK] Server is running!
echo.
echo ============================================
echo    Opening browser...
echo    http://localhost:3000
echo ============================================
echo.

start http://localhost:3000

:: Keep window open, monitor server health
echo Press Ctrl+C or close this window to stop the server.
echo.
:hold
ping -n 11 127.0.0.1 >nul
netstat -an 2>nul | findstr ":3000 " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo.
    echo [WARNING] Server stopped. Check server.log
    type server.log 2>nul
    echo.
    pause
    exit /b 1
)
goto :hold
