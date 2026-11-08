#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "  DrMayDay - Khởi động toàn bộ dự án"
echo "========================================"

command -v node >/dev/null 2>&1 || { echo "[LỖI] Chưa cài đặt Node.js. Vui lòng cài Node.js."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "[LỖI] Chưa cài đặt npm. Vui lòng cài npm."; exit 1; }

# Kiểm tra file schema SQL
if [ ! -f "$PROJECT_ROOT/mayday-database/final_restructured.sql" ] && [ ! -f "$PROJECT_ROOT/docs/final_restructured.sql" ]; then
    echo "[LỖI] Không tìm thấy final_restructured.sql trong mayday-database hoặc docs."
    exit 1
fi

echo ""
echo "Kiểm tra và cài đặt dependencies nếu chưa có..."

if [ ! -d "$PROJECT_ROOT/backend-benh-nhan/node_modules" ]; then
    echo "-> Cài đặt backend-benh-nhan..."
    (cd "$PROJECT_ROOT/backend-benh-nhan" && npm install)
fi

if [ ! -d "$PROJECT_ROOT/backend-bac-si/node_modules" ]; then
    echo "-> Cài đặt backend-bac-si..."
    (cd "$PROJECT_ROOT/backend-bac-si" && npm install)
fi

if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo "-> Cài đặt frontend..."
    (cd "$PROJECT_ROOT/frontend" && npm install)
fi

echo ""
echo "Khởi động các dịch vụ:"
echo "  [1] Backend Bệnh nhân: http://localhost:3000"
echo "  [2] Backend Bác sĩ:    http://localhost:3001"
echo "  [3] Frontend:          http://localhost:5173"
if command -v java >/dev/null 2>&1 && [ -f "$PROJECT_ROOT/backend/mvnw" ]; then
    echo "  [4] Backend Spring:    http://localhost:8080"
fi
echo ""
echo "Đang khởi động..."

trap 'kill $(jobs -p) 2>/dev/null || true' EXIT

(cd "$PROJECT_ROOT/backend-benh-nhan" && npm start) &
if [ -f "$PROJECT_ROOT/backend-bac-si/.env" ]; then
    (cd "$PROJECT_ROOT/backend-bac-si" && npm start) &
else
    echo "[Ghi chú] backend-bac-si/.env chưa được tạo. Bỏ qua khởi động backend bác sĩ."
fi
(cd "$PROJECT_ROOT/frontend" && npm run dev -- --host 0.0.0.0) &

wait
