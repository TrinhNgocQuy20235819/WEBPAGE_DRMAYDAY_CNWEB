/**
 * @file src/routes/patientRoutes.js
 * @description Định nghĩa toàn bộ các tuyến đường (Routes) cho Phân hệ Bệnh nhân (Đầu việc 2).
 *  Hỗ trợ đồng thời cả tiền tố `/api/v1/...` và `/api/...` theo đúng đặc tả trong 11 Slides:
 *
 *  1. Nhóm Xác thực, Tài khoản & Hồ sơ cá nhân (Slide 2):
 *     - POST   /api/v1/auth/signup
 *     - POST   /api/v1/auth/login
 *     - POST   /api/v1/auth/logout
 *     - POST   /api/v1/auth/forgot-password
 *     - PUT    /api/v1/auth/change-password
 *     - GET    /api/v1/profile
 *     - PUT    /api/v1/profile
 *
 *  2. Nhóm Sàng lọc báo động đỏ, Phân loại & Hồ sơ bệnh án Mày đay (Slide 5, 7, 10, 11):
 *     - POST   /api/v1/red-flag-screening
 *     - GET    /api/v1/medical_records/classify-questions     (medrec01)
 *     - POST   /api/v1/medical_records/classify               (medrec02)
 *     - POST   /api/v1/medical_records                        (medrec03)
 *     - GET    /api/v1/medical_records/patients/:id/history   (medrec13)
 *     - GET    /api/v1/medical_records/:id                    (medrec05)
 *     - GET    /api/v1/medical_records/:id/summary            (medrec06)
 *     - GET    /api/v1/medical_records/:id/answers            (medrec08)
 *     - PUT    /api/v1/medical_records/:id/answers            (medrec10)
 *     - GET    /api/v1/templates/:id                          (tmpl03)
 *     - GET    /api/v1/lab-results/:record_id                 (lab02)
 *     - GET    /api/v1/prescriptions/:record_id               (Đơn thuốc & chỉ dẫn ngừng thuốc)
 *
 *  3. Nhóm Theo dõi điểm số UAS7 & AAS hằng ngày (Slide 6):
 *     - GET    /api/v1/uas7-scores/eligibility                (uas701)
 *     - POST   /api/v1/uas7-scores                            (uas702)
 *     - GET    /api/v1/uas7-scores/patient/:patient_id        (uas704)
 *     - POST   /api/v1/aas-scores                             (Nhật ký phù mạch AAS)
 *     - GET    /api/v1/aas-scores/patient/:patient_id         (Lịch sử AAS)
 *
 *  4. Nhóm Theo dõi Tổn thương da 3 cấp & Kho ảnh đính kèm (Slide 8 & Slide 9):
 *     - POST   /api/v1/lesion-episodes                        (lesion02)
 *     - GET    /api/v1/lesion-episodes/my                     (lesion01)
 *     - GET    /api/v1/lesion-episodes/:id                    (lesion06)
 *     - PATCH  /api/v1/lesion-episodes/:id                    (lesion03)
 *     - DELETE /api/v1/lesion-episodes/:id                    (lesion04)
 *     - POST   /api/v1/lesion-locations                       (loc01)
 *     - GET    /api/v1/lesion-locations/episode/:episode_id   (loc03)
 *     - PATCH  /api/v1/lesion-locations/:id                   (loc04)
 *     - DELETE /api/v1/lesion-locations/:id                   (loc05)
 *     - POST   /api/v1/lesion-photos                          (lphoto01)
 *     - GET    /api/v1/lesion-photos/location/:location_id    (lphoto02)
 *     - PATCH  /api/v1/lesion-photos/:id/milestone            (lphoto03)
 *     - DELETE /api/v1/lesion-photos/:id                      (lphoto04)
 *     - POST   /api/v1/image-attachments/upload               (img01)
 *     - GET    /api/v1/image-attachments/user/:user_id        (img03)
 *     - DELETE /api/v1/image-attachments/:id                  (img05)
 *     - POST   /api/v1/answer-images                          (ansimg01)
 *     - GET    /api/v1/answer-images/:answer_id               (ansimg03)
 *     - DELETE /api/v1/answer-images/:id                      (ansimg04)
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { authenticateJWT, optionalAuthenticateJWT } = require('../middlewares/authMiddleware');
const authController = require('../controllers/authController');
const medicalRecordController = require('../controllers/medicalRecordController');
const uas7Controller = require('../controllers/uas7Controller');
const lesionController = require('../controllers/lesionController');
const { query } = require('../config/database');
const { RESPONSE_CODES, sendResponse } = require('../config/responseCodes');
const { state, saveStore } = require('../config/runtimeStore');

const router = express.Router();

// ============================================================================
// CẤU HÌNH MULTER CHO UPLOAD ẢNH TỔN THƯƠNG & MEDIA (SLIDE 8)
// ============================================================================
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeName = (file.originalname || 'upload.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  }
});

const maxFileSizeBytes = (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;
const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeBytes // Giới hạn tối đa 5MB theo đặc tả Slide 8 (Mã lỗi 6003)
  }
});

// ============================================================================
// 1. ROUTES XÁC THỰC & QUẢN LÝ HỒ SƠ CÁ NHÂN (SLIDE 2)
// ============================================================================
router.post('/auth/signup', authController.signup);
router.post('/auth/register', authController.signup);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authenticateJWT, authController.logout);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.get('/auth/his-lookup', authController.lookupHisPatient);
router.put('/auth/change-password', authenticateJWT, authController.changePassword);
router.post('/auth/change-password', authenticateJWT, authController.changePassword);

router.get('/profile', authenticateJWT, authController.getProfile);
router.put('/profile', authenticateJWT, authController.updateProfile);
router.get('/users/profile', authenticateJWT, authController.getProfile);
router.put('/users/profile', authenticateJWT, authController.updateProfile);

// ============================================================================
// 2. ROUTES SÀNG LỌC BÁO ĐỘNG ĐỎ, PHÂN LOẠI & BỆNH ÁN MÀY ĐAY (SLIDE 5, 7, 10, 11)
// ============================================================================
router.post('/red-flag-screening', optionalAuthenticateJWT, medicalRecordController.createRedFlagScreening);
router.post(
  '/medical-records/screening/red-flags',
  optionalAuthenticateJWT,
  medicalRecordController.createRedFlagScreening
);

// medrec01: Lấy danh sách câu hỏi phân loại bệnh án
router.get(
  ['/medical_records/classify-questions', '/medical-records/classify-questions'],
  authenticateJWT,
  medicalRecordController.getClassifyQuestions
);

// medrec02: Gửi câu trả lời phân loại bệnh án để xác định Cấp tính (CAP) / Mạn tính (MAN)
router.post(
  ['/medical_records/classify', '/medical-records/classify'],
  authenticateJWT,
  medicalRecordController.classifyMedicalRecord
);

// medrec03: Tạo hồ sơ bệnh án mới
router.post(
  ['/medical_records', '/medical-records'],
  authenticateJWT,
  medicalRecordController.createMedicalRecord
);

// medrec13: Xem lịch sử bệnh án của một bệnh nhân
router.get(
  [
    '/medical_records/patients/:id/history',
    '/medical-records/patients/:id/history',
    '/medical-records/patient/:id'
  ],
  authenticateJWT,
  medicalRecordController.getPatientMedicalHistory
);

// medrec05: Xem chi tiết toàn bộ hồ sơ bệnh án
router.get(
  ['/medical_records/:id', '/medical-records/:id'],
  authenticateJWT,
  medicalRecordController.getMedicalRecordById
);

// medrec06: Xem tóm tắt hồ sơ bệnh án (Summary Card)
router.get(
  ['/medical_records/:id/summary', '/medical-records/:id/summary'],
  authenticateJWT,
  medicalRecordController.getMedicalRecordSummary
);

// medrec08: Lấy toàn bộ câu trả lời động của một hồ sơ bệnh án
router.get(
  ['/medical_records/:id/answers', '/medical-records/:id/answers'],
  authenticateJWT,
  medicalRecordController.getMedicalRecordAnswers
);

// medrec10: Cập nhật / Upsert câu trả lời cho các câu hỏi trong bệnh án
router.put(
  ['/medical_records/:id/answers', '/medical-records/:id/answers'],
  authenticateJWT,
  medicalRecordController.updateMedicalRecordAnswers
);

// tmpl03: Lấy chi tiết cấu trúc 4 tầng của mẫu bệnh án (Template -> Group -> Subgroup -> Question)
router.get('/templates/:id', authenticateJWT, medicalRecordController.getTemplateDetail);

// lab02: Bệnh nhân xem danh sách kết quả xét nghiệm cận lâm sàng của bệnh án
router.get(
  ['/lab-results/:record_id', '/medical-records/:record_id/lab-results'],
  authenticateJWT,
  medicalRecordController.getLabResultsByRecord
);

// Bệnh nhân xem danh sách đơn thuốc điện tử & chỉ dẫn ngừng thuốc của bệnh án
router.get(
  ['/prescriptions/:record_id', '/medical-records/:record_id/prescriptions'],
  authenticateJWT,
  medicalRecordController.getPrescriptionsByRecord
);

/**
 * Route hỗ trợ đồng bộ trạng thái bệnh án ('pending' | 'in_progress' | 'completed')
 * Phục vụ kiểm thử tích hợp luồng khóa bệnh án khi đã hoàn thành (Mã lỗi 4003).
 */
