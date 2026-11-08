@echo off
setlocal

set "PROJECT_ROOT=%~dp0"
if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
)

echo =========================================================
echo   DrMayDay Complete - Khoi dong He Thong Hop Nhat (v2.0)
echo =========================================================

where node >nul 2>nul
if errorlevel 1 (
    echo [LOI] Chua tim thay Node.js. Vui long cai Node.js 18+ va thu lai.
    pause
    exit /b 1
)

if not exist "%PROJECT_ROOT%mayday-database\final_restructured.sql" (
    if not exist "%PROJECT_ROOT%docs\final_restructured.sql" (
        echo [LOI] Khong tim thay final_restructured.sql trong mayday-database hoac docs.
        pause
        exit /b 1
    )
)

echo.
echo [1/3] Kiem tra thu vien cai dat (node_modules)...

if not exist "%PROJECT_ROOT%backend-benh-nhan\node_modules" (
    pushd "%PROJECT_ROOT%backend-benh-nhan"
    call npm install
    if errorlevel 1 goto install_failed
    popd
)

if not exist "%PROJECT_ROOT%backend-bac-si\node_modules" (
    pushd "%PROJECT_ROOT%backend-bac-si"
    call npm install
    if errorlevel 1 goto install_failed
    popd
)

if not exist "%PROJECT_ROOT%frontend\node_modules" (
    pushd "%PROJECT_ROOT%frontend"
    call npm install
    if errorlevel 1 goto install_failed
    popd
)

echo.
echo [2/3] Khoi dong Unified API Gateway + Embedded PostgreSQL (Port 3080)...
start "DrMayDay Unified Backend - Port 3080" /D "%PROJECT_ROOT%" cmd /k "set PATH=C:\Program Files\nodejs;%PATH% && node server.js"

echo [3/3] Khoi dong Giao dien Web React + Vite (Port 5173)...
start "DrMayDay Frontend Web - Port 5173" /D "%PROJECT_ROOT%frontend" cmd /k "set PATH=C:\Program Files\nodejs;%PATH% && npm run dev"

echo.
echo =========================================================
echo   HE THONG DRMAYDAY DA KHOI DONG THANH CONG!
echo   - Giao dien Web:   http://localhost:5173
echo   - Unified API:     http://localhost:3080/api/v1/health
echo =========================================================
echo   Tai khoan Demo (Mat khau chung: password123):
echo   - Admin:     0903000999
echo   - Bac si:    0988765432
echo   - Benh nhan: 0912345678
echo =========================================================
pause
exit /b 0

:install_failed
echo.
echo [LOI] Cai dependencies that bai. Kiem tra ket noi mang va thu chay lai run.bat.
pause
exit /b 1
