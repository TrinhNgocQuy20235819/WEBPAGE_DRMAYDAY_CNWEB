/**
 * APIs nghiệp vụ bác sĩ (Đầu việc 3), dùng chung PostgreSQL với backend bệnh nhân.
 * Các thay đổi dữ liệu được ghi vào schema mayday-database hiện có.
 */
const { query, withTransaction } = require('../config/database');
const { RESPONSE_CODES, sendResponse } = require('../config/responseCodes');

const empty = (value) => value === undefined || value === null || value === '';
const validId = (value) => /^\d+$/.test(String(value || '')) && Number(value) > 0;
const toRecord = (row) => ({
  medical_record_id: row.ma_ho_so == null ? null : String(row.ma_ho_so), patient_id: String(row.ma_benh_nhan),
  patient_name: row.ho_ten, phone: row.so_dien_thoai, date_of_birth: row.ngay_sinh,
  gender: row.gioi_tinh, record_type: row.loai_benh_an, status: row.trang_thai,
  first_visit_at: row.thoi_diem_kham_lan_dau, created_at: row.thoi_diem_tao,
  assigned_doctor_id: row.ma_bac_si ? String(row.ma_bac_si) : null,
  visit_id: row.ma_phien_kham ? String(row.ma_phien_kham) : null,
  visit_date: row.ngay_kham || null, visit_number: row.lan_kham_thu || null,
  visit_summary: row.tom_tat_buoi_kham || null
});

async function doctorExists(id, db = { query }) {
  const result = await db.query('SELECT 1 FROM public.nhanvien WHERE ma_nhan_vien = $1', [id]);
  return result.rowCount > 0;
}

async function assignedRecord(recordId, doctorId, db = { query }, lock = false) {
  const result = await db.query(
    `SELECT h.ma_ho_so, h.ma_benh_nhan, h.loai_benh_an, h.trang_thai,
            pk.ma_phien_kham, pk.ma_bac_si
     FROM public.hosobenhan h
     LEFT JOIN LATERAL (
       SELECT ma_phien_kham, ma_bac_si FROM public.phienkham
       WHERE ma_ho_so = h.ma_ho_so ORDER BY lan_kham_thu DESC LIMIT 1
     ) pk ON TRUE
     WHERE h.ma_ho_so = $1${lock ? ' FOR UPDATE OF h' : ''}`,
    [recordId]
  );
  if (!result.rowCount) return { error: RESPONSE_CODES.MEDICAL_RECORD_NOT_FOUND };
  const record = result.rows[0];
  if (record.ma_bac_si && Number(record.ma_bac_si) !== Number(doctorId)) {
    return { error: RESPONSE_CODES.DOCTOR_NOT_ASSIGNED };
  }
  return { record };
}

