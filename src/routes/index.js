const express = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const patientRoutes = require('../modules/patients/patient.route');
const doctorRoutes = require('../modules/doctors/doctor.route');
const profileRoutes = require('../modules/profile/profile.routes');
const appointmentRoutes = require('../modules/appointments/appointment.routes');
const paymentRoutes = require('../modules/payments/payment.route.js');
const aiVoiceRoutes = require('../modules/ai-voice/ai-voice.routes');
const medicalRecordRoutes = require('../modules/medical-records/medicalRecord.routes');
const digitalTwinRoutes = require('../modules/digital-twin/digital-twin.routes');
const chatRoutes = require('../modules/chat/chat.routes');
const rateLimiter = require('../shared/middlewares/rateLimiter.middleware.js').globalLimiter;

const router = express.Router();

router.use(rateLimiter);
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/payments', paymentRoutes);
router.use('/ai-voice', aiVoiceRoutes);
router.use('/medical-records', medicalRecordRoutes);
router.use('/digital-twin', digitalTwinRoutes);
router.use('/chat', chatRoutes);


module.exports = router;
