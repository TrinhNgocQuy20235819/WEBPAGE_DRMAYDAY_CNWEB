/**
 * @file src/controllers/medicalRecordController.js
 * @description Controller xử lý nhóm API Sàng lọc báo động đỏ, Khai báo Y tế, Biểu mẫu động
 * và Quản lý Hồ sơ Bệnh án phía Bệnh nhân (Slide 5, Slide 11 & Bảng `sanglocbaodongdo` trong DB):
 * - POST /api/v1/red-flag-screening (Lưu lượt sàng lọc báo động đỏ vào `public.sanglocbaodongdo`)
 * - GET  /api/v1/medical_records/classify-questions (medrec01: Lấy danh sách câu hỏi sàng lọc)
 * - POST /api/v1/medical_records/classify (medrec02: Phân loại bệnh án Cấp/Mạn & suy ra template_id)
 * - POST /api/v1/medical_records (medrec03: Khởi tạo bệnh án mới ở trạng thái 'pending')
 * - GET  /api/v1/medical_records/:id (medrec05: Xem chi tiết bệnh án)
 * - GET  /api/v1/medical_records/:id/summary (medrec06: Xem bản tóm tắt bệnh án dạng thẻ Card)
 * - GET  /api/v1/medical_records/patients/:id/history (medrec13: Xem lịch sử khám của bệnh nhân)
 * - GET  /api/v1/medical_records/:id/answers (medrec08: Lấy danh sách câu trả lời của bệnh án)
 * - PUT  /api/v1/medical_records/:id/answers (medrec10: Upsert câu trả lời theo UNIQUE(medical_record_id, question_id))
 * - GET  /api/v1/templates/:id (tmpl03: Lấy cây cấu trúc biểu mẫu 4 tầng để Client render)
 * - GET  /api/v1/lab-results/:record_id (lab02: Bệnh nhân tra cứu kết quả xét nghiệm cận lâm sàng)
 * - GET  /api/v1/prescriptions/:record_id (Bệnh nhân tra cứu đơn thuốc điện tử & chỉ dẫn ngừng thuốc)
 */

const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../config/database');
const { RESPONSE_CODES, sendResponse } = require('../config/responseCodes');
const {
  state,
  saveStore,
  DEFAULT_CLASSIFY_QUESTIONS,
  DEFAULT_TEMPLATES
} = require('../config/runtimeStore');

/**
 * Chuyển đổi giá trị bất kỳ sang boolean an toàn
 */
function toBoolean(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'co' || s === 'có';
  }
  return false;
}

/**
 * 0. API Sàng lọc Báo động đỏ khi mở ứng dụng (Bảng `public.sanglocbaodongdo`)
 * Endpoint: POST /api/v1/red-flag-screening
 * Hỗ trợ cả người dùng chưa đăng nhập (`ma_benh_nhan = NULL`) hoặc đã đăng nhập.
 */
