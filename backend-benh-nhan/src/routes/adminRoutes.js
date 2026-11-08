/**
 * @file src/routes/adminRoutes.js
 * @description Định tuyến toàn bộ RESTful API cho:
 * - Slide 3: Admin Users, RBAC & Assignment (admin01..06, role01..02, perm01..04, roleperm01..03)
 * - Slide 4: Hạ tầng Topology Chi nhánh - Khoa - Phòng (branch01..05, dept01..05, room01..05)
 * - Slide 11: Dynamic Form Builder (tmpl01..05, sec01..03, ques01..03)
 */

const express = require('express');
const router = express.Router();

const { authenticateJWT, requireRoles } = require('../middlewares/authMiddleware');
const adminController = require('../controllers/adminController');
const topologyController = require('../controllers/topologyController');
const formBuilderController = require('../controllers/formBuilderController');

// ============================================================================
// 1. SLIDE 3: QUẢN TRỊ NGƯỜI DÙNG & PHÂN CÔNG CÔNG TÁC (ADMIN MODULE)
// ============================================================================
router.get('/admin/users', authenticateJWT, requireRoles('admin'), adminController.getListUsers);
router.get('/admin/users/:id', authenticateJWT, requireRoles('admin'), adminController.getUserDetails);
router.post('/admin/users', authenticateJWT, requireRoles('admin'), adminController.createUser);
router.put('/admin/users/:id', authenticateJWT, requireRoles('admin'), adminController.editUser);
router.delete('/admin/users/:id', authenticateJWT, requireRoles('admin'), adminController.deleteUser);
router.put('/admin/users/:id/assign', authenticateJWT, requireRoles('admin'), adminController.assignUser);

// Slide 3: Vai trò & Quyền hạn (RBAC)
router.post('/roles', authenticateJWT, requireRoles('admin'), adminController.createRole);
router.get('/roles', authenticateJWT, adminController.getRoles);

router.post('/permissions', authenticateJWT, requireRoles('admin'), adminController.createPermission);
router.get('/permissions', authenticateJWT, requireRoles('admin'), adminController.getPermissions);
router.put('/permissions/:id', authenticateJWT, requireRoles('admin'), adminController.editPermission);
router.delete('/permissions/:id', authenticateJWT, requireRoles('admin'), adminController.deletePermission);

router.post('/role_permissions', authenticateJWT, requireRoles('admin'), adminController.assignRolePermissions);
router.get('/role_permissions/:roleId', authenticateJWT, requireRoles('admin'), adminController.getRolePermissions);
router.delete('/role_permissions/:roleId/:permissionId', authenticateJWT, requireRoles('admin'), adminController.revokeRolePermission);

// ============================================================================
// 2. SLIDE 4: HẠ TẦNG CƠ SỞ VẬT CHẤT & TỔ CHỨC (TOPOLOGY)
// ============================================================================
// Chi nhánh (Branches)
router.post('/branches', authenticateJWT, requireRoles('admin'), topologyController.createBranch);
router.get('/branches', authenticateJWT, topologyController.getBranches);
router.get('/branches/:id', authenticateJWT, topologyController.getBranchDetail);
router.put('/branches/:id', authenticateJWT, requireRoles('admin'), topologyController.editBranch);
router.delete('/branches/:id', authenticateJWT, requireRoles('admin'), topologyController.deleteBranch);

// Khoa chuyên môn (Departments)
router.post('/departments', authenticateJWT, requireRoles('admin'), topologyController.createDepartment);
router.get('/departments', authenticateJWT, topologyController.getDepartments);
router.get('/departments/:id', authenticateJWT, topologyController.getDepartmentDetail);
router.put('/departments/:id', authenticateJWT, requireRoles('admin'), topologyController.editDepartment);
router.delete('/departments/:id', authenticateJWT, requireRoles('admin'), topologyController.deleteDepartment);

// Phòng khám (Rooms)
router.post('/rooms', authenticateJWT, requireRoles('admin'), topologyController.createRoom);
router.get('/rooms', authenticateJWT, topologyController.getRooms);
router.get('/rooms/:id', authenticateJWT, topologyController.getRoomDetail);
router.put('/rooms/:id', authenticateJWT, requireRoles('admin'), topologyController.editRoom);
router.delete('/rooms/:id', authenticateJWT, requireRoles('admin'), topologyController.deleteRoom);

// ============================================================================
// 3. SLIDE 11: BỘ TẠO BIỂU MẪU ĐỘNG (DYNAMIC FORM BUILDER)
// ============================================================================
// Mẫu phiếu khám (Templates)
router.post('/templates', authenticateJWT, requireRoles('admin', 'bac_si'), formBuilderController.createTemplate);
router.get('/templates/all', authenticateJWT, formBuilderController.getTemplates);
router.get('/templates/:id', authenticateJWT, formBuilderController.getTemplateDetail);
router.put('/templates/:id', authenticateJWT, requireRoles('admin', 'bac_si'), formBuilderController.editTemplate);
router.delete('/templates/:id', authenticateJWT, requireRoles('admin'), formBuilderController.deleteTemplate);

// Phân mục (Sections)
router.post('/templates/:template_id/sections', authenticateJWT, requireRoles('admin', 'bac_si'), formBuilderController.createSection);
router.put('/templates/sections/:id', authenticateJWT, requireRoles('admin', 'bac_si'), formBuilderController.editSection);
router.delete('/templates/sections/:id', authenticateJWT, requireRoles('admin', 'bac_si'), formBuilderController.deleteSection);

// Câu hỏi & Lựa chọn (Questions & Options)
router.post('/templates/sections/:section_id/questions', authenticateJWT, requireRoles('admin', 'bac_si'), formBuilderController.createQuestion);
router.put('/templates/questions/:id', authenticateJWT, requireRoles('admin', 'bac_si'), formBuilderController.editQuestion);
router.delete('/templates/questions/:id', authenticateJWT, requireRoles('admin', 'bac_si'), formBuilderController.deleteQuestion);

module.exports = router;
