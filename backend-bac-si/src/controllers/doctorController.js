/**
 * APIs nghiệp vụ bác sĩ (Đầu việc 3), dùng chung PostgreSQL với backend bệnh nhân.
 * Các thay đổi dữ liệu được ghi vào schema mayday-database hiện có (không sửa DDL).
 */
const path = require('path');
const bcrypt = require(path.resolve(__dirname, '../../../backend-benh-nhan/node_modules/bcryptjs'));
const { query, withTransaction } = require('../config/database');
const { RESPONSE_CODES, sendResponse } = require('../config/responseCodes');

let sharedStore = null;
let pushNotification = () => {};
try {
  sharedStore = require(path.resolve(__dirname, '../../../backend-benh-nhan/src/config/runtimeStore'));
  const infra = require(path.resolve(__dirname, '../../../backend-benh-nhan/src/controllers/sharedInfraController'));
  if (infra && typeof infra.pushNotification === 'function') {
    pushNotification = infra.pushNotification;
  }
} catch (_err) {
  sharedStore = null;
}

const empty = (value) => value === undefined || value === null || value === '';
const validId = (value) => /^\d+$/.test(String(value || '')) && Number(value) > 0;

const toRecord = (row) => {
  const maHoSo = row.ma_ho_so == null ? null : Number(row.ma_ho_so);
  const docId = row.ma_bac_si ? Number(row.ma_bac_si) : null;
  let roomName = 'Phòng Khám Chuyên Đề Mày Đay';
  if (sharedStore && sharedStore.state && docId && sharedStore.state.staffAssignments?.[docId]) {
    const rId = sharedStore.state.staffAssignments[docId].room_id;
    if (rId && sharedStore.state.rooms?.[rId]) {
      roomName = sharedStore.state.rooms[rId].name;
    }
  }
  return {
    medical_record_id: maHoSo == null ? null : String(maHoSo),
    record_code: maHoSo == null ? null : `BA-2026-${String(maHoSo).padStart(4, '0')}`,
    patient_id: String(row.ma_benh_nhan),
    patient_name: row.ho_ten,
    phone: row.so_dien_thoai,
    date_of_birth: row.ngay_sinh ? new Date(row.ngay_sinh).toISOString().slice(0, 10) : null,
    gender: row.gioi_tinh === 'Nu' ? 'Nữ' : 'Nam',
    raw_gender: row.gioi_tinh,
    bhyt_code: row.bhyt_so_the || null,
    ma_his: row.ma_his || null,
    record_type: row.loai_benh_an,
    clinical_type: row.loai_benh_an === 'MAN' ? 'chronic' : 'acute',
    status: row.trang_thai,
    diagnosis: row.chan_doan_ban_dau_phong_kham || row.tom_tat_buoi_kham || null,
    first_visit_at: row.thoi_diem_kham_lan_dau,
    created_at: row.thoi_diem_tao || row.thoi_diem_kham_lan_dau,
    assigned_doctor_id: docId ? String(docId) : null,
    assigned_doctor_name: row.ten_bac_si || null,
    room_name: roomName,
    visit_id: row.ma_phien_kham ? String(row.ma_phien_kham) : null,
    visit_date: row.ngay_kham || null,
    visit_number: row.lan_kham_thu || null,
    visit_summary: row.tom_tat_buoi_kham || null,
    uas7_total: row.uas7_total != null ? Number(row.uas7_total) : null
  };
};

async function doctorExists(id, db = { query }) {
  const result = await db.query('SELECT 1 FROM public.nhanvien WHERE ma_nhan_vien = $1', [id]);
  if (result.rowCount > 0) return true;
  // Nếu tài khoản bác sĩ/admin chưa có bản ghi nhanvien, tự động gán vào chi nhánh 1
  const cn = await db.query('SELECT ma_chi_nhanh FROM public.chinhanh ORDER BY ma_chi_nhanh ASC LIMIT 1');
  if (cn.rowCount > 0) {
    await db.query(
      'INSERT INTO public.nhanvien (ma_nhan_vien, ma_chi_nhanh) VALUES ($1, $2) ON CONFLICT (ma_nhan_vien) DO NOTHING',
      [id, cn.rows[0].ma_chi_nhanh]
    );
    return true;
  }
  return false;
}

