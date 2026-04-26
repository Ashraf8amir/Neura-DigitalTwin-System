const express = require('express');
const aiVoiceController = require('./ai-voice.controller');
const verifyToken = require('../../shared/middlewares/verifyToken.middleware.js');
const validateReq = require('../../shared/middlewares/validation.middleware.js');
const aiVoiceValidators = require('./ai-voice.validator.js');
const authorizeRoles = require('../../shared/middlewares/roleCheck.middleware.js');
const uploadMiddleware = require('../../shared/middlewares/upload.middleware.js');
const { ROLE } = require('../../shared/constants/enums');

const router = express.Router();

router.use(verifyToken);

router.post('/transcribe',
    authorizeRoles(ROLE.DOCTOR),
    uploadMiddleware.uploadAudioFile,
    validateReq(aiVoiceValidators.transcribeSchema),
    aiVoiceController.transcribeAudio
);

module.exports = router;