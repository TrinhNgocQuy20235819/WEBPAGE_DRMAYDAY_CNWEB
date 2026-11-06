# HƯỚNG DẪN CÀI ĐẶT, CẤU HÌNH VÀ VẬN HÀNH REDIS — DRMAYDAY BACKEND

Tài liệu kỹ thuật hướng dẫn cài đặt, cấu hình, kiểm thử và xử lý sự cố dịch vụ Redis phục vụ hệ thống bảo mật **JWT Token Blacklist** của dự án DrMayDay trên môi trường **Windows 11 (PowerShell)**.

---

## MỤC LỤC
1. [Redis dùng để làm gì trong DrMayDay?](#1-redis-dùng-để-làm-gì-trong-drmayday)
2. [Cách cài đặt và chạy Redis trên Windows 11](#2-cách-cài-đặt-và-chạy-redis-trên-windows-11)
3. [Cấu hình Spring Boot kết nối Redis](#3-cấu-hình-spring-boot-kết-nối-redis)
4. [Kiểm tra kết nối và trạng thái hoạt động](#4-kiểm-tra-kết-nối-và-trạng-thái-hoạt-động)
5. [Quy trình kiểm thử JWT Token Blacklist](#5-quy-trình-kiểm-thử-jwt-token-blacklist)
6. [Xử lý sự cố và lỗi thường gặp (Troubleshooting)](#6-xử-lý-sự-cố-và-lỗi-thường-gặp-troubleshooting)
7. [Checklist khởi động phục vụ Demo Khách hàng](#7-checklist-khởi-động-phục-vụ-demo-khách-hàng)

---

## 1. Redis dùng để làm gì trong DrMayDay?

Trong kiến trúc DrMayDay Backend, Redis đóng vai trò hạ tầng bảo mật thời gian thực (**Real-time Security Cache**) với các trách nhiệm cụ thể:

### 1.1 Quản trị JWT Token Blacklist (Thu hồi phiên tức thì)
- Cơ chế JWT vốn là **stateless** (phi trạng thái): Một token khi đã phát hành sẽ có chữ ký số hợp lệ cho tới thời điểm hết hạn tự nhiên (`exp`, mặc định 30 phút).
- Khi người dùng chủ động chọn **Đăng xuất (`POST /api/v1/auth/logout`)**, hệ thống bắt buộc phải vô hiệu hóa token đó ngay lập tức để ngăn chặn rủi ro chiếm đoạt phiên (Session Hijacking / Replay Attack).
- DrMayDay không lưu toàn bộ token vào database, mà trích xuất mã định danh duy nhất của token (**`jti` — JWT ID**) và lưu vào Redis Blacklist.

### 1.2 Cơ chế lưu trữ JTI và TTL tự động dọn rác
- Lớp lưu trữ `RedisRevocationStore` ghi nhận key với tiền tố chuẩn hóa:
  ```text
  drmayday:revoked:<jti>
  ```
- **Cơ chế ghi an toàn (`NX` — Set If Absent)**: Sử dụng phương thức `redis.opsForValue().setIfAbsent(key, "1", ttl)`. Điều này đảm bảo nếu client gọi logout nhiều lần, thời gian thu hồi ban đầu không bao giờ bị ghi đè hoặc rút ngắn.
- **Tự động hủy theo TTL (`Time-To-Live`)**:
  - Thời gian sống `ttl` của key trong Redis được tính chính xác bằng khoảng thời gian còn lại giữa thời điểm logout và thời điểm hết hạn của token:
    $$\text{TTL} = \text{expiresAt} - \text{Instant.now()}$$
  - Khi token đã hết hạn tự nhiên, Redis tự động giải phóng key (Auto-Eviction). Hệ thống hoàn toàn **không cần chạy cron job quét database**, tiết kiệm RAM và CPU.

### 1.3 Cơ chế bảo mật Fail-Closed khi Redis gặp sự cố
- Khi có request gửi kèm Bearer Token, `JwtAuthenticationFilter` sẽ kiểm tra `blacklist.isBlacklisted(claims.getId())`.
- Nếu Redis bị sập, ngắt kết nối hoặc timeout:
  - Hệ thống áp dụng nguyên tắc an toàn tuyệt đối **Fail-Closed** (Đóng cửa từ chối truy cập): Không bao giờ mặc định cho phép request đi qua khi chưa kiểm tra được blacklist.
  - Bộ lọc lập tức xóa `SecurityContext` và phản hồi mã lỗi:
    ```json
    {
      "code": 9901,
      "message": "Security service unavailable"
    }
    ```
    (HTTP Status: `503 Service Unavailable`).

### 1.4 So sánh vai trò giữa Redis và PostgreSQL trong DrMayDay

| Đặc tính | Redis | PostgreSQL Online |
|---|---|---|
| **Bản chất** | In-Memory Key-Value Store (RAM) | Relational Database Management System (Disk) |
| **Vai trò chính** | Lưu JWT Blacklist, kiểm tra thu hồi token tức thì | Lưu hồ sơ bệnh án, bệnh nhân, đợt tổn thương, ảnh, kết quả AI `so_luong_not_san`, tài khoản, vai trò, quyền hạn |
| **Tốc độ truy vấn** | Siêu nhanh ($< 1\text{ ms}$), độ phức tạp $O(1)$ | Truy vấn quan hệ, index, khóa ngoại, giao dịch ACID |
| **Tần suất gọi** | Được gọi tại **tất cả** các HTTP request có header `Authorization` | Chỉ gọi khi thao tác dữ liệu nghiệp vụ |
| **Vòng đời dữ liệu** | Tự động hủy sau khi token hết hạn qua TTL | Lưu trữ bền vững, quản lý phiên bản theo quy định y tế |

---

## 2. Cách cài đặt và chạy Redis trên Windows 11

Khuyến nghị sử dụng **Docker Desktop trên Windows 11** để đảm bảo tính đồng nhất, cô lập và dễ quản lý.

### 2.1 Bước 1: Kiểm tra Docker Desktop đang hoạt động
Mở PowerShell trên Windows 11 và chạy lệnh:
```powershell
docker info
```
*Nếu hiển thị thông tin hệ thống Docker (Server Version, OS/Arch: linux/amd64), Docker Desktop đã sẵn sàng.*

### 2.2 Bước 2: Khởi động Redis bằng Docker Compose có sẵn trong dự án (Ưu tiên)
Dự án đã định nghĩa sẵn cấu hình Redis trong `test-infra/docker-compose.yml`:
- Image: `redis:7-alpine`
- Port ánh xạ: `127.0.0.1:16379:6379`
- Bật cơ chế ghi đĩa AOF: `--appendonly yes` (đảm bảo không mất dữ liệu blacklist khi container restart)
- Volume: `redis_test_data:/data`

Chạy lệnh PowerShell tại thư mục gốc dự án:
```powershell
# Chạy container Redis ở chế độ nền
docker compose -f test-infra/docker-compose.yml up -d redis
```

### 2.3 Bước 3 (Tùy chọn): Chạy container Redis độc lập (Nếu không dùng Compose)
Nếu không dùng file Compose, bạn có thể tạo container độc lập bằng một lệnh duy nhất:
```powershell
docker run -d `
  --name drmayday-redis `
  -p 16379:6379 `
  --restart unless-stopped `
  -v drmayday_redis_data:/data `
  redis:7-alpine redis-server --appendonly yes
```

### 2.4 Quản trị vòng đời container Redis
Các lệnh PowerShell thường dùng để quản lý:
```powershell
# Xem danh sách container Redis đang chạy
docker ps --filter "ancestor=redis:7-alpine"

# Dừng container Redis
docker stop drmayday-security-test-redis-1

# Khởi động lại container Redis
docker start drmayday-security-test-redis-1

# Restart nhanh container
docker restart drmayday-security-test-redis-1

# Cấu hình tự động khởi động cùng Docker Desktop / Windows
docker update --restart unless-stopped drmayday-security-test-redis-1
```

---

## 3. Cấu hình Spring Boot kết nối Redis

### 3.1 Cấu hình chuẩn trong `application.properties`
Trong file `backend/src/main/resources/application.properties`, cấu hình kết nối Redis được khai báo:
```properties
# ===================================================================
# REDIS CONFIGURATION (JWT TOKEN BLACKLIST)
# ===================================================================
spring.data.redis.host=${REDIS_HOST:localhost}
spring.data.redis.port=${REDIS_PORT:6379}
spring.data.redis.password=${REDIS_PASSWORD:}
spring.data.redis.ssl.enabled=${REDIS_SSL:false}
spring.data.redis.timeout=2s
spring.data.redis.connect-timeout=2s
```

> [!IMPORTANT]
> **Quy định về Port trong DrMayDay**:
> - Container Redis ánh xạ ra ngoài máy tính qua cổng **`16379`** (thay vì `6379` mặc định) nhằm **tránh xung đột** với các phiên bản Redis hoặc dịch vụ khác có thể đang cài đặt sẵn trên máy lập trình viên.
> - Do đó, khi chạy backend trực tiếp trên Windows, biến `REDIS_PORT` **bắt buộc là `16379`**.

### 3.2 Cấu hình khi Backend chạy trực tiếp trên Windows (Host Machine)
Thiết lập các biến môi trường trong PowerShell trước khi chạy ứng dụng:
```powershell
$env:REDIS_HOST = "127.0.0.1"
$env:REDIS_PORT = "16379"
$env:REDIS_PASSWORD = ""
```
Hoặc truyền trực tiếp vào tham số dòng lệnh JVM khi khởi chạy Spring Boot:
```powershell
java -jar target/backend-0.0.1-SNAPSHOT.jar `
  --spring.data.redis.host=127.0.0.1 `
  --spring.data.redis.port=16379
```

### 3.3 Cấu hình khi Backend chạy trong môi trường Docker
Khi đóng gói backend vào container cùng mạng với Redis (`docker compose`):
- `REDIS_HOST` = `redis` *(Tên service của Redis trong Docker network, không dùng `localhost`)*.
- `REDIS_PORT` = `6379` *(Cổng dịch vụ nội bộ bên trong mạng Docker)*.

> [!WARNING]
> Không dùng `localhost` khi backend chạy trong container, vì bên trong container `localhost` sẽ trỏ về chính container backend, dẫn tới lỗi `Connection refused`.

---

## 4. Kiểm tra kết nối và trạng thái hoạt động

Thực hiện lần lượt các bước kiểm tra sau trên PowerShell để đảm bảo Redis đã sẵn sàng 100%:

### Bước 1: Kiểm tra container đang chạy và Healthy
```powershell
docker ps --filter "name=redis" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```
*Kết quả kỳ vọng*: `drmayday-security-test-redis-1` hiển thị trạng thái `Up ... (healthy)` và ánh xạ `127.0.0.1:16379->6379/tcp`.

### Bước 2: Kiểm tra phản hồi lệnh PING từ Redis CLI
Gửi lệnh `PING` trực tiếp vào bên trong container:
```powershell
docker exec drmayday-security-test-redis-1 redis-cli ping
```
*Kết quả kỳ vọng*:
```text
PONG
```

### Bước 3: Kiểm tra cổng mạng 16379 trên Windows Host
Xác nhận cổng `16379` đang mở và lắng nghe kết nối từ Windows:
```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 16379
```
*Kết quả kỳ vọng*: `TcpTestSucceeded : True`.

### Bước 4: Kiểm tra log của Backend Spring Boot
Khi backend khởi động thành công và kết nối Redis, log console sẽ không xuất hiện lỗi `RedisConnectionException` hoặc `QueryTimeoutException`.

---

## 5. Quy trình kiểm thử JWT Token Blacklist

Bạn có thể kiểm thử toàn bộ luồng tạo phiên, xác thực, logout và thu hồi token bằng các lệnh PowerShell dưới đây (sử dụng tài khoản demo có sẵn trên hệ thống):

### Bước 1: Đăng nhập lấy Access Token
Gửi request đăng nhập bằng tài khoản Patient A:
```powershell
$loginBody = @{
    phone = "0999900011"
    password = "DrMayDay@2026OnlineTest!"
} | ConvertTo-Json

$loginResp = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $loginBody

$token = $loginResp.data.accessToken
Write-Host "Access Token received: $token"
```
*Kết quả kỳ vọng*: HTTP `200 OK`, mã phản hồi `code: 1000`.

### Bước 2: Gọi API yêu cầu xác thực bằng Token hợp lệ
```powershell
$headers = @{
    Authorization = "Bearer $token"
}

$pingResp = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/shared/ping" `
  -Method GET `
  -Headers $headers

$pingResp | ConvertTo-Json
```
*Kết quả kỳ vọng*: HTTP `200 OK`, mã phản hồi `code: 1000`, dữ liệu trả về `"pong"`.

### Bước 3: Thực hiện Đăng xuất (Đưa token vào Redis Blacklist)
```powershell
$logoutResp = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/auth/logout" `
  -Method POST `
  -Headers $headers

$logoutResp | ConvertTo-Json
```
*Kết quả kỳ vọng*: HTTP `200 OK`, `code: 1000`, thông điệp `"Đăng xuất thành công"`.

### Bước 4: Kiểm tra trực tiếp Key và TTL trong Redis
Chạy lệnh kiểm tra key blacklist được tạo trong Redis:
```powershell
# Liệt kê các key blacklist
docker exec drmayday-security-test-redis-1 redis-cli keys "drmayday:revoked:*"

# Xem thời gian tồn tại còn lại (TTL tính theo giây) của key
$key = (docker exec drmayday-security-test-redis-1 redis-cli keys "drmayday:revoked:*")[0]
docker exec drmayday-security-test-redis-1 redis-cli ttl $key
```
*Kết quả kỳ vọng*:
- Tên key có dạng: `drmayday:revoked:<uuid-jti>`.
- Lệnh `ttl` trả về một số nguyên dương đại diện cho số giây còn lại (ví dụ `1785`), giảm dần theo thời gian.

### Bước 5: Gọi lại API bằng Token cũ đã logout (Xác nhận bị từ chối)
```powershell
try {
    Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/shared/ping" `
      -Method GET `
      -Headers $headers
} catch {
    $errResp = $_.Exception.Response
    Write-Host "HTTP Status:" $errResp.StatusCode.value__
    $stream = $errResp.GetResponseStream()
    $reader = [System.IO.StreamReader]::new($stream)
    Write-Host "Response Body:" $reader.ReadToEnd()
}
```
*Kết quả kỳ vọng*:
- HTTP Status: `401 Unauthorized`
- Body:
  ```json
  {
    "code": 3008,
    "message": "Phien dang nhap khong hop le hoac da het han"
  }
  ```

### Bước 6: Đăng nhập lại tạo phiên mới
Đăng nhập lại với cùng số điện thoại `0999900011`. Token mới sẽ có `jti` hoàn toàn mới và hoạt động bình thường, chứng minh việc blacklist một phiên không làm tê liệt tài khoản của người dùng.

---

## 6. Xử lý sự cố và lỗi thường gặp (Troubleshooting)

### 6.1 Lỗi: `docker: error during connect ... This error may indicate that the docker daemon is not running`
- **Nguyên nhân**: Docker Desktop chưa được bật trên Windows.
- **Cách xử lý**: Mở ứng dụng **Docker Desktop** từ Start Menu, đợi biểu tượng Docker chuyển sang màu xanh lá cây ("Engine running"), sau đó thử lại lệnh.

### 6.2 Lỗi: `Port 16379 is occupied; refusing to stop an unknown process`
- **Nguyên nhân**: Một ứng dụng khác hoặc một container cũ đang chiếm cổng `16379`.
- **Cách xử lý**:
  ```powershell
  # Tìm PID đang chiếm cổng 16379
  Get-NetTCPConnection -LocalPort 16379 | Select-Object LocalAddress, LocalPort, OwningProcess, State

  # Dừng container chiếm cổng nếu là Docker
  docker stop $(docker ps -q --filter "publish=16379")
  ```

### 6.3 Lỗi: `Connection refused: no further information` / `Unable to connect to Redis`
- **Nguyên nhân**: Backend cấu hình sai cổng (`6379` thay vì `16379`) hoặc container Redis chưa khởi động.
- **Cách xử lý**:
  1. Kiểm tra container: `docker ps --filter "name=redis"`.
  2. Kiểm tra biến môi trường backend: đảm bảo `--spring.data.redis.port=16379`.

### 6.4 Lỗi: HTTP `503` / Code `9901` (`Security service unavailable`)
- **Nguyên nhân**: Redis bị tắt đột ngột hoặc mất kết nối khi backend đang nhận request có kèm Bearer token.
- **Cách xử lý**:
  - Khởi động lại Redis container: `docker start drmayday-security-test-redis-1`.
  - Kiểm tra kết nối bằng `redis-cli ping`.
  - Backend sẽ tự động kết nối lại (auto-reconnect) qua cơ chế Connection Pool của Spring Data Redis / Lettuce mà không cần restart lại Java backend.

### 6.5 Lỗi: Backend chạy trong Docker nhưng gặp lỗi kết nối Redis
- **Nguyên nhân**: Đặt `REDIS_HOST=localhost` hoặc `127.0.0.1` bên trong Docker container.
- **Cách xử lý**: Đổi cấu hình thành `REDIS_HOST=redis` (dùng service name do Docker Compose cung cấp).

---

## 7. Checklist khởi động phục vụ Demo Khách hàng

Trước mỗi buổi demo thực tế cho đối tác / khách hàng, hãy kiểm tra danh sách 5 bước theo thứ tự sau:

- [ ] **Bước 1 — PostgreSQL Online sẵn sàng**:
  - Máy chủ online `160.191.46.107:6432` đang hoạt động.
  - Các tài khoản và dữ liệu demo `DRMAYDAY_TEST_*` đã có sẵn theo tài liệu `docs/testing/ONLINE_DEMO_DATA_MANIFEST.md`.
- [ ] **Bước 2 — Redis Local Container đang UP**:
  - Chạy lệnh: `docker exec drmayday-security-test-redis-1 redis-cli ping`.
  - Nhận kết quả `PONG`.
  - Port `16379` sẵn sàng.
- [ ] **Bước 3 — Biến môi trường Gemini API Key**:
  - Biến môi trường `GEMINI_API_KEY` đã được thiết lập hợp lệ trên máy tính.
- [ ] **Bước 4 — Khởi động Spring Boot Backend**:
  ```powershell
  # Cấu hình biến môi trường
  $env:SPRING_DATASOURCE_PASSWORD = "<ONLINE_DB_PASSWORD>"
  $env:JWT_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  $env:GEMINI_API_KEY = "<GEMINI_API_KEY>"

  # Khởi chạy backend kết nối PostgreSQL Online + Redis Local
  java -cp "backend/target/classes;backend/target/dependency/*" com.drmayday.backend.BackendApplication `
    --server.port=8080 `
    --spring.datasource.url=jdbc:postgresql://160.191.46.107:6432/mayday?sslmode=disable `
    --spring.datasource.username=mayday_app `
    --spring.jpa.hibernate.ddl-auto=none `
    --spring.sql.init.mode=never `
    --spring.flyway.enabled=false `
    --spring.liquibase.enabled=false `
    --security.rbac.source=configuration `
    --security.rbac.admin-permission=DRMAYDAY_TEST_ADMIN_PING `
    --security.rbac.manage-permission=DRMAYDAY_TEST_RBAC_MANAGE `
    --security.rbac.patient-permission=DRMAYDAY_TEST_PATIENT_PING `
    --security.rbac.doctor-permission=DRMAYDAY_TEST_DOCTOR_PING `
    --spring.data.redis.host=127.0.0.1 `
    --spring.data.redis.port=16379 `
    --ai.service.provider=gemini `
    --ai.service.base-url=https://generativelanguage.googleapis.com `
    --ai.service.model=gemini-2.5-flash-lite `
    --ai.service.mode=live `
    --ai.service.allow-mock=false `
    --ai.service.media-root="D:/Workspace/_Project/drmayday/.local/online-test/media"
  ```
- [ ] **Bước 5 — Smoke Test 60 giây**:
  - Đăng nhập thử bằng tài khoản Patient A (`0999900011` / `DrMayDay@2026OnlineTest!`).
  - Gọi `GET /api/v1/shared/ping` nhận `200 OK`.
  - Đăng xuất `POST /api/v1/auth/logout` nhận `200 OK`.
  - Gọi lại `GET /api/v1/shared/ping` nhận `401 / 3008`.

> [!NOTE]
> Container Redis chạy tại `127.0.0.1:16379` phục vụ cho môi trường phát triển (development), kiểm thử tích hợp và demo hiện tại của dự án. Khi đưa hệ thống lên môi trường Production thực tế, hệ thống sẽ được kết nối tới cụm Redis Cluster / Cloud có cơ chế sao lưu dự phòng và xác thực mật khẩu riêng.

