# Backend Phân hệ Bệnh nhân - Dự án DrMayDay (Đầu việc 2)

Hệ thống Backend RESTful API phục vụ **Phân hệ Bệnh nhân (Đầu việc 2)** trong đề tài **Hệ thống Quản lý Bệnh án Điện tử và Hỗ trợ Chẩn đoán, Điều trị Bệnh Mề đay (DrMayDay)**, được xây dựng bằng **Node.js + Express + PostgreSQL (`pg` / `@electric-sql/pglite`)** và bám sát 100% đặc tả kỹ thuật trong bộ 11 Slides (`SLIDE1_DrMayDay.pptx` – `SLIDE11_DrMayDay.pptx`), Bản Phân chia Công việc và Cơ sở dữ liệu gốc (`mayday-database/final_restructured.sql`).

---

## 1. Cam kết Tuân thủ Yêu cầu Đề bài
1. **Giữ nguyên 100% Database gốc**: Repository `d:\CNWeb\BTL\mayday-database` (`final_restructured.sql`) hoàn toàn không bị chỉnh sửa bất kỳ dòng nào (`git status` sạch tuyệt đối).
2. **Đầy đủ chức năng Backend Phân hệ Bệnh nhân (Đầu việc 2)**:
   - **Xác thực & Hồ sơ cá nhân (Slide 2)**: Đăng ký (`signup`), Đăng nhập (`login`), Đăng xuất thu hồi JWT (`logout` + `token_blacklist`), Quên mật khẩu (`forgot-password`), Đổi mật khẩu (`change-password`), Xem & Cập nhật hồ sơ hành chính, địa chỉ 3 cấp, BHYT, người thân (`GET/PUT /api/v1/profile`).
   - **Sàng lọc Báo động đỏ, Phân loại & Hồ sơ Bệnh án Mề đay (Slide 5, 7, 10, 11)**: Sàng lọc triệu chứng phản vệ nguy kịch (`sanglocbaodongdo`), Lấy bộ câu hỏi phân loại (`medrec01`), Suy diễn tự động bệnh án Cấp tính (`CAP` < 6 tuần) / Mạn tính (`MAN` ≥ 6 tuần) (`medrec02`), Khởi tạo bệnh án thỏa mãn khóa ngoại `DEFERRABLE INITIALLY DEFERRED` (`medrec03`), Xem chi tiết (`medrec05`), Xem tóm tắt (`medrec06`), Xem lịch sử khám (`medrec13`), Lấy & Upsert câu trả lời biểu mẫu động 4 tầng đồng bộ 2 chiều vào các bảng lâm sàng PostgreSQL (`medrec08`, `medrec10`), Lấy cây biểu mẫu 4 tầng (`tmpl03`), Tra cứu kết quả xét nghiệm cận lâm sàng (`lab02`) và Đơn thuốc điện tử.
   - **Thang điểm UAS7 & Nhật ký Phù mạch AAS hằng ngày (Slide 6)**: Kiểm tra điều kiện chấm điểm (`uas701`), Chấm điểm UAS7 hằng ngày tự động quản lý chu kỳ 7 ngày (`chukytheodoiuas7` & `nhatkyuashangngay`) và chặn trùng ngày `UNIQUE(ma_benh_nhan, ngay_cham_diem)` (`uas702`), Xem lịch sử điểm UAS7 (`uas704`), Ghi nhận & tra cứu nhật ký phù mạch hằng ngày (`nhatkyaashangngay`).
   - **Theo dõi Tổn thương da 3 cấp & Kho ảnh đính kèm (Slide 8 & Slide 9)**: Quản lý Đợt bùng phát tổn thương (`dottonthuongda` - `lesion01..06`), Vị trí cơ thể bị tổn thương (`vitritonthuong` - `loc01..05`), Ảnh chụp tiến triển 3 mốc (`start`, `peak`, `normal`) kèm điểm triệu chứng NRS 0–10 (`anhchuptonthuong` - `lphoto01..04`), Tải lên kho ảnh (`tepdinhkem` - `img01, img03, img05`), Đính kèm ảnh vào câu trả lời phiếu khám (`ansimg01, ansimg03, ansimg04`), và Khóa chỉnh sửa toàn diện khi bệnh án đã Hoàn thành (`4003 Medical record already completed`).
