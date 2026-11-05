/**
 * @file src/controllers/uas7Controller.js
 * @description Controller xử lý nhóm API Đánh giá Thang điểm Mề đay UAS7 & Phù mạch AAS hằng ngày (Slide 6):
 * - GET  /api/v1/uas7-scores/eligibility (uas701: Kiểm tra bệnh nhân có bệnh án đang active để chấm điểm)
 * - POST /api/v1/uas7-scores (uas702: Chấm điểm UAS7 hằng ngày vào `chukytheodoiuas7` & `nhatkyuashangngay`)
 * - GET  /api/v1/uas7-scores/patient/:patient_id (uas704: Lấy lịch sử điểm UAS7 sắp xếp theo `score_date DESC`)
 * - POST /api/v1/aas-scores (Ghi nhận nhật ký phù mạch hằng ngày vào `public.nhatkyaashangngay`)
 * - GET  /api/v1/aas-scores/patient/:patient_id (Lấy lịch sử nhật ký phù mạch AAS của bệnh nhân)
 */

const { query, withTransaction } = require('../config/database');
const { RESPONSE_CODES, sendResponse } = require('../config/responseCodes');
const { state, saveStore } = require('../config/runtimeStore');

/**
 * Định dạng đối tượng ngày từ PostgreSQL sang chuỗi YYYY-MM-DD
 */
function formatDateYMD(val) {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toISOString().slice(0, 10);
}

/**
 * 1. Kiểm tra điều kiện chấm điểm UAS7 của bệnh nhân đang đăng nhập (uas701)
 * Endpoint: GET /api/v1/uas7-scores/eligibility
 * Lưu ý Slide 6: Toàn bộ kiểu dữ liệu trong response data được format dạng chuỗi ("true", "false", "5").
 */