async function searchPatients(req, res) {
  try {
    const q = String(req.query.q || req.query.search || '').trim();
    if (q.length < 2) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM, {}, 'q must contain at least 2 characters');
    const result = await query(
      `SELECT DISTINCT ON (bn.ma_benh_nhan)
         h.ma_ho_so, bn.ma_benh_nhan, h.loai_benh_an, h.trang_thai,
         h.thoi_diem_kham_lan_dau, h.thoi_diem_kham_lan_dau AS thoi_diem_tao, n.ho_ten, n.so_dien_thoai,
         n.ngay_sinh, n.gioi_tinh, pk.ma_phien_kham, pk.ma_bac_si,
         pk.ngay_kham, pk.lan_kham_thu, pk.tom_tat_buoi_kham
       FROM public.benhnhan bn
       JOIN public.nguoi n ON n.ma_nguoi = bn.ma_benh_nhan
       LEFT JOIN public.hosobenhan h ON h.ma_benh_nhan = bn.ma_benh_nhan
       LEFT JOIN public.phienkham pk ON pk.ma_ho_so = h.ma_ho_so
       WHERE n.ho_ten ILIKE $1 OR n.so_dien_thoai ILIKE $1 OR bn.ma_his ILIKE $1
          OR h.ma_ho_so::text = $2 OR bn.ma_benh_nhan::text = $2
       ORDER BY bn.ma_benh_nhan, h.ma_ho_so DESC NULLS LAST, pk.lan_kham_thu DESC NULLS LAST
       LIMIT 50`, [`%${q}%`, q]
    );
    return sendResponse(res, RESPONSE_CODES.OK, result.rows.map(toRecord));
  } catch (err) {
    console.error('[Doctor.searchPatients]', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getQueue(req, res) {
  try {
    const status = String(req.query.status || 'pending');
    if (!['pending', 'in_progress', 'all'].includes(status)) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'status must be pending, in_progress, or all');
    }
    const result = await query(
      `SELECT h.ma_ho_so, h.ma_benh_nhan, h.loai_benh_an, h.trang_thai,
              h.thoi_diem_kham_lan_dau, h.thoi_diem_kham_lan_dau AS thoi_diem_tao, n.ho_ten, n.so_dien_thoai,
              n.ngay_sinh, n.gioi_tinh, pk.ma_phien_kham, pk.ma_bac_si,
              pk.ngay_kham, pk.lan_kham_thu, pk.tom_tat_buoi_kham
       FROM public.hosobenhan h
       JOIN public.benhnhan bn ON bn.ma_benh_nhan = h.ma_benh_nhan
       JOIN public.nguoi n ON n.ma_nguoi = bn.ma_benh_nhan
       LEFT JOIN LATERAL (
         SELECT ma_phien_kham, ma_bac_si, ngay_kham, lan_kham_thu, tom_tat_buoi_kham
         FROM public.phienkham WHERE ma_ho_so = h.ma_ho_so
         ORDER BY lan_kham_thu DESC LIMIT 1
       ) pk ON TRUE
       WHERE ($1 = 'all' OR h.trang_thai = $1)
         AND h.trang_thai IN ('pending', 'in_progress')
         AND (h.trang_thai = 'pending' OR pk.ma_bac_si = $2)
       ORDER BY CASE h.trang_thai WHEN 'in_progress' THEN 0 ELSE 1 END,
                h.thoi_diem_kham_lan_dau NULLS LAST, h.ma_ho_so`,
      [status, req.user.user_id]
    );
    return sendResponse(res, RESPONSE_CODES.OK, result.rows.map(toRecord));
  } catch (err) {
    console.error('[Doctor.getQueue]', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function acceptRecord(req, res) {
  const recordId = Number(req.params.id);
  const doctorId = req.user.user_id;
  if (!validId(recordId)) return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE);
  if (req.body.ma_phong_kham && !validId(req.body.ma_phong_kham)) return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE);
  try {
    if (!(await doctorExists(doctorId))) return sendResponse(res, RESPONSE_CODES.DOCTOR_ROLE_REQUIRED, {}, 'Doctor profile not found in staff directory');
    const accepted = await withTransaction(async (db) => {
      const lock = await db.query(
        `SELECT ma_ho_so, ma_benh_nhan, loai_benh_an, trang_thai
         FROM public.hosobenhan WHERE ma_ho_so = $1 FOR UPDATE`, [recordId]
      );
      if (!lock.rowCount) return { error: RESPONSE_CODES.MEDICAL_RECORD_NOT_FOUND };
      const record = lock.rows[0];
      if (record.trang_thai !== 'pending') {
        return { error: record.trang_thai === 'in_progress' ? RESPONSE_CODES.ALREADY_ACCEPTED : RESPONSE_CODES.RECORD_NOT_PENDING };
      }
      const visits = await db.query('SELECT COALESCE(MAX(lan_kham_thu), 0)::int AS last_visit FROM public.phienkham WHERE ma_ho_so = $1', [recordId]);
      const visitNumber = Number(visits.rows[0].last_visit) + 1;
      const visit = await db.query(
        `INSERT INTO public.phienkham
           (ma_ho_so, ma_bac_si, ma_phong_kham, loai_benh_an, ngay_kham, lan_kham_thu)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)
         RETURNING ma_phien_kham`,
        [recordId, doctorId, req.body.ma_phong_kham || null, record.loai_benh_an, visitNumber]
      );
      const visitId = visit.rows[0].ma_phien_kham;
      await db.query(record.loai_benh_an === 'CAP'
        ? 'INSERT INTO public.phienkhamcap (ma_phien_kham) VALUES ($1)'
        : 'INSERT INTO public.phienkhamman (ma_phien_kham) VALUES ($1)', [visitId]);
      await db.query("UPDATE public.hosobenhan SET trang_thai = 'in_progress' WHERE ma_ho_so = $1", [recordId]);
      return { visit_id: String(visitId), medical_record_id: String(recordId), status: 'in_progress', visit_number: visitNumber };
    });
    if (accepted.error) return sendResponse(res, accepted.error);
    return sendResponse(res, RESPONSE_CODES.CREATED, accepted);
  } catch (err) {
    console.error('[Doctor.acceptRecord]', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function completeRecord(req, res) {
  const recordId = Number(req.params.id);
  if (!validId(recordId)) return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE);
  const body = req.body || {};
  try {
    const result = await withTransaction(async (db) => {
      const access = await assignedRecord(recordId, req.user.user_id, db, true);
      if (access.error) return { error: access.error };
      const record = access.record;
      if (!record.ma_phien_kham || Number(record.ma_bac_si) !== req.user.user_id) return { error: RESPONSE_CODES.DOCTOR_NOT_ASSIGNED };
      if (record.trang_thai === 'completed') return { error: RESPONSE_CODES.MEDICAL_RECORD_COMPLETED };
      if (record.trang_thai !== 'in_progress') return { error: RESPONSE_CODES.ACTIVE_RECORD_REQUIRED };
      const update = await db.query(
        `UPDATE public.phienkham
         SET tom_tat_buoi_kham = COALESCE($1, tom_tat_buoi_kham),
             huong_xu_tri_lan_sau = COALESCE($2, huong_xu_tri_lan_sau),
             dan_do = COALESCE($3, dan_do),
             ngay_hen_tai_kham = COALESCE($4::date, ngay_hen_tai_kham)
         WHERE ma_phien_kham = $5
         RETURNING ma_phien_kham`,
        [body.tom_tat_buoi_kham ?? body.summary ?? null, body.huong_xu_tri_lan_sau ?? body.plan ?? null,
          body.dan_do ?? body.instructions ?? null, body.ngay_hen_tai_kham || null, record.ma_phien_kham]
      );
      if (!update.rowCount) return { error: RESPONSE_CODES.MEDICAL_RECORD_NOT_FOUND };
      await db.query("UPDATE public.hosobenhan SET trang_thai = 'completed' WHERE ma_ho_so = $1", [recordId]);
      return { medical_record_id: String(recordId), visit_id: String(record.ma_phien_kham), status: 'completed' };
    });
    if (result.error) return sendResponse(res, result.error);
    return sendResponse(res, RESPONSE_CODES.OK, result);
  } catch (err) {
    console.error('[Doctor.completeRecord]', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getPatientHistory(req, res) {
  const patientId = Number(req.params.patientId);
  if (!validId(patientId)) return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE);
  try {
    const result = await query(
      `SELECT h.ma_ho_so, h.ma_benh_nhan, h.loai_benh_an, h.trang_thai,
              h.thoi_diem_kham_lan_dau, h.thoi_diem_kham_lan_dau AS thoi_diem_tao, n.ho_ten, n.so_dien_thoai,
              n.ngay_sinh, n.gioi_tinh, pk.ma_phien_kham, pk.ma_bac_si,
              pk.ngay_kham, pk.lan_kham_thu, pk.tom_tat_buoi_kham,
              pk.huong_xu_tri_lan_sau, pk.dan_do
       FROM public.hosobenhan h
       JOIN public.benhnhan bn ON bn.ma_benh_nhan = h.ma_benh_nhan
       JOIN public.nguoi n ON n.ma_nguoi = bn.ma_benh_nhan
       LEFT JOIN public.phienkham pk ON pk.ma_ho_so = h.ma_ho_so
       WHERE h.ma_benh_nhan = $1
       ORDER BY h.ma_ho_so DESC, pk.lan_kham_thu DESC NULLS LAST`, [patientId]
    );
    return sendResponse(res, RESPONSE_CODES.OK, result.rows.map((row) => ({
      ...toRecord(row), plan: row.huong_xu_tri_lan_sau || null, instructions: row.dan_do || null
    })));
  } catch (err) {
    console.error('[Doctor.getPatientHistory]', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function createPrescription(req, res) {
  const recordId = Number(req.params.id);
  const body = req.body || {};
  const items = body.items;
  if (!validId(recordId)) return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE);
  if (!Array.isArray(items) || !items.length) return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'items must be a non-empty array');
  if (items.some((item) => !String(item.drug_name || item.ten_thuoc || '').trim() || !String(item.dosage || item.lieu_dung || '').trim() || !String(item.duration || item.thoi_gian_dung || '').trim())) {
    return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'Each item requires drug_name, dosage, and duration');
  }
  try {
    const result = await withTransaction(async (db) => {
      const access = await assignedRecord(recordId, req.user.user_id, db, true);
      if (access.error) return { error: access.error };
      if (!access.record.ma_phien_kham || Number(access.record.ma_bac_si) !== req.user.user_id) return { error: RESPONSE_CODES.DOCTOR_NOT_ASSIGNED };
      if (access.record.trang_thai === 'completed') return { error: RESPONSE_CODES.MEDICAL_RECORD_COMPLETED };
      const header = await db.query(
        `INSERT INTO public.donthuoc (ma_ho_so, ngay_ke_don, ghi_chu_dieu_tri, ngung_thuoc_lan_sau, thuoc_can_ngung_truoc_tai_kham)
         VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5) RETURNING ma_don_thuoc, ngay_ke_don, trang_thai_don, ghi_chu_dieu_tri`,
        [recordId, body.prescribed_date || null, body.treatment_note || body.ghi_chu_dieu_tri || null,
          body.stop_medication_next_visit === true, body.medication_to_stop || null]
      );
      const rx = header.rows[0];
      const savedItems = [];
      for (const item of items) {
        const drugId = item.drug_id || item.ma_thuoc || null;
        const detail = await db.query(
          `INSERT INTO public.chitietdonthuoc (ma_don_thuoc, ma_thuoc, ten_thuoc_bo_sung, lieu_dung, thoi_gian_dung)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING ma_chi_tiet_don_thuoc, ma_thuoc, ten_thuoc_bo_sung, lieu_dung, thoi_gian_dung`,
          [rx.ma_don_thuoc, drugId, drugId ? null : String(item.drug_name || item.ten_thuoc).trim(),
            String(item.dosage || item.lieu_dung).trim(), String(item.duration || item.thoi_gian_dung).trim()]
        );
        savedItems.push(detail.rows[0]);
      }
      return { prescription_id: String(rx.ma_don_thuoc), medical_record_id: String(recordId), date: rx.ngay_ke_don,
        status: rx.trang_thai_don, treatment_note: rx.ghi_chu_dieu_tri, items: savedItems.map((x) => ({
          item_id: String(x.ma_chi_tiet_don_thuoc), drug_id: x.ma_thuoc, drug_name: x.ten_thuoc_bo_sung,
          dosage: x.lieu_dung, duration: x.thoi_gian_dung
        })) };
    });
    if (result.error) return sendResponse(res, result.error);
    return sendResponse(res, RESPONSE_CODES.CREATED, result);
  } catch (err) {
    console.error('[Doctor.createPrescription]', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function createLabResult(req, res) {
  const recordId = Number(req.params.id);
  const body = req.body || {};
  if (!validId(recordId)) return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE);
  const tests = body.tests || body.xet_nghiem_khac;
  if (empty(tests)) return sendResponse(res, RESPONSE_CODES.MISSING_PARAM, {}, 'tests is required');
  try {
    const result = await withTransaction(async (db) => {
      const access = await assignedRecord(recordId, req.user.user_id, db, true);
      if (access.error) return { error: access.error };
      if (!access.record.ma_phien_kham || Number(access.record.ma_bac_si) !== req.user.user_id) return { error: RESPONSE_CODES.DOCTOR_NOT_ASSIGNED };
      if (access.record.trang_thai === 'completed') return { error: RESPONSE_CODES.MEDICAL_RECORD_COMPLETED };
      const type = access.record.loai_benh_an;
      const base = await db.query(
        `INSERT INTO public.ketquacanlamsang
           (ma_phien_kham, loai_ket_qua_can_lam_sang, xet_nghiem_khac, can_lam_sang_khac_ghi_chu)
         VALUES ($1, $2, $3, $4)
         RETURNING ma_ket_qua_can_lam_sang, ma_phien_kham, xet_nghiem_khac`,
        [access.record.ma_phien_kham, type, Array.isArray(tests) ? tests.join(', ') : String(tests), body.note || null]
      );
      const lab = base.rows[0];
      await db.query(type === 'CAP'
        ? 'INSERT INTO public.ketquacanlamsangcap (ma_ket_qua_can_lam_sang) VALUES ($1)'
        : 'INSERT INTO public.ketquacanlamsangman (ma_ket_qua_can_lam_sang) VALUES ($1)', [lab.ma_ket_qua_can_lam_sang]);
      return { lab_result_id: String(lab.ma_ket_qua_can_lam_sang), visit_id: String(lab.ma_phien_kham),
        tests: lab.xet_nghiem_khac, status: 'ordered' };
    });
    if (result.error) return sendResponse(res, result.error);
    return sendResponse(res, RESPONSE_CODES.CREATED, result);
  } catch (err) {
    console.error('[Doctor.createLabResult]', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getLabResults(req, res) {
  const recordId = Number(req.params.id);
  if (!validId(recordId)) return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE);
  try {
    const access = await assignedRecord(recordId, req.user.user_id);
    if (access.error) return sendResponse(res, access.error);
    if (!access.record.ma_phien_kham || Number(access.record.ma_bac_si) !== req.user.user_id) return sendResponse(res, RESPONSE_CODES.DOCTOR_NOT_ASSIGNED);
    const result = await query(
      `SELECT k.ma_ket_qua_can_lam_sang, k.ma_phien_kham, k.loai_ket_qua_can_lam_sang,
              k.xet_nghiem_khac, k.can_lam_sang_khac_ghi_chu, k.thoi_diem_thuc_hien,
              k.wbc, k.crp, k.ige_toan_phan, kc.lym, kc.neu, kc.plt, kc.tryptase_cap, kc.tryptase_nen,
              km.test_huyet_thanh_tu_than, km.ige_khang_tpo_ket_qua, km.bat_ket_qua,
              km.ige_khang_il24_ket_qua, km.asst_duong_kinh_mm, km.eo, km.ba_bach_cau,
              km.anti_tpo, km.tsh, km.ft4, km.ft3, km.mau_lang_2h, km.mau_lang_1h, km.ana_hep2, km.sieu_am_tuyen_giap
       FROM public.ketquacanlamsang k
       LEFT JOIN public.ketquacanlamsangcap kc ON kc.ma_ket_qua_can_lam_sang = k.ma_ket_qua_can_lam_sang
       LEFT JOIN public.ketquacanlamsangman km ON km.ma_ket_qua_can_lam_sang = k.ma_ket_qua_can_lam_sang
       JOIN public.phienkham pk ON pk.ma_phien_kham = k.ma_phien_kham
       WHERE pk.ma_ho_so = $1 ORDER BY k.ma_ket_qua_can_lam_sang DESC`, [recordId]
    );
    return sendResponse(res, RESPONSE_CODES.OK, result.rows);
  } catch (err) {
    console.error('[Doctor.getLabResults]', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

async function getLesionImages(req, res) {
  const recordId = Number(req.params.id);
  if (!validId(recordId)) return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE);
  try {
    const access = await assignedRecord(recordId, req.user.user_id);
    if (access.error) return sendResponse(res, access.error);
    if (!access.record.ma_phien_kham || Number(access.record.ma_bac_si) !== req.user.user_id) return sendResponse(res, RESPONSE_CODES.DOCTOR_NOT_ASSIGNED);
    const result = await query(
      `SELECT d.ma_dot_ton_thuong_da, d.ten_dot_ton_thuong_da, d.thoi_diem_xuat_hien,
              v.ma_vi_tri_ton_thuong, v.vi_tri_co_the,
              a.ma_anh, a.ma_tep_dinh_kem, a.thoi_diem_chup, a.moc_tien_trien,
              a.diem_ngua_nrs, a.diem_dau_nrs, a.diem_bong_rat_nrs,
              a.so_luong_not_san, a.chi_so_auas_cuc_bo,
              COALESCE(a.url_anh, t.duong_dan_url) AS image_url,
              t.ten_tep_goc, t.duong_dan_luu_tru
       FROM public.dottonthuongda d
       LEFT JOIN public.vitritonthuong v ON v.ma_dot_ton_thuong_da = d.ma_dot_ton_thuong_da
       LEFT JOIN public.anhchuptonthuong a ON a.ma_vi_tri_ton_thuong = v.ma_vi_tri_ton_thuong
                                        OR (a.ma_dot_ton_thuong_da = d.ma_dot_ton_thuong_da AND a.ma_vi_tri_ton_thuong IS NULL)
       LEFT JOIN public.tepdinhkem t ON t.ma_tep_dinh_kem = a.ma_tep_dinh_kem
       WHERE d.ma_benh_nhan = $1
         AND (d.ma_ho_so_man = $2 OR d.ma_ho_so_man IS NULL)
       ORDER BY d.thoi_diem_xuat_hien DESC NULLS LAST, v.ma_vi_tri_ton_thuong, a.thoi_diem_chup`,
      [access.record.ma_benh_nhan, recordId]
    );
    const groups = new Map();
    for (const row of result.rows) {
      const episodeId = String(row.ma_dot_ton_thuong_da);
      if (!groups.has(episodeId)) groups.set(episodeId, { episode_id: episodeId, name: row.ten_dot_ton_thuong_da,
        occurred_at: row.thoi_diem_xuat_hien, locations: new Map(), photos: [] });
      const episode = groups.get(episodeId);
      if (row.ma_vi_tri_ton_thuong) {
        const locationId = String(row.ma_vi_tri_ton_thuong);
        if (!episode.locations.has(locationId)) episode.locations.set(locationId, { location_id: locationId, body_part: row.vi_tri_co_the, photos: [] });
        if (row.ma_anh) episode.locations.get(locationId).photos.push({ photo_id: String(row.ma_anh), attachment_id: String(row.ma_tep_dinh_kem),
          milestone: row.moc_tien_trien, captured_at: row.thoi_diem_chup, itch_score: row.diem_ngua_nrs,
          pain_score: row.diem_dau_nrs, burning_score: row.diem_bong_rat_nrs, hives_count: row.so_luong_not_san,
          auas: row.chi_so_auas_cuc_bo, image_url: row.image_url, file_name: row.ten_tep_goc, storage_path: row.duong_dan_luu_tru });
      } else if (row.ma_anh) {
        groups.get(episodeId).photos.push({ photo_id: String(row.ma_anh), attachment_id: String(row.ma_tep_dinh_kem),
          milestone: row.moc_tien_trien, captured_at: row.thoi_diem_chup, itch_score: row.diem_ngua_nrs,
          pain_score: row.diem_dau_nrs, burning_score: row.diem_bong_rat_nrs, hives_count: row.so_luong_not_san,
          auas: row.chi_so_auas_cuc_bo, image_url: row.image_url, file_name: row.ten_tep_goc, storage_path: row.duong_dan_luu_tru });
      }
    }
    const episodes = [...groups.values()].map((episode) => ({ ...episode, locations: [...episode.locations.values()] }));
    return sendResponse(res, RESPONSE_CODES.OK, episodes);
  } catch (err) {
    console.error('[Doctor.getLesionImages]', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

const LAB_BASE_FIELDS = {
  wbc: 'wbc', crp: 'crp', ige_toan_phan: 'ige_toan_phan',
  can_lam_sang_khac_ghi_chu: 'can_lam_sang_khac_ghi_chu',
  xet_nghiem_khac: 'xet_nghiem_khac', thoi_diem_thuc_hien: 'thoi_diem_thuc_hien'
};
const LAB_CAP_FIELDS = {
  lym: 'lym', neu: 'neu', plt: 'plt', tryptase_cap: 'tryptase_cap', tryptase_nen: 'tryptase_nen'
};
const LAB_MAN_FIELDS = {
  test_huyet_thanh_tu_than: 'test_huyet_thanh_tu_than', ige_khang_tpo_ket_qua: 'ige_khang_tpo_ket_qua',
  bat_ket_qua: 'bat_ket_qua', ige_khang_il24_ket_qua: 'ige_khang_il24_ket_qua',
  asst_duong_kinh_mm: 'asst_duong_kinh_mm', eo: 'eo', ba_bach_cau: 'ba_bach_cau',
  anti_tpo: 'anti_tpo', tsh: 'tsh', ft4: 'ft4', ft3: 'ft3', mau_lang_2h: 'mau_lang_2h',
  mau_lang_1h: 'mau_lang_1h', ana_hep2: 'ana_hep2', sieu_am_tuyen_giap: 'sieu_am_tuyen_giap'
};

async function updateLabResult(req, res) {
  const labId = Number(req.params.labId);
  if (!validId(labId)) return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE);
  const body = req.body || {};
  try {
    const saved = await withTransaction(async (db) => {
      const access = await db.query(
        `SELECT k.ma_ket_qua_can_lam_sang, k.ma_phien_kham, k.loai_ket_qua_can_lam_sang,
                h.ma_ho_so, h.trang_thai, pk.ma_bac_si
         FROM public.ketquacanlamsang k
         JOIN public.phienkham pk ON pk.ma_phien_kham = k.ma_phien_kham
         JOIN public.hosobenhan h ON h.ma_ho_so = pk.ma_ho_so
         WHERE k.ma_ket_qua_can_lam_sang = $1 FOR UPDATE OF k, h`, [labId]
      );
      if (!access.rowCount) return { error: RESPONSE_CODES.MEDICAL_RECORD_NOT_FOUND };
      const lab = access.rows[0];
      if (Number(lab.ma_bac_si) !== req.user.user_id) return { error: RESPONSE_CODES.DOCTOR_NOT_ASSIGNED };
      if (lab.trang_thai === 'completed') return { error: RESPONSE_CODES.MEDICAL_RECORD_COMPLETED };

      const baseUpdates = Object.entries(LAB_BASE_FIELDS).filter(([key]) => body[key] !== undefined);
      const subtypeFields = lab.loai_ket_qua_can_lam_sang === 'CAP' ? LAB_CAP_FIELDS : LAB_MAN_FIELDS;
      const subtypeUpdates = Object.entries(subtypeFields).filter(([key]) => body[key] !== undefined);
      if (!baseUpdates.length && !subtypeUpdates.length) return { error: RESPONSE_CODES.MISSING_PARAM };

      if (baseUpdates.length) {
        const values = baseUpdates.map(([key]) => body[key]);
        values.push(labId);
        const setClause = baseUpdates.map(([key, column], i) => `${column} = $${i + 1}`).join(', ');
        await db.query(`UPDATE public.ketquacanlamsang SET ${setClause} WHERE ma_ket_qua_can_lam_sang = $${values.length}`, values);
      }
      if (subtypeUpdates.length) {
        const table = lab.loai_ket_qua_can_lam_sang === 'CAP' ? 'ketquacanlamsangcap' : 'ketquacanlamsangman';
        const values = subtypeUpdates.map(([key]) => body[key]);
        values.push(labId);
        const setClause = subtypeUpdates.map(([key, column], i) => `${column} = $${i + 1}`).join(', ');
        await db.query(`UPDATE public.${table} SET ${setClause} WHERE ma_ket_qua_can_lam_sang = $${values.length}`, values);
      }
      return { lab_result_id: String(labId), medical_record_id: String(lab.ma_ho_so), updated: [...baseUpdates, ...subtypeUpdates].map(([key]) => key) };
    });
    if (saved.error) return sendResponse(res, saved.error);
    return sendResponse(res, RESPONSE_CODES.OK, saved);
  } catch (err) {
    console.error('[Doctor.updateLabResult]', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

module.exports = { searchPatients, getQueue, acceptRecord, completeRecord, getPatientHistory,
  createPrescription, createLabResult, updateLabResult, getLabResults, getLesionImages };