async function assignedRecord(recordId, doctorId, db = { query }, lock = false, allowReadAny = false) {
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
  if (!allowReadAny && record.ma_bac_si && Number(record.ma_bac_si) !== Number(doctorId)) {
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
         h.ma_ho_so, bn.ma_benh_nhan, bn.bhyt_so_the, bn.ma_his,
         h.loai_benh_an, h.trang_thai, h.chan_doan_ban_dau_phong_kham,
         h.thoi_diem_kham_lan_dau, h.thoi_diem_kham_lan_dau AS thoi_diem_tao, n.ho_ten, n.so_dien_thoai,
         n.ngay_sinh, n.gioi_tinh, pk.ma_phien_kham, pk.ma_bac_si, bs.ho_ten AS ten_bac_si,
         pk.ngay_kham, pk.lan_kham_thu, pk.tom_tat_buoi_kham
       FROM public.benhnhan bn
       JOIN public.nguoi n ON n.ma_nguoi = bn.ma_benh_nhan
       LEFT JOIN public.hosobenhan h ON h.ma_benh_nhan = bn.ma_benh_nhan
       LEFT JOIN public.phienkham pk ON pk.ma_ho_so = h.ma_ho_so
       LEFT JOIN public.nguoi bs ON bs.ma_nguoi = pk.ma_bac_si
       WHERE n.ho_ten ILIKE $1 OR n.so_dien_thoai ILIKE $1 OR bn.ma_his ILIKE $1 OR bn.bhyt_so_the ILIKE $1
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
    if (!['pending', 'in_progress', 'completed', 'all'].includes(status)) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'status must be pending, in_progress, completed, or all');
    }
    const includeCompleted =
      status === 'completed' || String(req.query.include_completed || 'false').toLowerCase() === 'true';

    const result = await query(
      `SELECT h.ma_ho_so, h.ma_benh_nhan, bn.bhyt_so_the, bn.ma_his,
              h.loai_benh_an, h.trang_thai, h.chan_doan_ban_dau_phong_kham,
              h.thoi_diem_kham_lan_dau, h.thoi_diem_kham_lan_dau AS thoi_diem_tao, n.ho_ten, n.so_dien_thoai,
              n.ngay_sinh, n.gioi_tinh, pk.ma_phien_kham, pk.ma_bac_si, bs.ho_ten AS ten_bac_si,
              pk.ngay_kham, pk.lan_kham_thu, pk.tom_tat_buoi_kham,
              (
                SELECT COALESCE(SUM(u.diem_uas_ngay), 0)::int
                FROM (
                  SELECT diem_uas_ngay
                  FROM public.nhatkyuashangngay
                  WHERE ma_benh_nhan = h.ma_benh_nhan
                  ORDER BY ngay_cham_diem DESC
                  LIMIT 7
                ) u
              ) AS uas7_total
       FROM public.hosobenhan h
       JOIN public.benhnhan bn ON bn.ma_benh_nhan = h.ma_benh_nhan
       JOIN public.nguoi n ON n.ma_nguoi = bn.ma_benh_nhan
       LEFT JOIN LATERAL (
         SELECT ma_phien_kham, ma_bac_si, ngay_kham, lan_kham_thu, tom_tat_buoi_kham
         FROM public.phienkham WHERE ma_ho_so = h.ma_ho_so
         ORDER BY lan_kham_thu DESC LIMIT 1
       ) pk ON TRUE
       LEFT JOIN public.nguoi bs ON bs.ma_nguoi = pk.ma_bac_si
       WHERE ($1 = 'all' OR h.trang_thai = $1)
         AND (
           ($3 = true AND h.trang_thai IN ('pending', 'in_progress', 'completed'))
           OR ($3 = false AND h.trang_thai IN ('pending', 'in_progress'))
         )
         AND (h.trang_thai = 'pending' OR pk.ma_bac_si = $2 OR $4 = true)
       ORDER BY CASE h.trang_thai WHEN 'in_progress' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
                h.thoi_diem_kham_lan_dau DESC NULLS LAST, h.ma_ho_so DESC`,
      [status, req.user.user_id, includeCompleted, req.user.role_name === 'admin' || req.user.role_name === 'dieu_duong']
    );
    return sendResponse(res, RESPONSE_CODES.OK, result.rows.map(toRecord));
  } catch (err) {
    console.error('[Doctor.getQueue]', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * docpat02: Bác sĩ / Điều dưỡng tiếp nhận nhanh bệnh nhân mới tại quầy và tạo bệnh án chờ khám
 * Endpoint: POST /api/v1/doctor/patients
 */
async function createWalkInPatientRecord(req, res) {
  try {
    const body = req.body || {};
    const fullName = String(body.full_name || body.name || '').trim();
    const cleanPhone = String(body.phone || '').replace(/\s+/g, '').trim();
    const rawGender = String(body.gender || 'Nam').trim();
    const dbGender = rawGender === 'Nữ' || rawGender === 'Nu' || rawGender.toLowerCase() === 'female' ? 'Nu' : 'Nam';
    const dob = body.date_of_birth || body.dob || '1990-01-01';
    const bhyt = String(body.bhyt_code || body.health_insurance_number || '').trim() || null;
    const isChronic =
      String(body.clinical_type || body.record_type || '').toLowerCase() === 'chronic' ||
      String(body.record_type || '').toUpperCase() === 'MAN';
    const loaiBenhAn = isChronic ? 'MAN' : 'CAP';
    const symptoms = String(body.symptoms || body.diagnosis || '').trim() ||
      (loaiBenhAn === 'MAN' ? 'Mày đay mạn tính tiếp nhận tại phòng khám' : 'Mày đay cấp tính tiếp nhận tại phòng khám');

    if (!fullName || !cleanPhone) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM, {}, 'full_name and phone are required');
    }
    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'Số điện thoại phải gồm đúng 10 chữ số');
    }

    const passwordHash = await bcrypt.hash('password123', 10);

    const created = await withTransaction(async (db) => {
      // Kiểm tra bệnh nhân theo SĐT nếu đã tồn tại
      const existingRes = await db.query(
        `SELECT n.ma_nguoi, bn.ma_benh_nhan
         FROM public.nguoi n
         LEFT JOIN public.benhnhan bn ON bn.ma_benh_nhan = n.ma_nguoi
         WHERE n.so_dien_thoai = $1
         LIMIT 1`,
        [cleanPhone]
      );

      let patientId;
      if (existingRes.rowCount > 0) {
        patientId = Number(existingRes.rows[0].ma_nguoi);
        if (!existingRes.rows[0].ma_benh_nhan) {
          await db.query(
            `INSERT INTO public.benhnhan (ma_benh_nhan, bhyt_so_the) VALUES ($1, $2)`,
            [patientId, bhyt]
          );
        } else if (bhyt) {
          await db.query(
            `UPDATE public.benhnhan SET bhyt_so_the = COALESCE($1, bhyt_so_the) WHERE ma_benh_nhan = $2`,
            [bhyt, patientId]
          );
        }
      } else {
        const roleRes = await db.query(`SELECT ma_vai_tro FROM public.vaitro WHERE ten_vai_tro = 'benh_nhan' LIMIT 1`);
        const patRoleId = roleRes.rowCount > 0 ? Number(roleRes.rows[0].ma_vai_tro) : 4;

        const pRes = await db.query(
          `INSERT INTO public.nguoi (ho_ten, ngay_sinh, gioi_tinh, so_dien_thoai)
           VALUES ($1, $2::date, $3, $4)
           RETURNING ma_nguoi`,
          [fullName, dob, dbGender, cleanPhone]
        );
        patientId = Number(pRes.rows[0].ma_nguoi);

        await db.query(
          `INSERT INTO public.benhnhan (ma_benh_nhan, bhyt_so_the) VALUES ($1, $2)`,
          [patientId, bhyt]
        );
        await db.query(
          `INSERT INTO public.taikhoan (ma_nguoi, ma_vai_tro, ten_dang_nhap, mat_khau_ma_hoa, trang_thai_hoat_dong)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT (ma_nguoi) DO NOTHING`,
          [patientId, patRoleId, cleanPhone, passwordHash]
        );
      }

      const hosoRes = await db.query(
        `INSERT INTO public.hosobenhan (
           ma_benh_nhan, loai_benh_an, thoi_diem_kham_lan_dau,
           ngay_bat_dau_dieu_tri_ngoai_tru, chan_doan_ban_dau_phong_kham, trang_thai
         )
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_DATE, $3, 'pending')
         RETURNING ma_ho_so, thoi_diem_kham_lan_dau`,
        [patientId, loaiBenhAn, symptoms]
      );
      const recordId = Number(hosoRes.rows[0].ma_ho_so);

      if (loaiBenhAn === 'CAP') {
        await db.query(`INSERT INTO public.benhanmaydaycap (ma_ho_so) VALUES ($1)`, [recordId]);
      } else {
        await db.query(`INSERT INTO public.benhanmaydayman (ma_ho_so) VALUES ($1)`, [recordId]);
      }

      if (sharedStore && sharedStore.state) {
        sharedStore.state.recordMeta[recordId] = {
          template_id: loaiBenhAn === 'MAN' ? 'TMPL_URT_CHRONIC' : 'TMPL_URT_ACUTE',
          created_by: req.user.user_id,
          assigned_doctor_id: null,
          instructions: null,
          created_at: new Date(hosoRes.rows[0].thoi_diem_kham_lan_dau).toISOString(),
          completed_at: null
        };
        sharedStore.saveStore();
      }

      return {
        medical_record_id: String(recordId),
        record_code: `BA-2026-${String(recordId).padStart(4, '0')}`,
        patient_id: String(patientId),
        patient_name: fullName,
        phone: cleanPhone,
        date_of_birth: dob,
        gender: dbGender === 'Nu' ? 'Nữ' : 'Nam',
        bhyt_code: bhyt,
        record_type: loaiBenhAn,
        clinical_type: loaiBenhAn === 'MAN' ? 'chronic' : 'acute',
        diagnosis: symptoms,
        status: 'pending',
        created_at: new Date(hosoRes.rows[0].thoi_diem_kham_lan_dau).toISOString()
      };
    });

    return sendResponse(res, RESPONSE_CODES.CREATED, created, 'Tiếp nhận bệnh nhân mới vào hàng đợi thành công');
  } catch (err) {
    console.error('[Doctor.createWalkInPatientRecord]', err);
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

      if (sharedStore && sharedStore.state) {
        if (!sharedStore.state.recordMeta[recordId]) sharedStore.state.recordMeta[recordId] = {};
        sharedStore.state.recordMeta[recordId].assigned_doctor_id = doctorId;
        sharedStore.saveStore();
      }
      pushNotification(record.ma_benh_nhan, {
        title: 'Bác sĩ đã tiếp nhận hồ sơ khám',
        message: `${req.user.full_name} đang thăm khám hồ sơ #BA-2026-${String(recordId).padStart(4, '0')} của bạn.`,
        type: 'QUEUE_ACCEPTED',
        record_id: recordId
      });

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

      const summaryVal = body.tom_tat_buoi_kham ?? body.summary ?? body.diagnosis ?? null;
      const planVal = body.huong_xu_tri_lan_sau ?? body.plan ?? null;
      const instrVal = body.dan_do ?? body.instructions ?? null;

      const update = await db.query(
        `UPDATE public.phienkham
         SET tom_tat_buoi_kham = COALESCE($1, tom_tat_buoi_kham),
             huong_xu_tri_lan_sau = COALESCE($2, huong_xu_tri_lan_sau),
             dan_do = COALESCE($3, dan_do),
             ngay_hen_tai_kham = COALESCE($4::date, ngay_hen_tai_kham)
         WHERE ma_phien_kham = $5
         RETURNING ma_phien_kham`,
        [summaryVal, planVal, instrVal, body.ngay_hen_tai_kham || null, record.ma_phien_kham]
      );
      if (!update.rowCount) return { error: RESPONSE_CODES.MEDICAL_RECORD_NOT_FOUND };

      await db.query(
        `UPDATE public.hosobenhan
         SET trang_thai = 'completed',
             chan_doan_ban_dau_phong_kham = COALESCE($1, chan_doan_ban_dau_phong_kham)
         WHERE ma_ho_so = $2`,
        [body.diagnosis || summaryVal, recordId]
      );

      if (sharedStore && sharedStore.state) {
        if (!sharedStore.state.recordMeta[recordId]) sharedStore.state.recordMeta[recordId] = {};
        if (instrVal) sharedStore.state.recordMeta[recordId].instructions = instrVal;
        sharedStore.state.recordMeta[recordId].completed_at = new Date().toISOString();
        sharedStore.saveStore();
      }
      pushNotification(record.ma_benh_nhan, {
        title: 'Hoàn tất phiên khám bệnh án',
        message: `${req.user.full_name} đã hoàn tất kết luận lâm sàng cho hồ sơ #BA-2026-${String(recordId).padStart(4, '0')}.`,
        type: 'VISIT_COMPLETED',
        record_id: recordId
      });

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
      `SELECT h.ma_ho_so, h.ma_benh_nhan, bn.bhyt_so_the, bn.ma_his,
              h.loai_benh_an, h.trang_thai, h.chan_doan_ban_dau_phong_kham,
              h.thoi_diem_kham_lan_dau, h.thoi_diem_kham_lan_dau AS thoi_diem_tao, n.ho_ten, n.so_dien_thoai,
              n.ngay_sinh, n.gioi_tinh, pk.ma_phien_kham, pk.ma_bac_si, bs.ho_ten AS ten_bac_si,
              pk.ngay_kham, pk.lan_kham_thu, pk.tom_tat_buoi_kham,
              pk.huong_xu_tri_lan_sau, pk.dan_do
       FROM public.hosobenhan h
       JOIN public.benhnhan bn ON bn.ma_benh_nhan = h.ma_benh_nhan
       JOIN public.nguoi n ON n.ma_nguoi = bn.ma_benh_nhan
       LEFT JOIN public.phienkham pk ON pk.ma_ho_so = h.ma_ho_so
       LEFT JOIN public.nguoi bs ON bs.ma_nguoi = pk.ma_bac_si
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
  if (items.some((item) => !String(item.drug_name || item.ten_thuoc || item.drug_id || item.ma_thuoc || '').trim() || !String(item.dosage || item.lieu_dung || '').trim() || !String(item.duration || item.thoi_gian_dung || '').trim())) {
    return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'Each item requires drug_name, dosage, and duration');
  }
  try {
    const result = await withTransaction(async (db) => {
      const access = await assignedRecord(recordId, req.user.user_id, db, true);
      if (access.error) return { error: access.error };
      if (!access.record.ma_phien_kham || Number(access.record.ma_bac_si) !== req.user.user_id) return { error: RESPONSE_CODES.DOCTOR_NOT_ASSIGNED };
      if (access.record.trang_thai === 'completed') return { error: RESPONSE_CODES.MEDICAL_RECORD_COMPLETED };

      // Đảm bảo thỏa mãn ck_donthuoc_ngung_detail trong final_restructured.sql
      const stopNextVisit = body.stop_medication_next_visit === true;
      const medToStop = stopNextVisit
        ? String(body.medication_to_stop || 'Ngừng kháng Histamine trước tái khám').trim()
        : null;

      if (body.diagnosis && String(body.diagnosis).trim()) {
        await db.query(
          `UPDATE public.hosobenhan SET chan_doan_ban_dau_phong_kham = $1 WHERE ma_ho_so = $2`,
          [String(body.diagnosis).trim(), recordId]
        );
      }

      const header = await db.query(
        `INSERT INTO public.donthuoc (
           ma_ho_so, ma_phien_kham, ngay_ke_don, ghi_chu_dieu_tri,
           ngung_thuoc_lan_sau, thuoc_can_ngung_truoc_tai_kham
         )
         VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5, $6)
         RETURNING ma_don_thuoc, ngay_ke_don, trang_thai_don, ghi_chu_dieu_tri`,
        [
          recordId,
          access.record.ma_phien_kham,
          body.prescribed_date || null,
          body.treatment_note || body.ghi_chu_dieu_tri || null,
          stopNextVisit,
          medToStop
        ]
      );
      const rx = header.rows[0];
      const savedItems = [];
      for (const item of items) {
        let validDrugId = null;
        const requestedDrugId = item.drug_id || item.ma_thuoc || null;
        if (requestedDrugId) {
          const checkDrug = await db.query(`SELECT ma_thuoc, ten_thuoc FROM public.thuoc WHERE ma_thuoc = $1`, [requestedDrugId]);
          if (checkDrug.rowCount > 0) {
            validDrugId = checkDrug.rows[0].ma_thuoc;
          }
        }
        const drugNameText = validDrugId ? null : String(item.drug_name || item.ten_thuoc || requestedDrugId).trim();
        const detail = await db.query(
          `INSERT INTO public.chitietdonthuoc (ma_don_thuoc, ma_thuoc, ten_thuoc_bo_sung, lieu_dung, thoi_gian_dung)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING ma_chi_tiet_don_thuoc, ma_thuoc, ten_thuoc_bo_sung, lieu_dung, thoi_gian_dung`,
          [
            rx.ma_don_thuoc,
            validDrugId,
            drugNameText,
            String(item.dosage || item.lieu_dung).trim(),
            String(item.duration || item.thoi_gian_dung).trim()
          ]
        );
        savedItems.push({
          ...detail.rows[0],
          display_name: String(item.drug_name || item.ten_thuoc || drugNameText || validDrugId)
        });
      }

      pushNotification(access.record.ma_benh_nhan, {
        title: 'Đơn thuốc điện tử mới',
        message: `${req.user.full_name} vừa kê đơn thuốc gồm ${savedItems.length} khoản cho hồ sơ #BA-2026-${String(recordId).padStart(4, '0')}.`,
        type: 'PRESCRIPTION',
        record_id: recordId
      });

      return {
        prescription_id: String(rx.ma_don_thuoc),
        medical_record_id: String(recordId),
        session_id: String(access.record.ma_phien_kham),
        date: rx.ngay_ke_don,
        status: rx.trang_thai_don,
        treatment_note: rx.ghi_chu_dieu_tri,
        items: savedItems.map((x) => ({
          item_id: String(x.ma_chi_tiet_don_thuoc),
          drug_id: x.ma_thuoc,
          drug_name: x.ten_thuoc_bo_sung || x.display_name,
          dosage: x.lieu_dung,
          duration: x.thoi_gian_dung
        }))
      };
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
           (ma_phien_kham, loai_ket_qua_can_lam_sang, xet_nghiem_khac, can_lam_sang_khac_ghi_chu, thoi_diem_thuc_hien)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         RETURNING ma_ket_qua_can_lam_sang, ma_phien_kham, xet_nghiem_khac, can_lam_sang_khac_ghi_chu, thoi_diem_thuc_hien`,
        [access.record.ma_phien_kham, type, Array.isArray(tests) ? tests.join(', ') : String(tests), body.note || null]
      );
      const lab = base.rows[0];
      await db.query(type === 'CAP'
        ? 'INSERT INTO public.ketquacanlamsangcap (ma_ket_qua_can_lam_sang) VALUES ($1)'
        : 'INSERT INTO public.ketquacanlamsangman (ma_ket_qua_can_lam_sang) VALUES ($1)', [lab.ma_ket_qua_can_lam_sang]);

      pushNotification(access.record.ma_benh_nhan, {
        title: 'Chỉ định xét nghiệm cận lâm sàng mới',
        message: `${req.user.full_name} đã chỉ định cận lâm sàng: ${lab.xet_nghiem_khac}`,
        type: 'LAB_ORDER',
        record_id: recordId
      });

      return {
        lab_result_id: String(lab.ma_ket_qua_can_lam_sang),
        visit_id: String(lab.ma_phien_kham),
        tests: lab.xet_nghiem_khac,
        note: lab.can_lam_sang_khac_ghi_chu,
        created_at: lab.thoi_diem_thuc_hien,
        status: 'ordered'
      };
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
    const access = await assignedRecord(recordId, req.user.user_id, { query }, false, true);
    if (access.error) return sendResponse(res, access.error);
    const result = await query(
      `SELECT k.ma_ket_qua_can_lam_sang, k.ma_phien_kham, k.loai_ket_qua_can_lam_sang,
              k.xet_nghiem_khac, k.can_lam_sang_khac_ghi_chu, k.thoi_diem_thuc_hien,
              k.wbc, k.crp, k.ige_toan_phan, kc.lym, kc.neu, kc.plt, kc.tryptase_cap, kc.tryptase_nen, kc.nlr, kc.plr,
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
    const access = await assignedRecord(recordId, req.user.user_id, { query }, false, true);
    if (access.error) return sendResponse(res, access.error);
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
       ORDER BY d.thoi_diem_xuat_hien DESC NULLS LAST, v.ma_vi_tri_ton_thuong, a.thoi_diem_chup`,
      [access.record.ma_benh_nhan]
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
                h.ma_ho_so, h.ma_benh_nhan, h.trang_thai, pk.ma_bac_si
         FROM public.ketquacanlamsang k
         JOIN public.phienkham pk ON pk.ma_phien_kham = k.ma_phien_kham
         JOIN public.hosobenhan h ON h.ma_ho_so = pk.ma_ho_so
         WHERE k.ma_ket_qua_can_lam_sang = $1 FOR UPDATE OF k, h`, [labId]
      );
      if (!access.rowCount) return { error: RESPONSE_CODES.MEDICAL_RECORD_NOT_FOUND };
      const lab = access.rows[0];
      if (Number(lab.ma_bac_si) !== req.user.user_id && req.user.role_name !== 'admin') return { error: RESPONSE_CODES.DOCTOR_NOT_ASSIGNED };
      if (lab.trang_thai === 'completed') return { error: RESPONSE_CODES.MEDICAL_RECORD_COMPLETED };

      const baseUpdates = Object.entries(LAB_BASE_FIELDS).filter(([key]) => body[key] !== undefined);
      const subtypeFields = lab.loai_ket_qua_can_lam_sang === 'CAP' ? LAB_CAP_FIELDS : LAB_MAN_FIELDS;
      const subtypeUpdates = Object.entries(subtypeFields).filter(([key]) => body[key] !== undefined);
      if (!baseUpdates.length && !subtypeUpdates.length) return { error: RESPONSE_CODES.MISSING_PARAM };

      if (baseUpdates.length) {
        const values = baseUpdates.map(([key]) => body[key] === '' ? null : body[key]);
        values.push(labId);
        const setClause = baseUpdates.map(([_key, column], i) => `${column} = $${i + 1}`).join(', ');
        await db.query(`UPDATE public.ketquacanlamsang SET ${setClause} WHERE ma_ket_qua_can_lam_sang = $${values.length}`, values);
      }
      if (subtypeUpdates.length) {
        const table = lab.loai_ket_qua_can_lam_sang === 'CAP' ? 'ketquacanlamsangcap' : 'ketquacanlamsangman';
        const values = subtypeUpdates.map(([key]) => body[key] === '' ? null : body[key]);
        values.push(labId);
        const setClause = subtypeUpdates.map(([_key, column], i) => `${column} = $${i + 1}`).join(', ');
        await db.query(`UPDATE public.${table} SET ${setClause} WHERE ma_ket_qua_can_lam_sang = $${values.length}`, values);
      }

      pushNotification(lab.ma_benh_nhan, {
        title: 'Đã cập nhật kết quả xét nghiệm',
        message: `Kết quả cận lâm sàng cho hồ sơ #BA-2026-${String(lab.ma_ho_so).padStart(4, '0')} đã có chỉ số định lượng mới.`,
        type: 'LAB_RESULT',
        record_id: lab.ma_ho_so
      });

      return { lab_result_id: String(labId), medical_record_id: String(lab.ma_ho_so), updated: [...baseUpdates, ...subtypeUpdates].map(([key]) => key) };
    });
    if (saved.error) return sendResponse(res, saved.error);
    return sendResponse(res, RESPONSE_CODES.OK, saved);
  } catch (err) {
    console.error('[Doctor.updateLabResult]', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

module.exports = {
  searchPatients,
  getQueue,
  createWalkInPatientRecord,
  acceptRecord,
  completeRecord,
  getPatientHistory,
  createPrescription,
  createLabResult,
  updateLabResult,
  getLabResults,
  getLesionImages
};