router.put(
  ['/medical_records/:id/status', '/medical-records/:id/status'],
  authenticateJWT,
  async (req, res) => {
    try {
      const recordId = Number(req.params.id);
      if (isNaN(recordId)) {
        return sendResponse(res, RESPONSE_CODES.MEDICAL_RECORD_NOT_FOUND);
      }

      const status = req.body.status || 'completed';
      const updRes = await query(
        `UPDATE public.hosobenhan
         SET trang_thai = $1
         WHERE ma_ho_so = $2
         RETURNING ma_ho_so, trang_thai`,
        [status, recordId]
      );

      if (updRes.rowCount === 0) {
        return sendResponse(res, RESPONSE_CODES.MEDICAL_RECORD_NOT_FOUND);
      }

      if (!state.recordMeta[recordId]) {
        state.recordMeta[recordId] = {};
      }
      if (status === 'completed') {
        state.recordMeta[recordId].completed_at = new Date().toISOString();
      }
      saveStore();

      return sendResponse(res, RESPONSE_CODES.OK, {
        medical_record_id: recordId,
        status: updRes.rows[0].trang_thai
      });
    } catch (err) {
      console.error('[updateRecordStatus] Lỗi:', err);
      return sendResponse(res, RESPONSE_CODES.INTERNAL_ERROR, {}, err.message);
    }
  }
);

