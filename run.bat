@echo off
setlocal

set "PROJECT_ROOT=%~dp0"

echo ========================================
echo   DrMayDay - khoi dong toan bo project
echo ========================================

where java >nul 2>nul
if errorlevel 1 (
    echo [LOI] Chua tim thay Java. Cai Java 17 hoac moi hon va them vao PATH.
    pause
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo [LOI] Chua tim thay Node.js. Cai Node.js va them vao PATH.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [LOI] Chua tim thay npm. Cai Node.js kem npm va them vao PATH.
    pause
    exit /b 1
)

if not exist "%PROJECT_ROOT%mayday-database\final_restructured.sql" (
    echo [LOI] Khong tim thay mayday-database\final_restructured.sql.
    pause
    exit /b 1
)

if not exist "%PROJECT_ROOT%backend\mvnw.cmd" (
    echo [LOI] Khong tim thay backend\mvnw.cmd.
    pause
    exit /b 1
)

echo.
echo Kiem tra va cai dependencies neu chua co...

if not exist "%PROJECT_ROOT%backend-benh-nhan\node_modules" (
    pushd "%PROJECT_ROOT%backend-benh-nhan"
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

if exist "%PROJECT_ROOT%backend-bac-si\.env" (
    if not exist "%PROJECT_ROOT%backend-bac-si\node_modules" (
        pushd "%PROJECT_ROOT%backend-bac-si"
        call npm install
        if errorlevel 1 goto install_failed
        popd
    )
)

echo.
echo Dang mo cac dich vu trong cac cua so rieng...
start "DrMayDay Backend Benh Nhan - port 3000" /D "%PROJECT_ROOT%backend-benh-nhan" cmd /k "npm start"
start "DrMayDay Backend Spring - port 8080" /D "%PROJECT_ROOT%backend" cmd /k "mvnw.cmd spring-boot:run"
start "DrMayDay Frontend - port 5173" /D "%PROJECT_ROOT%frontend" cmd /k "npm run dev -- --host 0.0.0.0"
if exist "%PROJECT_ROOT%backend-bac-si\.env" (
    start "DrMayDay Backend Bac Si - port 3001" /D "%PROJECT_ROOT%backend-bac-si" cmd /k "npm start"
) else (
    echo Backend bac si chua duoc khoi dong.
    echo Tao backend-bac-si\.env tu backend-bac-si\.env.example va cau hinh DATABASE_URL dung chung PostgreSQL.
)

echo.
echo Da gui lenh khoi dong cac dich vu da cau hinh:
echo   Frontend:             http://localhost:5173
echo   Backend Spring:       http://localhost:8080
echo   Backend benh nhan:    http://localhost:3000/api/v1/health
echo   Backend bac si:       http://localhost:3001/api/v1/health (can .env)
echo.
echo Backend benh nhan mac dinh dung PostgreSQL nhung PGlite.
echo De dung chung database, cau hinh backend-benh-nhan va backend-bac-si cung DATABASE_URL PostgreSQL;
echo dat USE_EMBEDDED_PG=false o backend-benh-nhan va JWT_SECRET hai backend phai giong nhau.
echo Cua so nay co the dong; cac cua so dich vu se tiep tuc chay.
pause
exit /b 0

:install_failed
echo.
echo [LOI] Cai dependencies that bai. Kiem tra ket noi mang va thu chay lai run.bat.
pause
exit /b 1
