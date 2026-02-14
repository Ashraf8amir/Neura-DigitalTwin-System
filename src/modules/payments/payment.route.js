const express = require('express');
const paymentController = require('./payment.controller.js');
const verifyToken = require('../../shared/middlewares/verifyToken.middleware.js');
const validateReq  = require('../../shared/middlewares/validation.middleware.js');
const authorizeRoles = require('../../shared/middlewares/roleCheck.middleware.js');
const { ROLE } = require('../../shared/constants/enums');

const router = express.Router();

router.post('/callback',
    paymentController.handlePaymobCallback
);
router.get('/success',
    paymentController.paymentSuccess
);


module.exports = router;