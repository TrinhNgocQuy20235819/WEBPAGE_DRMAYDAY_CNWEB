/**
 * @file src/controllers/lesionController.js
 * @description Controller xử lý nhóm API Theo dõi Tổn thương da 3 cấp (Slide 9)
 * và Quản lý Tệp ảnh đính kèm của Bệnh nhân (Slide 8):
 *
 * I. Đợt bùng phát tổn thương da (`public.dottonthuongda` - Lesion Episodes):
 *   - POST   /api/v1/lesion-episodes (lesion02: Tạo đợt tổn thương mới)
 *   - GET    /api/v1/lesion-episodes/my (lesion01: Lấy danh sách đợt tổn thương của bệnh nhân)
 *   - GET    /api/v1/lesion-episodes/:id (lesion06: Xem chi tiết đợt tổn thương)
 *   - PATCH  /api/v1/lesion-episodes/:id (lesion03: Cập nhật đợt tổn thương; chặn nếu bệnh án completed)
 *   - DELETE /api/v1/lesion-episodes/:id (lesion04: Xóa đợt tổn thương cùng các vị trí & ảnh con)
 *
 * II. Vị trí tổn thương trên cơ thể (`public.vitritonthuong` - Lesion Locations):
 *   - POST   /api/v1/lesion-locations (loc01: Thêm vị trí cơ thể bị tổn thương)
 *   - GET    /api/v1/lesion-locations/episode/:episode_id (loc03: Lấy danh sách vị trí theo đợt)
 *   - PATCH  /api/v1/lesion-locations/:id (loc04: Cập nhật vị trí tổn thương)
 *   - DELETE /api/v1/lesion-locations/:id (loc05: Xóa vị trí tổn thương)
 *
 * III. Ảnh chụp tiến triển 3 mốc & Triệu chứng (`public.anhchuptonthuong` - Lesion Photos):
 *   - POST   /api/v1/lesion-photos (lphoto01: Lưu ảnh theo mốc start/peak/normal kèm điểm ngứa/đau/rát 0-10)
 *   - GET    /api/v1/lesion-photos/location/:location_id (lphoto02: Lấy danh sách ảnh theo vị trí)
 *   - PATCH  /api/v1/lesion-photos/:id/milestone (lphoto03: Cập nhật mốc tiến triển milestone và chỉ số ảnh)
 *   - DELETE /api/v1/lesion-photos/:id (lphoto04: Xóa bản ghi ảnh tổn thương)
 *
 * IV. Kho ảnh đính kèm (`public.tepdinhkem` - Media Attachments & Answer Images):
 *   - POST   /api/v1/image-attachments/upload (img01: Tải ảnh lên, lưu vào `public.tepdinhkem`)
 *   - GET    /api/v1/image-attachments/user/:user_id (img03: Lấy danh sách ảnh của người dùng)
 *   - DELETE /api/v1/image-attachments/:id (img05: Xóa tệp ảnh)
 *   - POST   /api/v1/answer-images (ansimg01: Gắn ảnh vào câu trả lời phiếu khám)
 *   - GET    /api/v1/answer-images/:answer_id (ansimg03: Xem ảnh của câu trả lời)
 *   - DELETE /api/v1/answer-images/:id (ansimg04: Gỡ liên kết ảnh khỏi câu trả lời, giữ nguyên ảnh gốc)
 */

const fs = require('fs');
const path = require('path');
const { query, withTransaction } = require('../config/database');
const { RESPONSE_CODES, sendResponse } = require('../config/responseCodes');
const { state, saveStore } = require('../config/runtimeStore');

const VALID_MILESTONES = ['start', 'peak', 'normal'];

/**
 * Chuẩn hóa cặp (context_tags, context_other) trước khi lưu vào bảng `dottonthuongda` hoặc `vitritonthuong`
 * để tuân thủ tuyệt đối ràng buộc `ck_dottonthuongda_hoancanh` và `ck_vitritonthuong_hoancanh` trong DB:
 * (((hoan_canh_xuat_hien IS NOT DISTINCT FROM 'Khac') AND hoan_canh_xuat_hien_khac IS NOT NULL AND btrim(hoan_canh_xuat_hien_khac) <> '')
 *  OR (NOT (hoan_canh_xuat_hien IS NOT DISTINCT FROM 'Khac') AND hoan_canh_xuat_hien_khac IS NULL))
 */
function normalizeContextForDb(contextTags, contextOther) {
  const tagsStr =
    contextTags !== undefined && contextTags !== null
      ? typeof contextTags === 'object'
        ? JSON.stringify(contextTags)
        : String(contextTags).trim()
      : null;
  const otherStr =
    contextOther !== undefined && contextOther !== null && String(contextOther).trim() !== ''
      ? String(contextOther).trim()
      : null;

  if (otherStr) {
    return {
      hoan_canh_xuat_hien: 'Khac',
      hoan_canh_xuat_hien_khac: otherStr,
      meta_tags: tagsStr,
      meta_other: otherStr
    };
  }

  if (tagsStr === 'Khac') {
    return {
      hoan_canh_xuat_hien: 'Khac',
      hoan_canh_xuat_hien_khac: 'Bối cảnh khác',
      meta_tags: tagsStr,
      meta_other: 'Bối cảnh khác'
    };
  }

  return {
    hoan_canh_xuat_hien: tagsStr || null,
    hoan_canh_xuat_hien_khac: null,
    meta_tags: tagsStr || null,
    meta_other: null
  };
}

/**
 * Kiểm tra trạng thái của bệnh án liên kết với Đợt tổn thương (chặn thao tác nếu đã 'completed' -> mã lỗi 4003)
 */
async function checkMedicalRecordNotCompleted(maHoSo, reqUser) {
  if (!maHoSo) return { ok: true, record: null };

  const resRec = await query(
    `SELECT ma_ho_so, ma_benh_nhan, loai_benh_an, trang_thai
     FROM public.hosobenhan
     WHERE ma_ho_so = $1`,
    [Number(maHoSo)]
  );

  if (resRec.rowCount === 0) {
    return { ok: false, error: RESPONSE_CODES.MEDICAL_RECORD_NOT_FOUND };
  }

  const rec = resRec.rows[0];
  if (reqUser && reqUser.role_name === 'benh_nhan' && Number(rec.ma_benh_nhan) !== reqUser.user_id) {
    return { ok: false, error: RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA };
  }

  if (rec.trang_thai === 'completed') {
    return { ok: false, error: RESPONSE_CODES.MEDICAL_RECORD_COMPLETED };
  }

  return { ok: true, record: rec };
}

/**
 * Định dạng bản ghi Đợt tổn thương da (`dottonthuongda`) trả về cho Client theo đúng Slide 9 (`S9_p06_1.png`)
 */
