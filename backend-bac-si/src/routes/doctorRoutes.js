/** HTTP routes for Doctor Workstream 3. */
const express = require('express');
const { authenticateJWT, requireRoles } = require('../middlewares/authMiddleware');
const doctorController = require('../controllers/doctorController');

const router = express.Router();
const doctorOnly = [authenticateJWT, requireRoles('bac_si')];

router.get('/doctor/patients/search', ...doctorOnly, doctorController.searchPatients);
router.get('/doctor/queue', ...doctorOnly, doctorController.getQueue);
router.get('/doctor/patients/:patientId/history', ...doctorOnly, doctorController.getPatientHistory);
router.post('/doctor/medical-records/:id/accept', ...doctorOnly, doctorController.acceptRecord);
router.post('/doctor/medical-records/:id/complete', ...doctorOnly, doctorController.completeRecord);
router.post('/doctor/medical-records/:id/prescriptions', ...doctorOnly, doctorController.createPrescription);
router.post('/doctor/medical-records/:id/lab-results', ...doctorOnly, doctorController.createLabResult);
router.get('/doctor/medical-records/:id/lab-results', ...doctorOnly, doctorController.getLabResults);
router.patch('/doctor/lab-results/:labId', ...doctorOnly, doctorController.updateLabResult);
router.get('/doctor/medical-records/:id/lesion-images', ...doctorOnly, doctorController.getLesionImages);

module.exports = router;