async function createRedFlagScreening(req, res) {
  try {
    const body = req.body || {};
    const q1 = toBoolean(body.co_kho_tho_kho_khe_nghen_hong ?? body.breathing_difficulty);
    const q2 = toBoolean(body.co_chong_mat_tuc_nguc_sap_ngat ?? body.dizziness_chest_tightness);
    const q3 = toBoolean(body.co_sung_moi_luoi_co_hong ?? body.lip_tongue_swelling);
    const q4 = toBoolean(body.co_dau_bung_non_lien_tuc ?? body.abdominal_pain_vomiting);

    const hasAnaphylaxisRisk = q1 || q2 || q3 || q4;

    // Tuân thủ ràng buộc ck_sanglocbaodongdo_xac_nhan và ck_sanglocbaodongdo_goi_cap_cuu trong DB
    let xacNhanGoiCapCuu = null;
    let daNhanNutGoi = false;
    let sdtCapCuu = null;
    let thoiDiemNhanNut = null;

    if (hasAnaphylaxisRisk) {
      xacNhanGoiCapCuu =
        body.xac_nhan_muon_goi_cap_cuu !== undefined
          ? toBoolean(body.xac_nhan_muon_goi_cap_cuu)
          : true;
      daNhanNutGoi = toBoolean(body.da_nhan_nut_goi_cap_cuu);
      if (daNhanNutGoi && xacNhanGoiCapCuu) {
        sdtCapCuu = String(body.so_dien_thoai_cap_cuu || '115').trim();
        thoiDiemNhanNut = new Date().toISOString();
      } else {
        daNhanNutGoi = false;
      }
    }

    const maBenhNhan = req.user ? req.user.user_id : body.ma_benh_nhan || null;
    const maPhienUngDung = body.ma_phien_ung_dung || uuidv4();

    const insertRes = await query(
      `INSERT INTO public.sanglocbaodongdo (
         ma_phien_ung_dung,
         ma_benh_nhan,
         phien_ban_bo_cau_hoi,
         co_kho_tho_kho_khe_nghen_hong,
         co_chong_mat_tuc_nguc_sap_ngat,
         co_sung_moi_luoi_co_hong,
         co_dau_bung_non_lien_tuc,
         xac_nhan_muon_goi_cap_cuu,
         da_nhan_nut_goi_cap_cuu,
         so_dien_thoai_cap_cuu,
         thoi_diem_nhan_nut_goi
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (ma_phien_ung_dung) DO UPDATE
       SET co_kho_tho_kho_khe_nghen_hong = EXCLUDED.co_kho_tho_kho_khe_nghen_hong,
           co_chong_mat_tuc_nguc_sap_ngat = EXCLUDED.co_chong_mat_tuc_nguc_sap_ngat,
           co_sung_moi_luoi_co_hong = EXCLUDED.co_sung_moi_luoi_co_hong,
           co_dau_bung_non_lien_tuc = EXCLUDED.co_dau_bung_non_lien_tuc,
           xac_nhan_muon_goi_cap_cuu = EXCLUDED.xac_nhan_muon_goi_cap_cuu,
           da_nhan_nut_goi_cap_cuu = EXCLUDED.da_nhan_nut_goi_cap_cuu,
           so_dien_thoai_cap_cuu = EXCLUDED.so_dien_thoai_cap_cuu,
           thoi_diem_nhan_nut_goi = EXCLUDED.thoi_diem_nhan_nut_goi
       RETURNING *`,
      [
        maPhienUngDung,
        maBenhNhan,
        body.phien_ban_bo_cau_hoi || 'APP_GD1_V1',
        q1,
        q2,
        q3,
        q4,
        xacNhanGoiCapCuu,
        daNhanNutGoi,
        sdtCapCuu,
        thoiDiemNhanNut
      ]
    );

    const row = insertRes.rows[0];
    return sendResponse(res, RESPONSE_CODES.CREATED, {
      ma_luot_sang_loc: Number(row.ma_luot_sang_loc),
      ma_phien_ung_dung: row.ma_phien_ung_dung,
      ma_benh_nhan: row.ma_benh_nhan ? Number(row.ma_benh_nhan) : null,
      co_nguy_co_phan_ve: row.co_nguy_co_phan_ve,
      ket_qua_dieu_huong: row.ket_qua_dieu_huong,
      xac_nhan_muon_goi_cap_cuu: row.xac_nhan_muon_goi_cap_cuu,
      da_nhan_nut_goi_cap_cuu: row.da_nhan_nut_goi_cap_cuu,
      so_dien_thoai_cap_cuu: row.so_dien_thoai_cap_cuu,
      thoi_diem_hoan_tat: row.thoi_diem_hoan_tat
    });
  } catch (err) {
    console.error('[MedicalRecordController.createRedFlagScreening] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 1. Lấy danh sách các câu hỏi sàng lọc / phân loại bệnh án (medrec01)
 * Endpoint: GET /api/v1/medical_records/classify-questions
 */
async function getClassifyQuestions(req, res) {
  try {
    return sendResponse(res, RESPONSE_CODES.OK, DEFAULT_CLASSIFY_QUESTIONS);
  } catch (err) {
    console.error('[MedicalRecordController.getClassifyQuestions] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 2. Tiếp nhận câu trả lời phân loại và trả về `template_id` phù hợp nhất (medrec02)
 * Endpoint: POST /api/v1/medical_records/classify
 */
async function classifyMedicalRecord(req, res) {
  try {
    const body = req.body || {};
    const answers = Array.isArray(body.answers) ? body.answers : null;

    // Kiểm tra xem người dùng có truyền dữ liệu phân loại không (Test case 4006)
    const hasDirectOption =
      body.duration_option !== undefined ||
      body.duration_weeks !== undefined ||
      body.is_chronic !== undefined ||
      body.loai_benh_an !== undefined;

    if ((!answers || answers.length === 0) && !hasDirectOption) {
      return sendResponse(res, RESPONSE_CODES.CLASSIFY_INCOMPLETE);
    }

    // Chuyển mảng answers sang map để tra cứu nhanh
    const ansMap = {};
    if (answers) {
      for (const item of answers) {
        if (item && item.question_id) {
          ansMap[item.question_id] =
            item.option_value ?? item.answer_text ?? item.answer_value ?? item.value;
        }
      }
      if (Object.keys(ansMap).length === 0) {
        return sendResponse(res, RESPONSE_CODES.CLASSIFY_INCOMPLETE);
      }
    }

    // Xác định loại bệnh án: Mạn tính (MAN >= 6 tuần) hay Cấp tính (CAP < 6 tuần)
    let isChronic = false;
    if (body.loai_benh_an) {
      isChronic = String(body.loai_benh_an).toUpperCase() === 'MAN';
    } else if (body.is_chronic !== undefined) {
      isChronic = toBoolean(body.is_chronic);
    } else if (body.duration_weeks !== undefined) {
      isChronic = Number(body.duration_weeks) >= 6;
    } else if (body.duration_option) {
      isChronic = String(body.duration_option).toUpperCase().includes('OVER_6');
    } else if (ansMap.CLS_DURATION_WEEKS !== undefined) {
      const v = String(ansMap.CLS_DURATION_WEEKS).toUpperCase();
      isChronic = v === 'OVER_6_WEEKS' || v === 'MAN' || v === 'CHRONIC' || Number(v) >= 6;
    } else {
      // Nếu mảng answers không có câu hỏi thời gian khởi phát -> báo thiếu lựa chọn phân loại (4006)
      return sendResponse(res, RESPONSE_CODES.CLASSIFY_INCOMPLETE);
    }

    // Nếu người dùng gửi kèm các câu hỏi sàng lọc báo động đỏ thì lưu luôn vào bảng `sanglocbaodongdo`
    let screeningRecord = null;
    if (
      ansMap.CLS_RED_FLAG_BREATHING !== undefined ||
      ansMap.CLS_RED_FLAG_DIZZINESS !== undefined ||
      ansMap.CLS_RED_FLAG_SWELLING !== undefined ||
      ansMap.CLS_RED_FLAG_ABDOMINAL !== undefined
    ) {
      const q1 = toBoolean(ansMap.CLS_RED_FLAG_BREATHING);
      const q2 = toBoolean(ansMap.CLS_RED_FLAG_DIZZINESS);
      const q3 = toBoolean(ansMap.CLS_RED_FLAG_SWELLING);
      const q4 = toBoolean(ansMap.CLS_RED_FLAG_ABDOMINAL);
      const risk = q1 || q2 || q3 || q4;

      const sRes = await query(
        `INSERT INTO public.sanglocbaodongdo (
           ma_benh_nhan,
           co_kho_tho_kho_khe_nghen_hong,
           co_chong_mat_tuc_nguc_sap_ngat,
           co_sung_moi_luoi_co_hong,
           co_dau_bung_non_lien_tuc,
           xac_nhan_muon_goi_cap_cuu
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ma_luot_sang_loc, co_nguy_co_phan_ve, ket_qua_dieu_huong`,
        [req.user ? req.user.user_id : null, q1, q2, q3, q4, risk ? true : null]
      );
      screeningRecord = sRes.rows[0];
    }

    const templateId = isChronic ? 'TMPL_URT_CHRONIC' : 'TMPL_URT_ACUTE';
    const templateObj = DEFAULT_TEMPLATES[templateId];

    return sendResponse(res, RESPONSE_CODES.OK, {
      template_id: templateId,
      loai_benh_an: templateObj.loai_benh_an,
      red_flag_screening: screeningRecord,
      template: templateObj
    });
  } catch (err) {
    console.error('[MedicalRecordController.classifyMedicalRecord] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * Hàm nội bộ: Đồng bộ mảng câu trả lời (`answers`) của Bệnh nhân vào cả:
 * 1. Các bảng lâm sàng trong PostgreSQL (`hosobenhan`, `tiensubanthan`, `hoancanhkhoiphatdiung`,
 *    `benhanmaydaycap`, `tinhtrangnhiemtrung`, `benhanmaydayman`, `benhsucacdotbenhtruoc`).
 * 2. Kho câu trả lời động `state.dynamicAnswers[maHoSo]` đảm bảo ràng buộc `UNIQUE(medical_record_id, question_id)`.
 */
async function upsertAnswersForRecord(client, maHoSo, loaiBenhAn, answersArray, answeredByUserId) {
  if (!Array.isArray(answersArray) || answersArray.length === 0) {
    return 0;
  }

  if (!state.dynamicAnswers[maHoSo]) {
    state.dynamicAnswers[maHoSo] = {};
  }

  const nowIso = new Date().toISOString();
  let upsertedCount = 0;

  for (const item of answersArray) {
    if (!item || !item.question_id) continue;
    const qId = String(item.question_id).trim();
    const existing = state.dynamicAnswers[maHoSo][qId];

    const answerRecord = {
      id: existing ? existing.id : state.answerSeq++,
      medical_record_id: Number(maHoSo),
      question_id: qId,
      question_option_id:
        item.question_option_id !== undefined && item.question_option_id !== null
          ? Number(item.question_option_id)
          : null,
      answer_text:
        item.answer_text !== undefined && item.answer_text !== null
          ? String(item.answer_text)
          : null,
      answer_value: item.answer_value !== undefined ? item.answer_value : null,
      answered_by: Number(answeredByUserId),
      created_at: existing ? existing.created_at : nowIso,
      updated_at: nowIso
    };

    state.dynamicAnswers[maHoSo][qId] = answerRecord;
    upsertedCount++;
  }

  // Ánh xạ các câu trả lời chuẩn vào các bảng lâm sàng của PostgreSQL (`final_restructured.sql`)
  const map = state.dynamicAnswers[maHoSo];
  const getVal = (key) => {
    if (!map[key]) return undefined;
    if (map[key].answer_text !== null && map[key].answer_text !== '') return map[key].answer_text;
    if (map[key].answer_value !== null && map[key].answer_value !== undefined) {
      return typeof map[key].answer_value === 'object'
        ? JSON.stringify(map[key].answer_value)
        : String(map[key].answer_value);
    }
    return undefined;
  };

  // 1. Cập nhật các cột lâm sàng chung trên `public.hosobenhan`
  const durationWeeksRaw = getVal('Q_DURATION_WEEKS');
  if (durationWeeksRaw !== undefined && !isNaN(Number(durationWeeksRaw)) && Number(durationWeeksRaw) >= 0) {
    await client.query(
      `UPDATE public.hosobenhan SET thoi_gian_khoi_phat_tuan = $1 WHERE ma_ho_so = $2`,
      [Number(durationWeeksRaw), maHoSo]
    );
  }

  const treatedBeforeRaw = getVal('Q_TREATED_BEFORE');
  if (treatedBeforeRaw !== undefined) {
    await client.query(
      `UPDATE public.hosobenhan SET da_dieu_tri_truoc_kham = $1 WHERE ma_ho_so = $2`,
      [toBoolean(treatedBeforeRaw), maHoSo]
    );
  }

  const famHistoryRaw = getVal('Q_FAMILY_HISTORY');
  const famHistoryDetailRaw = getVal('Q_FAMILY_HISTORY_DETAIL');
  if (famHistoryRaw !== undefined) {
    let tsGd = 'Khong';
    if (famHistoryRaw === 'Co' || toBoolean(famHistoryRaw)) tsGd = 'Co';
    else if (famHistoryRaw === 'Khong ro') tsGd = 'Khong ro';

    // Ràng buộc ck_hoso_giadinh_detail: Nếu tien_su_gia_dinh = 'Co' thì tien_su_gia_dinh_ghi_ro NOT NULL & <> ''
    const tsGdGhiRo =
      tsGd === 'Co'
        ? (famHistoryDetailRaw && String(famHistoryDetailRaw).trim()) || 'Có tiền sử dị ứng/mề đay trong gia đình'
        : null;

    await client.query(
      `UPDATE public.hosobenhan
       SET tien_su_gia_dinh = $1, tien_su_gia_dinh_ghi_ro = $2
       WHERE ma_ho_so = $3`,
      [tsGd, tsGdGhiRo, maHoSo]
    );
  }

  // 2. Đồng bộ bảng `public.tiensubanthan` (Tuân thủ các ràng buộc ck_detail_tien_su_*)
  const atopyDetail = getVal('Q_ATOPY_HISTORY');
  const allergyDetail = getVal('Q_DRUG_FOOD_ALLERGY_HISTORY');
  const thyroidDetail = getVal('Q_THYROID_HISTORY');
  const autoimmuneDetail = getVal('Q_AUTOIMMUNE_HISTORY');
  const otherDetail = getVal('Q_OTHER_HISTORY');

  if (
    atopyDetail !== undefined ||
    allergyDetail !== undefined ||
    thyroidDetail !== undefined ||
    autoimmuneDetail !== undefined ||
    otherDetail !== undefined
  ) {
    const coDiaText = atopyDetail && String(atopyDetail).trim() ? String(atopyDetail).trim() : null;
    const diUngText = allergyDetail && String(allergyDetail).trim() ? String(allergyDetail).trim() : null;
    const tuyenGiapText = thyroidDetail && String(thyroidDetail).trim() ? String(thyroidDetail).trim() : null;
    const tuMienText = autoimmuneDetail && String(autoimmuneDetail).trim() ? String(autoimmuneDetail).trim() : null;
    const khacText = otherDetail && String(otherDetail).trim() ? String(otherDetail).trim() : null;

    await client.query(
      `INSERT INTO public.tiensubanthan (
         ma_ho_so,
         tien_su_co_dia, tien_su_co_dia_ghi_ro,
         tien_su_tuyen_giap, tien_su_tuyen_giap_ghi_ro,
         tien_su_tu_mien, tien_su_tu_mien_ghi_ro,
         tien_su_di_ung, tien_su_di_ung_ghi_ro,
         tien_su_benh_khac, tien_su_benh_khac_ghi_ro
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (ma_ho_so) DO UPDATE
       SET tien_su_co_dia = EXCLUDED.tien_su_co_dia,
           tien_su_co_dia_ghi_ro = EXCLUDED.tien_su_co_dia_ghi_ro,
           tien_su_tuyen_giap = EXCLUDED.tien_su_tuyen_giap,
           tien_su_tuyen_giap_ghi_ro = EXCLUDED.tien_su_tuyen_giap_ghi_ro,
           tien_su_tu_mien = EXCLUDED.tien_su_tu_mien,
           tien_su_tu_mien_ghi_ro = EXCLUDED.tien_su_tu_mien_ghi_ro,
           tien_su_di_ung = EXCLUDED.tien_su_di_ung,
           tien_su_di_ung_ghi_ro = EXCLUDED.tien_su_di_ung_ghi_ro,
           tien_su_benh_khac = EXCLUDED.tien_su_benh_khac,
           tien_su_benh_khac_ghi_ro = EXCLUDED.tien_su_benh_khac_ghi_ro`,
      [
        maHoSo,
        Boolean(coDiaText), coDiaText,
        Boolean(tuyenGiapText), tuyenGiapText,
        Boolean(tuMienText), tuMienText,
        Boolean(diUngText), diUngText,
        Boolean(khacText), khacText
      ]
    );
  }

  // 3. Đồng bộ bảng `public.hoancanhkhoiphatdiung`
  const foodSuspect = getVal('Q_SUSPECTED_FOOD_DETAIL');
  const drugSuspect = getVal('Q_SUSPECTED_DRUG_DETAIL');
  if (foodSuspect !== undefined || drugSuspect !== undefined) {
    await client.query(
      `INSERT INTO public.hoancanhkhoiphatdiung (ma_ho_so, thuc_an_nghi_ngo, thuoc_nghi_ngo)
       VALUES ($1, $2, $3)
       ON CONFLICT (ma_ho_so) DO UPDATE
       SET thuc_an_nghi_ngo = COALESCE(EXCLUDED.thuc_an_nghi_ngo, public.hoancanhkhoiphatdiung.thuc_an_nghi_ngo),
           thuoc_nghi_ngo = COALESCE(EXCLUDED.thuoc_nghi_ngo, public.hoancanhkhoiphatdiung.thuoc_nghi_ngo)`,
      [maHoSo, foodSuspect || null, drugSuspect || null]
    );
  }

  // 4. Đồng bộ bảng chuyên biệt theo loại bệnh án Cấp (`CAP`) hoặc Mạn (`MAN`)
  if (loaiBenhAn === 'CAP') {
    const factorGroup = getVal('Q_SUSPECTED_FACTOR_GROUP');
    const suspectedName = foodSuspect || drugSuspect || null;
    if (factorGroup !== undefined || suspectedName !== null) {
      await client.query(
        `UPDATE public.benhanmaydaycap
         SET nhom_yeu_to_nghi_ngo = COALESCE($1, nhom_yeu_to_nghi_ngo),
             co_nghi_ngo_dot_nay = $2,
             ten_yeu_to_nghi_ngo = COALESCE($3, ten_yeu_to_nghi_ngo)
         WHERE ma_ho_so = $4`,
        [factorGroup || null, Boolean(factorGroup || suspectedName), suspectedName, maHoSo]
      );
    }

    const infectionSymptoms = getVal('Q_INFECTION_SYMPTOMS');
    if (infectionSymptoms && String(infectionSymptoms).trim()) {
      await client.query(
        `INSERT INTO public.tinhtrangnhiemtrung (ma_ho_so, khac_ghi_ro)
         VALUES ($1, $2)
         ON CONFLICT (ma_ho_so) DO UPDATE
         SET khac_ghi_ro = EXCLUDED.khac_ghi_ro`,
        [maHoSo, String(infectionSymptoms).trim()]
      );
    }
  } else if (loaiBenhAn === 'MAN') {
    const manifestation = getVal('Q_DISEASE_MANIFESTATION');
    const validManifestations = ['Chi san phu', 'Chi phu mach', 'San phu + phu mach'];
    const safeManifestation = validManifestations.includes(manifestation) ? manifestation : null;

    const inducibleRaw = map.Q_INDUCIBLE_FACTORS
      ? map.Q_INDUCIBLE_FACTORS.answer_value || map.Q_INDUCIBLE_FACTORS.answer_text
      : null;
    const inducibleStr = inducibleRaw ? JSON.stringify(inducibleRaw) : '';

    if (safeManifestation || inducibleRaw) {
      await client.query(
        `UPDATE public.benhanmaydayman
         SET bieu_hien_qua_trinh_benh = COALESCE($1, bieu_hien_qua_trinh_benh),
             chung_da_ve_noi = COALESCE($2, chung_da_ve_noi),
             may_day_cholinergic = COALESCE($3, may_day_cholinergic),
             may_day_do_lanh = COALESCE($4, may_day_do_lanh),
             may_day_do_nuoc = COALESCE($5, may_day_do_nuoc),
             may_day_do_anh_sang = COALESCE($6, may_day_do_anh_sang)
         WHERE ma_ho_so = $7`,
        [
          safeManifestation,
          inducibleStr ? inducibleStr.includes('chung_da_ve_noi') : null,
          inducibleStr ? inducibleStr.includes('may_day_cholinergic') : null,
          inducibleStr ? inducibleStr.includes('may_day_do_lanh') : null,
          inducibleStr ? inducibleStr.includes('may_day_do_nuoc') : null,
          inducibleStr ? inducibleStr.includes('may_day_do_anh_sang') : null,
          maHoSo
        ]
      );
    }

    const ageFirstOnset = getVal('Q_AGE_FIRST_ONSET');
    const prevEpisodesCount = getVal('Q_PREVIOUS_EPISODES_COUNT');
    if (ageFirstOnset !== undefined || prevEpisodesCount !== undefined) {
      const safeAge =
        ageFirstOnset !== undefined && !isNaN(Number(ageFirstOnset)) && Number(ageFirstOnset) >= 0
          ? Math.floor(Number(ageFirstOnset))
          : null;
      const safeCount =
        prevEpisodesCount !== undefined && !isNaN(Number(prevEpisodesCount)) && Number(prevEpisodesCount) >= 0
          ? Math.floor(Number(prevEpisodesCount))
          : null;

      await client.query(
        `INSERT INTO public.benhsucacdotbenhtruoc (
           ma_ho_so, tung_co_dot_tuong_tu, tuoi_khoi_phat, so_dot_truoc
         )
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (ma_ho_so) DO UPDATE
         SET tung_co_dot_tuong_tu = EXCLUDED.tung_co_dot_tuong_tu,
             tuoi_khoi_phat = COALESCE(EXCLUDED.tuoi_khoi_phat, public.benhsucacdotbenhtruoc.tuoi_khoi_phat),
             so_dot_truoc = COALESCE(EXCLUDED.so_dot_truoc, public.benhsucacdotbenhtruoc.so_dot_truoc)`,
        [maHoSo, safeCount !== null ? safeCount > 0 : true, safeAge, safeCount]
      );
    }
  }

  saveStore();
  return upsertedCount;
}

/**
 * 3. Khởi tạo hồ sơ bệnh án mới ở trạng thái 'pending' (medrec03)
 * Endpoint: POST /api/v1/medical_records (và POST /api/v1/medical_records/)
 */
async function createMedicalRecord(req, res) {
  try {
    const body = req.body || {};
    const templateId = body.template_id ? String(body.template_id).trim() : '';

    if (!templateId) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM, {}, 'template_id is required');
    }

    // Kiểm tra template_id có tồn tại không (Test case 4101)
    const templateDef =
      (state.customTemplates && state.customTemplates[templateId]) || DEFAULT_TEMPLATES[templateId];
    if (!templateDef) {
      return sendResponse(res, RESPONSE_CODES.TEMPLATE_NOT_FOUND);
    }

    // Nếu người gọi là bệnh nhân thì patient_id chính là user_id đang đăng nhập
    const patientId =
      req.user.role_name === 'benh_nhan'
        ? req.user.user_id
        : Number(body.patient_id || req.user.user_id);

    // Kiểm tra bệnh nhân tồn tại trong bảng `public.benhnhan`
    const bnCheck = await query(
      `SELECT ma_benh_nhan FROM public.benhnhan WHERE ma_benh_nhan = $1`,
      [patientId]
    );
    if (bnCheck.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.USER_NOT_FOUND, {}, 'Patient record not found');
    }

    const loaiBenhAn =
      templateDef.loai_benh_an ||
      (templateId.toUpperCase().includes('ACUTE') || templateId.toUpperCase().includes('CAP')
        ? 'CAP'
        : 'MAN');
    const initialAnswers = Array.isArray(body.answers) ? body.answers : [];
    const initialDiagnosis =
      body.chan_doan_ban_dau_phong_kham ||
      body.diagnosis ||
      (loaiBenhAn === 'MAN'
        ? 'Theo dõi Mày đay mạn tính (>= 6 tuần)'
        : 'Theo dõi Mày đay cấp tính (< 6 tuần)');

    // Thực thi Transaction tạo đồng bộ `hosobenhan` và bảng subtype bắt buộc (`benhanmaydaycap` / `benhanmaydayman`)
    // để thỏa mãn khóa ngoại DEFERRABLE INITIALLY DEFERRED trong `final_restructured.sql`
    const createdRecord = await withTransaction(async (client) => {
      const hosoRes = await client.query(
        `INSERT INTO public.hosobenhan (
           ma_benh_nhan,
           loai_benh_an,
           thoi_diem_kham_lan_dau,
           ngay_bat_dau_dieu_tri_ngoai_tru,
           chan_doan_ban_dau_phong_kham,
           trang_thai
         )
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_DATE, $3, 'pending')
         RETURNING ma_ho_so, ma_benh_nhan, loai_benh_an, thoi_diem_kham_lan_dau, trang_thai`,
        [patientId, loaiBenhAn, initialDiagnosis]
      );

      const hoso = hosoRes.rows[0];
      const maHoSo = Number(hoso.ma_ho_so);

      // Bắt buộc chèn dòng tương ứng vào bảng subtype trước khi COMMIT
      if (loaiBenhAn === 'CAP') {
        await client.query(`INSERT INTO public.benhanmaydaycap (ma_ho_so) VALUES ($1)`, [maHoSo]);
      } else {
        await client.query(`INSERT INTO public.benhanmaydayman (ma_ho_so) VALUES ($1)`, [maHoSo]);
      }

      // Lưu metadata bổ trợ của bệnh án
      const createdAtIso = new Date(hoso.thoi_diem_kham_lan_dau).toISOString();
      state.recordMeta[maHoSo] = {
        template_id: templateId,
        created_by: req.user.user_id,
        assigned_doctor_id: null,
        instructions: null,
        created_at: createdAtIso,
        completed_at: null
      };

      // Nếu bệnh nhân gửi kèm mảng câu trả lời ban đầu thì nạp luôn
      if (initialAnswers.length > 0) {
        await upsertAnswersForRecord(client, maHoSo, loaiBenhAn, initialAnswers, req.user.user_id);
      } else {
        saveStore();
      }

      return {
        medical_record_id: maHoSo,
        patient_id: Number(hoso.ma_benh_nhan),
        assigned_doctor_id: null,
        created_by: req.user.user_id,
        template_id: templateId,
        loai_benh_an: loaiBenhAn,
        status: hoso.trang_thai,
        instructions: null,
        created_at: createdAtIso
      };
    });

    return sendResponse(
      res,
      RESPONSE_CODES.CREATED,
      createdRecord,
      'Tạo hồ sơ bệnh án thành công'
    );
  } catch (err) {
    console.error('[MedicalRecordController.createMedicalRecord] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * Hàm nội bộ lấy thông tin bệnh án và kiểm tra quyền truy cập của Bệnh nhân
 */
async function fetchAndAuthorizeMedicalRecord(maHoSo, reqUser) {
  if (isNaN(Number(maHoSo))) {
    return { error: RESPONSE_CODES.MEDICAL_RECORD_NOT_FOUND };
  }

  const hosoRes = await query(
    `SELECT hs.*, n.ho_ten AS ten_benh_nhan, n.so_dien_thoai AS sdt_benh_nhan
     FROM public.hosobenhan hs
     JOIN public.nguoi n ON n.ma_nguoi = hs.ma_benh_nhan
     WHERE hs.ma_ho_so = $1`,
    [Number(maHoSo)]
  );

  if (hosoRes.rowCount === 0) {
    return { error: RESPONSE_CODES.MEDICAL_RECORD_NOT_FOUND };
  }

  const record = hosoRes.rows[0];
  // Quyền riêng tư y tế (Slide 1 & Slide 5): Bệnh nhân chỉ được xem/sửa bệnh án của chính mình
  if (reqUser.role_name === 'benh_nhan' && Number(record.ma_benh_nhan) !== reqUser.user_id) {
    return { error: RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA };
  }

  return { record };
}

/**
 * 4. Xem chi tiết hồ sơ bệnh án (medrec05)
 * Endpoint: GET /api/v1/medical_records/:id
 */
async function getMedicalRecordById(req, res) {
  try {
    const { id } = req.params;
    const { record, error } = await fetchAndAuthorizeMedicalRecord(id, req.user);
    if (error) {
      return sendResponse(res, error);
    }

    const maHoSo = Number(record.ma_ho_so);
    const meta = state.recordMeta[maHoSo] || {};
    const templateId =
      meta.template_id || (record.loai_benh_an === 'MAN' ? 'TMPL_URT_CHRONIC' : 'TMPL_URT_ACUTE');

    // Lấy thêm thông tin bác sĩ khám gần nhất từ bảng `public.phienkham` nếu có
    const pkRes = await query(
      `SELECT ma_phien_kham, ma_bac_si, ngay_kham, lan_kham_thu, dan_do, tom_tat_buoi_kham
       FROM public.phienkham
       WHERE ma_ho_so = $1
       ORDER BY lan_kham_thu DESC
       LIMIT 1`,
      [maHoSo]
    );
    const latestSession = pkRes.rows[0] || null;

    return sendResponse(res, RESPONSE_CODES.OK, {
      medical_record_id: maHoSo,
      patient_id: Number(record.ma_benh_nhan),
      patient_name: record.ten_benh_nhan,
      patient_phone: record.sdt_benh_nhan,
      assigned_doctor_id:
        meta.assigned_doctor_id || (latestSession ? Number(latestSession.ma_bac_si) : null),
      created_by: meta.created_by || Number(record.ma_benh_nhan),
      template_id: templateId,
      loai_benh_an: record.loai_benh_an,
      status: record.trang_thai,
      instructions: meta.instructions || (latestSession ? latestSession.dan_do : null),
      thoi_gian_khoi_phat_tuan: record.thoi_gian_khoi_phat_tuan,
      tien_su_gia_dinh: record.tien_su_gia_dinh,
      tien_su_gia_dinh_ghi_ro: record.tien_su_gia_dinh_ghi_ro,
      created_at:
        meta.created_at ||
        (record.thoi_diem_kham_lan_dau
          ? new Date(record.thoi_diem_kham_lan_dau).toISOString()
          : null),
      completed_at: meta.completed_at || null
    });
  } catch (err) {
    console.error('[MedicalRecordController.getMedicalRecordById] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 5. Xem bản tóm tắt nhanh (Summary Card) của bệnh án (medrec06)
 * Endpoint: GET /api/v1/medical_records/:id/summary
 */
async function getMedicalRecordSummary(req, res) {
  try {
    const { id } = req.params;
    const { record, error } = await fetchAndAuthorizeMedicalRecord(id, req.user);
    if (error) {
      return sendResponse(res, error);
    }

    const maHoSo = Number(record.ma_ho_so);
    const meta = state.recordMeta[maHoSo] || {};
    const templateId =
      meta.template_id || (record.loai_benh_an === 'MAN' ? 'TMPL_URT_CHRONIC' : 'TMPL_URT_ACUTE');

    return sendResponse(res, RESPONSE_CODES.OK, {
      medical_record_id: maHoSo,
      patient_id: Number(record.ma_benh_nhan),
      patient_name: record.ten_benh_nhan,
      template_id: templateId,
      loai_benh_an: record.loai_benh_an,
      status: record.trang_thai,
      created_at:
        meta.created_at ||
        (record.thoi_diem_kham_lan_dau
          ? new Date(record.thoi_diem_kham_lan_dau).toISOString()
          : null)
    });
  } catch (err) {
    console.error('[MedicalRecordController.getMedicalRecordSummary] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 6. Xem toàn bộ lịch sử khám bệnh của một bệnh nhân cụ thể (medrec13)
 * Endpoint: GET /api/v1/medical_records/patients/:id/history
 */
async function getPatientMedicalHistory(req, res) {
  try {
    const targetPatientId = Number(req.params.id);
    if (isNaN(targetPatientId)) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_TYPE);
    }

    // Kiểm tra RBAC: Bệnh nhân A không được phép xem lịch sử bệnh án của Bệnh nhân B (Test case 3106)
    if (req.user.role_name === 'benh_nhan' && targetPatientId !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    const listRes = await query(
      `SELECT hs.ma_ho_so, hs.ma_benh_nhan, hs.loai_benh_an, hs.thoi_diem_kham_lan_dau,
              hs.ngay_bat_dau_dieu_tri_ngoai_tru, hs.ngay_ket_thuc_dieu_tri_ngoai_tru,
              hs.chan_doan_ban_dau_phong_kham, hs.trang_thai,
              pk.ma_bac_si, pk.tom_tat_buoi_kham, pk.huong_xu_tri_lan_sau, pk.dan_do,
              bs.ho_ten AS ten_bac_si
       FROM public.hosobenhan hs
       LEFT JOIN LATERAL (
         SELECT ma_phien_kham, ma_bac_si, tom_tat_buoi_kham, huong_xu_tri_lan_sau, dan_do
         FROM public.phienkham
         WHERE ma_ho_so = hs.ma_ho_so
         ORDER BY lan_kham_thu DESC
         LIMIT 1
       ) pk ON TRUE
       LEFT JOIN public.nguoi bs ON bs.ma_nguoi = pk.ma_bac_si
       WHERE hs.ma_benh_nhan = $1
       ORDER BY hs.thoi_diem_kham_lan_dau DESC NULLS LAST, hs.ma_ho_so DESC`,
      [targetPatientId]
    );

    const history = listRes.rows.map((row) => {
      const maHoSo = Number(row.ma_ho_so);
      const meta = state.recordMeta[maHoSo] || {};
      return {
        medical_record_id: maHoSo,
        record_code: `BA-2026-${String(maHoSo).padStart(4, '0')}`,
        patient_id: Number(row.ma_benh_nhan),
        assigned_doctor_id: meta.assigned_doctor_id || (row.ma_bac_si ? Number(row.ma_bac_si) : null),
        assigned_doctor_name: row.ten_bac_si || null,
        template_id:
          meta.template_id || (row.loai_benh_an === 'MAN' ? 'TMPL_URT_CHRONIC' : 'TMPL_URT_ACUTE'),
        loai_benh_an: row.loai_benh_an,
        clinical_type: row.loai_benh_an === 'MAN' ? 'chronic' : 'acute',
        diagnosis: row.chan_doan_ban_dau_phong_kham || row.tom_tat_buoi_kham || null,
        visit_summary: row.tom_tat_buoi_kham || null,
        visit_plan: row.huong_xu_tri_lan_sau || null,
        status: row.trang_thai,
        instructions: meta.instructions || row.dan_do || null,
        created_at:
          meta.created_at ||
          (row.thoi_diem_kham_lan_dau
            ? new Date(row.thoi_diem_kham_lan_dau).toISOString()
            : null),
        completed_at: meta.completed_at || null
      };
    });

    return sendResponse(res, RESPONSE_CODES.OK, history);
  } catch (err) {
    console.error('[MedicalRecordController.getPatientMedicalHistory] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 7. Truy xuất toàn bộ câu trả lời trong biểu mẫu khám của bệnh án (medrec08)
 * Endpoint: GET /api/v1/medical_records/:id/answers
 */
async function getMedicalRecordAnswers(req, res) {
  try {
    const { id } = req.params;
    const { record, error } = await fetchAndAuthorizeMedicalRecord(id, req.user);
    if (error) {
      return sendResponse(res, error);
    }

    const maHoSo = Number(record.ma_ho_so);
    const storedMap = state.dynamicAnswers[maHoSo] || {};
    const answersList = Object.values(storedMap);

    // Gắn thêm danh sách ảnh đính kèm cho từng câu trả lời (nếu có trong answer_images)
    const enrichedAnswers = answersList.map((ans) => {
      const attachedImages = state.answerImages.filter(
        (img) => Number(img.answer_id) === Number(ans.id)
      );
      return {
        ...ans,
        images: attachedImages
      };
    });

    return sendResponse(res, RESPONSE_CODES.OK, enrichedAnswers);
  } catch (err) {
    console.error('[MedicalRecordController.getMedicalRecordAnswers] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 8. Cập nhật / Upsert câu trả lời của bệnh nhân vào bệnh án (medrec10)
 * Endpoint: PUT /api/v1/medical_records/:id/answers
 * Ràng buộc: UNIQUE(medical_record_id, question_id). Chặn sửa nếu status === 'completed' (4003).
 */
async function updateMedicalRecordAnswers(req, res) {
  try {
    const { id } = req.params;
    const { record, error } = await fetchAndAuthorizeMedicalRecord(id, req.user);
    if (error) {
      return sendResponse(res, error);
    }

    // Kiểm tra trạng thái bệnh án: Không cho phép cập nhật khi bệnh án đã đóng (Test case 4003)
    if (record.trang_thai === 'completed') {
      return sendResponse(res, RESPONSE_CODES.MEDICAL_RECORD_COMPLETED);
    }

    const body = req.body || {};
    const answers = body.answers;
    if (!Array.isArray(answers) || answers.length === 0) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM, {}, 'answers array is required');
    }

    const maHoSo = Number(record.ma_ho_so);
    const count = await withTransaction(async (client) => {
      return upsertAnswersForRecord(
        client,
        maHoSo,
        record.loai_benh_an,
        answers,
        req.user.user_id
      );
    });

    return sendResponse(
      res,
      RESPONSE_CODES.OK,
      { count },
      'Cập nhật câu trả lời thành công'
    );
  } catch (err) {
    console.error('[MedicalRecordController.updateMedicalRecordAnswers] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 9. Lấy cấu trúc cây biểu mẫu khám động 4 tầng (tmpl03) để ứng dụng Bệnh nhân hiển thị
 * Endpoint: GET /api/v1/templates/:id
 */
async function getTemplateDetail(req, res) {
  try {
    const templateId = String(req.params.id || '').trim();
    const tmpl =
      (state.customTemplates && state.customTemplates[templateId]) || DEFAULT_TEMPLATES[templateId];
    if (!tmpl) {
      return sendResponse(res, RESPONSE_CODES.TEMPLATE_NOT_FOUND);
    }
    return sendResponse(res, RESPONSE_CODES.OK, tmpl);
  } catch (err) {
    console.error('[MedicalRecordController.getTemplateDetail] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 10. Bệnh nhân xem kết quả xét nghiệm cận lâm sàng của bệnh án (lab02 - Slide 1 & Slide 7)
 * Endpoint: GET /api/v1/lab-results/:record_id
 * Truy vấn trực tiếp từ các bảng `phienkham` -> `ketquacanlamsang` -> `ketquacanlamsangcap` / `ketquacanlamsangman`
 */
async function getLabResultsByRecord(req, res) {
  try {
    const { record_id } = req.params;
    const { record, error } = await fetchAndAuthorizeMedicalRecord(record_id, req.user);
    if (error) {
      return sendResponse(res, error);
    }

    const maHoSo = Number(record.ma_ho_so);
    const kqRes = await query(
      `SELECT kq.ma_ket_qua_can_lam_sang, kq.ma_phien_kham, kq.loai_ket_qua_can_lam_sang,
              kq.wbc, kq.crp, kq.ige_toan_phan, kq.can_lam_sang_khac_ghi_chu,
              kq.xet_nghiem_khac, kq.thoi_diem_thuc_hien,
              cap.lym, cap.neu, cap.plt, cap.tryptase_cap, cap.tryptase_nen, cap.nlr, cap.plr,
              man.test_huyet_thanh_tu_than, man.ige_khang_tpo_ket_qua, man.bat_ket_qua,
              man.ige_khang_il24_ket_qua, man.asst_duong_kinh_mm, man.eo, man.ba_bach_cau,
              man.anti_tpo, man.tsh, man.ft4, man.ft3, man.mau_lang_1h, man.mau_lang_2h,
              man.ana_hep2, man.sieu_am_tuyen_giap
       FROM public.ketquacanlamsang kq
       JOIN public.phienkham pk ON pk.ma_phien_kham = kq.ma_phien_kham
       LEFT JOIN public.ketquacanlamsangcap cap ON cap.ma_ket_qua_can_lam_sang = kq.ma_ket_qua_can_lam_sang
       LEFT JOIN public.ketquacanlamsangman man ON man.ma_ket_qua_can_lam_sang = kq.ma_ket_qua_can_lam_sang
       WHERE pk.ma_ho_so = $1
       ORDER BY kq.thoi_diem_thuc_hien DESC NULLS LAST`,
      [maHoSo]
    );

    return sendResponse(res, RESPONSE_CODES.OK, kqRes.rows);
  } catch (err) {
    console.error('[MedicalRecordController.getLabResultsByRecord] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 11. Bệnh nhân xem đơn thuốc điện tử & chỉ dẫn ngừng thuốc của bệnh án (Slide 1 & Slide 7)
 * Endpoint: GET /api/v1/prescriptions/:record_id
 * Truy vấn từ `public.donthuoc`, `public.chitietdonthuoc`, `public.thuoc`, `public.chidanngungthuoc`
 */
async function getPrescriptionsByRecord(req, res) {
  try {
    const { record_id } = req.params;
    const { record, error } = await fetchAndAuthorizeMedicalRecord(record_id, req.user);
    if (error) {
      return sendResponse(res, error);
    }

    const maHoSo = Number(record.ma_ho_so);
    const donRes = await query(
      `SELECT * FROM public.donthuoc WHERE ma_ho_so = $1 ORDER BY ngay_ke_don DESC, ma_don_thuoc DESC`,
      [maHoSo]
    );

    const prescriptions = [];
    for (const don of donRes.rows) {
      const itemsRes = await query(
        `SELECT ct.*, t.ten_thuoc, t.hoat_chat, t.nhom_dieu_tri
         FROM public.chitietdonthuoc ct
         LEFT JOIN public.thuoc t ON t.ma_thuoc = ct.ma_thuoc
         WHERE ct.ma_don_thuoc = $1`,
        [don.ma_don_thuoc]
      );

      const stopRes = await query(
        `SELECT * FROM public.chidanngungthuoc WHERE ma_don_thuoc = $1`,
        [don.ma_don_thuoc]
      );

      prescriptions.push({
        prescription_id: String(don.ma_don_thuoc),
        medical_record_id: String(don.ma_ho_so),
        session_id: String(don.ma_phien_kham),
        prescribed_date: don.ngay_ke_don,
        status: don.trang_thai_don,
        notes: don.ghi_chu_dieu_tri,
        stop_medication_next_visit: don.ngung_thuoc_lan_sau,
        medications_to_stop: don.thuoc_can_ngung_truoc_tai_kham,
        items: itemsRes.rows,
        stop_instructions: stopRes.rows
      });
    }

    return sendResponse(res, RESPONSE_CODES.OK, prescriptions);
  } catch (err) {
    console.error('[MedicalRecordController.getPrescriptionsByRecord] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

module.exports = {
  createRedFlagScreening,
  getClassifyQuestions,
  classifyMedicalRecord,
  createMedicalRecord,
  getMedicalRecordById,
  getMedicalRecordSummary,
  getPatientMedicalHistory,
  getMedicalRecordAnswers,
  updateMedicalRecordAnswers,
  getTemplateDetail,
  getLabResultsByRecord,
  getPrescriptionsByRecord,
  fetchAndAuthorizeMedicalRecord
};