async function checkEligibility(req, res) {
  try {
    const patientId = req.user.user_id;

    // Tìm hồ sơ bệnh án đang active (pending, in_progress, draft) của bệnh nhân
    const activeRes = await query(
      `SELECT ma_ho_so, loai_benh_an, trang_thai
       FROM public.hosobenhan
       WHERE ma_benh_nhan = $1
         AND trang_thai IN ('pending', 'in_progress', 'draft')
       ORDER BY
         CASE WHEN loai_benh_an = 'MAN' THEN 0 ELSE 1 END,
         ma_ho_so DESC
       LIMIT 1`,
      [patientId]
    );

    if (activeRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.OK, {
        eligible: 'false'
      });
    }

    const activeRecord = activeRes.rows[0];
    return sendResponse(res, RESPONSE_CODES.OK, {
      eligible: 'true',
      medical_record_id: String(activeRecord.ma_ho_so)
    });
  } catch (err) {
    console.error('[UAS7Controller.checkEligibility] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 2. Bệnh nhân gửi điểm UAS7 hằng ngày (uas702)
 * Endpoint: POST /api/v1/uas7-scores
 * Ràng buộc:
 * - Tự động ép kiểu iss7, hss7 từ string sang int (thang 0 - 3).
 * - Sai khoảng iss7 -> trả mã 5003; sai khoảng hss7 -> trả mã 5004.
 * - Kiểm soát UNIQUE(ma_benh_nhan, ngay_cham_diem) -> nếu trùng ngày trả mã 5002.
 * - Tự động tìm hoặc tạo chu kỳ 7 ngày trong `public.chukytheodoiuas7` để khớp khóa ngoại
 *   `fk_uas_chuky_benhnhan_ngay` của `final_restructured.sql`.
 */
async function createUas7Score(req, res) {
  try {
    const body = req.body || {};
    const patientId = req.user.user_id;

    const rawIss7 = body.iss7 !== undefined ? body.iss7 : body.diem_ngua_iss;
    const rawHss7 = body.hss7 !== undefined ? body.hss7 : body.diem_san_phu_hss;
    const scoreDate = formatDateYMD(body.score_date || body.ngay_cham_diem || new Date());
    const note = body.note !== undefined ? String(body.note) : null;
    const medicationStatus = body.trang_thai_dung_thuoc || (note ? note.slice(0, 50) : 'DUNG_THUOC_DEU');

    // Kiểm tra tham số bắt buộc
    if (rawIss7 === undefined || rawIss7 === null || rawIss7 === '' ||
        rawHss7 === undefined || rawHss7 === null || rawHss7 === '') {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM, {}, 'iss7 and hss7 are required');
    }

    // Parse iss7 và hss7 từ string sang số nguyên (Slide 6)
    const iss7 = Number(rawIss7);
    const hss7 = Number(rawHss7);

    if (!Number.isInteger(iss7) || iss7 < 0 || iss7 > 3) {
      return sendResponse(res, RESPONSE_CODES.INVALID_ISS7_VALUE);
    }

    if (!Number.isInteger(hss7) || hss7 < 0 || hss7 > 3) {
      return sendResponse(res, RESPONSE_CODES.INVALID_HSS7_VALUE);
    }

    if (!scoreDate || !/^\d{4}-\d{2}-\d{2}$/.test(scoreDate)) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'Invalid score_date format (YYYY-MM-DD)');
    }

    // Kiểm tra trùng ngày chấm điểm: UNIQUE(ma_benh_nhan, ngay_cham_diem) (Test case 5002)
    const dupCheck = await query(
      `SELECT ma_nhat_ky_uas
       FROM public.nhatkyuashangngay
       WHERE ma_benh_nhan = $1 AND ngay_cham_diem = $2::date`,
      [patientId, scoreDate]
    );
    if (dupCheck.rowCount > 0) {
      return sendResponse(res, RESPONSE_CODES.UAS7_ALREADY_SUBMITTED);
    }

    // Xác định hồ sơ bệnh án liên quan (medical_record_id)
    let requestedRecordId = body.medical_record_id ? Number(body.medical_record_id) : null;
    let maHoSoMan = null;

    if (requestedRecordId) {
      const recRes = await query(
        `SELECT ma_ho_so, ma_benh_nhan, loai_benh_an, trang_thai
         FROM public.hosobenhan
         WHERE ma_ho_so = $1`,
        [requestedRecordId]
      );
      if (recRes.rowCount === 0) {
        return sendResponse(res, RESPONSE_CODES.MEDICAL_RECORD_NOT_FOUND);
      }
      if (Number(recRes.rows[0].ma_benh_nhan) !== patientId) {
        return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
      }
      if (recRes.rows[0].loai_benh_an === 'MAN') {
        maHoSoMan = Number(recRes.rows[0].ma_ho_so);
      }
    } else {
      // Tự động tìm hồ sơ active gần nhất của bệnh nhân
      const activeRes = await query(
        `SELECT ma_ho_so, loai_benh_an
         FROM public.hosobenhan
         WHERE ma_benh_nhan = $1 AND trang_thai IN ('pending', 'in_progress', 'draft')
         ORDER BY CASE WHEN loai_benh_an = 'MAN' THEN 0 ELSE 1 END, ma_ho_so DESC
         LIMIT 1`,
        [patientId]
      );
      if (activeRes.rowCount > 0) {
        requestedRecordId = Number(activeRes.rows[0].ma_ho_so);
        if (activeRes.rows[0].loai_benh_an === 'MAN') {
          maHoSoMan = requestedRecordId;
        }
      }
    }

    const insertedScore = await withTransaction(async (client) => {
      // 1. Tìm chu kỳ 7 ngày hiện có bao phủ ngày scoreDate của bệnh nhân
      const cycleRes = await client.query(
        `SELECT ma_chu_ky, ngay_bat_dau, ngay_ket_thuc,
                (($2::date - ngay_bat_dau) + 1)::smallint AS ngay_thu_may
         FROM public.chukytheodoiuas7
         WHERE ma_benh_nhan = $1
           AND ngay_bat_dau <= $2::date
           AND ngay_ket_thuc >= $2::date
         ORDER BY ma_chu_ky DESC
         LIMIT 1`,
        [patientId, scoreDate]
      );

      let maChuKy;
      let ngayThuMay;

      if (cycleRes.rowCount > 0) {
        maChuKy = Number(cycleRes.rows[0].ma_chu_ky);
        ngayThuMay = Number(cycleRes.rows[0].ngay_thu_may);
      } else {
        // Tạo chu kỳ 7 ngày mới bắt đầu từ scoreDate (thỏa mãn ck_chukyuas7_ngay: ngay_ket_thuc = ngay_bat_dau + 6)
        const newCycleRes = await client.query(
          `INSERT INTO public.chukytheodoiuas7 (ma_benh_nhan, ngay_bat_dau, ngay_ket_thuc, trang_thai_chu_ky)
           VALUES ($1, $2::date, ($2::date + 6), 'DANG_THEO_DOI')
           RETURNING ma_chu_ky`,
          [patientId, scoreDate]
        );
        maChuKy = Number(newCycleRes.rows[0].ma_chu_ky);
        ngayThuMay = 1;
      }

      // 2. Chèn điểm vào bảng `public.nhatkyuashangngay`
      // Cột `diem_uas_ngay` được PostgreSQL tự động tính bằng `diem_san_phu_hss + diem_ngua_iss`
      const insertRes = await client.query(
        `INSERT INTO public.nhatkyuashangngay (
           ma_chu_ky,
           ma_ho_so_man,
           ma_benh_nhan,
           ngay_cham_diem,
           ngay_thu_may_trong_chu_ky,
           diem_san_phu_hss,
           diem_ngua_iss,
           trang_thai_dung_thuoc,
           trang_thai_ngay
         )
         VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, 'HOP_LE')
         RETURNING *`,
        [
          maChuKy,
          maHoSoMan,
          patientId,
          scoreDate,
          ngayThuMay,
          hss7,
          iss7,
          medicationStatus
        ]
      );

      return insertRes.rows[0];
    });

    const nowIso = new Date(insertedScore.thoi_diem_cap_nhat).toISOString();
    const noteKey = `${patientId}_${scoreDate}`;
    state.uas7Notes[noteKey] = {
      note,
      medical_record_id: requestedRecordId ? String(requestedRecordId) : null,
      created_at: nowIso
    };
    saveStore();

    // Format toàn bộ các giá trị trả về thành string theo đặc tả Slide 6 (`S6_p09_1.png`)
    const formattedRecord = {
      id: String(insertedScore.ma_nhat_ky_uas),
      cycle_id: String(insertedScore.ma_chu_ky),
      day_in_cycle: String(insertedScore.ngay_thu_may_trong_chu_ky),
      patient_id: String(insertedScore.ma_benh_nhan),
      medical_record_id: String(requestedRecordId || insertedScore.ma_ho_so_man || ''),
      score_date: formatDateYMD(insertedScore.ngay_cham_diem),
      iss7: String(insertedScore.diem_ngua_iss),
      hss7: String(insertedScore.diem_san_phu_hss),
      daily_score: String(insertedScore.diem_uas_ngay),
      note: note,
      created_at: nowIso,
      updated_at: nowIso
    };

    return sendResponse(res, RESPONSE_CODES.CREATED, formattedRecord);
  } catch (err) {
    // Bắt lỗi vi phạm ràng buộc UNIQUE trong CSDL nếu phát sinh đồng thời
    if (err && err.code === '23505') {
      return sendResponse(res, RESPONSE_CODES.UAS7_ALREADY_SUBMITTED);
    }
    console.error('[UAS7Controller.createUas7Score] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 3. Truy xuất toàn bộ lịch sử điểm UAS7 của bệnh nhân (uas704)
 * Endpoint: GET /api/v1/uas7-scores/patient/:patient_id
 * Sắp xếp theo `score_date DESC` (mới nhất xếp trước).
 */
async function getPatientUas7History(req, res) {
  try {
    const rawPatientId = req.params.patient_id;
    const patientId = parseInt(String(rawPatientId), 10);

    if (isNaN(patientId)) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_TYPE, {}, 'Invalid patient_id');
    }

    // Kiểm tra quyền riêng tư y tế: Bệnh nhân không được xem điểm của bệnh nhân khác (3106)
    if (req.user.role_name === 'benh_nhan' && patientId !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    // Kiểm tra bệnh nhân tồn tại trong hệ thống (Test case 3007)
    const userCheck = await query(
      `SELECT ma_nguoi FROM public.nguoi WHERE ma_nguoi = $1`,
      [patientId]
    );
    if (userCheck.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.USER_NOT_FOUND);
    }

    // Truy vấn bảng `public.nhatkyuashangngay` kết hợp view `public.v_chukytheodoiuas7`
    const historyRes = await query(
      `SELECT nk.*, vc.so_ngay_hop_le, vc.ngay_bat_dau AS chu_ky_bat_dau, vc.ngay_ket_thuc AS chu_ky_ket_thuc
       FROM public.nhatkyuashangngay nk
       LEFT JOIN public.v_chukytheodoiuas7 vc ON vc.ma_chu_ky = nk.ma_chu_ky
       WHERE nk.ma_benh_nhan = $1
       ORDER BY nk.ngay_cham_diem DESC, nk.ma_nhat_ky_uas DESC`,
      [patientId]
    );

    const formattedList = historyRes.rows.map((row) => {
      const sDate = formatDateYMD(row.ngay_cham_diem);
      const noteMeta = state.uas7Notes[`${patientId}_${sDate}`] || {};
      const updatedIso = new Date(row.thoi_diem_cap_nhat).toISOString();

      return {
        id: String(row.ma_nhat_ky_uas),
        cycle_id: row.ma_chu_ky ? String(row.ma_chu_ky) : null,
        day_in_cycle: row.ngay_thu_may_trong_chu_ky ? String(row.ngay_thu_may_trong_chu_ky) : null,
        valid_days_in_cycle: row.so_ngay_hop_le !== null ? String(row.so_ngay_hop_le) : null,
        patient_id: String(row.ma_benh_nhan),
        medical_record_id: String(
          noteMeta.medical_record_id || row.ma_ho_so_man || ''
        ),
        score_date: sDate,
        iss7: String(row.diem_ngua_iss),
        hss7: String(row.diem_san_phu_hss),
        daily_score: String(row.diem_uas_ngay),
        note: noteMeta.note !== undefined ? noteMeta.note : row.trang_thai_dung_thuoc,
        created_at: noteMeta.created_at || updatedIso,
        updated_at: updatedIso
      };
    });

    return sendResponse(res, RESPONSE_CODES.OK, formattedList);
  } catch (err) {
    console.error('[UAS7Controller.getPatientUas7History] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 4. Ghi nhận Nhật ký Phù mạch hằng ngày AAS (Bảng `public.nhatkyaashangngay` trong CSDL)
 * Endpoint: POST /api/v1/aas-scores
 * Tuân thủ ràng buộc `ck_aas_day_du_diem`:
 * - Nếu `co_dot_sung_phu = TRUE`: 4 chỉ số (`muc_kho_chiu`, `han_che_hoat_dong`,
 *   `anh_huong_ngoai_hinh`, `do_nang_tong_the`) phải có mặt và nằm trong khoảng 0..3.
 * - Nếu `co_dot_sung_phu = FALSE`: cả 4 chỉ số phải là NULL, `diem_aas_ngay` tự tính = 0.
 */
async function createAasScore(req, res) {
  try {
    const body = req.body || {};
    const patientId = req.user.user_id;
    const scoreDate = formatDateYMD(body.ngay_theo_doi || body.score_date || new Date());
    const coDotSungPhu = Boolean(body.co_dot_sung_phu ?? body.has_angioedema);

    let mucKhoChiu = null;
    let hanCheHoatDong = null;
    let anhHuongNgoaiHinh = null;
    let doNangTongThe = null;

    if (coDotSungPhu) {
      mucKhoChiu = Number(body.muc_kho_chiu ?? 0);
      hanCheHoatDong = Number(body.han_che_hoat_dong ?? 0);
      anhHuongNgoaiHinh = Number(body.anh_huong_ngoai_hinh ?? 0);
      doNangTongThe = Number(body.do_nang_tong_the ?? 0);

      for (const val of [mucKhoChiu, hanCheHoatDong, anhHuongNgoaiHinh, doNangTongThe]) {
        if (!Number.isInteger(val) || val < 0 || val > 3) {
          return sendResponse(
            res,
            RESPONSE_CODES.INVALID_PARAM_VALUE,
            {},
            'AAS component scores must be integers between 0 and 3'
          );
        }
      }
    }

    // Kiểm tra trùng ngày trong `public.nhatkyaashangngay`
    const dupCheck = await query(
      `SELECT ma_nhat_ky_aas FROM public.nhatkyaashangngay WHERE ma_benh_nhan = $1 AND ngay_theo_doi = $2::date`,
      [patientId, scoreDate]
    );
    if (dupCheck.rowCount > 0) {
      return sendResponse(res, RESPONSE_CODES.UAS7_ALREADY_SUBMITTED);
    }

    // Tìm hồ sơ mạn tính nếu có
    let maHoSoMan = null;
    const manCheck = await query(
      `SELECT ma_ho_so FROM public.hosobenhan WHERE ma_benh_nhan = $1 AND loai_benh_an = 'MAN' ORDER BY ma_ho_so DESC LIMIT 1`,
      [patientId]
    );
    if (manCheck.rowCount > 0) {
      maHoSoMan = Number(manCheck.rows[0].ma_ho_so);
    }

    const insertRes = await query(
      `INSERT INTO public.nhatkyaashangngay (
         ma_benh_nhan,
         ma_ho_so_man,
         ngay_theo_doi,
         co_dot_sung_phu,
         thoi_diem_xuat_hien,
         muc_kho_chiu,
         han_che_hoat_dong,
         anh_huong_ngoai_hinh,
         do_nang_tong_the
       )
       VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        patientId,
        maHoSoMan,
        scoreDate,
        coDotSungPhu,
        body.thoi_diem_xuat_hien || null,
        mucKhoChiu,
        hanCheHoatDong,
        anhHuongNgoaiHinh,
        doNangTongThe
      ]
    );

    const row = insertRes.rows[0];
    return sendResponse(res, RESPONSE_CODES.CREATED, {
      id: String(row.ma_nhat_ky_aas),
      patient_id: String(row.ma_benh_nhan),
      medical_record_id: row.ma_ho_so_man ? String(row.ma_ho_so_man) : null,
      score_date: formatDateYMD(row.ngay_theo_doi),
      co_dot_sung_phu: row.co_dot_sung_phu,
      muc_kho_chiu: row.muc_kho_chiu,
      han_che_hoat_dong: row.han_che_hoat_dong,
      anh_huong_ngoai_hinh: row.anh_huong_ngoai_hinh,
      do_nang_tong_the: row.do_nang_tong_the,
      daily_aas_score: String(row.diem_aas_ngay)
    });
  } catch (err) {
    console.error('[UAS7Controller.createAasScore] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 5. Xem lịch sử Nhật ký Phù mạch AAS của bệnh nhân
 * Endpoint: GET /api/v1/aas-scores/patient/:patient_id
 */
async function getPatientAasHistory(req, res) {
  try {
    const patientId = parseInt(String(req.params.patient_id), 10);
    if (isNaN(patientId)) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_TYPE);
    }

    if (req.user.role_name === 'benh_nhan' && patientId !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    const resList = await query(
      `SELECT * FROM public.nhatkyaashangngay WHERE ma_benh_nhan = $1 ORDER BY ngay_theo_doi DESC`,
      [patientId]
    );

    return sendResponse(res, RESPONSE_CODES.OK, resList.rows);
  } catch (err) {
    console.error('[UAS7Controller.getPatientAasHistory] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

module.exports = {
  checkEligibility,
  createUas7Score,
  getPatientUas7History,
  createAasScore,
  getPatientAasHistory
};

