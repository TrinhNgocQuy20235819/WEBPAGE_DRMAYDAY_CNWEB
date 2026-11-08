/** HTTP routes for Doctor Workstream 3. */
const express = require('express');
const { authenticateJWT, requireRoles } = require('../middlewares/authMiddleware');
const doctorController = require('../controllers/doctorController');

const router = express.Router();
const clinicalStaffOnly = [authenticateJWT, requireRoles('bac_si', 'dieu_duong', 'admin')];

router.get('/doctor/patients/search', ...clinicalStaffOnly, doctorController.searchPatients);
router.post('/doctor/patients', ...clinicalStaffOnly, doctorController.createWalkInPatientRecord);
router.get('/doctor/queue', ...clinicalStaffOnly, doctorController.getQueue);
router.get('/doctor/patients/:patientId/history', ...clinicalStaffOnly, doctorController.getPatientHistory);
router.post('/doctor/medical-records/:id/accept', ...clinicalStaffOnly, doctorController.acceptRecord);
router.post('/doctor/medical-records/:id/complete', ...clinicalStaffOnly, doctorController.completeRecord);
router.post('/doctor/medical-records/:id/prescriptions', ...clinicalStaffOnly, doctorController.createPrescription);
router.post('/doctor/medical-records/:id/lab-results', ...clinicalStaffOnly, doctorController.createLabResult);
router.get('/doctor/medical-records/:id/lab-results', ...clinicalStaffOnly, doctorController.getLabResults);
router.patch('/doctor/lab-results/:labId', ...clinicalStaffOnly, doctorController.updateLabResult);
router.put('/doctor/lab-results/:labId', ...clinicalStaffOnly, doctorController.updateLabResult);
router.get('/doctor/medical-records/:id/lesion-images', ...clinicalStaffOnly, doctorController.getLesionImages);

module.exports = router;