// ============================================================================
// 3. ROUTES THEO DÕI ĐIỂM SỐ UAS7 & AAS HẰNG NGÀY (SLIDE 6)
// ============================================================================
// uas701: Kiểm tra điều kiện chấm điểm UAS7
router.get('/uas7-scores/eligibility', authenticateJWT, uas7Controller.checkEligibility);

// uas702: Bệnh nhân gửi điểm UAS7 hằng ngày
router.post('/uas7-scores', authenticateJWT, uas7Controller.createUas7Score);

// uas704: Lấy lịch sử điểm UAS7 của bệnh nhân
router.get(
  '/uas7-scores/patient/:patient_id',
  authenticateJWT,
  uas7Controller.getPatientUas7History
);

// Mở rộng: Bệnh nhân gửi nhật ký phù mạch hằng ngày (AAS - bảng nhatkyaashangngay)
router.post('/aas-scores', authenticateJWT, uas7Controller.createAasScore);

// Mở rộng: Xem lịch sử điểm AAS của bệnh nhân
router.get(
  '/aas-scores/patient/:patient_id',
  authenticateJWT,
  uas7Controller.getPatientAasHistory
);

// ============================================================================
// 4. ROUTES ĐỢT TỔN THƯƠNG DA, VỊ TRÍ CƠ THỂ, ẢNH CHỤP & KHO ẢNH (SLIDE 8 & 9)
// ============================================================================
// lesion02: Tạo mới đợt tổn thương da
router.post('/lesion-episodes', authenticateJWT, lesionController.createLesionEpisode);