3. **Code có chú thích (comment) tiếng Việt chi tiết** trên toàn bộ các file cấu hình, middleware, controller, route và bộ kiểm thử.

---

## 2. Cấu trúc Thư mục Dự án

```text
d:\CNWeb\BTL\
├── mayday-database\                  # Repo CSDL gốc clone từ GitHub (GIỮ NGUYÊN 100%)
│   └── final_restructured.sql        # Schema PostgreSQL 16 (35 bảng, 1 view, 6 hàm PL/pgSQL)
├── backend-benh-nhan\                # Mã nguồn Backend Phân hệ Bệnh nhân (Đầu việc 2)
│   ├── src\
│   │   ├── config\
│   │   │   ├── database.js           # Kết nối PostgreSQL (pg.Pool hoặc PGlite nạp final_restructured.sql)
│   │   │   ├── responseCodes.js      # Bộ mã phản hồi chuẩn hóa (1000..9999)
│   │   │   └── runtimeStore.js       # Quản lý biểu mẫu 4 tầng, token_blacklist, ánh xạ câu trả lời động
│   │   ├── middlewares\
│   │   │   └── authMiddleware.js     # Xác thực JWT, kiểm tra token_blacklist, khóa tài khoản & RBAC
│   │   ├── controllers\
│   │   │   ├── authController.js           # Xử lý API Slide 2 (Auth & Profile)
│   │   │   ├── medicalRecordController.js  # Xử lý API Slide 5, 7, 10, 11 (Bệnh án, Sàng lọc, Xét nghiệm, Đơn thuốc)
│   │   │   ├── uas7Controller.js           # Xử lý API Slide 6 (UAS7 & AAS hằng ngày)
│   │   │   └── lesionController.js         # Xử lý API Slide 8 & 9 (Tổn thương da 3 cấp & Kho ảnh)
│   │   ├── routes\
│   │   │   └── patientRoutes.js      # Định tuyến toàn bộ RESTful API (/api/v1/...)
│   │   └── server.js                 # Điểm khởi chạy Express Server
│   ├── tests\
│   │   └── run_all_tests.js          # Bộ kiểm thử tự động 34 kịch bản (Pass 34/34 - 100%)
│   ├── data\
│   │   └── test_results.json         # Kết quả kiểm thử tự động xuất ra JSON
│   ├── .env                          # Biến môi trường
│   └── package.json                  # Khai báo dependencies & scripts
└── Bao_Cao_Backend_Phan_He_Benh_Nhan_DrMayDay.pdf  # Báo cáo kỹ thuật chi tiết dạng PDF
```

---

## 3. Hướng dẫn Cài đặt & Chạy Hệ thống

### Cấu hình biến môi trường (`.env`)
Hệ thống hỗ trợ 2 chế độ kết nối PostgreSQL linh hoạt:
- **Chế độ 1 (Mặc định - Chạy ngay không cần cài PostgreSQL rời)**: Đặt `USE_EMBEDDED_PG=true` trong `.env`. Hệ thống sử dụng nhân PostgreSQL 16 nhúng (`@electric-sql/pglite`) tự động nạp trực tiếp file `../mayday-database/final_restructured.sql`.
- **Chế độ 2 (Kết nối PostgreSQL Server độc lập)**: Đặt `USE_EMBEDDED_PG=false` và cấu hình `DATABASE_URL=postgresql://postgres:password@localhost:5432/mayday_db`.

### Khởi chạy Server
```bash
npm start
```

### Chạy Bộ Kiểm thử Tự động (34 Test Cases)
```bash
npm test
```
Toàn bộ 34/34 Test Cases bao phủ các mã phản hồi (`1000`, `1001`, `2001`–`2004`, `3001`–`3009`, `3106`, `4001`–`4006`, `4101`, `5002`–`5004`, `6001`–`6006`, `7001`–`7007`) đều đạt **100% PASS**.

