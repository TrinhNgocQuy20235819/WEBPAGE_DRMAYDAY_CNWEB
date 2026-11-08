/**
 * @file src/routes/sharedInfraRoutes.js
 * @description Định tuyến cho Đầu việc 4:
 * - Hệ thống Thông báo & Đăng ký FCM Token (Slide 10)
 * - Mô-đun AI Đếm nốt sẩn mề đay & tính điểm AUAS cục bộ (Slide 9)
 * - Các endpoint kiểm chứng RBAC & Shared Security (tương thích nhánh Dev 4)
 */

const express = require('express');
const { authenticateJWT, requireRoles } = require('../middlewares/authMiddleware');
const sharedInfraController = require('../controllers/sharedInfraController');

const router = express.Router();

// Slide 10: FCM Tokens & Notifications
router.post('/fcm-tokens', authenticateJWT, sharedInfraController.registerFcmToken);
router.get('/notifications', authenticateJWT, sharedInfraController.getMyNotifications);
router.put('/notifications/read-all', authenticateJWT, sharedInfraController.markAllNotificationsRead);
router.put('/notifications/:id/read', authenticateJWT, sharedInfraController.markNotificationRead);
router.delete('/notifications/:id', authenticateJWT, sharedInfraController.deleteNotification);

// Slide 9: AI Wheal Counting & Local AUAS Inference
router.post('/ai/inference', authenticateJWT, sharedInfraController.runLesionAiInference);

// Dev 4 Shared Security & RBAC Verification Routes
router.get('/shared/ping', authenticateJWT, sharedInfraController.securityPing('authenticated'));
router.get('/admin/ping', authenticateJWT, requireRoles('admin'), sharedInfraController.securityPing('admin'));
router.get('/doctor/ping', authenticateJWT, requireRoles('bac_si', 'dieu_duong', 'admin'), sharedInfraController.securityPing('doctor'));
router.get('/patient/ping', authenticateJWT, requireRoles('benh_nhan'), sharedInfraController.securityPing('patient'));

module.exports = router;

