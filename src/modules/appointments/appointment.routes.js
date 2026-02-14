const express = require('express');
const appointmentController = require('./appointment.controller');
const verifyToken = require('../../shared/middlewares/verifyToken.middleware.js');
const validateReq = require('../../shared/middlewares/validation.middleware.js'); 
const appointmentValidators = require('./appointment.validator.js');
const authorizeRoles = require('../../shared/middlewares/roleCheck.middleware.js');
const { ROLE } = require('../../shared/constants/enums');

const router = express.Router();

router.use(verifyToken);
router.use(authorizeRoles(ROLE.PATIENT, ROLE.DOCTOR, ROLE.ADMIN));

router.post('/',
    validateReq(appointmentValidators.createAppointmentSchema),
    appointmentController.createAppointment
);
router.get('/', appointmentController.getAllAppointments);
router.get('/count', appointmentController.countAppointments);
router.get('/statistics', appointmentController.getAppointmentStatistics);
router.get('/search', appointmentController.searchAppointments);
router.get('/today',
    authorizeRoles(ROLE.DOCTOR),
    appointmentController.getTodayAppointments
);
router.get('/upcoming', appointmentController.getUpcomingAppointments);
router.get('/past', appointmentController.getPastAppointments);
router.get('/available-slots/:doctorId', appointmentController.getAvailableSlots);
router.post('/:id/reschedule',
    validateReq(appointmentValidators.rescheduleAppointmentSchema),
    appointmentController.rescheduleAppointment
);
router.post('/:id/cancel', appointmentController.cancelAppointment);




module.exports = router;