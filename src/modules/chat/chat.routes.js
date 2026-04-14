const express = require('express');
const verifyToken = require('../../shared/middlewares/verifyToken.middleware');
const authorizeRoles = require('../../shared/middlewares/roleCheck.middleware');
const validateReq = require('../../shared/middlewares/validation.middleware');
const uploadMiddleware = require('../../shared/middlewares/upload.middleware');
const { ROLE } = require('../../shared/constants/enums');
const chatController = require('./chat.controller');
const chatValidator = require('./chat.validator');

const router = express.Router();

router.use(verifyToken);
router.use(authorizeRoles(ROLE.DOCTOR, ROLE.PATIENT));

router.post(
  '/conversations',
  validateReq(chatValidator.createConversationSchema),
  chatController.createConversation
);

router.get('/conversations', chatController.getConversations);

router.get(
  '/conversations/search',
  validateReq(chatValidator.searchMessagesSchema),
  chatController.searchMessages
);

router.get(
  '/conversations/:conversationId/messages',
  validateReq(chatValidator.getMessagesSchema),
  chatController.getMessages
);

router.post(
  '/conversations/:conversationId/messages',
  validateReq(chatValidator.sendMessageSchema),
  chatController.sendMessage
);

router.post(
  '/conversations/:conversationId/attachments',
  uploadMiddleware.uploadImageOrPDF,
  validateReq(chatValidator.sendAttachmentSchema),
  chatController.sendAttachment
);

router.patch(
  '/messages/:messageId/read',
  validateReq(chatValidator.markReadSchema),
  chatController.markMessageRead
);

module.exports = router;

