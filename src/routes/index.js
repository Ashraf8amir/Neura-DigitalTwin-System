const express = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const patientRoutes = require('../modules/patients/patient.route');
const doctorRoutes = require('../modules/doctors/doctor.route');
const profileRoutes = require('../modules/profile/profile.routes');
const appointmentRoutes = require('../modules/appointments/appointment.routes');
const paymentRoutes = require('../modules/payments/payment.route.js');
const rateLimiter = require('../shared/middlewares/rateLimiter.middleware.js').globalLimiter;

const router = express.Router();

router.use(rateLimiter);
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/payments', paymentRoutes);

module.exports = router;