function formatEpisodeRow(row) {
  const epId = String(row.ma_dot_ton_thuong_da);
  const meta = state.lesionEpisodeMeta[epId] || {};
  const medRecId = meta.medical_record_id || row.ma_ho_so_man || null;

  return {
    episode_id: epId,
    medical_record_id: medRecId !== null ? String(medRecId) : null,
    patient_id: String(row.ma_benh_nhan),
    name: row.ten_dot_ton_thuong_da,
    occurred_at: row.thoi_diem_xuat_hien ? new Date(row.thoi_diem_xuat_hien).toISOString() : null,
    context_tags:
      meta.context_tags !== undefined ? meta.context_tags : row.hoan_canh_xuat_hien,
    context_other:
      meta.context_other !== undefined ? meta.context_other : row.hoan_canh_xuat_hien_khac,
    medication_name: row.ten_thuoc_dung_gan_thoi_diem_xuat_hien || null,
    medication_taken_ago: row.thoi_gian_dung_thuoc_truoc_khi_xuat_hien || null,
    medication_unit: row.don_vi_thoi_gian || null,
    description: row.chi_tiet_dot_ton_thuong || null,
    created_at: new Date(row.thoi_diem_tao).toISOString(),
    updated_at: new Date(row.thoi_diem_cap_nhat).toISOString()
  };
}

/**
 * Định dạng bản ghi Vị trí tổn thương (`vitritonthuong`) trả về cho Client theo Slide 9 (`S9_p24_1.png`)
 */
function formatLocationRow(row) {
  const locId = String(row.ma_vi_tri_ton_thuong);
  const meta = state.lesionLocationMeta[locId] || {};

  return {
    lesion_location_id: locId,
    location_id: locId,
    episode_id: String(row.ma_dot_ton_thuong_da),
    body_part: row.vi_tri_co_the,
    occurred_at: row.thoi_diem_xuat_hien ? new Date(row.thoi_diem_xuat_hien).toISOString() : null,
    context_tags:
      meta.context_tags !== undefined ? meta.context_tags : row.hoan_canh_xuat_hien,
    context_other:
      meta.context_other !== undefined ? meta.context_other : row.hoan_canh_xuat_hien_khac,
    medication_name: row.ten_thuoc_lien_quan || null,
    medication_taken_ago: row.thoi_gian_dung_thuoc_truoc_khi_xuat_hien || null,
    medication_unit: row.don_vi_thoi_gian || null,
    created_at: new Date(row.thoi_diem_tao).toISOString(),
    updated_at: new Date(row.thoi_diem_cap_nhat).toISOString()
  };
}

/**
 * Định dạng bản ghi Ảnh tổn thương (`anhchuptonthuong`) trả về cho Client theo Slide 9 (`S9_p39_1.png`, `S9_p42_1.png`)
 */
function formatPhotoRow(row) {
  const item = {
    photo_id: String(row.ma_anh),
    episode_id: row.ma_dot_ton_thuong_da !== null ? String(row.ma_dot_ton_thuong_da) : null,
    location_id: row.ma_vi_tri_ton_thuong !== null ? String(row.ma_vi_tri_ton_thuong) : null,
    attachment_id: String(row.ma_tep_dinh_kem),
    taken_at: row.thoi_diem_chup ? new Date(row.thoi_diem_chup).toISOString() : null,
    milestone: row.moc_tien_trien,
    itch_score: row.diem_ngua_nrs !== null && row.diem_ngua_nrs !== undefined ? String(row.diem_ngua_nrs) : null,
    pain_score: row.diem_dau_nrs !== null && row.diem_dau_nrs !== undefined ? String(row.diem_dau_nrs) : null,
    burn_score: row.diem_bong_rat_nrs !== null && row.diem_bong_rat_nrs !== undefined ? String(row.diem_bong_rat_nrs) : null,
    hives_count: row.so_luong_not_san !== null && row.so_luong_not_san !== undefined ? String(row.so_luong_not_san) : null,
    local_auas: row.chi_so_auas_cuc_bo !== null && row.chi_so_auas_cuc_bo !== undefined ? String(row.chi_so_auas_cuc_bo) : null,
    annotated_url: row.url_anh || null,
    created_at: new Date(row.thoi_diem_tao).toISOString(),
    updated_at: new Date(row.thoi_diem_cap_nhat).toISOString()
  };

  if (row.file_url !== undefined || row.duong_dan_url !== undefined || row.duong_dan_luu_tru !== undefined) {
    item.attachment = {
      attachment_id: String(row.ma_tep_dinh_kem),
      file_url: row.duong_dan_url || row.duong_dan_luu_tru || null,
      file_name: row.ten_tep_goc || null
    };
  }

  return item;
}

/* ==========================================================================
 * PHẦN I: QUẢN LÝ ĐỢT BÙNG PHÁT TỔN THƯƠNG DA (LESION EPISODES)
 * ========================================================================== */

/**
 * 1. Khởi tạo đợt bùng phát tổn thương da mới (lesion02)
 * Endpoint: POST /api/v1/lesion-episodes
 */
