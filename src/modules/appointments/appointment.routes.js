const express = require('express');
const appointmentController = require('./appointment.controller');
const verifyToken = require('../../shared/middlewares/verifyToken.middleware.js');
const validateReq = require('../../shared/middlewares/validation.middleware.js'); 
const appointmentValidators = require('./appointment.validator.js');
const authorizeRoles = require('../../shared/middlewares/roleCheck.middleware.js');
const { ROLE } = require('../../shared/constants/enums');

const router = express.Router();

router.use(verifyToken);

router.post('/',
    authorizeRoles(ROLE.PATIENT, ROLE.DOCTOR, ROLE.ADMIN),
    validateReq(appointmentValidators.createAppointmentSchema),
    appointmentController.createAppointment
);
router.get('/',
    authorizeRoles(ROLE.PATIENT, ROLE.DOCTOR, ROLE.ADMIN),
    appointmentController.getAllAppointments
);
router.get('/count',
    authorizeRoles(ROLE.PATIENT, ROLE.DOCTOR, ROLE.ADMIN),
    appointmentController.countAppointments
);
router.get('/statistics',
    authorizeRoles(ROLE.PATIENT, ROLE.DOCTOR, ROLE.ADMIN),
    appointmentController.getAppointmentStatistics
);
router.get('/search',
    authorizeRoles(ROLE.PATIENT, ROLE.DOCTOR, ROLE.ADMIN),
    appointmentController.searchAppointments
)

module.exports = router;