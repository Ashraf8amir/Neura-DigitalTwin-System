const express = require('express');
const jobController = require('./job.controller');


const router = express.Router();

router.post('/cancel/unconfirmed-appointments', jobController.cancelUnconfirmedAppointments);
router.post('/unblock/blacklisted-patients', jobController.unblockBlacklistedPatients);

module.exports = router;