async function createLesionEpisode(req, res) {
  try {
    const body = req.body || {};
    const patientId = req.user.user_id;
    const name = body.name !== undefined ? String(body.name).trim() : '';

    // Kiểm tra tên đợt tổn thương không được để trống (Test case 7004)
    if (!name) {
      return sendResponse(res, RESPONSE_CODES.LESION_NAME_EMPTY);
    }

    // Xác định hồ sơ bệnh án liên kết
    let medicalRecordId = body.medical_record_id ? Number(body.medical_record_id) : null;
    if (!medicalRecordId) {
      const activeRes = await query(
        `SELECT ma_ho_so FROM public.hosobenhan
         WHERE ma_benh_nhan = $1 AND trang_thai IN ('pending', 'in_progress', 'draft')
         ORDER BY CASE WHEN loai_benh_an = 'MAN' THEN 0 ELSE 1 END, ma_ho_so DESC
         LIMIT 1`,
        [patientId]
      );
      if (activeRes.rowCount === 0) {
        return sendResponse(res, RESPONSE_CODES.ACTIVE_RECORD_REQUIRED);
      }
      medicalRecordId = Number(activeRes.rows[0].ma_ho_so);
    }

    const checkRec = await checkMedicalRecordNotCompleted(medicalRecordId, req.user);
    if (!checkRec.ok) {
      return sendResponse(res, checkRec.error);
    }

    // Trong `final_restructured.sql`, cột `ma_ho_so_man` tham chiếu tới `benhanmaydayman(ma_ho_so)`
    const maHoSoMan = checkRec.record.loai_benh_an === 'MAN' ? Number(checkRec.record.ma_ho_so) : null;

    const occurredAt = body.occurred_at ? new Date(body.occurred_at).toISOString() : new Date().toISOString();
    const ctx = normalizeContextForDb(body.context_tags, body.context_other);

    const insertRes = await query(
      `INSERT INTO public.dottonthuongda (
         ma_benh_nhan,
         ma_ho_so_man,
         ten_dot_ton_thuong_da,
         thoi_diem_xuat_hien,
         hoan_canh_xuat_hien,
         hoan_canh_xuat_hien_khac,
         ten_thuoc_dung_gan_thoi_diem_xuat_hien,
         thoi_gian_dung_thuoc_truoc_khi_xuat_hien,
         don_vi_thoi_gian,
         chi_tiet_dot_ton_thuong
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        patientId,
        maHoSoMan,
        name,
        occurredAt,
        ctx.hoan_canh_xuat_hien,
        ctx.hoan_canh_xuat_hien_khac,
        body.medication_name || null,
        body.medication_taken_ago !== undefined && body.medication_taken_ago !== null
          ? String(body.medication_taken_ago)
          : null,
        body.medication_unit || null,
        body.description || null
      ]
    );

    const row = insertRes.rows[0];
    const epId = String(row.ma_dot_ton_thuong_da);
    state.lesionEpisodeMeta[epId] = {
      medical_record_id: String(medicalRecordId),
      context_tags: ctx.meta_tags,
      context_other: ctx.meta_other
    };
    saveStore();

    return sendResponse(
      res,
      RESPONSE_CODES.CREATED,
      formatEpisodeRow(row),
      'Tạo đợt tổn thương thành công'
    );
  } catch (err) {
    console.error('[LesionController.createLesionEpisode] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 2. Lấy danh sách toàn bộ đợt tổn thương của bệnh nhân đang đăng nhập (lesion01)
 * Endpoint: GET /api/v1/lesion-episodes/my
 */
async function getMyLesionEpisodes(req, res) {
  try {
    const patientId = req.user.user_id;
    const filterRecordId = req.query.medical_record_id ? Number(req.query.medical_record_id) : null;

    // Kiểm tra xem bệnh nhân có bệnh án active không (Test case 4002 trên Slide 9 trang 11)
    const activeCheck = await query(
      `SELECT ma_ho_so FROM public.hosobenhan
       WHERE ma_benh_nhan = $1 AND trang_thai IN ('pending', 'in_progress', 'draft')
       LIMIT 1`,
      [patientId]
    );

    if (activeCheck.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.ACTIVE_RECORD_REQUIRED);
    }

    const listRes = await query(
      `SELECT * FROM public.dottonthuongda
       WHERE ma_benh_nhan = $1
       ORDER BY thoi_diem_xuat_hien DESC NULLS LAST, ma_dot_ton_thuong_da DESC`,
      [patientId]
    );

    let episodes = listRes.rows.map(formatEpisodeRow);
    if (filterRecordId) {
      episodes = episodes.filter((ep) => Number(ep.medical_record_id) === filterRecordId);
    }

    return sendResponse(res, RESPONSE_CODES.OK, episodes);
  } catch (err) {
    console.error('[LesionController.getMyLesionEpisodes] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 3. Xem chi tiết một đợt tổn thương theo ID (lesion06)
 * Endpoint: GET /api/v1/lesion-episodes/:id
 */
async function getLesionEpisodeById(req, res) {
  try {
    const epId = Number(req.params.id);
    if (isNaN(epId)) {
      return sendResponse(res, RESPONSE_CODES.LESION_EPISODE_NOT_FOUND);
    }

    const epRes = await query(
      `SELECT * FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = $1`,
      [epId]
    );

    if (epRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.LESION_EPISODE_NOT_FOUND);
    }

    const row = epRes.rows[0];
    if (req.user.role_name === 'benh_nhan' && Number(row.ma_benh_nhan) !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    const episodeObj = formatEpisodeRow(row);

    // Lấy kèm danh sách các vị trí tổn thương thuộc đợt này
    const locRes = await query(
      `SELECT * FROM public.vitritonthuong
       WHERE ma_dot_ton_thuong_da = $1
       ORDER BY ma_vi_tri_ton_thuong ASC`,
      [epId]
    );
    episodeObj.locations = locRes.rows.map(formatLocationRow);

    return sendResponse(res, RESPONSE_CODES.OK, episodeObj);
  } catch (err) {
    console.error('[LesionController.getLesionEpisodeById] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 4. Cập nhật thông tin một đợt tổn thương (lesion03)
 * Endpoint: PATCH /api/v1/lesion-episodes/:id
 * Chặn sửa nếu bệnh án đã chuyển trạng thái 'completed' (Test case 4003).
 */
async function updateLesionEpisode(req, res) {
  try {
    const epId = Number(req.params.id);
    if (isNaN(epId)) {
      return sendResponse(res, RESPONSE_CODES.LESION_EPISODE_NOT_FOUND);
    }

    const epRes = await query(
      `SELECT * FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = $1`,
      [epId]
    );
    if (epRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.LESION_EPISODE_NOT_FOUND);
    }

    const cur = epRes.rows[0];
    if (req.user.role_name === 'benh_nhan' && Number(cur.ma_benh_nhan) !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    const meta = state.lesionEpisodeMeta[String(epId)] || {};
    const linkedRecordId = meta.medical_record_id || cur.ma_ho_so_man;

    // Kiểm tra bệnh án đã completed chưa (Test case 4003)
    const checkRec = await checkMedicalRecordNotCompleted(linkedRecordId, req.user);
    if (!checkRec.ok) {
      return sendResponse(res, checkRec.error);
    }

    const body = req.body || {};
    if (body.name !== undefined && String(body.name).trim() === '') {
      return sendResponse(res, RESPONSE_CODES.LESION_NAME_EMPTY);
    }

    const newName = body.name !== undefined ? String(body.name).trim() : cur.ten_dot_ton_thuong_da;
    const newOccurredAt =
      body.occurred_at !== undefined
        ? body.occurred_at
          ? new Date(body.occurred_at).toISOString()
          : null
        : cur.thoi_diem_xuat_hien;

    const rawTags = body.context_tags !== undefined ? body.context_tags : meta.context_tags ?? cur.hoan_canh_xuat_hien;
    const rawOther = body.context_other !== undefined ? body.context_other : meta.context_other ?? cur.hoan_canh_xuat_hien_khac;
    const ctx = normalizeContextForDb(rawTags, rawOther);

    const newMedName =
      body.medication_name !== undefined ? body.medication_name : cur.ten_thuoc_dung_gan_thoi_diem_xuat_hien;
    const newMedAgo =
      body.medication_taken_ago !== undefined
        ? body.medication_taken_ago !== null
          ? String(body.medication_taken_ago)
          : null
        : cur.thoi_gian_dung_thuoc_truoc_khi_xuat_hien;
    const newMedUnit =
      body.medication_unit !== undefined ? body.medication_unit : cur.don_vi_thoi_gian;
    const newDesc =
      body.description !== undefined ? body.description : cur.chi_tiet_dot_ton_thuong;

    const updRes = await query(
      `UPDATE public.dottonthuongda
       SET ten_dot_ton_thuong_da = $1,
           thoi_diem_xuat_hien = $2,
           hoan_canh_xuat_hien = $3,
           hoan_canh_xuat_hien_khac = $4,
           ten_thuoc_dung_gan_thoi_diem_xuat_hien = $5,
           thoi_gian_dung_thuoc_truoc_khi_xuat_hien = $6,
           don_vi_thoi_gian = $7,
           chi_tiet_dot_ton_thuong = $8
       WHERE ma_dot_ton_thuong_da = $9
       RETURNING *`,
      [
        newName,
        newOccurredAt,
        ctx.hoan_canh_xuat_hien,
        ctx.hoan_canh_xuat_hien_khac,
        newMedName,
        newMedAgo,
        newMedUnit,
        newDesc,
        epId
      ]
    );

    state.lesionEpisodeMeta[String(epId)] = {
      ...meta,
      context_tags: ctx.meta_tags,
      context_other: ctx.meta_other
    };
    saveStore();

    return sendResponse(
      res,
      RESPONSE_CODES.OK,
      formatEpisodeRow(updRes.rows[0]),
      'Cập nhật thành công'
    );
  } catch (err) {
    console.error('[LesionController.updateLesionEpisode] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 5. Xóa một đợt tổn thương da (lesion04)
 * Endpoint: DELETE /api/v1/lesion-episodes/:id
 * Do trong `final_restructured.sql` các bảng con `anhchuptonthuong` và `vitritonthuong` đặt
 * `ON DELETE RESTRICT`, ta thực hiện xóa tuần tự từ bảng cháu (`anhchuptonthuong`) ->
 * bảng con (`vitritonthuong`) -> bảng cha (`dottonthuongda`) bên trong một Transaction.
 */
async function deleteLesionEpisode(req, res) {
  try {
    const epId = Number(req.params.id);
    if (isNaN(epId)) {
      return sendResponse(res, RESPONSE_CODES.LESION_EPISODE_NOT_FOUND);
    }

    const epRes = await query(
      `SELECT * FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = $1`,
      [epId]
    );
    if (epRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.LESION_EPISODE_NOT_FOUND);
    }

    const cur = epRes.rows[0];
    if (req.user.role_name === 'benh_nhan' && Number(cur.ma_benh_nhan) !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    const meta = state.lesionEpisodeMeta[String(epId)] || {};
    const checkRec = await checkMedicalRecordNotCompleted(meta.medical_record_id || cur.ma_ho_so_man, req.user);
    if (!checkRec.ok) {
      return sendResponse(res, checkRec.error);
    }

    await withTransaction(async (client) => {
      await client.query(`DELETE FROM public.anhchuptonthuong WHERE ma_dot_ton_thuong_da = $1`, [epId]);
      await client.query(`DELETE FROM public.vitritonthuong WHERE ma_dot_ton_thuong_da = $1`, [epId]);
      await client.query(`DELETE FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = $1`, [epId]);
    });

    delete state.lesionEpisodeMeta[String(epId)];
    saveStore();

    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Xóa thành công');
  } catch (err) {
    console.error('[LesionController.deleteLesionEpisode] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/* ==========================================================================
 * PHẦN II: QUẢN LÝ VỊ TRÍ TỔN THƯƠNG TRÊN CƠ THỂ (LESION LOCATIONS)
 * ========================================================================== */

/**
 * 6. Tạo vị trí tổn thương mới thuộc một đợt bùng phát (loc01)
 * Endpoint: POST /api/v1/lesion-locations
 */
async function createLesionLocation(req, res) {
  try {
    const body = req.body || {};
    const episodeId = body.episode_id ? Number(body.episode_id) : null;
    const bodyPart = body.body_part !== undefined ? String(body.body_part).trim() : '';

    // Kiểm tra tên vị trí cơ thể không được để trống (Test case 7005)
    if (!bodyPart) {
      return sendResponse(res, RESPONSE_CODES.BODY_PART_EMPTY);
    }

    if (!episodeId || isNaN(episodeId)) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM, {}, 'episode_id is required');
    }

    // Kiểm tra đợt tổn thương tồn tại và thuộc quyền sở hữu
    const epRes = await query(
      `SELECT * FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = $1`,
      [episodeId]
    );
    if (epRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.LESION_EPISODE_NOT_FOUND);
    }

    const ep = epRes.rows[0];
    if (req.user.role_name === 'benh_nhan' && Number(ep.ma_benh_nhan) !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    const epMeta = state.lesionEpisodeMeta[String(episodeId)] || {};
    const checkRec = await checkMedicalRecordNotCompleted(epMeta.medical_record_id || ep.ma_ho_so_man, req.user);
    if (!checkRec.ok) {
      return sendResponse(res, checkRec.error);
    }

    const occurredAt = body.occurred_at ? new Date(body.occurred_at).toISOString() : new Date().toISOString();
    const ctx = normalizeContextForDb(body.context_tags, body.context_other);

    const insertRes = await query(
      `INSERT INTO public.vitritonthuong (
         ma_dot_ton_thuong_da,
         vi_tri_co_the,
         thoi_diem_xuat_hien,
         ten_thuoc_lien_quan,
         thoi_gian_dung_thuoc_truoc_khi_xuat_hien,
         hoan_canh_xuat_hien,
         hoan_canh_xuat_hien_khac,
         don_vi_thoi_gian
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        episodeId,
        bodyPart,
        occurredAt,
        body.medication_name || null,
        body.medication_taken_ago !== undefined && body.medication_taken_ago !== null
          ? String(body.medication_taken_ago)
          : null,
        ctx.hoan_canh_xuat_hien,
        ctx.hoan_canh_xuat_hien_khac,
        body.medication_unit || null
      ]
    );

    const row = insertRes.rows[0];
    const locId = String(row.ma_vi_tri_ton_thuong);
    state.lesionLocationMeta[locId] = {
      context_tags: ctx.meta_tags,
      context_other: ctx.meta_other
    };
    saveStore();

    return sendResponse(
      res,
      RESPONSE_CODES.CREATED,
      formatLocationRow(row),
      'Tạo vị trí thành công'
    );
  } catch (err) {
    console.error('[LesionController.createLesionLocation] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 7. Lấy danh sách vị trí tổn thương theo đợt bùng phát (loc03)
 * Endpoint: GET /api/v1/lesion-locations/episode/:episode_id
 */
async function getLocationsByEpisode(req, res) {
  try {
    const episodeId = Number(req.params.episode_id);
    if (isNaN(episodeId)) {
      return sendResponse(res, RESPONSE_CODES.LESION_EPISODE_NOT_FOUND);
    }

    const epRes = await query(
      `SELECT * FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = $1`,
      [episodeId]
    );
    if (epRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.LESION_EPISODE_NOT_FOUND);
    }

    if (req.user.role_name === 'benh_nhan' && Number(epRes.rows[0].ma_benh_nhan) !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    const locRes = await query(
      `SELECT * FROM public.vitritonthuong
       WHERE ma_dot_ton_thuong_da = $1
       ORDER BY ma_vi_tri_ton_thuong ASC`,
      [episodeId]
    );

    const locations = [];
    for (const row of locRes.rows) {
      const locObj = formatLocationRow(row);
      const photosRes = await query(
        `SELECT a.*, t.duong_dan_url, t.duong_dan_luu_tru, t.ten_tep_goc
         FROM public.anhchuptonthuong a
         LEFT JOIN public.tepdinhkem t ON t.ma_tep_dinh_kem = a.ma_tep_dinh_kem
         WHERE a.ma_vi_tri_ton_thuong = $1
         ORDER BY a.thoi_diem_chup ASC`,
        [row.ma_vi_tri_ton_thuong]
      );
      locObj.photos = photosRes.rows.map(formatPhotoRow);
      locations.push(locObj);
    }

    return sendResponse(res, RESPONSE_CODES.OK, locations);
  } catch (err) {
    console.error('[LesionController.getLocationsByEpisode] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 8. Cập nhật thông tin một vị trí tổn thương (loc04)
 * Endpoint: PATCH /api/v1/lesion-locations/:id
 */
async function updateLesionLocation(req, res) {
  try {
    const locId = Number(req.params.id);
    if (isNaN(locId)) {
      return sendResponse(res, RESPONSE_CODES.LESION_LOCATION_NOT_FOUND);
    }

    const locRes = await query(
      `SELECT v.*, d.ma_benh_nhan, d.ma_ho_so_man
       FROM public.vitritonthuong v
       JOIN public.dottonthuongda d ON d.ma_dot_ton_thuong_da = v.ma_dot_ton_thuong_da
       WHERE v.ma_vi_tri_ton_thuong = $1`,
      [locId]
    );
    if (locRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.LESION_LOCATION_NOT_FOUND);
    }

    const cur = locRes.rows[0];
    if (req.user.role_name === 'benh_nhan' && Number(cur.ma_benh_nhan) !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    const epMeta = state.lesionEpisodeMeta[String(cur.ma_dot_ton_thuong_da)] || {};
    const checkRec = await checkMedicalRecordNotCompleted(epMeta.medical_record_id || cur.ma_ho_so_man, req.user);
    if (!checkRec.ok) {
      return sendResponse(res, checkRec.error);
    }

    const body = req.body || {};
    if (body.body_part !== undefined && String(body.body_part).trim() === '') {
      return sendResponse(res, RESPONSE_CODES.BODY_PART_EMPTY);
    }

    const newBodyPart = body.body_part !== undefined ? String(body.body_part).trim() : cur.vi_tri_co_the;
    const newOccurredAt =
      body.occurred_at !== undefined
        ? body.occurred_at
          ? new Date(body.occurred_at).toISOString()
          : null
        : cur.thoi_diem_xuat_hien;

    const locMeta = state.lesionLocationMeta[String(locId)] || {};
    const rawTags = body.context_tags !== undefined ? body.context_tags : locMeta.context_tags ?? cur.hoan_canh_xuat_hien;
    const rawOther = body.context_other !== undefined ? body.context_other : locMeta.context_other ?? cur.hoan_canh_xuat_hien_khac;
    const ctx = normalizeContextForDb(rawTags, rawOther);

    const newMedName =
      body.medication_name !== undefined ? body.medication_name : cur.ten_thuoc_lien_quan;
    const newMedAgo =
      body.medication_taken_ago !== undefined
        ? body.medication_taken_ago !== null
          ? String(body.medication_taken_ago)
          : null
        : cur.thoi_gian_dung_thuoc_truoc_khi_xuat_hien;
    const newMedUnit =
      body.medication_unit !== undefined ? body.medication_unit : cur.don_vi_thoi_gian;

    const updRes = await query(
      `UPDATE public.vitritonthuong
       SET vi_tri_co_the = $1,
           thoi_diem_xuat_hien = $2,
           hoan_canh_xuat_hien = $3,
           hoan_canh_xuat_hien_khac = $4,
           ten_thuoc_lien_quan = $5,
           thoi_gian_dung_thuoc_truoc_khi_xuat_hien = $6,
           don_vi_thoi_gian = $7
       WHERE ma_vi_tri_ton_thuong = $8
       RETURNING *`,
      [
        newBodyPart,
        newOccurredAt,
        ctx.hoan_canh_xuat_hien,
        ctx.hoan_canh_xuat_hien_khac,
        newMedName,
        newMedAgo,
        newMedUnit,
        locId
      ]
    );

    state.lesionLocationMeta[String(locId)] = {
      context_tags: ctx.meta_tags,
      context_other: ctx.meta_other
    };
    saveStore();

    return sendResponse(
      res,
      RESPONSE_CODES.OK,
      formatLocationRow(updRes.rows[0]),
      'Cập nhật thành công'
    );
  } catch (err) {
    console.error('[LesionController.updateLesionLocation] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 9. Xóa một vị trí tổn thương (loc05)
 * Endpoint: DELETE /api/v1/lesion-locations/:id
 */
async function deleteLesionLocation(req, res) {
  try {
    const locId = Number(req.params.id);
    if (isNaN(locId)) {
      return sendResponse(res, RESPONSE_CODES.LESION_LOCATION_NOT_FOUND);
    }

    const locRes = await query(
      `SELECT v.*, d.ma_benh_nhan, d.ma_ho_so_man
       FROM public.vitritonthuong v
       JOIN public.dottonthuongda d ON d.ma_dot_ton_thuong_da = v.ma_dot_ton_thuong_da
       WHERE v.ma_vi_tri_ton_thuong = $1`,
      [locId]
    );
    if (locRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.LESION_LOCATION_NOT_FOUND);
    }

    const cur = locRes.rows[0];
    if (req.user.role_name === 'benh_nhan' && Number(cur.ma_benh_nhan) !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    const epMeta = state.lesionEpisodeMeta[String(cur.ma_dot_ton_thuong_da)] || {};
    const checkRec = await checkMedicalRecordNotCompleted(epMeta.medical_record_id || cur.ma_ho_so_man, req.user);
    if (!checkRec.ok) {
      return sendResponse(res, checkRec.error);
    }

    await withTransaction(async (client) => {
      await client.query(`DELETE FROM public.anhchuptonthuong WHERE ma_vi_tri_ton_thuong = $1`, [locId]);
      await client.query(`DELETE FROM public.vitritonthuong WHERE ma_vi_tri_ton_thuong = $1`, [locId]);
    });

    delete state.lesionLocationMeta[String(locId)];
    saveStore();

    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Xóa thành công');
  } catch (err) {
    console.error('[LesionController.deleteLesionLocation] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/* ==========================================================================
 * PHẦN III: QUẢN LÝ ẢNH CHỤP TIẾN TRIỂN 3 MỐC & TRIỆU CHỨNG (LESION PHOTOS)
 * ========================================================================== */

/**
 * Kiểm tra điểm triệu chứng lâm sàng (itch_score, pain_score, burn_score) nằm trong thang 0 - 10
 */
function parseAndValidateSymptomScore(val) {
  if (val === undefined || val === null || val === '') {
    return { valid: true, value: null };
  }
  const num = Number(val);
  if (!Number.isInteger(num) || num < 0 || num > 10) {
    return { valid: false, value: null };
  }
  return { valid: true, value: num };
}

/**
 * 10. Lưu trữ ảnh chụp tổn thương theo từng mốc tiến triển kèm điểm triệu chứng (lphoto01)
 * Endpoint: POST /api/v1/lesion-photos
 */
async function createLesionPhoto(req, res) {
  try {
    const body = req.body || {};
    const episodeId = body.episode_id ? Number(body.episode_id) : null;
    const locationId = body.location_id ? Number(body.location_id) : null;
    const attachmentId = body.attachment_id ? Number(body.attachment_id) : null;
    const milestone = body.milestone ? String(body.milestone).trim().toLowerCase() : '';

    if (!episodeId || !attachmentId || !milestone) {
      return sendResponse(
        res,
        RESPONSE_CODES.MISSING_PARAM,
        {},
        'episode_id, attachment_id, and milestone are required'
      );
    }

    // Kiểm tra milestone hợp lệ: 'start', 'peak', 'normal' (Test case 7006)
    if (!VALID_MILESTONES.includes(milestone)) {
      return sendResponse(res, RESPONSE_CODES.INVALID_MILESTONE);
    }

    // Kiểm tra điểm triệu chứng (itch_score, pain_score, burn_score) trong thang 0 - 10 (Test case 7007)
    const itch = parseAndValidateSymptomScore(body.itch_score);
    const pain = parseAndValidateSymptomScore(body.pain_score);
    const burn = parseAndValidateSymptomScore(body.burn_score);

    if (!itch.valid || !pain.valid || !burn.valid) {
      return sendResponse(res, RESPONSE_CODES.SYMPTOM_SCORE_OUT_OF_RANGE);
    }

    // Kiểm tra đợt tổn thương tồn tại
    const epRes = await query(
      `SELECT * FROM public.dottonthuongda WHERE ma_dot_ton_thuong_da = $1`,
      [episodeId]
    );
    if (epRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.LESION_EPISODE_NOT_FOUND);
    }
    const ep = epRes.rows[0];
    if (req.user.role_name === 'benh_nhan' && Number(ep.ma_benh_nhan) !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    const epMeta = state.lesionEpisodeMeta[String(episodeId)] || {};
    const checkRec = await checkMedicalRecordNotCompleted(epMeta.medical_record_id || ep.ma_ho_so_man, req.user);
    if (!checkRec.ok) {
      return sendResponse(res, checkRec.error);
    }

    // Nếu có location_id thì kiểm tra vị trí đó thuộc đúng đợt tổn thương (fk_anh_vitri_cung_dot)
    if (locationId) {
      const locCheck = await query(
        `SELECT ma_vi_tri_ton_thuong
         FROM public.vitritonthuong
         WHERE ma_vi_tri_ton_thuong = $1 AND ma_dot_ton_thuong_da = $2`,
        [locationId, episodeId]
      );
      if (locCheck.rowCount === 0) {
        return sendResponse(res, RESPONSE_CODES.LESION_LOCATION_NOT_FOUND);
      }
    }

    // Kiểm tra tệp đính kèm tồn tại trong bảng `public.tepdinhkem`
    const attCheck = await query(
      `SELECT ma_tep_dinh_kem, duong_dan_url, duong_dan_luu_tru
       FROM public.tepdinhkem
       WHERE ma_tep_dinh_kem = $1`,
      [attachmentId]
    );
    if (attCheck.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.ATTACHMENT_NOT_FOUND);
    }

    const takenAt = body.taken_at ? new Date(body.taken_at).toISOString() : new Date().toISOString();
    const hivesCount =
      body.hives_count !== undefined && body.hives_count !== null && body.hives_count !== ''
        ? Math.max(0, parseInt(String(body.hives_count), 10))
        : null;
    const localAuas =
      body.local_auas !== undefined && body.local_auas !== null && body.local_auas !== ''
        ? Number(body.local_auas)
        : null;
    const annotatedUrl =
      body.annotated_url || attCheck.rows[0].duong_dan_url || attCheck.rows[0].duong_dan_luu_tru || null;

    const insertRes = await query(
      `INSERT INTO public.anhchuptonthuong (
         ma_tep_dinh_kem,
         ma_dot_ton_thuong_da,
         ma_vi_tri_ton_thuong,
         thoi_diem_chup,
         moc_tien_trien,
         diem_ngua_nrs,
         diem_dau_nrs,
         diem_bong_rat_nrs,
         so_luong_not_san,
         chi_so_auas_cuc_bo,
         url_anh
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        attachmentId,
        episodeId,
        locationId,
        takenAt,
        milestone,
        itch.value,
        pain.value,
        burn.value,
        hivesCount,
        localAuas,
        annotatedUrl
      ]
    );

    return sendResponse(
      res,
      RESPONSE_CODES.CREATED,
      formatPhotoRow(insertRes.rows[0]),
      'Lưu ảnh thành công'
    );
  } catch (err) {
    console.error('[LesionController.createLesionPhoto] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 11. Lấy danh sách ảnh tổn thương theo vị trí cơ thể (lphoto02)
 * Endpoint: GET /api/v1/lesion-photos/location/:location_id
 * Kết hợp (JOIN) với bảng `public.tepdinhkem` để trả về thông tin file ảnh gốc.
 */
async function getPhotosByLocation(req, res) {
  try {
    const locationId = Number(req.params.location_id);
    if (isNaN(locationId)) {
      return sendResponse(res, RESPONSE_CODES.LESION_LOCATION_NOT_FOUND);
    }

    const locRes = await query(
      `SELECT v.*, d.ma_benh_nhan
       FROM public.vitritonthuong v
       JOIN public.dottonthuongda d ON d.ma_dot_ton_thuong_da = v.ma_dot_ton_thuong_da
       WHERE v.ma_vi_tri_ton_thuong = $1`,
      [locationId]
    );
    if (locRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.LESION_LOCATION_NOT_FOUND);
    }

    if (req.user.role_name === 'benh_nhan' && Number(locRes.rows[0].ma_benh_nhan) !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    const photosRes = await query(
      `SELECT a.*, t.duong_dan_url, t.duong_dan_luu_tru, t.ten_tep_goc
       FROM public.anhchuptonthuong a
       JOIN public.tepdinhkem t ON t.ma_tep_dinh_kem = a.ma_tep_dinh_kem
       WHERE a.ma_vi_tri_ton_thuong = $1
       ORDER BY a.thoi_diem_chup ASC, a.ma_anh ASC`,
      [locationId]
    );

    return sendResponse(res, RESPONSE_CODES.OK, photosRes.rows.map(formatPhotoRow));
  } catch (err) {
    console.error('[LesionController.getPhotosByLocation] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 12. Cập nhật mốc tiến triển (`milestone`) và điểm triệu chứng/AI của một bức ảnh (lphoto03)
 * Endpoint: PATCH /api/v1/lesion-photos/:id/milestone
 */
async function updateLesionPhotoMilestone(req, res) {
  try {
    const photoId = Number(req.params.id);
    if (isNaN(photoId)) {
      return sendResponse(res, RESPONSE_CODES.LESION_PHOTO_NOT_FOUND);
    }

    const photoRes = await query(
      `SELECT a.*, d.ma_benh_nhan, d.ma_ho_so_man
       FROM public.anhchuptonthuong a
       LEFT JOIN public.dottonthuongda d ON d.ma_dot_ton_thuong_da = a.ma_dot_ton_thuong_da
       WHERE a.ma_anh = $1`,
      [photoId]
    );
    if (photoRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.LESION_PHOTO_NOT_FOUND);
    }

    const cur = photoRes.rows[0];
    if (req.user.role_name === 'benh_nhan' && cur.ma_benh_nhan && Number(cur.ma_benh_nhan) !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    const epMeta = state.lesionEpisodeMeta[String(cur.ma_dot_ton_thuong_da)] || {};
    const checkRec = await checkMedicalRecordNotCompleted(epMeta.medical_record_id || cur.ma_ho_so_man, req.user);
    if (!checkRec.ok) {
      return sendResponse(res, checkRec.error);
    }

    const body = req.body || {};
    let newMilestone = cur.moc_tien_trien;
    if (body.milestone !== undefined) {
      const m = String(body.milestone).trim().toLowerCase();
      if (!VALID_MILESTONES.includes(m)) {
        return sendResponse(res, RESPONSE_CODES.INVALID_MILESTONE);
      }
      newMilestone = m;
    }

    const itch = body.itch_score !== undefined ? parseAndValidateSymptomScore(body.itch_score) : { valid: true, value: cur.diem_ngua_nrs };
    const pain = body.pain_score !== undefined ? parseAndValidateSymptomScore(body.pain_score) : { valid: true, value: cur.diem_dau_nrs };
    const burn = body.burn_score !== undefined ? parseAndValidateSymptomScore(body.burn_score) : { valid: true, value: cur.diem_bong_rat_nrs };

    if (!itch.valid || !pain.valid || !burn.valid) {
      return sendResponse(res, RESPONSE_CODES.SYMPTOM_SCORE_OUT_OF_RANGE);
    }

    const newHivesCount =
      body.hives_count !== undefined
        ? body.hives_count !== null && body.hives_count !== ''
          ? Math.max(0, parseInt(String(body.hives_count), 10))
          : null
        : cur.so_luong_not_san;

    const newLocalAuas =
      body.local_auas !== undefined
        ? body.local_auas !== null && body.local_auas !== ''
          ? Number(body.local_auas)
          : null
        : cur.chi_so_auas_cuc_bo;

    const newAnnotatedUrl =
      body.annotated_url !== undefined ? body.annotated_url : cur.url_anh;

    const updRes = await query(
      `UPDATE public.anhchuptonthuong
       SET moc_tien_trien = $1,
           diem_ngua_nrs = $2,
           diem_dau_nrs = $3,
           diem_bong_rat_nrs = $4,
           so_luong_not_san = $5,
           chi_so_auas_cuc_bo = $6,
           url_anh = $7
       WHERE ma_anh = $8
       RETURNING *`,
      [
        newMilestone,
        itch.value,
        pain.value,
        burn.value,
        newHivesCount,
        newLocalAuas,
        newAnnotatedUrl,
        photoId
      ]
    );

    return sendResponse(
      res,
      RESPONSE_CODES.OK,
      formatPhotoRow(updRes.rows[0]),
      'Cập nhật thành công'
    );
  } catch (err) {
    console.error('[LesionController.updateLesionPhotoMilestone] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 13. Xóa một bản ghi ảnh tổn thương (lphoto04)
 * Endpoint: DELETE /api/v1/lesion-photos/:id
 */
async function deleteLesionPhoto(req, res) {
  try {
    const photoId = Number(req.params.id);
    if (isNaN(photoId)) {
      return sendResponse(res, RESPONSE_CODES.LESION_PHOTO_NOT_FOUND);
    }

    const photoRes = await query(
      `SELECT a.*, d.ma_benh_nhan, d.ma_ho_so_man
       FROM public.anhchuptonthuong a
       LEFT JOIN public.dottonthuongda d ON d.ma_dot_ton_thuong_da = a.ma_dot_ton_thuong_da
       WHERE a.ma_anh = $1`,
      [photoId]
    );
    if (photoRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.LESION_PHOTO_NOT_FOUND);
    }

    const cur = photoRes.rows[0];
    if (req.user.role_name === 'benh_nhan' && cur.ma_benh_nhan && Number(cur.ma_benh_nhan) !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    const epMeta = state.lesionEpisodeMeta[String(cur.ma_dot_ton_thuong_da)] || {};
    const checkRec = await checkMedicalRecordNotCompleted(epMeta.medical_record_id || cur.ma_ho_so_man, req.user);
    if (!checkRec.ok) {
      return sendResponse(res, checkRec.error);
    }

    await query(`DELETE FROM public.anhchuptonthuong WHERE ma_anh = $1`, [photoId]);
    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Xóa ảnh tổn thương thành công');
  } catch (err) {
    console.error('[LesionController.deleteLesionPhoto] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/* ==========================================================================
 * PHẦN IV: QUẢN LÝ KHO ẢNH ĐÍNH KÈM (`public.tepdinhkem` - Hỗ trợ Bệnh nhân Upload)
 * ========================================================================== */

/**
 * 14. Tải tệp ảnh lên kho lưu trữ và lưu metadata vào `public.tepdinhkem` (img01 - Slide 8)
 * Endpoint: POST /api/v1/image-attachments/upload
 */
async function uploadImageAttachment(req, res) {
  try {
    const file = req.file;
    const body = req.body || {};

    if (!file && !body.file_name) {
      return sendResponse(res, RESPONSE_CODES.IMAGE_FILE_REQUIRED);
    }

    const maxBytes = (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;
    const fileSize = file ? file.size : Number(body.file_size || 1024);
    if (fileSize > maxBytes) {
      return sendResponse(res, RESPONSE_CODES.FILE_SIZE_EXCEEDS_LIMIT);
    }

    // Tìm hồ sơ bệnh án của người dùng để gắn vào cột `ma_ho_so` (NOT NULL trong `public.tepdinhkem`)
    let maHoSo = body.medical_record_id ? Number(body.medical_record_id) : null;
    if (!maHoSo) {
      const hosoRes = await query(
        `SELECT ma_ho_so FROM public.hosobenhan WHERE ma_benh_nhan = $1 ORDER BY ma_ho_so DESC LIMIT 1`,
        [req.user.user_id]
      );
      if (hosoRes.rowCount > 0) {
        maHoSo = Number(hosoRes.rows[0].ma_ho_so);
      } else {
        return sendResponse(res, RESPONSE_CODES.ACTIVE_RECORD_REQUIRED);
      }
    }

    const originalName = file ? file.originalname : String(body.file_name);
    const storagePath = file ? `/uploads/${file.filename}` : body.storage_path || `/uploads/${Date.now()}_${originalName}`;
    const fileUrl = body.file_url || `http://localhost:${process.env.PORT || 3000}${storagePath}`;
    const mimeType = file ? file.mimetype : body.mime_type || 'image/jpeg';

    const insertRes = await query(
      `INSERT INTO public.tepdinhkem (
         ma_ho_so,
         ma_tai_khoan,
         ten_tep_goc,
         duong_dan_luu_tru,
         duong_dan_url,
         dinh_dang_tep,
         loai_phuong_tien,
         dung_luong_byte,
         phan_loai_muc_dich,
         mo_ta_tep
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'IMAGE', $7, $8, $9)
       RETURNING *`,
      [
        maHoSo,
        req.user.account_id,
        originalName,
        storagePath,
        fileUrl,
        mimeType,
        Math.max(1, fileSize),
        body.purpose || 'LESION_PHOTO',
        body.description || null
      ]
    );

    const row = insertRes.rows[0];
    return sendResponse(res, RESPONSE_CODES.CREATED, {
      attachment_id: String(row.ma_tep_dinh_kem),
      medical_record_id: String(row.ma_ho_so),
      user_id: String(req.user.user_id),
      file_name: row.ten_tep_goc,
      file_url: row.duong_dan_url,
      storage_path: row.duong_dan_luu_tru,
      file_size: Number(row.dung_luong_byte),
      created_at: new Date(row.thoi_diem_tao).toISOString()
    });
  } catch (err) {
    console.error('[LesionController.uploadImageAttachment] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 15. Lấy danh sách ảnh đã tải lên của người dùng (img03 - Slide 8)
 * Endpoint: GET /api/v1/image-attachments/user/:user_id
 */
async function getUserImageAttachments(req, res) {
  try {
    const targetUserId = Number(req.params.user_id);
    if (req.user.role_name === 'benh_nhan' && targetUserId !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    const listRes = await query(
      `SELECT t.*
       FROM public.tepdinhkem t
       JOIN public.hosobenhan hs ON hs.ma_ho_so = t.ma_ho_so
       WHERE hs.ma_benh_nhan = $1
       ORDER BY t.thoi_diem_tao DESC`,
      [targetUserId]
    );

    const formatted = listRes.rows.map((r) => ({
      attachment_id: String(r.ma_tep_dinh_kem),
      medical_record_id: String(r.ma_ho_so),
      file_name: r.ten_tep_goc,
      file_url: r.duong_dan_url,
      file_size: Number(r.dung_luong_byte),
      created_at: new Date(r.thoi_diem_tao).toISOString()
    }));

    return sendResponse(res, RESPONSE_CODES.OK, formatted);
  } catch (err) {
    console.error('[LesionController.getUserImageAttachments] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 16. Xóa tệp ảnh khỏi kho lưu trữ (img05 - Slide 8)
 * Endpoint: DELETE /api/v1/image-attachments/:id
 */
async function deleteImageAttachment(req, res) {
  try {
    const attId = Number(req.params.id);
    if (isNaN(attId)) {
      return sendResponse(res, RESPONSE_CODES.ATTACHMENT_NOT_FOUND);
    }

    const attRes = await query(
      `SELECT t.*, hs.ma_benh_nhan
       FROM public.tepdinhkem t
       JOIN public.hosobenhan hs ON hs.ma_ho_so = t.ma_ho_so
       WHERE t.ma_tep_dinh_kem = $1`,
      [attId]
    );
    if (attRes.rowCount === 0) {
      return sendResponse(res, RESPONSE_CODES.ATTACHMENT_NOT_FOUND);
    }

    const att = attRes.rows[0];
    if (req.user.role_name === 'benh_nhan' && Number(att.ma_benh_nhan) !== req.user.user_id) {
      return sendResponse(res, RESPONSE_CODES.FORBIDDEN_OTHER_USER_DATA);
    }

    await withTransaction(async (client) => {
      await client.query(`DELETE FROM public.anhchuptonthuong WHERE ma_tep_dinh_kem = $1`, [attId]);
      await client.query(`DELETE FROM public.tepdinhkem WHERE ma_tep_dinh_kem = $1`, [attId]);
    });

    state.answerImages = state.answerImages.filter((item) => Number(item.attachment_id) !== attId);
    saveStore();

    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Xóa ảnh thành công');
  } catch (err) {
    console.error('[LesionController.deleteImageAttachment] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 17. Gắn liên kết ảnh vào một câu trả lời trong phiếu khám (ansimg01 - Slide 8)
 * Endpoint: POST /api/v1/answer-images
 */
async function attachImageToAnswer(req, res) {
  try {
    const body = req.body || {};
    const answerId = body.answer_id ? Number(body.answer_id) : null;
    const attachmentId = body.attachment_id ? Number(body.attachment_id) : null;
    const optionValue = body.option_value || null;

    if (!answerId || !attachmentId) {
      return sendResponse(res, RESPONSE_CODES.MISSING_PARAM, {}, 'answer_id and attachment_id are required');
    }

    // Tìm câu trả lời trong state.dynamicAnswers
    let foundAnswer = null;
    let foundRecordId = null;
    for (const [recId, qMap] of Object.entries(state.dynamicAnswers)) {
      for (const ans of Object.values(qMap)) {
        if (Number(ans.id) === answerId) {
          foundAnswer = ans;
          foundRecordId = Number(recId);
          break;
        }
      }
      if (foundAnswer) break;
    }

    if (!foundAnswer) {
      return sendResponse(res, RESPONSE_CODES.INVALID_PARAM_VALUE, {}, 'Answer not found');
    }

    // Kiểm tra trạng thái bệnh án không được là completed (Test case 4003)
    const checkRec = await checkMedicalRecordNotCompleted(foundRecordId, req.user);
    if (!checkRec.ok) {
      return sendResponse(res, checkRec.error);
    }

    // Kiểm tra trùng liên kết (Test case 6006)
    const isDuplicate = state.answerImages.some(
      (item) => Number(item.answer_id) === answerId && Number(item.attachment_id) === attachmentId
    );
    if (isDuplicate) {
      return sendResponse(res, RESPONSE_CODES.IMAGE_ALREADY_MAPPED);
    }

    const newLink = {
      id: state.answerImageSeq++,
      answer_id: answerId,
      medical_record_id: foundRecordId,
      attachment_id: attachmentId,
      option_value: optionValue,
      created_at: new Date().toISOString()
    };

    state.answerImages.push(newLink);
    saveStore();

    return sendResponse(res, RESPONSE_CODES.CREATED, newLink);
  } catch (err) {
    console.error('[LesionController.attachImageToAnswer] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 18. Xem danh sách ảnh đính kèm theo câu trả lời (ansimg03 - Slide 8)
 * Endpoint: GET /api/v1/answer-images/:answer_id
 */
async function getAnswerImages(req, res) {
  try {
    const answerId = Number(req.params.answer_id);
    const links = state.answerImages.filter((item) => Number(item.answer_id) === answerId);

    const results = [];
    for (const link of links) {
      const attRes = await query(
        `SELECT * FROM public.tepdinhkem WHERE ma_tep_dinh_kem = $1`,
        [link.attachment_id]
      );
      const att = attRes.rows[0] || {};
      results.push({
        ...link,
        file_url: att.duong_dan_url || att.duong_dan_luu_tru || null,
        file_name: att.ten_tep_goc || null
      });
    }

    return sendResponse(res, RESPONSE_CODES.OK, results);
  } catch (err) {
    console.error('[LesionController.getAnswerImages] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

/**
 * 19. Gỡ liên kết ảnh khỏi câu trả lời mà KHÔNG xóa file gốc trong `public.tepdinhkem` (ansimg04 - Slide 8)
 * Endpoint: DELETE /api/v1/answer-images/:id
 */
async function deleteAnswerImageLink(req, res) {
  try {
    const linkId = Number(req.params.id);
    const idx = state.answerImages.findIndex((item) => Number(item.id) === linkId);
    if (idx === -1) {
      return sendResponse(res, RESPONSE_CODES.ATTACHMENT_NOT_FOUND);
    }

    state.answerImages.splice(idx, 1);
    saveStore();

    return sendResponse(res, RESPONSE_CODES.OK, {}, 'Đã gỡ liên kết ảnh khỏi câu trả lời');
  } catch (err) {
    console.error('[LesionController.deleteAnswerImageLink] Lỗi:', err);
    return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
  }
}

module.exports = {
  createLesionEpisode,
  getMyLesionEpisodes,
  getLesionEpisodeById,
  updateLesionEpisode,
  deleteLesionEpisode,
  createLesionLocation,
  getLocationsByEpisode,
  updateLesionLocation,
  deleteLesionLocation,
  createLesionPhoto,
  getPhotosByLocation,
  updateLesionPhotoMilestone,
  deleteLesionPhoto,
  uploadImageAttachment,
  getUserImageAttachments,
  deleteImageAttachment,
  attachImageToAnswer,
  getAnswerImages,
  deleteAnswerImageLink
};

