/**
 * @file src/config/demoSeeder.js
 * @description Khởi tạo dữ liệu mẫu lâm sàng đầy đủ trên schema gốc `final_restructured.sql`
 * (không sửa bất kỳ dòng DDL nào) khi chạy hệ thống hợp nhất (`SEED_DEMO_DATA=true`).
 * Không kích hoạt trong bộ unit test để đảm bảo 100% tính cô lập kiểm thử.
 */

const bcrypt = require('bcryptjs');
const { state, saveStore } = require('./runtimeStore');

/**
 * Định dạng YYYY-MM-DD lệch `offsetDays` so với hôm nay theo giờ cục bộ
 */
function localDateOffset(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function seedDemoDataIfNeeded({ rawQuery, withTransaction }) {
  try {
    const existingDemo = await rawQuery(
      `SELECT ma_tai_khoan FROM public.taikhoan WHERE ten_dang_nhap = $1 LIMIT 1`,
      ['0912345678']
    );
    if (existingDemo.rowCount > 0) {
      return;
    }

    console.log('[Seeder] Đang khởi tạo dữ liệu mẫu lâm sàng cho Hệ thống DrMayDay...');
    const passwordHash = await bcrypt.hash('password123', 10);

    // Lấy map vai trò từ bảng public.vaitro
    const rolesRes = await rawQuery(`SELECT ma_vai_tro, ten_vai_tro FROM public.vaitro`);
    const roleMap = {};
    for (const r of rolesRes.rows) {
      roleMap[r.ten_vai_tro] = Number(r.ma_vai_tro);
    }
    const adminRoleId = roleMap.admin || 1;
    const doctorRoleId = roleMap.bac_si || 2;
    const nurseRoleId = roleMap.dieu_duong || 3;
    const patientRoleId = roleMap.benh_nhan || 4;

    // Đảm bảo có ít nhất 2 chi nhánh và các phòng khám thực tế trong public.chinhanh / public.phongkham
    const branchesRes = await rawQuery(`SELECT ma_chi_nhanh FROM public.chinhanh ORDER BY ma_chi_nhanh ASC`);
    let branch1Id = branchesRes.rows[0] ? Number(branchesRes.rows[0].ma_chi_nhanh) : null;
    let branch2Id = branchesRes.rows[1] ? Number(branchesRes.rows[1].ma_chi_nhanh) : null;

    if (!branch1Id) {
      const b1 = await rawQuery(
        `INSERT INTO public.chinhanh (ten_chi_nhanh, dia_chi, so_dien_thoai, trang_thai)
         VALUES ($1, $2, $3, true) RETURNING ma_chi_nhanh`,
        ['Bệnh viện Da liễu Trung ương - Cơ sở 1', '15A Phương Mai, Đống Đa, Hà Nội', '0243852265']
      );
      branch1Id = Number(b1.rows[0].ma_chi_nhanh);
    }
    if (!branch2Id) {
      const b2 = await rawQuery(
        `INSERT INTO public.chinhanh (ten_chi_nhanh, dia_chi, so_dien_thoai, trang_thai)
         VALUES ($1, $2, $3, true) RETURNING ma_chi_nhanh`,
        ['Bệnh viện Da liễu Trung ương - Cơ sở 2', 'Quốc Oai, Hà Nội', '0243852299']
      );
      branch2Id = Number(b2.rows[0].ma_chi_nhanh);
    }

    await rawQuery(
      `INSERT INTO public.phongkham (ma_chi_nhanh, ten_phong_kham)
       VALUES ($1, 'Phòng Khám Chuyên Đề Mày Đay 302'),
              ($1, 'Phòng Xét Nghiệm Dị Ứng & IgE'),
              ($2, 'Phòng Test Áp & Kích Thích Lạnh')
       ON CONFLICT (ma_chi_nhanh, ten_phong_kham) DO NOTHING`,
      [branch1Id, branch2Id]
    );
    const pkRoomRes = await rawQuery(
      `SELECT ma_phong_kham FROM public.phongkham WHERE ma_chi_nhanh = $1 ORDER BY ma_phong_kham ASC LIMIT 1`,
      [branch1Id]
    );
    const defaultDbRoomId = pkRoomRes.rows[0] ? Number(pkRoomRes.rows[0].ma_phong_kham) : null;

    // Bổ sung thêm danh mục thuốc chuẩn điều trị Mày đay
    await rawQuery(
      `INSERT INTO public.thuoc (ma_thuoc, ten_thuoc, hoat_chat, nhom_dieu_tri)
       VALUES
         ('THUOC_CETIRIZINE_10', 'Zyrtec 10mg', 'Cetirizine', 'Khang histamine H1 TH2'),
         ('THUOC_LEVOCETIRIZINE_5', 'Xyzal 5mg', 'Levocetirizine', 'Khang histamine H1 TH2'),
         ('THUOC_DESLORATADINE_5', 'Aerius 5mg', 'Desloratadine', 'Khang histamine H1 TH2'),
         ('THUOC_PREDNISOLONE_5', 'Prednisolone 5mg', 'Prednisolone', 'Corticosteroid toan than'),
         ('THUOC_CYCLOSPORINE_25', 'Neoral 25mg', 'Cyclosporine', 'Uc che mien dich')
       ON CONFLICT (ma_thuoc) DO NOTHING`
    );

    await withTransaction(async (client) => {
      // Helper tạo nhân sự (Admin / Bác sĩ / Điều dưỡng)
      async function createStaffAccount({ fullName, dob, gender, phone, city, roleId, branchId, deptId, roomId, empCode, specialty }) {
        const pRes = await client.query(
          `INSERT INTO public.nguoi (ho_ten, ngay_sinh, gioi_tinh, so_dien_thoai, dia_chi_tinh_tp)
           VALUES ($1, $2, $3, $4, $5) RETURNING ma_nguoi`,
          [fullName, dob, gender, phone, city]
        );
        const userId = Number(pRes.rows[0].ma_nguoi);
        await client.query(
          `INSERT INTO public.taikhoan (ma_nguoi, ma_vai_tro, ten_dang_nhap, mat_khau_ma_hoa, trang_thai_hoat_dong)
           VALUES ($1, $2, $3, $4, true)`,
          [userId, roleId, phone, passwordHash]
        );
        if (roleId === doctorRoleId || roleId === nurseRoleId) {
          await client.query(
            `INSERT INTO public.nhanvien (ma_nhan_vien, ma_chi_nhanh) VALUES ($1, $2)`,
            [userId, branchId]
          );
        }
        if (!state.staffAssignments) state.staffAssignments = {};
        state.staffAssignments[userId] = {
          user_id: userId,
          branch_id: branchId,
          department_id: deptId,
          room_id: roomId,
          employee_code: empCode,
          specialty
        };
        return userId;
      }

      // Helper tạo bệnh nhân
      async function createPatientAccount({ fullName, dob, gender, phone, city, commune, hamlet, hisCode, career, bhyt, bhytExp, kinName, kinPhone, workPlace }) {
        const pRes = await client.query(
          `INSERT INTO public.nguoi (ho_ten, ngay_sinh, gioi_tinh, so_dien_thoai, dia_chi_tinh_tp, dia_chi_xa_phuong, dia_chi_so_nha_thon_pho)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ma_nguoi`,
          [fullName, dob, gender, phone, city, commune, hamlet]
        );
        const userId = Number(pRes.rows[0].ma_nguoi);
        await client.query(
          `INSERT INTO public.benhnhan (ma_benh_nhan, ma_his, nghe_nghiep, dan_toc, bhyt_so_the, bhyt_gia_tri_den, nguoi_nha_ho_ten_dia_chi, nguoi_nha_so_dien_thoai)
           VALUES ($1, $2, $3, 'Kinh', $4, $5, $6, $7)`,
          [userId, hisCode, career, bhyt, bhytExp, kinName, kinPhone]
        );
        const tkRes = await client.query(
          `INSERT INTO public.taikhoan (ma_nguoi, ma_vai_tro, ten_dang_nhap, mat_khau_ma_hoa, trang_thai_hoat_dong)
           VALUES ($1, $2, $3, $4, true) RETURNING ma_tai_khoan`,
          [userId, patientRoleId, phone, passwordHash]
        );
        state.userExtraProfile[userId] = {
          work_place: workPlace || 'Hà Nội',
          career_display: career
        };
        return { userId, accountId: Number(tkRes.rows[0].ma_tai_khoan) };
      }

      const adminId = await createStaffAccount({
        fullName: 'Quản Trị Viên Hệ Thống',
        dob: '1988-03-12',
        gender: 'Nam',
        phone: '0903000999',
        city: 'Hà Nội',
        roleId: adminRoleId,
        branchId: branch1Id,
        deptId: 1,
        roomId: 1,
        empCode: 'ADM-001',
        specialty: 'Quản trị Hệ thống CNTT Y tế'
      });

      const doc1Id = await createStaffAccount({
        fullName: 'TS.BS. Nguyễn Văn Hùng',
        dob: '1979-09-20',
        gender: 'Nam',
        phone: '0988765432',
        city: 'Hà Nội',
        roleId: doctorRoleId,
        branchId: branch1Id,
        deptId: 2,
        roomId: 2,
        empCode: 'BS-101',
        specialty: 'Da liễu & Miễn dịch lâm sàng'
      });

      await createStaffAccount({
        fullName: 'ThS.BS. Lê Thị Bình',
        dob: '1986-04-15',
        gender: 'Nu',
        phone: '0977123456',
        city: 'Hà Nội',
        roleId: doctorRoleId,
        branchId: branch1Id,
        deptId: 1,
        roomId: 1,
        empCode: 'BS-102',
        specialty: 'Dị ứng & Miễn dịch lâm sàng'
      });

      await createStaffAccount({
        fullName: 'ĐD. Phạm Thùy Linh',
        dob: '1995-07-08',
        gender: 'Nu',
        phone: '0966123456',
        city: 'Hà Nội',
        roleId: nurseRoleId,
        branchId: branch1Id,
        deptId: 2,
        roomId: 3,
        empCode: 'DD-204',
        specialty: 'Điều dưỡng Chuyên khoa Da liễu'
      });

      const pat1 = await createPatientAccount({
        fullName: 'Nguyễn Thị Mai',
        dob: '1994-05-18',
        gender: 'Nu',
        phone: '0912345678',
        city: 'Hà Nội',
        commune: 'Phường Phương Mai, Quận Đống Đa',
        hamlet: 'Số 18 Ngõ 102 Trường Chinh',
        hisCode: 'DL-2026-0888',
        career: 'Can bo cong chuc',
        bhyt: 'DN4010123456789',
        bhytExp: '2026-12-31',
        kinName: 'Nguyễn Văn Tuấn (Chồng)',
        kinPhone: '0987111222',
        workPlace: 'Trường Đại học Kinh tế Quốc dân'
      });

      const pat2 = await createPatientAccount({
        fullName: 'Trần Văn Nam',
        dob: '1982-08-20',
        gender: 'Nam',
        phone: '0904556677',
        city: 'Hà Nội',
        commune: 'Phường Dịch Vọng, Quận Cầu Giấy',
        hamlet: 'Số 45 Phố Thành Thái',
        hisCode: 'DL-2026-0889',
        career: 'Cong nhan',
        bhyt: 'GD4010987654321',
        bhytExp: '2026-12-31',
        kinName: 'Phạm Thị Hoa (Vợ)',
        kinPhone: '0915222333',
        workPlace: 'Khu Công nghiệp Bắc Thăng Long'
      });

      const pat3 = await createPatientAccount({
        fullName: 'Lê Hoàng Yến',
        dob: '2001-11-10',
        gender: 'Nu',
        phone: '0903112233',
        city: 'Hải Phòng',
        commune: 'Phường Lạch Tray, Quận Ngô Quyền',
        hamlet: 'Số 120 Lạch Tray',
        hisCode: 'DL-2026-0890',
        career: 'Hoc sinh - Sinh vien',
        bhyt: 'HT4010112233445',
        bhytExp: '2026-12-31',
        kinName: 'Lê Văn Hải (Bố)',
        kinPhone: '0913444555',
        workPlace: 'Sinh viên Đại học Y'
      });

      // ======================================================================
      // BỆNH ÁN 1: MẠN TÍNH (MAN) - ĐANG KHÁM ('in_progress') - BN NGUYỄN THỊ MAI
      // ======================================================================
      const rec1Res = await client.query(
        `INSERT INTO public.hosobenhan (
           ma_benh_nhan, loai_benh_an, thoi_diem_kham_lan_dau,
           ngay_bat_dau_dieu_tri_ngoai_tru, chan_doan_ban_dau_phong_kham,
           thoi_gian_khoi_phat_tuan, trang_thai, tien_su_gia_dinh, tien_su_gia_dinh_ghi_ro,
           da_dieu_tri_truoc_kham
         )
         VALUES ($1, 'MAN', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_DATE - 7,
                 'Mày đay mạn tính tự phát (CSU) phối hợp da vẽ nổi', 10, 'in_progress',
                 'Co', 'Mẹ ruột có tiền sử viêm mũi dị ứng', true)
         RETURNING ma_ho_so`,
        [pat1.userId]
      );
      const rec1Id = Number(rec1Res.rows[0].ma_ho_so);

      await client.query(
        `INSERT INTO public.benhanmaydayman (
           ma_ho_so, chan_doan_chinh, phan_nhom_csu, chung_da_ve_noi,
           may_day_cholinergic, bieu_hien_qua_trinh_benh
         )
         VALUES ($1, 'CSU + CIndU', 'CSU Type I', true, true, 'San phu + phu mach')`,
        [rec1Id]
      );

      const visit1Res = await client.query(
        `INSERT INTO public.phienkham (
           ma_ho_so, ma_bac_si, ma_phong_kham, loai_benh_an, ngay_kham, lan_kham_thu,
           tom_tat_buoi_kham, huong_xu_tri_lan_sau, dan_do, ngay_hen_tai_kham
         )
         VALUES ($1, $2, $3, 'MAN', CURRENT_DATE, 1,
                 'Mày đay mạn tính bùng phát > 6 tuần, sẩn phù rải rác cẳng tay và vùng cổ, kèm ngứa nhiều về đêm.',
                 'Đánh giá đáp ứng kháng Histamine H1 liều chuẩn sau 2 tuần; cân nhắc tăng liều gấp 2-4 lần nếu UAS7 >= 16.',
                 'Uống thuốc đúng giờ sau ăn tối, tránh gãi chà xát mạnh, chấm điểm UAS7 mỗi ngày trên ứng dụng DrMayDay.',
                 CURRENT_DATE + 14)
         RETURNING ma_phien_kham`,
        [rec1Id, doc1Id, defaultDbRoomId]
      );
      const visit1Id = Number(visit1Res.rows[0].ma_phien_kham);

      await client.query(
        `INSERT INTO public.phienkhamman (
           ma_phien_kham, hien_tai_co_san_phu, vi_tri_san_phu, trong_dot_co_phu_mach, diem_aas7
         )
         VALUES ($1, true, 'Cẳng tay phải, vùng cổ và lưng trên', true, 7)`,
        [visit1Id]
      );

      // Đơn thuốc cho Bệnh án 1
      const rx1Res = await client.query(
        `INSERT INTO public.donthuoc (
           ma_ho_so, ma_phien_kham, ngay_ke_don, trang_thai_don, ghi_chu_dieu_tri,
           ngung_thuoc_lan_sau, thuoc_can_ngung_truoc_tai_kham
         )
         VALUES ($1, $2, CURRENT_DATE, 'DANG_DIEU_TRI',
                 'Phác đồ bậc 1 EAACI/GA²LEN/EuroGuiDerm. Theo dõi sát điểm UAS7 hằng ngày.',
                 true, 'Ngừng kháng Histamine tối thiểu 5 ngày trước khi làm ASST tái khám')
         RETURNING ma_don_thuoc`,
        [rec1Id, visit1Id]
      );
      const rx1Id = Number(rx1Res.rows[0].ma_don_thuoc);

      await client.query(
        `INSERT INTO public.chitietdonthuoc (ma_don_thuoc, ma_thuoc, ten_thuoc_bo_sung, lieu_dung, thoi_gian_dung)
         VALUES
           ($1, 'THUOC_FEXOFENADINE_180', NULL, '1 viên/ngày (uống buổi tối)', '14 ngày (14 viên)'),
           ($1, NULL, 'Montelukast 10mg', '1 viên/ngày (trước khi ngủ)', '14 ngày (14 viên)'),
           ($1, NULL, 'Kem dưỡng ẩm phục hồi Ceramide', 'Thoa mỏng vùng da khô ngứa 2 lần/ngày', '14 ngày (01 tuýp)')`,
        [rx1Id]
      );

      // Kết quả cận lâm sàng cho Bệnh án 1
      const lab1Res = await client.query(
        `INSERT INTO public.ketquacanlamsang (
           ma_phien_kham, loai_ket_qua_can_lam_sang, wbc, crp, ige_toan_phan,
           xet_nghiem_khac, can_lam_sang_khac_ghi_chu, thoi_diem_thuc_hien
         )
         VALUES ($1, 'MAN', 8.4, 3.2, 348.5,
                 'Định lượng IgE toàn phần, Tổng phân tích tế bào máu ngoại vi, Anti-TPO, FricTest',
                 'IgE toàn phần tăng cao (348.5 IU/mL), phù hợp kiểu hình CSU Type I tự dị ứng.',
                 CURRENT_TIMESTAMP - INTERVAL '2 hours')
         RETURNING ma_ket_qua_can_lam_sang`,
        [visit1Id]
      );
      const lab1Id = Number(lab1Res.rows[0].ma_ket_qua_can_lam_sang);

      await client.query(
        `INSERT INTO public.ketquacanlamsangman (
           ma_ket_qua_can_lam_sang, test_huyet_thanh_tu_than, eo, anti_tpo, tsh, ft4
         )
         VALUES ($1, 'Chua lam', 0.42, 38.5, 2.14, 15.6)`,
        [lab1Id]
      );

      // Chu kỳ 7 ngày UAS7 từ hôm qua trở về 7 ngày trước (để hôm nay trống cho người dùng test chấm điểm trực tiếp!)
      const cycleStart = localDateOffset(-7);
      const cycleRes = await client.query(
        `INSERT INTO public.chukytheodoiuas7 (ma_benh_nhan, ngay_bat_dau, ngay_ket_thuc, trang_thai_chu_ky)
         VALUES ($1, $2::date, ($2::date + 6), 'HOAN_THANH')
         RETURNING ma_chu_ky`,
        [pat1.userId, cycleStart]
      );
      const cycleId = Number(cycleRes.rows[0].ma_chu_ky);

      const sampleUas = [
        { day: 1, offset: -7, hss: 3, iss: 3, note: 'Bùng phát nhiều sẩn phù sau khi đi nắng' },
        { day: 2, offset: -6, hss: 3, iss: 2, note: 'Còn ngứa nhiều vùng cổ và hai cẳng tay' },
        { day: 3, offset: -5, hss: 2, iss: 2, note: 'Đáp ứng một phần sau uống Telfast HD 180mg' },
        { day: 4, offset: -4, hss: 2, iss: 2, note: 'Nổi sẩn rải rác buổi tối' },
        { day: 5, offset: -3, hss: 2, iss: 1, note: 'Giảm ngứa rõ rệt, ngủ ngon hơn' },
        { day: 6, offset: -2, hss: 1, iss: 2, note: 'Xuất hiện vài nốt sẩn nhỏ khi ma sát cổ áo' },
        { day: 7, offset: -1, hss: 1, iss: 1, note: 'Tình trạng ổn định, chỉ còn ít nốt mờ' }
      ];

      for (const item of sampleUas) {
        const dStr = localDateOffset(item.offset);
        await client.query(
          `INSERT INTO public.nhatkyuashangngay (
             ma_chu_ky, ma_ho_so_man, ma_benh_nhan, ngay_cham_diem,
             ngay_thu_may_trong_chu_ky, diem_san_phu_hss, diem_ngua_iss,
             trang_thai_dung_thuoc, trang_thai_ngay
           )
           VALUES ($1, $2, $3, $4::date, $5, $6, $7, 'DUNG_THUOC_DEU', 'HOP_LE')`,
          [cycleId, rec1Id, pat1.userId, dStr, item.day, item.hss, item.iss]
        );
        state.uas7Notes[`${pat1.userId}_${dStr}`] = {
          note: item.note,
          medical_record_id: String(rec1Id),
          created_at: new Date().toISOString()
        };
      }

      // Nhật ký phù mạch AAS mẫu
      await client.query(
        `INSERT INTO public.nhatkyaashangngay (
           ma_benh_nhan, ma_ho_so_man, ngay_theo_doi, co_dot_sung_phu,
           thoi_diem_xuat_hien, muc_kho_chiu, han_che_hoat_dong, anh_huong_ngoai_hinh, do_nang_tong_the
         )
         VALUES
           ($1, $2, $3::date, true, 'Buổi sáng khi thức dậy', 2, 1, 2, 2),
           ($1, $2, $4::date, false, NULL, NULL, NULL, NULL, NULL)`,
        [pat1.userId, rec1Id, localDateOffset(-5), localDateOffset(-2)]
      );

      // Đợt tổn thương da 3 mốc tiến triển (start / peak / normal) cho Bệnh án 1
      const epRes = await client.query(
        `INSERT INTO public.dottonthuongda (
           ma_benh_nhan, ma_ho_so_man, ten_dot_ton_thuong_da, thoi_diem_xuat_hien,
           hoan_canh_xuat_hien, chi_tiet_dot_ton_thuong
         )
         VALUES ($1, $2, 'Đợt bùng phát sẩn phù tuần này', CURRENT_TIMESTAMP - INTERVAL '5 days',
                 'Sau vận động & thời tiết giao mùa', 'Sẩn phù gồ cao nền đỏ vùng cẳng tay và cổ')
         RETURNING ma_dot_ton_thuong_da`,
        [pat1.userId, rec1Id]
      );
      const epId = Number(epRes.rows[0].ma_dot_ton_thuong_da);
      state.lesionEpisodeMeta[String(epId)] = {
        medical_record_id: String(rec1Id),
        context_tags: 'Sau vận động & thời tiết giao mùa',
        context_other: null
      };

      const locRes = await client.query(
        `INSERT INTO public.vitritonthuong (
           ma_dot_ton_thuong_da, vi_tri_co_the, thoi_diem_xuat_hien, hoan_canh_xuat_hien
         )
         VALUES ($1, 'Cẳng tay phải & Vùng cổ', CURRENT_TIMESTAMP - INTERVAL '5 days', 'Sau vận động')
         RETURNING ma_vi_tri_ton_thuong`,
        [epId]
      );
      const locId = Number(locRes.rows[0].ma_vi_tri_ton_thuong);

      const samplePhotos = [
        {
          fileName: 'lesion_onset_arm.jpg',
          url: '/images/clinic/clinic-urticaria-rash.jpg',
          milestone: 'start',
          itch: 5,
          pain: 1,
          burn: 3,
          hives: 14,
          auas: 1.8,
          hoursAgo: 96
        },
        {
          fileName: 'lesion_peak_arm.jpg',
          url: '/images/clinic/clinic-examination.jpg',
          milestone: 'peak',
          itch: 8,
          pain: 2,
          burn: 5,
          hives: 32,
          auas: 2.7,
          hoursAgo: 48
        },
        {
          fileName: 'lesion_remission_arm.jpg',
          url: '/images/clinic/clinic-consultation-02.jpg',
          milestone: 'normal',
          itch: 2,
          pain: 0,
          burn: 1,
          hives: 3,
          auas: 0.5,
          hoursAgo: 12
        }
      ];

      for (const ph of samplePhotos) {
        const attRes = await client.query(
          `INSERT INTO public.tepdinhkem (
             ma_ho_so, ma_tai_khoan, ten_tep_goc, duong_dan_luu_tru, duong_dan_url,
             dinh_dang_tep, loai_phuong_tien, dung_luong_byte, phan_loai_muc_dich, mo_ta_tep
           )
           VALUES ($1, $2, $3, $4, $4, 'image/jpeg', 'IMAGE', 245760, 'LESION_PHOTO', 'Ảnh theo dõi tiến triển sẩn phù')
           RETURNING ma_tep_dinh_kem`,
          [rec1Id, pat1.accountId, ph.fileName, ph.url]
        );
        const attId = Number(attRes.rows[0].ma_tep_dinh_kem);

        await client.query(
          `INSERT INTO public.anhchuptonthuong (
             ma_tep_dinh_kem, ma_dot_ton_thuong_da, ma_vi_tri_ton_thuong,
             thoi_diem_chup, moc_tien_trien, diem_ngua_nrs, diem_dau_nrs, diem_bong_rat_nrs,
             so_luong_not_san, chi_so_auas_cuc_bo, url_anh
           )
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP - ($4 * INTERVAL '1 hour'), $5, $6, $7, $8, $9, $10, $11)`,
          [attId, epId, locId, ph.hoursAgo, ph.milestone, ph.itch, ph.pain, ph.burn, ph.hives, ph.auas, ph.url]
        );
      }

      state.recordMeta[rec1Id] = {
        template_id: 'TMPL_URT_CHRONIC',
        created_by: pat1.userId,
        assigned_doctor_id: doc1Id,
        instructions: 'Uống thuốc đúng giờ sau ăn tối, tránh gãi chà xát mạnh, chấm điểm UAS7 mỗi ngày.',
        created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
        completed_at: null
      };

      // ======================================================================
      // BỆNH ÁN 2: CẤP TÍNH (CAP) - CHỜ KHÁM ('pending') - BN TRẦN VĂN NAM
      // ======================================================================
      const rec2Res = await client.query(
        `INSERT INTO public.hosobenhan (
           ma_benh_nhan, loai_benh_an, thoi_diem_kham_lan_dau,
           ngay_bat_dau_dieu_tri_ngoai_tru, chan_doan_ban_dau_phong_kham,
           thoi_gian_khoi_phat_tuan, trang_thai, tien_su_gia_dinh, da_dieu_tri_truoc_kham
         )
         VALUES ($1, 'CAP', CURRENT_TIMESTAMP - INTERVAL '45 minutes', CURRENT_DATE,
                 'Theo dõi mày đay cấp tính nghi dị ứng hải sản', 0.5, 'pending', 'Khong', false)
         RETURNING ma_ho_so`,
        [pat2.userId]
      );
      const rec2Id = Number(rec2Res.rows[0].ma_ho_so);

      await client.query(
        `INSERT INTO public.benhanmaydaycap (
           ma_ho_so, nhom_yeu_to_nghi_ngo, co_nghi_ngo_dot_nay, ten_yeu_to_nghi_ngo, cd_may_day_cap_thong_thuong
         )
         VALUES ($1, 'Thuc an', true, 'Tôm biển & Ghẹ hấp', true)`,
        [rec2Id]
      );

      state.recordMeta[rec2Id] = {
        template_id: 'TMPL_URT_ACUTE',
        created_by: pat2.userId,
        assigned_doctor_id: null,
        instructions: null,
        created_at: new Date(Date.now() - 45 * 60000).toISOString(),
        completed_at: null
      };

      // ======================================================================
      // BỆNH ÁN 3: MẠN TÍNH (MAN) - HOÀN TẤT ('completed') - BN LÊ HOÀNG YẾN
      // ======================================================================
      const rec3Res = await client.query(
        `INSERT INTO public.hosobenhan (
           ma_benh_nhan, loai_benh_an, thoi_diem_kham_lan_dau,
           ngay_bat_dau_dieu_tri_ngoai_tru, ngay_ket_thuc_dieu_tri_ngoai_tru,
           chan_doan_ban_dau_phong_kham, ket_qua_dieu_tri_bao_hiem,
           thoi_gian_khoi_phat_tuan, trang_thai, tien_su_gia_dinh, da_dieu_tri_truoc_kham
         )
         VALUES ($1, 'MAN', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_DATE - 14, CURRENT_DATE - 1,
                 'Mày đay cảm ứng vật lý - Chứng da vẽ nổi (Symptomatic Dermographism)', 'Do',
                 8, 'completed', 'Khong', true)
         RETURNING ma_ho_so`,
        [pat3.userId]
      );
      const rec3Id = Number(rec3Res.rows[0].ma_ho_so);

      await client.query(
        `INSERT INTO public.benhanmaydayman (
           ma_ho_so, chan_doan_chinh, phan_nhom_csu, chung_da_ve_noi, bieu_hien_qua_trinh_benh
         )
         VALUES ($1, 'CIndU', 'Khong xac dinh', true, 'Chi san phu')`,
        [rec3Id]
      );

      const visit3Res = await client.query(
        `INSERT INTO public.phienkham (
           ma_ho_so, ma_bac_si, ma_phong_kham, loai_benh_an, ngay_kham, lan_kham_thu,
           tom_tat_buoi_kham, huong_xu_tri_lan_sau, dan_do
         )
         VALUES ($1, $2, $3, 'MAN', CURRENT_DATE - 1, 1,
                 'Đáp ứng tốt với Bilastine 20mg/ngày, điểm FricTest giảm từ 4+ xuống 1+.',
                 'Duy trì liều chuẩn thêm 4 tuần và tái khám định kỳ.',
                 'Mặc quần áo rộng thoáng, tránh ma sát mạnh lên da.')
         RETURNING ma_phien_kham`,
        [rec3Id, doc1Id, defaultDbRoomId]
      );
      const visit3Id = Number(visit3Res.rows[0].ma_phien_kham);

      await client.query(
        `INSERT INTO public.phienkhamman (ma_phien_kham, hien_tai_co_san_phu, vi_tri_san_phu)
         VALUES ($1, false, 'Cẳng tay hai bên')`,
        [visit3Id]
      );

      const rx3Res = await client.query(
        `INSERT INTO public.donthuoc (
           ma_ho_so, ma_phien_kham, ngay_ke_don, trang_thai_don, ghi_chu_dieu_tri, ngung_thuoc_lan_sau
         )
         VALUES ($1, $2, CURRENT_DATE - 1, 'HOAN_THANH', 'Đáp ứng lâm sàng tốt.', false)
         RETURNING ma_don_thuoc`,
        [rec3Id, visit3Id]
      );
      await client.query(
        `INSERT INTO public.chitietdonthuoc (ma_don_thuoc, ma_thuoc, ten_thuoc_bo_sung, lieu_dung, thoi_gian_dung)
         VALUES ($1, 'THUOC_BILASTINE_20', NULL, '1 viên/ngày (trước ăn 1 giờ)', '28 ngày (28 viên)')`,
        [rx3Res.rows[0].ma_don_thuoc]
      );

      state.recordMeta[rec3Id] = {
        template_id: 'TMPL_URT_CHRONIC',
        created_by: pat3.userId,
        assigned_doctor_id: doc1Id,
        instructions: 'Mặc quần áo rộng thoáng, tránh ma sát mạnh lên da.',
        created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
        completed_at: new Date(Date.now() - 86400000).toISOString()
      };

      // Khởi tạo thông báo thực tế cho các vai trò
      if (!state.notifications) state.notifications = {};
      state.notifications[pat1.userId] = [
        {
          id: `NOTIF_${Date.now()}_1`,
          user_id: pat1.userId,
          title: 'Bác sĩ đã kê đơn thuốc mới',
          message: `TS.BS. Nguyễn Văn Hùng đã kê đơn điều trị cho hồ sơ #BA-${rec1Id}. Vui lòng xem chi tiết liều dùng.`,
          type: 'PRESCRIPTION',
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: `NOTIF_${Date.now()}_2`,
          user_id: pat1.userId,
          title: 'Nhắc lịch chấm điểm UAS7 hôm nay',
          message: 'Bạn đã hoàn thành 7/7 ngày tuần trước (UAS7 = 24 điểm). Hãy tiếp tục ghi nhận triệu chứng hôm nay!',
          type: 'UAS7_REMINDER',
          is_read: false,
          created_at: new Date(Date.now() - 7200000).toISOString()
        }
      ];

      state.notifications[doc1Id] = [
        {
          id: `NOTIF_${Date.now()}_3`,
          user_id: doc1Id,
          title: 'Bệnh nhân mới trong hàng đợi khám',
          message: `BN Trần Văn Nam vừa gửi phiếu khai báo Mày đay cấp (#BA-${rec2Id}) đang chờ tiếp nhận.`,
          type: 'NEW_QUEUE',
          is_read: false,
          created_at: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: `NOTIF_${Date.now()}_4`,
          user_id: doc1Id,
          title: 'Đã có kết quả xét nghiệm IgE toàn phần',
          message: `BN Nguyễn Thị Mai (#BA-${rec1Id}): IgE toàn phần = 348.5 IU/mL, Anti-TPO = 38.5 IU/mL.`,
          type: 'LAB_RESULT',
          is_read: false,
          created_at: new Date(Date.now() - 5400000).toISOString()
        }
      ];

      state.notifications[adminId] = [
        {
          id: `NOTIF_${Date.now()}_5`,
          user_id: adminId,
          title: 'Hệ thống DrMayDay hợp nhất hoạt động ổn định',
          message: 'Đã đồng bộ đầy đủ 4 phân hệ (Admin, Bệnh nhân, Bác sĩ, AI & Thông báo) trên CSDL chuẩn.',
          type: 'SYSTEM',
          is_read: false,
          created_at: new Date().toISOString()
        }
      ];
    });

    saveStore();
    console.log('[Seeder] Khởi tạo thành công dữ liệu mẫu (Admin: 0903000999, Bác sĩ: 0988765432, Bệnh nhân: 0912345678 / password123).');
  } catch (err) {
    console.warn('[Seeder] Cảnh báo khi nạp dữ liệu mẫu:', err.message);
  }
}

module.exports = { seedDemoDataIfNeeded };