// lesion01: Lấy danh sách các đợt tổn thương của bệnh nhân đang đăng nhập
router.get('/lesion-episodes/my', authenticateJWT, lesionController.getMyLesionEpisodes);

// lesion06: Xem chi tiết một đợt tổn thương (kèm danh sách vị trí)
router.get('/lesion-episodes/:id', authenticateJWT, lesionController.getLesionEpisodeById);

// lesion03: Cập nhật đợt tổn thương
router.patch('/lesion-episodes/:id', authenticateJWT, lesionController.updateLesionEpisode);
router.put('/lesion-episodes/:id', authenticateJWT, lesionController.updateLesionEpisode);

// lesion04: Xóa đợt tổn thương
router.delete('/lesion-episodes/:id', authenticateJWT, lesionController.deleteLesionEpisode);

// loc01: Thêm vị trí cơ thể bị tổn thương vào đợt tổn thương
router.post('/lesion-locations', authenticateJWT, lesionController.createLesionLocation);

// loc03: Danh sách các vị trí cơ thể của một đợt tổn thương
router.get(
  '/lesion-locations/episode/:episode_id',
  authenticateJWT,
  lesionController.getLocationsByEpisode
);

// loc04: Cập nhật thông tin vị trí tổn thương
router.patch('/lesion-locations/:id', authenticateJWT, lesionController.updateLesionLocation);
router.put('/lesion-locations/:id', authenticateJWT, lesionController.updateLesionLocation);

// loc05: Xóa vị trí tổn thương khỏi đợt tổn thương
router.delete('/lesion-locations/:id', authenticateJWT, lesionController.deleteLesionLocation);

// lphoto01: Lưu ảnh chụp tiến triển 3 mốc (start/peak/normal) kèm điểm triệu chứng (0-10)
router.post('/lesion-photos', authenticateJWT, lesionController.createLesionPhoto);

// lphoto02: Lấy danh sách ảnh chụp của một vị trí cơ thể
router.get(
  '/lesion-photos/location/:location_id',
  authenticateJWT,
  lesionController.getPhotosByLocation
);

// lphoto03: Cập nhật mốc tiến triển milestone và thông tin ảnh chụp tổn thương
router.patch(
  '/lesion-photos/:id/milestone',
  authenticateJWT,
  lesionController.updateLesionPhotoMilestone
);
router.put(
  '/lesion-photos/:id/milestone',
  authenticateJWT,
  lesionController.updateLesionPhotoMilestone
);

// lphoto04: Xóa ảnh chụp tổn thương
router.delete('/lesion-photos/:id', authenticateJWT, lesionController.deleteLesionPhoto);

// img01: Tải lên tệp ảnh vào kho lưu trữ (bảng public.tepdinhkem)
router.post(
  '/image-attachments/upload',
  authenticateJWT,
  upload.single('file'),
  lesionController.uploadImageAttachment
);

// img03: Lấy danh sách tệp ảnh đã tải lên của người dùng
router.get(
  '/image-attachments/user/:user_id',
  authenticateJWT,
  lesionController.getUserImageAttachments
);

// img05: Xóa tệp ảnh khỏi kho lưu trữ
router.delete(
  '/image-attachments/:id',
  authenticateJWT,
  lesionController.deleteImageAttachment
);

// ansimg01: Đính kèm hình ảnh vào câu trả lời của câu hỏi động
router.post('/answer-images', authenticateJWT, lesionController.attachImageToAnswer);

// ansimg03: Lấy danh sách ảnh của một câu trả lời trong hồ sơ bệnh án
router.get('/answer-images/:answer_id', authenticateJWT, lesionController.getAnswerImages);

// ansimg04: Gỡ liên kết ảnh khỏi câu trả lời mà không xóa ảnh gốc
router.delete('/answer-images/:id', authenticateJWT, lesionController.deleteAnswerImageLink);

module.exports = router;
